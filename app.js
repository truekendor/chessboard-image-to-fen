import {
  normalizeFenString,
  parseFenFromArray,
  drawFileOnCanvas,
} from "./utils.js";

import { ChessBoardCanvas } from "./pieceHelper.js";
import { chessPiecesLookup } from "./pieceData.js";
import { appendLoader, removeLoader } from "./loaderCanvas.js";
import { createCopyButtons, createLichessLink } from "./creationHelper.js";
import { CV_Helper } from "./cvHelper.js";

const fileInput = document.querySelector("#image-input");

const mainContainer = document.querySelector(".main-container");
// wrapper for buttons and heading
const panel = document.querySelector(".panel");
const canvasContainer = document.querySelector(".canvas-container");

// prediction preview button
const buttonWhite = panel.querySelector(".switch");

// container with Paste/Drop text
const infoDiv = document.querySelector(".info-div");

// bottom container with links to lichess
const linkContainer = document.querySelector(".links");

const canvas = document.querySelector(".main-canvas");
const c = canvas.getContext("2d", {
  willReadFrequently: true,
});

const previewCanvas = document.getElementById("preview-canvas");
const prevCtx = previewCanvas.getContext("2d");

const helperCanvas = document.querySelector(".helper-canvas");
const ctx = helperCanvas.getContext("2d");
helperCanvas.classList.add("helper-canvas");

canvas.width = 600;
canvas.height = 600;
helperCanvas.width = canvas.width;
helperCanvas.height = canvas.height;

const grid = document.querySelector(".chessboard");

const URL = `https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v3_small_100_224/feature_vector/5/default/1`;
const MOBILE_NET_INPUT_WIDTH = 224;

let mobilenet = null;
let model = null;

await Promise.all([
  await loadMobilenetModel(),
  await tf.loadLayersModel("./model/model.json"),
])
  .then((result) => {
    mobilenet = result[0];
    model = result[1];
  })
  .finally(() => {
    removeLoader();
  });

// const mobilenet = await loadMobilenetModel();
// const model = await tf.loadLayersModel("./model/model.json");

infoDiv.classList.remove("hidden");

const fenImageData = {
  white: undefined,
  black: undefined,
};

async function loadMobilenetModel() {
  try {
    // todo fix this
    appendLoader();

    const mobilenet = await tf.loadGraphModel(URL, {
      fromTFHub: true,
    });

    // const mobilenet = await tf.loadGraphModel("./mobilenet", {
    //   fromTFHub: true,
    // });

    const answer = mobilenet.predict(
      // * [1, y, x, 3]
      tf.zeros([1, MOBILE_NET_INPUT_WIDTH, MOBILE_NET_INPUT_WIDTH, 3])
    );

    answer.dispose();

    return mobilenet;
  } catch (e) {
    console.log(e?.message);
  }
}

/**
 * filters contours array with arbitrary heuristics
 */
function getBoardCandidates(rects, imgDims) {
  const area = imgDims.width * imgDims.height;
  const imgAspectRatio = imgDims.width / imgDims.height;
  const imgSimilarToSquare = imgAspectRatio < 1.15 && imgAspectRatio > 0.85;

  return rects.filter((rect) => {
    const contourArea = rect.width * rect.height;

    // area is too small
    if (area / contourArea > 20) return;
    // not rect. similar
    if (rect.aspectRatio > 1.1 || rect.aspectRatio < 0.9) return;
    // absolute contour size is too small
    if (rect.width < 100 || rect.height < 100) return;
    // relative contour size is too small
    if (rect.width < imgDims.width / 8 || rect.height < imgDims.height / 8)
      return;

    if (imgSimilarToSquare && contourArea < 0.7) {
      return { x: 0, y: 0, width: imgDims.width, height: imgDims.height };
    }

    return rect;
  });
}

async function convertFile(file) {
  const dims = await drawFileOnCanvas(file, canvas);
  infoDiv.classList.add("hidden");

  const rects = CV_Helper.getBoardContours(canvas);
  const filtered = getBoardCandidates(rects, dims);

  await drawFileOnCanvas(file, canvas);

  if (filtered.length === 0) {
    // todo inform the user

    return;
  }

  const { x, y, width, height } = filtered[0];
  const imageData = c.getImageData(x, y, width, height);

  canvas.width = width;
  canvas.height = height;
  c.putImageData(imageData, 0, 0);

  predict(canvas);
  return false;
}

function drawBoardOutline(boardCandidates, canvas) {
  console.log("BOARD COORDS!!");
  console.log("BOARD COORDS!!");
  console.log("BOARD COORDS!!", boardCandidates);

  const c = canvas.getContext("2d");
  c.filter = "grayscale(0)";

  const { x, y, width, height } = boardCandidates;

  c.strokeStyle = "red";
  c.lineWidth = 2;

  c.beginPath();
  c.rect(x, y, width, height);
  c.stroke();
  c.closePath();
}

