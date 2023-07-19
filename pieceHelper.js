import { isNumber } from "./utils.js";

const img = new Image();

// Q K R N B P
img.src = "pieces.png";

await img.decode();

class PieceHelper {
  #canvas = document.createElement("canvas");
  #c = this.#canvas.getContext("2d", {
    willReadFrequently: true,
  });

  constructor(img) {
    this.#canvas.width = img.width;
    this.#canvas.height = img.height;
    // @ts-ignore
    this.#c.drawImage(img, 0, 0);
  }

  #cropArea({ row, column }) {
    const w = img.height / 2;

    const data = this.#c.getImageData(column * w, row * w, w, w);

    const tCanvas = document.createElement("canvas");
    const tC = tCanvas.getContext("2d");
    tCanvas.width = w;
    tCanvas.height = w;

    tC.putImageData(data, 0, 0);

    return tCanvas;
  }

  get q() {
    return this.#cropArea({ row: 0, column: 0 });
  }
  get k() {
    return this.#cropArea({ row: 0, column: 1 });
  }
  get r() {
    return this.#cropArea({ row: 0, column: 2 });
  }
  get n() {
    return this.#cropArea({ row: 0, column: 3 });
  }
  get b() {
    return this.#cropArea({ row: 0, column: 4 });
  }
  get p() {
    return this.#cropArea({ row: 0, column: 5 });
  }
  get Q() {
    return this.#cropArea({ row: 1, column: 0 });
  }
  get K() {
    return this.#cropArea({ row: 1, column: 1 });
  }
  get R() {
    return this.#cropArea({ row: 1, column: 2 });
  }
  get N() {
    return this.#cropArea({ row: 1, column: 3 });
  }
  get B() {
    return this.#cropArea({ row: 1, column: 4 });
  }
  get P() {
    return this.#cropArea({ row: 1, column: 5 });
  }
}

export const pieceHelper = new PieceHelper(img);

export class ChessBoardCanvas {
  #canvas;
  #c;
  #tileWidth;

  // lichess tile colors
  #styles = {
    light: "rgb(247, 217, 181)",
    dark: "rgb(181,136,99)",
    lightPale: "hsl(33, 60%, 84%)",
    darkPale: "hsl(27, 26%, 55%)",
    // light: "purple",
    // dark: "red",
  };

  constructor(width) {
    this.#canvas = document.createElement("canvas");
    this.#c = this.#canvas.getContext("2d", {
      willReadFrequently: true,
    });
    this.#tileWidth = width / 8;

    this.#canvas.width = width;
    this.#canvas.height = width;

    this.drawPattern();
  }

  drawPattern(light = this.#styles.light, dark = this.#styles.dark) {
    this.#c.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        this.#c.fillStyle = (i + j) % 2 === 0 ? dark : light;

        this.#c.beginPath();
        this.#c.rect(
          j * this.#tileWidth,
          i * this.#tileWidth,
          this.#tileWidth,
          this.#tileWidth
        );
        this.#c.fill();
        this.#c.closePath();
      }
    }
  }

  // TODO delete with init pr
  get patternCanvas() {
    this.drawPattern();

    return this.#canvas;
  }

  // TODO delete with init pr
  get patternData() {
    this.drawPattern();

    return this.#c.getImageData(0, 0, this.#canvas.width, this.#canvas.width);
  }

  get imageData() {
    return this.#c.getImageData(0, 0, this.#canvas.width, this.#canvas.width);
  }

  get canvas() {
    return this.#canvas;
  }

  drawChessboardFromFen(fen) {
    if (fen.length !== 64) {
      throw new Error("Invalid FEN length");
    }
    // this.#c.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
    for (let i = 0; i < 64; i++) {
      const piece = fen[i];

      // if number
      if (isNumber(piece)) continue;

      const row = i % 8;
      const column = Math.floor(i / 8);

      this.#c.beginPath();
      this.#c.drawImage(
        pieceHelper[piece],
        row * this.#tileWidth,
        column * this.#tileWidth,
        this.#tileWidth,
        this.#tileWidth
      );
    }

    return this.#canvas;
  }

  clearCanvas() {
    this.#c.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
  }
}
