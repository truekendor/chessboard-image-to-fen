"use strict";

import {
  normalizeFenString,
  parseFenFromArray,
  drawFileOnCanvas,
} from "./utils.js";

import { ChessBoardCanvas } from "./pieceHelper.js";
import { chessPiecesLookup } from "./pieceData.js";
import { appendLoader, removeLoader } from "./loaderCanvas.js";
import { createLichessLink } from "./createLinks.js";

const mainContainer = document.querySelector(".main-container");
// wrapper for opacity slider and buttons
const panel = document.querySelector(".panel");
const buttonsContainer = panel.querySelector(".preview-btn-container");
const canvasContainer = document.querySelector(".canvas-container");

// prediction preview buttons
const buttons = buttonsContainer.querySelectorAll("button");
const buttonWhite = buttons[0];
const buttonBlack = buttons[1];

// container with Paste/Drop text
const infoDiv = document.querySelector(".info-div");

// bottom container with links to
// lichess / chesscon
const linkContainer = document.querySelector(".links");

const canvas = document.querySelector(".main-canvas");
const c = canvas.getContext("2d", {
  willReadFrequently: true,
});

const helperCanvas = document.querySelector(".helper-canvas");
const ctx = helperCanvas.getContext("2d");
helperCanvas.classList.add("helper-canvas");

canvas.width = 600;
canvas.height = 600;
helperCanvas.width = canvas.width;
helperCanvas.height = canvas.height;

const URL = `https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v3_small_100_224/feature_vector/5/default/1`;
const MOBILE_NET_INPUT_WIDTH = 224;

const mobilenet = await loadMobilenetModel();
const model = await tf.loadLayersModel("./model/model.json");

const fenImageData = {
  white: undefined,
  black: undefined,
};

async function loadMobilenetModel() {
  try {
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
  } finally {
    removeLoader();
  }
}

async function handleFileFromEvent(file) {
  await drawFileOnCanvas(file, canvas);
  predict();

  infoDiv.classList.add("hidden");
  return false;
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

function predict() {
  try {
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

      tileFeatures.forEach((feature) => {
        const prediction = model.predict(feature.expandDims()).squeeze();

        const predictionArray = prediction.arraySync();

        let maxValue = predictionArray[0];
        let maxIndex = 0;

        for (let i = 1; i < predictionArray.length; i++) {
          const cur = predictionArray[i];

          if (cur > maxValue) {
            maxValue = cur;
            maxIndex = i;
          }
        }

        pieceKeys.forEach((key) => {
          if (parseInt(key) === maxIndex) {
            fen.push(chessPiecesLookup[maxIndex]);
          }
        });
      });

      // https://lichess.org/editor/qQRPKQQp/QkNNkPbp/NrpkbRBn/qpkQppBR/PqnRkQKB/rbBBPRqn/rNQBrBkN/PqRPNBbk_w_-_-_0_1?color=white

      const board = new ChessBoardCanvas(helperCanvas.width);
      const [parsedFen, reversedFen] = parseFenFromArray(fen);

      board.drawChessboardFromFen(
        normalizeFenString(parsedFen).filter((el) => el !== "/")
      );
      const dataWhite = board.imageData;

      fenImageData.white = dataWhite;

      board.drawPattern();

      board.drawChessboardFromFen(
        normalizeFenString(reversedFen).filter((el) => el !== "/")
      );

      const dataBlack = board.imageData;
      fenImageData.black = dataBlack;
      const dividerLine = document.createElement("div");
      dividerLine.classList.add("horizontal-line");
      const [linkLichess, linkLichessReversed] = createLichessLink(
        parsedFen,
        reversedFen
      );
      linkContainer.innerHTML = "";

      linkContainer.append(linkLichess, linkLichessReversed);
      linkContainer.append(dividerLine);
    });
  } catch (e) {
    console.log(e.message);
  }
}

// * =================
// * EVENT LISTENERS

addEventListener("paste", async (e) => {
  if (e.clipboardData.files.length === 0) return;
  await handleFileFromEvent(e.clipboardData.files[0]);
});

// * =================
// * drag listeners
addEventListener("drop", async (e) => {
  e.preventDefault();

  if (e.dataTransfer.files.length === 0) return false;
  await handleFileFromEvent(e.dataTransfer.files[0]);

  mainContainer.classList.remove("drag-over");

  panel.classList.remove("pointer-none");
  canvasContainer.classList.remove("pointer-none");
});

addEventListener("dragover", () => {
  mainContainer.classList.add("drag-over");

  panel.classList.add("pointer-none");
  canvasContainer.classList.add("pointer-none");
});

addEventListener("dragleave", () => {
  mainContainer.classList.remove("drag-over");
});

addEventListener("dragover", (e) => {
  e.preventDefault();
});

// * =================
// * preview button listeners

buttonBlack.addEventListener("pointerdown", () => {
  if (!fenImageData.black) return;

  ctx.putImageData(fenImageData.black, 0, 0);

  helperCanvas.classList.add("top");
});

buttonBlack.addEventListener("pointerup", () => {
  helperCanvas.classList.remove("top");
});

buttonWhite.addEventListener("pointerdown", () => {
  if (!fenImageData.white) return;
  ctx.putImageData(fenImageData.white, 0, 0);

  helperCanvas.classList.add("top");
});

buttonWhite.addEventListener("pointerup", () => {
  helperCanvas.classList.remove("top");
});
