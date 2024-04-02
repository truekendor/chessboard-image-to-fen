import "./styles/style.css";
import "./styles/chessboard.css";
import "./styles/loader.css";
import "./styles/rects.css";
import "./styles/detectionResults.css";

import { NN } from "./nnHelper.js";

const mainContainer: HTMLDivElement =
  document.querySelector(".main-container")!;

const canvasContainer: HTMLSelectElement =
  document.querySelector(".canvas-container")!;

const canvas: HTMLCanvasElement = document.querySelector(".main-canvas")!;
canvas.width = 600;
canvas.height = 600;

// bottom container with links to lichess
// const linkContainer: HTMLDivElement = document.querySelector(".links")!;

// const rectsContainer: HTMLDivElement = document.querySelector(".outline-svg_container")!;
// const rectsSVG = rectsContainer.querySelector("svg")!;

NN.loadModels();

const fileInput: HTMLInputElement = document.querySelector("#image-input")!;

async function convertFileAndPredict(file: Blob) {
  const img = new Image();
  const fileReader = new FileReader();
  const c = canvas.getContext("2d")!;

  fileReader.readAsDataURL(file);

  await new Promise((res, rej) => {
    fileReader.onload = () => {
      // placeholder chessboard grid
      const chessboardGrid: HTMLDivElement =
        document.querySelector(".chessboard")!;
      // container with Paste/Drop text and SVG
      const infoDiv: HTMLDivElement = document.querySelector(
        ".paste-drop-tooltip"
      )!;

      chessboardGrid.classList.add("hidden");

      img.src = fileReader.result as string;

      img.onload = () => {
        infoDiv.classList.add("hidden");

        canvasContainer.classList.add("active");

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        c.drawImage(img, 0, 0);

        res(null);
      };

      img.onerror = (err) => rej(err);
    };
  });

  const detectionResult = await NN.detection.detectChessboards(
    img,
    NN.models.detectionModel,
    canvas
  );

  setTimeout(() => {
    NN.classification.classifyDetectionResults(canvas, detectionResult);
  });

  return;
}

// * =================
// * =================
// * EVENT LISTENERS
fileInput.addEventListener("change", async () => {
  if (fileInput?.files?.length === 0) {
    return;
  }
  await convertFileAndPredict(fileInput!.files![0]);
});

window.addEventListener("paste", async (e) => {
  if (e?.clipboardData?.files.length === 0) {
    return;
  }
  await convertFileAndPredict(e!.clipboardData!.files[0]);
});

window.addEventListener("drop", async (e) => {
  e.preventDefault();

  if (e?.dataTransfer?.files.length === 0) {
    return;
  }

  await convertFileAndPredict(e!.dataTransfer!.files[0]);

  mainContainer.classList.remove("drag-over");

  canvasContainer.classList.remove("pointer-none");
});

window.addEventListener("dragover", () => {
  mainContainer.classList.add("drag-over");

  canvasContainer.classList.add("pointer-none");
});

window.addEventListener("dragleave", () => {
  mainContainer.classList.remove("drag-over");
});

window.addEventListener("dragover", (e) => {
  e.preventDefault();
});
