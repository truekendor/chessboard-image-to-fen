import * as tf from "@tensorflow/tfjs";
import { parseFenFromArray } from "./utils";

import { renderSVGBoxes } from "./renderBoxes.js";

// bottom container with links to lichess
const linkContainer: HTMLDivElement = document.querySelector(".links")!;

export class NN {
  // const URL = `https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v3_small_100_224/feature_vector/5/default/1`;
  static mobilenetInputWidth = 224 as const;

  static models: {
    detectionModel: tf.GraphModel;
    classificationModel: tf.LayersModel;
    mobilenetFeatureVector: tf.GraphModel;
  };

  static get classification() {
    return ClassificationHelper;
  }

  static get detection() {
    return DetectionHelper;
  }

  static async loadModels() {
    const [detectionModel, classificationModel, mobilenetFeatureVector] =
      // todo delete comments
      await Promise.all([
        tf.loadGraphModel("./nn/detection_model/model.json"),
        // tf.loadGraphModel("./nn/best_web_model_v3/model.json"),
        tf.loadLayersModel("./nn/classification_model/model.json"),
        // tf.loadGraphModel(URL, {
        //   fromTFHub: true,
        // }),
        tf.loadGraphModel("./nn/mobilenet/model.json"),
      ] as const);

    tf.tidy(() => {
      detectionModel.execute(tf.zeros(detectionModel.inputs[0].shape!));

      mobilenetFeatureVector.predict(
        tf.zeros([1, NN.mobilenetInputWidth, NN.mobilenetInputWidth, 3])
      );
    });

    const app = document.querySelector("#app")!;
    const loader = document.querySelector(".loader")!;
    app.removeChild(loader);

    // @ts-expect-error initialization
    this.models = {};

    this.models.detectionModel = detectionModel;
    this.models.classificationModel = classificationModel;
    this.models.mobilenetFeatureVector = mobilenetFeatureVector;

    return [
      detectionModel,
      classificationModel,
      mobilenetFeatureVector,
    ] as const;
  }
}

class DetectionHelper {
  private static modelShape = [640, 640];

  // number of classes to detect
  private static numberOfClasses = 1;

  /**
   * Method run inference and do detection from source.
   */
  static async detectChessboards(
    source: HTMLImageElement,
    model: tf.GraphModel,
    canvasRef: HTMLCanvasElement
  ) {
    const [modelWidth, modelHeight] = this.modelShape; // get model width and height

    tf.engine().startScope(); // start scoping tf engine
    const [input, xRatio, yRatio] = this.preprocess(
      source,
      modelWidth,
      modelHeight
    ); // preprocess image

    const res: tf.Tensor<tf.Rank> = model.execute(input) as tf.Tensor4D; // inference model

    const transRes = res.transpose([0, 2, 1]); // transpose result [b, det, n] => [b, n, det]
    const boxes = tf.tidy(() => {
      const w = transRes.slice([0, 0, 2], [-1, -1, 1]); // get width
      const h = transRes.slice([0, 0, 3], [-1, -1, 1]); // get height
      const x1 = tf.sub(transRes.slice([0, 0, 0], [-1, -1, 1]), tf.div(w, 2)); // x1
      const y1 = tf.sub(transRes.slice([0, 0, 1], [-1, -1, 1]), tf.div(h, 2)); // y1
      return tf
        .concat(
          [
            y1,
            x1,
            tf.add(y1, h), //y2
            tf.add(x1, w), //x2
          ],
          2
        )
        .squeeze() as tf.Tensor2D;
    }); // process boxes [y1, x1, y2, x2]

    const [scores, classes] = tf.tidy(() => {
      // class scores
      const rawScores = transRes
        .slice([0, 0, 4], [-1, -1, this.numberOfClasses])
        .squeeze([0]); // #6 only squeeze axis 0 to handle only 1 class models

      const scores = rawScores.max(1) as tf.Tensor1D;
      const classes = rawScores.argMax(1) as tf.Tensor1D;

      return [scores, classes] as const;
    }); // get max scores and classes index

    const nms = await tf.image.nonMaxSuppressionAsync(
      boxes,
      scores,
      500,
      0.45,
      0.2
    ); // NMS to filter boxes

    const boxes_data = boxes.gather(nms, 0).dataSync() as Float32Array; // indexing boxes by nms index
    const scores_data = scores.gather(nms, 0).dataSync() as Float32Array; // indexing scores by nms index
    const classes_data = classes.gather(nms, 0).dataSync() as Int32Array; // indexing classes by nms index

    tf.dispose([res, transRes, boxes, scores, classes, nms]); // clear memory

    tf.engine().endScope(); // end of scoping

    const detectionResult = renderSVGBoxes(
      canvasRef,
      boxes_data,
      scores_data,
      classes_data,
      [xRatio, yRatio]
    );

    return detectionResult;
  }

