import { NN } from "./nnHelper";
import { MainCanvas } from "./main";
import { DetectionCanvas } from "./components/detection-canvas";
import { createSidebarCard } from "./components/sidebarCard";
import {
  createResizableSVGGroup,
  drawOutlinedArea,
  recomputeCirclePosition,
} from "./components/resizableSVGGroup";
import { OutlineState } from "./outlineState";
import { Sidebar } from "./components/sidebar";

export const detectionsOutlineContainer: HTMLDivElement =
  document.querySelector(".outline-svg_container")!;
const detectionsOutlineSVG = detectionsOutlineContainer.querySelector("svg")!;
const allGroups = Array.from(detectionsOutlineSVG.querySelectorAll("g"));

export const detectionCanvasList: DetectionCanvas[] = [];

export function renderSVGBoxes(
  boxes_data: Float32Array,
  scores_data: Float32Array,
  ratios: [number, number]
): DetectionCanvas[] {
  const canvas = MainCanvas.canvas;
  const { left, top } = MainCanvas.boundingRect;
  const ratio = MainCanvas.ratio;

  const prevGroups = detectionsOutlineSVG.querySelectorAll("g");
  Sidebar.removePredictions(detectionCanvasList);

  prevGroups.forEach((rect) => {
    detectionsOutlineSVG.removeChild(rect);
  });

  for (let i = 0; i < scores_data.length; ++i) {
    // filter based on class threshold
    const score = scores_data[i] * 100; //.toFixed(1);

    const aspectRatio =
      (boxes_data[i * 4 + 2] - boxes_data[i * 4]) /
      (boxes_data[i * 4 + 3] - boxes_data[i * 4 + 1]);

    // if (score < 80) {
    //   continue;
    // }

    // todo
    if (aspectRatio > 1.3 || aspectRatio < 0.7) {
      continue;
    }

    let [y1, x1, y2, x2] = boxes_data.slice(i * 4, (i + 1) * 4);

    x1 = (x1 / 640) * canvas.width * ratios[0];
    x2 = (x2 / 640) * canvas.width * ratios[0];
    y1 = (y1 / 640) * canvas.height * ratios[1];
    y2 = (y2 / 640) * canvas.height * ratios[1];

    const width = x2 - x1;
    const height = y2 - y1;

    // ! ===================
    // todo make rect pool; 50 rects should be more than enough

    const cX1 = left + x1 / ratio;
    const cY1 = top + y1 / ratio;

    const cWidth = width / ratio;
    const cHeight = height / ratio;

    const detectionCanvas = new DetectionCanvas({
      aspectRatio,
      width,
      height,
      score,
      x1,
      y1,
    });

    detectionCanvasList.push(detectionCanvas);

    const group = createResizableSVGGroup({
      x1: cX1,
      y1: cY1,
      width: cWidth,
      height: cHeight,
      detectionCanvas,
    });

    detectionsOutlineSVG.append(group);
  }

  setTimeout(() => {
    detectionCanvasList.forEach((detectionCanvas) => {
      const [regularFen, reversedFen] = NN.classification.classifyCanvas(
        detectionCanvas.canvas
      );
      createSidebarCard(
        detectionCanvas,
        regularFen,
        reversedFen
      ).appendCardToSidebar();
    });
  }, 25);

  Sidebar.expand();

  return detectionCanvasList;
}

const addNewRectBtn: HTMLButtonElement =
  document.querySelector(".add-rect__btn")!;

addNewRectBtn.addEventListener("click", () => {
  const detectionCanvas = new DetectionCanvas({
    aspectRatio: 1,
    score: 0,
    width: 200,
    height: 200,
    x1: MainCanvas.boundingRect.left,
    y1: MainCanvas.boundingRect.top,
  });

  const group = createResizableSVGGroup({
    x1: MainCanvas.boundingRect.left,
    y1: MainCanvas.boundingRect.top,
    width: 200,
    height: 200,
    detectionCanvas,
  });

  allGroups.length = 0;
  const g = detectionsOutlineSVG.querySelectorAll("g");
  allGroups.push(...g);

  detectionsOutlineSVG.append(group);
  detectionCanvasList.push(detectionCanvas);

  createSidebarCard(
    detectionCanvas,
    "8/8/8/8/8/8/8/8",
    "8/8/8/8/8/8/8/8"
  ).appendCardToSidebar();
});

