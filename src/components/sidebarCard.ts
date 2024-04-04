import { DetectionCanvas } from "../detection-canvas";
import { NN } from "../nnHelper";
import { detectionCanvasList } from "../renderBoxes";

const sidebar = document.querySelector(".detection-sidebar")!;
const outlineSVG = document.querySelector(".outline-svg_svg")!;

export function createSidebarCard(
  detectionCanvas: DetectionCanvas,
  fenWhite: string,
  fenBlack: string
) {
  const cardWrapper = document.createElement("div");
  cardWrapper.classList.add("detection-card");

  // * ============
  // * button panel

  const previewPredictionBtn = document.createElement("button");
  previewPredictionBtn.textContent = "preview";

  const predictBtn = document.createElement("button");
  predictBtn.textContent = "predict";

  const deleteCardBtn = document.createElement("button");
  deleteCardBtn.textContent = "delete";

  const buttonsPanel = document.createElement("div");
  buttonsPanel.append(previewPredictionBtn, predictBtn, deleteCardBtn);

  predictBtn.addEventListener("click", () => {
    const [f1, f2] = NN.classification.classifyCanvas(
      detectionCanvas.toGrayScale().canvas
    );

    fenW.value = f1;
    fenB.value = f2;
  });

  previewPredictionBtn.addEventListener("pointerdown", () => {
    //
  });

  previewPredictionBtn.addEventListener("pointerup", () => {
    //
  });

  deleteCardBtn.addEventListener("click", () => {
    const index = detectionCanvasList.findIndex((el) => {
      return el.id === detectionCanvas.id;
    });

    detectionCanvasList.splice(index, 1);

    const cards = sidebar.querySelectorAll(".detection-card");
    cards.forEach((card) => {
      const cardCanvas = card.querySelector("canvas")!;
      const dataId = parseInt(cardCanvas.getAttribute("data-id")!);

      if (dataId === detectionCanvas.id) {
        sidebar.removeChild(card);
      }
    });

    const groups = outlineSVG.querySelectorAll("g");
    groups.forEach((group) => {
      const dataId = parseInt(group.getAttribute("data-id")!);

      if (dataId === detectionCanvas.id) {
        outlineSVG.removeChild(group);
      }
    });
  });

  // * ============
  // * fen

  const fenContainer = document.createElement("div");
  fenContainer.classList.add("fen-container");

  const fenW = document.createElement("input");
  const fenB = document.createElement("input");

  const copyFENBtnW = document.createElement("button");
  const copyFENBtnB = document.createElement("button");

  copyFENBtnW.addEventListener("click", () => {
    navigator.clipboard.writeText(fenWhite);
  });

  copyFENBtnB.addEventListener("click", () => {
    navigator.clipboard.writeText(fenBlack);
  });

  copyFENBtnW.textContent = "copy";
  copyFENBtnB.textContent = "copy";

  fenW.value = fenWhite;
  fenB.value = fenBlack;

  fenW.disabled = true;
  fenB.disabled = true;
  fenContainer.append(fenW, copyFENBtnW, fenB, copyFENBtnB);

  // * ============

  cardWrapper.append(buttonsPanel, detectionCanvas.canvas, fenContainer);

  return {
    card: cardWrapper,
    appendCardToSidebar: () => {
      const resultsDiv = document.querySelector(".detection-sidebar")!;
      resultsDiv.append(cardWrapper);
    },
  };
}