  /**
   * Preprocess image / frame before forwarded into the model
   */
  private static preprocess(
    source: HTMLImageElement,
    modelWidth: number,
    modelHeight: number
  ) {
    // ratios for boxes
    let xRatio = 0;
    let yRatio = 0;

    const input = tf.tidy(() => {
      const img = tf.browser.fromPixels(source);

      // padding image to square => [n, m] to [n, n], n > m
      const [h, w] = img.shape.slice(0, 2); // get source width and height
      const maxSize = Math.max(w, h); // get max size
      const imgPadded = img.pad([
        [0, maxSize - h], // padding y [bottom only]
        [0, maxSize - w], // padding x [right only]
        [0, 0],
      ]) as tf.Tensor3D;

      xRatio = maxSize / w; // update xRatio
      yRatio = maxSize / h; // update yRatio

      return tf.image
        .resizeBilinear(imgPadded, [modelWidth, modelHeight]) // resize frame
        .div(255.0) // normalize
        .expandDims(0) as tf.Tensor4D; // add batch
    });

    return [input, xRatio, yRatio] as const;
  }
}

class ClassificationHelper {
  private static chessPiecesLookup = {
    // black pieces
    "0": "p",
    "1": "r",
    "2": "n",
    "3": "b",
    "4": "q",
    "5": "k",
    // white pieces
    "6": "P",
    "7": "R",
    "8": "N",
    "9": "B",
    "10": "Q",
    "11": "K",
    // empty space/tile
    "12": "s",
  };

  private static pieceKeys = Object.keys(
    this.chessPiecesLookup
  ) as (keyof typeof this.chessPiecesLookup)[];

  static classifyDetectionResults(
    canvas: HTMLCanvasElement,
    results: Awaited<ReturnType<typeof DetectionHelper.detectChessboards>>
  ) {
    const ctx = canvas.getContext("2d", {
      willReadFrequently: true,
    })!;

    const resultsDiv = document.querySelector(".results")!;

    const tileCanvas = document.createElement("canvas");

    tf.tidy(() => {
      results.forEach((_, index) => {
        const { width, height, x1, y1 } = results[index];

        // todo move to state, no need to recreate for each function call
        // local canvas
        const boardCanvas = document.createElement("canvas");
        const bCtx = boardCanvas.getContext("2d", {
          willReadFrequently: true,
        })!;

        boardCanvas.width = width;
        boardCanvas.height = height;

        bCtx.filter = "grayscale(1)";
        const boardData = ctx.getImageData(x1, y1, width, height);
        bCtx.putImageData(boardData, 0, 0);

        bCtx.drawImage(boardCanvas, 0, 0);

        resultsDiv.append(boardCanvas);

        const tileFeatures = this.extractTileFeatures(boardCanvas, tileCanvas);
        const fenArray = this.classifyTiles(tileFeatures);

        const [parsedFen, reversedFen] = parseFenFromArray(fenArray);
        // todo delete
        reversedFen;

        // todo uncomment after improvement
        // saves predicted images to fenImageData object
        // savePredictedImages(parsedFen, reversedFen);

        const wrapperOne = document.createElement("div");
        const wrapperTwo = document.createElement("div");
        wrapperOne.classList.add("link-wrapper");
        wrapperTwo.classList.add("link-wrapper");

        // const [linkLichess, linkLichessReversed] = createLichessLink(
        //   parsedFen,
        //   reversedFen
        // );
        // const [copyWhite, copyBlack] = createCopyButtons(parsedFen, reversedFen);

        // wrapperOne.append(linkLichess, copyWhite);
        // wrapperTwo.append(linkLichessReversed, copyBlack);

        console.log(`fen: ${parsedFen}`);

        // to get rid of children nodes
        linkContainer.innerHTML = "";

        linkContainer.append(wrapperOne, wrapperTwo);
      });
    });
  }

