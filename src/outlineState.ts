import { DetectionCanvas } from "./components/detection-canvas";
import { detectionsOutlineContainer } from "./renderBoxes";

export class OutlineState {
  static circleIndex = 0;

  static currentDetectionCanvas: DetectionCanvas | null = null;
  static groupToResize: HTMLElement | null = null;
  static rectToResize: SVGRectElement | null = null;
  static circleTarget: SVGCircleElement | null = null;
  static sidebarCanvas: HTMLCanvasElement | null = null;

  static reset() {
    if (this.groupToResize) {
      this.groupToResize.classList.remove("group-active");
    }
    if (this.rectToResize) {
      detectionsOutlineContainer.querySelectorAll("rect").forEach((rect) => {
        rect.classList.remove("pointer-none");
        rect.classList.remove("rect-active");
      });

      detectionsOutlineContainer.querySelectorAll("g").forEach((g) => {
        g.classList.remove("pointer-none");
      });
    }
    this.circleIndex = 0;

    this.groupToResize = null;
    this.rectToResize = null;
    this.circleTarget = null;
    this.sidebarCanvas = null;
    this.currentDetectionCanvas = null;
  }
}