function calculateFeaturesOnCurrentTile(canvasRef, mobilenet) {
  try {
    return tf.tidy(() => {
      const canvasAsTensor = tf.browser.fromPixels(canvasRef);

      // Resize image to mobilenet size
      const resizedTensorFrame = tf.image.resizeBilinear(
        canvasAsTensor,
        [MOBILE_NET_INPUT_WIDTH, MOBILE_NET_INPUT_WIDTH],
        true
      );

      // tensors normalization [0, 1]
      const normalizedTensorFrame = resizedTensorFrame.div(255);

      return mobilenet.predict(normalizedTensorFrame.expandDims()).squeeze();
    });
  } catch (e) {
    console.log(e.message);
  }
}

// Predict and do some other bullshit
function predict(canvas) {
  try {
    grid.classList.add("hidden");

    tf.tidy(() => {
      const pieceKeys = Object.keys(chessPiecesLookup);

      const tileWidth = canvas.width / 8;
      const tileHeight = canvas.height / 8;

      const tileFeatures = [];
      const fen = [];

      for (let i = 0; i < 64; i++) {
        const row = i % 8;
        const column = Math.floor(i / 8);

        const tileCanvas = document.createElement("canvas");
        tileCanvas.width = tileWidth;
        tileCanvas.height = tileHeight;

        const tc = tileCanvas.getContext("2d");

        const x1 = row * tileWidth;
        const y1 = column * tileHeight;

        const tileData = c.getImageData(x1, y1, tileWidth, tileHeight);
        tc.putImageData(tileData, 0, 0);

        const feature = calculateFeaturesOnCurrentTile(tileCanvas, mobilenet);
        tileFeatures.push(feature);
      }

      // calculate image features for each tile
      tileFeatures.forEach((feature) => {
        const prediction = model.predict(feature.expandDims()).squeeze();

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
        pieceKeys.forEach((key) => {
          if (parseInt(key) === maxIndex) {
            fen.push(chessPiecesLookup[maxIndex]);
          }
        });
      });

      const [parsedFen, reversedFen] = parseFenFromArray(fen);

      // saves predicted images to fenImageData object
      savePredictedImages(parsedFen, reversedFen);

      const wrapperOne = document.createElement("div");
      const wrapperTwo = document.createElement("div");
      wrapperOne.classList.add("link-wrapper");
      wrapperTwo.classList.add("link-wrapper");

      const [linkLichess, linkLichessReversed] = createLichessLink(
        parsedFen,
        reversedFen
      );
      const [copyWhite, copyBlack] = createCopyButtons(parsedFen, reversedFen);

      wrapperOne.append(linkLichess, copyWhite);
      wrapperTwo.append(linkLichessReversed, copyBlack);

      // to get rid of children nodes
      linkContainer.innerHTML = "";

      linkContainer.append(wrapperOne, wrapperTwo);
    });
  } catch (e) {
    console.log(e.message);
  }
}

function savePredictedImages(fen, reversedFen) {
  const board = new ChessBoardCanvas(helperCanvas.width);
  // save predicted fen images
  board.clearBoard();
  board.drawChessboardFromFen(
    normalizeFenString(fen).filter((el) => el !== "/")
  );
  fenImageData.white = board.imageData;
  board.clearBoard();
  board.drawChessboardFromFen(
    normalizeFenString(reversedFen).filter((el) => el !== "/")
  );
  fenImageData.black = board.imageData;
}

// * =================
// * =================
// * EVENT LISTENERS
fileInput.addEventListener("change", async () => {
  if (fileInput.files.length === 0) return;
  await convertFile(fileInput.files[0]);
});

window.addEventListener("paste", async (e) => {
  if (e.clipboardData.files.length === 0) return;
  await convertFile(e.clipboardData.files[0]);
});

window.addEventListener("drop", async (e) => {
  e.preventDefault();

  if (e.dataTransfer.files.length === 0) return false;
  await convertFile(e.dataTransfer.files[0]);

  mainContainer.classList.remove("drag-over");

  panel.classList.remove("pointer-none");
  canvasContainer.classList.remove("pointer-none");
});

window.addEventListener("dragover", () => {
  mainContainer.classList.add("drag-over");

  panel.classList.add("pointer-none");
  canvasContainer.classList.add("pointer-none");
});

window.addEventListener("dragleave", () => {
  mainContainer.classList.remove("drag-over");
});

window.addEventListener("dragover", (e) => {
  e.preventDefault();
});

// * =================
// * preview button listeners
buttonWhite.addEventListener("pointerdown", () => {
  if (!fenImageData.white) return;
  ctx.putImageData(fenImageData.white, 0, 0);

  helperCanvas.classList.add("z-index-high");
});

buttonWhite.addEventListener("pointerup", () => {
  helperCanvas.classList.remove("z-index-high");
});
