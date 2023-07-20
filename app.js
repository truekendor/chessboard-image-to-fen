"use strict";

import {
  normalizeFenString,
  parseFenFromArray,
  drawFileOnCanvas,
} from "./utils.js";

import { ChessBoardCanvas } from "./pieceHelper.js";
import { chessPiecesLookup } from "./pieceData.js";
import { appendLoader, removeLoader } from "./loaderCanvas.js";
import { createCopyButtons, createLichessLink } from "./createHelper.js";

const fileInput = document.querySelector("#image-input");

const mainContainer = document.querySelector(".main-container");
// wrapper for buttons and heading
const panel = document.querySelector(".panel");
const canvasContainer = document.querySelector(".canvas-container");

// prediction preview button
const buttonWhite = panel.querySelector(".switch");

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

const grid = document.querySelector(".chessboard");

const URL = `https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v3_small_100_224/feature_vector/5/default/1`;
const MOBILE_NET_INPUT_WIDTH = 224;

const mobilenet = await loadMobilenetModel();
const model = await tf.loadLayersModel("./model/model.json");

infoDiv.classList.remove("hidden");

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

// Predict and do some other bullshit
function predict() {
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

window.addEventListener("paste", async (e) => {
  if (e.clipboardData.files.length === 0) return;
  await handleFileFromEvent(e.clipboardData.files[0]);
});

window.addEventListener("drop", async (e) => {
  e.preventDefault();

  if (e.dataTransfer.files.length === 0) return false;
  await handleFileFromEvent(e.dataTransfer.files[0]);

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

  helperCanvas.classList.add("top");
});

buttonWhite.addEventListener("pointerup", () => {
  helperCanvas.classList.remove("top");
});

fileInput.addEventListener("change", async (e) => {
  if (fileInput.files.length === 0) return;
  await handleFileFromEvent(fileInput.files[0]);
});