window.addEventListener("pointerdown", (e) => {
  if (!e.target) {
    return;
  }
  const target = e.target as SVGCircleElement;
  const dataIndex = target.getAttribute("data-index")!;
  const dataId = target.getAttribute("data-id");

  const rectClicked = dataId && !dataIndex;
  const circleClicked = !!dataIndex;

  if (rectClicked) {
    OutlineState.currentDetectionCanvas =
      detectionCanvasList.find((el) => {
        return el.id === parseInt(dataId);
      }) || null;

    OutlineState.sidebarCanvas = document.querySelector(`#dt-canvas-${dataId}`);
    OutlineState.groupToResize = document.querySelector(`#dt-group-${dataId}`);
    OutlineState.rectToResize =
      OutlineState.groupToResize?.querySelector("rect") || null;

    if (OutlineState.groupToResize) {
      OutlineState.groupToResize.classList.add("group-active");

      detectionsOutlineContainer.querySelectorAll("g").forEach((g) => {
        if (g !== (OutlineState.groupToResize as SVGGElement | null)) {
          g.classList.add("pointer-none");
        }
      });
    }
    if (OutlineState.rectToResize) {
      OutlineState.rectToResize.classList.add("group-active");
    }

    return;
  }

  if (!circleClicked) {
    return;
  }
  OutlineState.circleIndex = parseInt(dataIndex);
  OutlineState.circleTarget = target;

  OutlineState.groupToResize = OutlineState.circleTarget.parentElement!;
  OutlineState.rectToResize =
    OutlineState.groupToResize!.querySelector("rect")!;

  OutlineState.groupToResize.classList.add("group-active");
  OutlineState.rectToResize.classList.add("rect-active");

  const id = parseInt(OutlineState.groupToResize.getAttribute("data-id")!);
  OutlineState.sidebarCanvas = document.querySelector(`#dt-canvas-${id}`);

  OutlineState.currentDetectionCanvas =
    detectionCanvasList.find((el) => {
      return el.id === id;
    }) || null;

  detectionsOutlineContainer.querySelectorAll("rect").forEach((rect) => {
    rect.classList.add("pointer-none");
  });
});

window.addEventListener("pointerup", () => OutlineState.reset());
window.addEventListener("pointerleave", () => OutlineState.reset());
window.addEventListener("pointerenter", () => OutlineState.reset());

window.addEventListener("pointermove", (e) => {
  if (e.buttons !== 1) {
    return;
  }

  // !=============
  // ! todo rewrite with tracking current pointer position
  // ! instead of adding movement(x/y) components

  if (
    !OutlineState.circleTarget ||
    !OutlineState.rectToResize ||
    !OutlineState.groupToResize ||
    !OutlineState.sidebarCanvas ||
    !OutlineState.currentDetectionCanvas
  ) {
    return;
  }

  let rectWidth = parseFloat(OutlineState.rectToResize.getAttribute("width")!);
  let rectHeight = parseFloat(
    OutlineState.rectToResize.getAttribute("height")!
  );

  let rectX = parseFloat(
    OutlineState.groupToResize.style.getPropertyValue("--x").slice(0, -2)
  );
  let rectY = parseFloat(
    OutlineState.groupToResize.style.getPropertyValue("--y").slice(0, -2)
  );

  /**
   * adjusted index values
   * 0 1 2
   * 3 * 5
   * 6 7 8
   */

  rectX += e.movementX * (OutlineState.circleIndex % 3 === 0 ? 1 : 0);
  rectY += e.movementY * (OutlineState.circleIndex <= 2 ? 1 : 0);

  //   2 5 8 ->  width += movementX
  //   0 3 6 ->  width -= movementX
  const leftMultiplier = OutlineState.circleIndex % 3 === 0 ? -1 : 0;
  const rightMultiplier = (OutlineState.circleIndex + 1) % 3 === 0 ? 1 : 0;
  rectWidth += e.movementX * (leftMultiplier || rightMultiplier);

  if (rectWidth > 10) {
    OutlineState.groupToResize.style.setProperty("--x", `${rectX}px`);
    OutlineState.rectToResize.setAttribute("width", `${rectWidth}`);
  }

  //   0 1 2 -> height -= movementY
  //   6 7 8 -> height += movementY
  const topMultiplier = OutlineState.circleIndex <= 2 ? -1 : 0;
  const bottomMultiplier = OutlineState.circleIndex >= 6 ? 1 : 0;
  rectHeight += e.movementY * (topMultiplier || bottomMultiplier);

  if (rectHeight > 10) {
    OutlineState.groupToResize.style.setProperty("--y", `${rectY}px`);
    OutlineState.rectToResize.setAttribute("height", `${rectHeight}`);
  }

  recomputeCirclePosition(OutlineState.groupToResize, rectWidth, rectHeight);

  drawOutlinedArea({
    x: rectX,
    y: rectY,
    detectionCanvas: OutlineState.currentDetectionCanvas,
    styleWidth: rectWidth,
    styleHeight: rectHeight,
  });
});
