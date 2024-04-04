import { NN, appendCardToSidebar } from "./nnHelper";
import { MainCanvas } from "./main";
import { DetectionCanvas } from "./detection-canvas";

const detectionsOutlineContainer: HTMLDivElement = document.querySelector(
  ".outline-svg_container"
)!;
const detectionsOutlineSVG = detectionsOutlineContainer.querySelector("svg")!;

const detectionCanvasList: DetectionCanvas[] = [];

function createResizableSVGGroup({
  x1,
  y1,
  width,
  height,
  detectionCanvas,
}: {
  x1: number;
  y1: number;
  width: number;
  height: number;
  detectionCanvas: DetectionCanvas;
}) {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");

  group.id = `dt-group-${detectionCanvas.id}`;
  rect.id = `dt-rect-${detectionCanvas.id}`;

  group.setAttribute("data-id", `${detectionCanvas.id}`);
  rect.setAttribute("data-id", `${detectionCanvas.id}`);

  group.append(rect);

  // create SVG circle
  for (let i = 0; i < 8; i++) {
    // we're skipping the central circle so the index to be adjusted
    const adjustedIndex = i + (i >= 4 ? 1 : 0);

    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );

    circle.setAttribute("data-index", `${adjustedIndex}`);

    // todo move this logic to css
    const cx = (adjustedIndex % 3) * 0.5 * width;
    const cy = Math.floor(adjustedIndex / 3) * 0.5 * height;

    circle.setAttribute("cx", `${cx}`);
    circle.setAttribute("cy", `${cy}`);

    group.append(circle);
  }

  group.classList.add("detection_group");

  rect.setAttribute("width", `${width}`);
  rect.setAttribute("height", `${height}`);

  group.style.setProperty("--x", `${x1}px`);
  group.style.setProperty("--y", `${y1}px`);

  // todo move outside
  rect.addEventListener("pointermove", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.buttons !== 1) {
      return;
    }

    const x = parseFloat(group.style.getPropertyValue("--x").slice(0, -2));
    const y = parseFloat(group.style.getPropertyValue("--y").slice(0, -2));

    const pubX = x + e.movementX;
    const pubY = y + e.movementY;

    group.style.setProperty("--x", `${pubX}px`);
    group.style.setProperty("--y", `${pubY}px`);

    if (sidebarCanvas) {
      drawOutlinedArea({
        x: pubX,
        y: pubY,
        detectionCanvas: detectionCanvas,
        styleWidth: detectionCanvas.width,
        styleHeight: detectionCanvas.height,
      });

      return;
    }
  });

  return group;
}

export function renderSVGBoxes(
  boxes_data: Float32Array,
  scores_data: Float32Array,
  ratios: [number, number]
): DetectionCanvas[] {
  const canvas = MainCanvas.canvas;
  const { left, top } = MainCanvas.boundingRect;
  const ratio = MainCanvas.ratio;

  const prevGroups = detectionsOutlineSVG.querySelectorAll("g");

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

  // todo delete?

  setTimeout(() => {
    detectionCanvasList.forEach((detectionResult) => {
      const [regularFen, reversedFen] = NN.classification.classifyCanvas(
        detectionResult.canvas
      );
      appendCardToSidebar(detectionResult, regularFen, reversedFen);
    });
  }, 25);

  return detectionCanvasList;
}

// todo move to css calc() with css custom props
function recomputeCirclePosition(
  group: SVGGElement | HTMLElement,
  width: number,
  height: number
) {
  const circles = group.querySelectorAll("circle");

  circles.forEach((circle, index) => {
    const i = index + (index >= 4 ? 1 : 0);
    const cx = (i % 3) * 0.5 * width;
    const cy = Math.floor(i / 3) * 0.5 * height;

    circle.setAttribute("cx", `${cx}`);
    circle.setAttribute("cy", `${cy}`);
  });
}

function drawOutlinedArea({
  x,
  y,
  styleHeight,
  styleWidth,
  detectionCanvas,
}: {
  x: number;
  y: number;
  styleWidth: number;
  styleHeight: number;
  detectionCanvas: DetectionCanvas;
}) {
  const ratio = MainCanvas.ratio;
  const mainContext = MainCanvas.ctx;
  const { left, top } = MainCanvas.boundingRect;

  const width = styleWidth * ratio;
  const height = styleHeight * ratio;

  if (width <= 0 || height <= 0) {
    return;
  }

  const x1 = (x - left) * ratio;
  const y1 = (y - top) * ratio;

  detectionCanvas.width = width;
  detectionCanvas.height = width;

  detectionCanvas.x1 = x1;
  detectionCanvas.y1 = y1;

  try {
    const data = mainContext.getImageData(x1, y1, width, height);

    detectionCanvas.ctx.putImageData(data, 0, 0);
  } catch {
    return;
  }
}

