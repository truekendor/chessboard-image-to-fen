import { DetectionCanvas } from "../detection-canvas";

import { NN } from "../nnHelper";

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

  const buttonsPanel = document.createElement("div");
  buttonsPanel.append(previewPredictionBtn, predictBtn);

  predictBtn.addEventListener("click", () => {
    const [f1, f2] = NN.classification.classifyCanvas(
      detectionCanvas.toGrayScale().canvas
    );

    fenW.value = f1;
    fenB.value = f2;
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
