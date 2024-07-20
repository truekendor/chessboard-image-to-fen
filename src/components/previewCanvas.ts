import { isNumber } from "../utils";

const img = new Image();

// todo change order
// K Q B N R P
img.src = "pieces.png";

class PieceHelper {
  #canvas = document.createElement("canvas");
  #c = this.#canvas.getContext("2d", {
    willReadFrequently: true,
  })!;

  constructor(img: HTMLImageElement | HTMLCanvasElement) {
    this.#canvas.width = img.width;
    this.#canvas.height = img.height;

    this.#c.drawImage(img, 0, 0);
  }

  #cropArea({ row, column }: { row: number; column: number }) {
    const w = img.height / 2;

    const data = this.#c.getImageData(column * w, row * w, w, w);

    const tileCanvas = document.createElement("canvas");
    const tileCtx = tileCanvas.getContext("2d")!;
    tileCanvas.width = w;
    tileCanvas.height = w;

    tileCtx.putImageData(data, 0, 0);

    return tileCanvas;
  }

  get q() {
    return this.#cropArea({ row: 1, column: 1 });
  }
  get k() {
    return this.#cropArea({ row: 1, column: 0 });
  }
  get r() {
    return this.#cropArea({ row: 1, column: 4 });
  }
  get n() {
    return this.#cropArea({ row: 1, column: 3 });
  }
  get b() {
    return this.#cropArea({ row: 1, column: 2 });
  }
  get p() {
    return this.#cropArea({ row: 1, column: 5 });
  }
  get Q() {
    return this.#cropArea({ row: 0, column: 1 });
  }
  get K() {
    return this.#cropArea({ row: 0, column: 0 });
  }
  get R() {
    return this.#cropArea({ row: 0, column: 4 });
  }
  get N() {
    return this.#cropArea({ row: 0, column: 3 });
  }
  get B() {
    return this.#cropArea({ row: 0, column: 2 });
  }
  get P() {
    return this.#cropArea({ row: 0, column: 5 });
  }
}

export let pieceHelper: PieceHelper;

img.decode().then(() => {
  pieceHelper = new PieceHelper(img);
});

export class ChessBoardCanvas {
  #canvas;
  #c;
  #tileWidth;

  constructor(width: number, height = width) {
    this.#canvas = document.createElement("canvas");
    this.#c = this.#canvas.getContext("2d", {
      willReadFrequently: true,
    })!;
    this.#tileWidth = width / 8;

    this.#canvas.width = width;
    this.#canvas.height = height;
  }

  get imageData() {
    return this.#c.getImageData(0, 0, this.#canvas.width, this.#canvas.width);
  }

  drawChessboardFromFen(fen: string[]) {
    if (fen.length !== 64) {
      throw new Error("Invalid FEN length");
    }

    for (let i = 0; i < 64; i++) {
      const piece = fen[i];

      // if number
      if (isNumber(piece)) continue;

      const row = i % 8;
      const column = Math.floor(i / 8);

      this.#c.beginPath();
      this.#c.drawImage(
        // @ts-ignore
        pieceHelper[piece],
        row * this.#tileWidth,
        column * this.#tileWidth,
        this.#tileWidth,
        this.#tileWidth
      );
    }

    return this.#canvas;
  }

  clearBoard() {
    this.#c.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
  }
}
