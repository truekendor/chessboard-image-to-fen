import { NN } from "./nnHelper";

const rectsContainer: HTMLDivElement = document.querySelector(
  ".outline-svg_container"
)!;
const rectsSVG = rectsContainer.querySelector("svg")!;

const mainCanvas: HTMLCanvasElement = document.querySelector(".main-canvas")!;

const mainContext = mainCanvas.getContext("2d", {
  willReadFrequently: true,
})!;

function incrementalId() {
  let id = 1;

  return () => id++;
}

const getIncId = incrementalId();

type DetectionResultType = {
  score: number;
  aspectRatio: number;
  width: number;
  height: number;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  mainContext: CanvasRenderingContext2D;
};

class DetectionResult implements DetectionResultType {
  canvas: HTMLCanvasElement = document.createElement("canvas");
  ctx: CanvasRenderingContext2D = this.canvas.getContext("2d", {
    willReadFrequently: true,
  })!;

  id = getIncId();

  score = 0;
  aspectRatio = 0;
  width = 0;
  height = 0;

  x1 = 0;
  x2 = 0;
  y1 = 0;
  y2 = 0;

  mainContext: CanvasRenderingContext2D;

  constructor({
    score,
    aspectRatio,
    width,
    height,
    x1,
    x2,
    y1,
    y2,
    mainContext,
  }: DetectionResultType) {
    this.score = score;
    this.aspectRatio = aspectRatio;
    this.width = width;
    this.height = height;
    //
    this.x1 = x1;
    this.x2 = x2;
    this.y1 = y1;
    this.y2 = y2;

    this.mainContext = mainContext;

    this.canvas.id = `dt-canvas-${this.id}`;
    this.canvas.setAttribute("data-id", `${this.id}`);

    this.draw();
  }

  private draw() {
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.ctx.filter = "grayscale(1)";

    const mainCanvasData = mainContext.getImageData(
      this.x1,
      this.y1,
      this.width,
      this.height
    );

    this.ctx.putImageData(mainCanvasData, 0, 0);
    this.ctx.drawImage(this.canvas, 0, 0);
  }
}

function createResizableSVGGroup({
  x1,
  y1,
  width,
  height,
  canvasId,
}: {
  x1: number;
  y1: number;
  width: number;
  height: number;
  canvasId: number;
}) {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");

  group.id = `dt-group-${canvasId}`;
  rect.id = `dt-rect-${canvasId}`;

  group.setAttribute("data-id", `${canvasId}`);
  rect.setAttribute("data-id", `${canvasId}`);

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
        canvas: sidebarCanvas,
        styleHeight: height,
        styleWidth: width,
      });
    }
  });

  return group;
}

export function renderSVGBoxes(
  canvas: HTMLCanvasElement,
  boxes_data: Float32Array,
  scores_data: Float32Array,
  ratios: [number, number]
): DetectionResult[] {
  const resultsList: DetectionResult[] = [];

  const prevGroups = rectsSVG.querySelectorAll("g");

  prevGroups.forEach((rect) => {
    rectsSVG.removeChild(rect);
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

    const {
      left,
      top,
      width: canvasStyleWidth,
      // height: browserHeight,
    } = canvas.getBoundingClientRect();

    x1 = (x1 / 640) * canvas.width * ratios[0];
    x2 = (x2 / 640) * canvas.width * ratios[0];
    y1 = (y1 / 640) * canvas.height * ratios[1];
    y2 = (y2 / 640) * canvas.height * ratios[1];

    const width = x2 - x1;
    const height = y2 - y1;

    // ! ===================
    // todo make rect pool; 50 rects should be more than enough

    // todo rename vars
    const ratio = canvas.width / canvasStyleWidth;
    const cX1 = left + x1 / ratio;
    // const cX2 = left + x2 / ratio;

    const cY1 = top + y1 / ratio;
    // const cY2 = top + y2 / ratio;

    const cWidth = width / ratio;
    const cHeight = height / ratio;

    const detection = new DetectionResult({
      aspectRatio,
      width,
      height,
      score,
      x1,
      x2,
      y1,
      y2,
      mainContext: mainContext,
    });

    resultsList.push(detection);

    const group = createResizableSVGGroup({
      x1: cX1,
      y1: cY1,
      width: cWidth,
      height: cHeight,
      canvasId: detection.id,
    });

    rectsSVG.append(group);
  }

  resultsList.forEach((res) => {
    NN.classification.__dev_classifyRes(res);
  });

  return resultsList;
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
  canvas,
}: {
  x: number;
  y: number;
  styleWidth: number;
  styleHeight: number;
  canvas: HTMLCanvasElement;
}) {
  // todo pass browserWidth, left, top and context as params
  // todo or move to class
  const {
    width: canvasStyleWidth,
    left,
    top,
  } = mainCanvas.getBoundingClientRect();

  const ratio = mainCanvas.width / canvasStyleWidth;

  const width = styleWidth * ratio;
  const height = styleHeight * ratio;

  if (width <= 0 || height <= 0) {
    return;
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  try {
    const data = mainContext.getImageData(
      (x - left) * ratio,
      (y - top) * ratio,
      width,
      height
    );

    ctx.putImageData(data, 0, 0);
  } catch {
    return;
  }
}

let circleIndex = 0;

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

  if (dataId && !dataIndex) {
    sidebarCanvas = document.querySelector(`#dt-canvas-${dataId}`)!;
    groupToResize = document.querySelector(`#dt-group-${dataId}`)!;

    rectToResize = groupToResize.querySelector("rect")!;
    return;
  }

  if (!dataIndex) {
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

  rectsContainer.querySelectorAll("rect").forEach((rect) => {
    rect.classList.add("pointer-none");
  });
});

window.addEventListener("pointerup", resetOutlineState);
window.addEventListener("pointerleave", resetOutlineState);
window.addEventListener("pointerenter", resetOutlineState);

function resetOutlineState() {
  if (groupToResize) {
    groupToResize.classList.remove("group-active");
  }
  if (rectToResize) {
    rectsContainer.querySelectorAll("rect").forEach((rect) => {
      rect.classList.remove("pointer-none");
      rect.classList.remove("rect-active");
    });
  }
  circleIndex = 0;

  groupToResize = null;
  rectToResize = null;
  circleTarget = null;
  sidebarCanvas = null;
}

window.addEventListener("pointermove", (e) => {
  if (e.buttons !== 1) {
    return;
  }

  // !=============
  // ! todo rewrite with tracking current pointer position
  // ! instead of adding movement(x/y) components

  if (!circleTarget || !rectToResize || !groupToResize || !sidebarCanvas) {
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
    canvas: sidebarCanvas,
    styleWidth: rectWidth,
    styleHeight: rectHeight,
  });
});