let circleIndex = 0;

let currentDetectionCanvas: DetectionCanvas | null = null;
let groupToResize: HTMLElement | null = null;
let rectToResize: SVGRectElement | null = null;
let circleTarget: SVGCircleElement | null = null;
let sidebarCanvas: HTMLCanvasElement | null = null;

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
    currentDetectionCanvas =
      detectionCanvasList.find((el) => {
        return el.id === parseInt(dataId);
      }) || null;

    sidebarCanvas = document.querySelector(`#dt-canvas-${dataId}`);
    groupToResize = document.querySelector(`#dt-group-${dataId}`);

    rectToResize = groupToResize?.querySelector("rect") || null;
    return;
  }

  if (!circleClicked) {
    return;
  }
  circleIndex = parseInt(dataIndex);
  circleTarget = target;

  groupToResize = circleTarget.parentElement!;
  rectToResize = groupToResize!.querySelector("rect")!;

  groupToResize.classList.add("group-active");
  rectToResize.classList.add("rect-active");

  const id = parseInt(groupToResize.getAttribute("data-id")!);
  sidebarCanvas = document.querySelector(`#dt-canvas-${id}`);

  currentDetectionCanvas =
    detectionCanvasList.find((el) => {
      return el.id === id;
    }) || null;

  detectionsOutlineContainer.querySelectorAll("rect").forEach((rect) => {
    rect.classList.add("pointer-none");
  });
});

window.addEventListener("pointerup", resetCurrentOutlineState);
window.addEventListener("pointerleave", resetCurrentOutlineState);
window.addEventListener("pointerenter", resetCurrentOutlineState);

function resetCurrentOutlineState() {
  if (groupToResize) {
    groupToResize.classList.remove("group-active");
  }
  if (rectToResize) {
    detectionsOutlineContainer.querySelectorAll("rect").forEach((rect) => {
      rect.classList.remove("pointer-none");
      rect.classList.remove("rect-active");
    });
  }
  circleIndex = 0;

  groupToResize = null;
  rectToResize = null;
  circleTarget = null;
  sidebarCanvas = null;
  currentDetectionCanvas = null;
}

window.addEventListener("pointermove", (e) => {
  if (e.buttons !== 1) {
    return;
  }

  // !=============
  // ! todo rewrite with tracking current pointer position
  // ! instead of adding movement(x/y) components

  if (
    !circleTarget ||
    !rectToResize ||
    !groupToResize ||
    !sidebarCanvas ||
    !currentDetectionCanvas
  ) {
    return;
  }

  let rectWidth = parseFloat(rectToResize.getAttribute("width")!);
  let rectHeight = parseFloat(rectToResize.getAttribute("height")!);

  let rectX = parseFloat(
    groupToResize.style.getPropertyValue("--x").slice(0, -2)
  );
  let rectY = parseFloat(
    groupToResize.style.getPropertyValue("--y").slice(0, -2)
  );

  /**
   * adjusted index values
   * 0 1 2
   * 3 * 5
   * 6 7 8
   */

  rectX += e.movementX * (circleIndex % 3 === 0 ? 1 : 0);
  rectY += e.movementY * (circleIndex <= 2 ? 1 : 0);

  //   2 5 8 ->  width += movementX
  //   0 3 6 ->  width -= movementX
  const leftMultiplier = circleIndex % 3 === 0 ? -1 : 0;
  const rightMultiplier = (circleIndex + 1) % 3 === 0 ? 1 : 0;
  rectWidth += e.movementX * (leftMultiplier || rightMultiplier);

  if (rectWidth > 10) {
    groupToResize.style.setProperty("--x", `${rectX}px`);
    rectToResize.setAttribute("width", `${rectWidth}`);
  }

  //   0 1 2 -> height -= movementY
  //   6 7 8 -> height += movementY
  const topMultiplier = circleIndex <= 2 ? -1 : 0;
  const bottomMultiplier = circleIndex >= 6 ? 1 : 0;
  rectHeight += e.movementY * (topMultiplier || bottomMultiplier);

  if (rectHeight > 10) {
    groupToResize.style.setProperty("--y", `${rectY}px`);
    rectToResize.setAttribute("height", `${rectHeight}`);
  }

  recomputeCirclePosition(groupToResize, rectWidth, rectHeight);

  drawOutlinedArea({
    x: rectX,
    y: rectY,
    detectionCanvas: currentDetectionCanvas,
    styleWidth: rectWidth,
    styleHeight: rectHeight,
  });
});
