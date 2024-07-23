import { DetectionCanvas } from "./detection-canvas";
import { MainCanvas } from "../main";
import { OutlineState } from "../outlineState";
import { Sidebar } from "./sidebar";

export function createResizableSVGGroup({
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

  // todo add "click" / "pointer(up/down)" listeners;
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

    if (OutlineState.sidebarCanvas) {
      const rectWidth = parseFloat(rect.getAttribute("width")!);
      const rectHeight = parseFloat(rect.getAttribute("height")!);

      drawOutlinedArea({
        x: pubX,
        y: pubY,
        detectionCanvas: detectionCanvas,
        styleWidth: rectWidth,
        styleHeight: rectHeight,
      });

      return;
    }
  });

  return group;
}

// todo move to css calc() with css custom props
export function recomputeCirclePosition(
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

export function drawOutlinedArea({
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
  detectionCanvas.height = height;

  detectionCanvas.x1 = x1;
  detectionCanvas.y1 = y1;

  const btn = Sidebar._sidebar.querySelector(
    `.data-predict-id-${detectionCanvas.id}`
  )!;
  btn.textContent = "preview (old)";

  try {
    const data = mainContext.getImageData(x1, y1, width, height);

    detectionCanvas.ctx.putImageData(data, 0, 0);
  } catch {
    return;
  }
}
