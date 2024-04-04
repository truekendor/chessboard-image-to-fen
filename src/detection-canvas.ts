import { MainCanvas } from "./main";

type DetectionCanvasConstructor = {
  score: number;
  aspectRatio: number;
  width: number;
  height: number;
  x1: number;
  y1: number;
};

const getIncId = (function () {
  let id = 1;
  return () => id++;
})();

export class DetectionCanvas {
  canvas: HTMLCanvasElement = document.createElement("canvas");
  ctx: CanvasRenderingContext2D = this.canvas.getContext("2d", {
    willReadFrequently: true,
  })!;

  id = getIncId();

  score = 0;
  aspectRatio = 0;

  x1 = 0;
  y1 = 0;

  constructor({
    score,
    aspectRatio,
    width,
    height,
    x1,
    y1,
  }: DetectionCanvasConstructor) {
    this.score = score;
    this.aspectRatio = aspectRatio;

    this.x1 = x1;
    this.y1 = y1;

    this.canvas.id = `dt-canvas-${this.id}`;
    this.canvas.setAttribute("data-id", `${this.id}`);

    this.canvas.width = width;
    this.canvas.height = height;

    this.toGrayScale();
  }

  toGrayScale() {
    this.ctx.filter = "grayscale(1)";

    const mainCanvasData = MainCanvas.ctx.getImageData(
      this.x1,
      this.y1,
      this.canvas.width,
      this.canvas.height
    );

    this.ctx.putImageData(mainCanvasData, 0, 0);
    this.ctx.drawImage(this.canvas, 0, 0);

    return this;
  }

  get width() {
    return this.canvas.width;
  }

  get height() {
    return this.canvas.height;
  }

  set width(val: number) {
    this.canvas.width = val;
  }

  set height(val: number) {
    this.canvas.height = val;
  }
}