  private static extractTileFeatures(
    boardCanvas: HTMLCanvasElement,
    tileCanvas: HTMLCanvasElement
  ): readonly tf.Tensor<tf.Rank>[] {
    const bCtx = boardCanvas.getContext("2d")!;
    const tCtx = tileCanvas.getContext("2d")!;

    const tileFeatures: tf.Tensor<tf.Rank>[] = [];

    const tileWidth = boardCanvas.width / 8;
    const tileHeight = boardCanvas.height / 8;

    for (let i = 0; i < 64; i++) {
      const row = i % 8;
      const column = Math.floor(i / 8);

      tileCanvas.width = tileWidth;
      tileCanvas.height = tileHeight;

      const x1 = row * tileWidth;
      const y1 = column * tileHeight;

      const tileData = bCtx.getImageData(x1, y1, tileWidth, tileHeight);
      tCtx.putImageData(tileData, 0, 0);

      const feature = this.calculateFeaturesOnCurrentTile(
        tileCanvas,
        NN.models.mobilenetFeatureVector
      );

      tileFeatures.push(feature);
    }

    return tileFeatures;
  }

  private static classifyTiles(
    tileFeatures: ReturnType<typeof this.extractTileFeatures>
  ): readonly string[] {
    const fen: string[] = [];

    // calculate image features for each tile
    tileFeatures.forEach((feature) => {
      // tensor with a shape [1, 13];
      const predictionWithBatch = NN.models.classificationModel.predict(
        feature.expandDims()
      ) as tf.Tensor2D;

      // tensor with a shape [13];
      const prediction = predictionWithBatch.squeeze() as tf.Tensor1D;

      const predictionArray = prediction.arraySync();

      let maxValue = predictionArray[0];
      let maxIndex = 0;

      // find index of tile with maximum value
      for (let i = 1; i < predictionArray.length; i++) {
        const cur = predictionArray[i];

        if (cur > maxValue) {
          maxValue = cur;
          maxIndex = i;
        }
      }

      // lookup piece type in chessPieceLookup and
      // put prediction into the fen array
      this.pieceKeys.forEach((key) => {
        if (parseInt(key) === maxIndex) {
          const pieceKey =
            maxIndex.toString() as keyof typeof this.chessPiecesLookup;

          fen.push(this.chessPiecesLookup[pieceKey]);
        }
      });
    });

    return fen;
  }

  private static calculateFeaturesOnCurrentTile(
    canvasRef: HTMLCanvasElement,
    mobilenet: tf.GraphModel
  ) {
    return tf.tidy(() => {
      const canvasAsTensor = tf.browser.fromPixels(canvasRef);

      // Resize image to mobilenet size
      const resizedTensorFrame = tf.image.resizeBilinear(
        canvasAsTensor,
        [NN.mobilenetInputWidth, NN.mobilenetInputWidth],
        true
      );

      // tensors normalization [0, 1]
      const normalizedTensorFrame = resizedTensorFrame.div(255);

      const resultWithBatch = mobilenet.predict(
        normalizedTensorFrame.expandDims()
      ) as tf.Tensor2D;

      const result = resultWithBatch.squeeze();

      return result;
    });
  }
}
