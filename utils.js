/**
 * @param {array}
 * Array with piece types as values
 * ['q', '5', 'N', ...]
 * @returns [string, string]
 */
export function parseFenFromArray(fenArray) {
  let fen = [];

  for (let i = 0; i < 8; i++) {
    const rowArray = [];

    for (let j = 0; j < 8; j++) {
      const cur = fenArray[i * 8 + j];

      // can be 's' as default for network output
      // (i choose that at random at data gen stage)
      // and a number (usual fen string)
      if (!(cur === "s" || cur === " " || isNumber(cur))) {
        rowArray.push(cur);
        continue;
      }

      if (rowArray.length === 0) {
        rowArray.push(1);
        continue;
      }

      if (isNumber(rowArray.at(-1))) {
        rowArray[rowArray.length - 1] = parseInt(rowArray.at(-1)) + 1;
      } else {
        rowArray.push(1);
      }
    }

    fen.push(rowArray.join(""));
  }

  const reversedFen = [...fen]
    .reverse()
    .map((row) => row.split("").reverse().join(""))
    .join("/");

  fen = fen.join("/");

  return [fen, reversedFen];
}

export function isNumber(value) {
  return typeof parseInt(value) === "number" && !isNaN(parseInt(value));
}

/**
 * @param {string}
 * parses FEN string to be exactly 71 chars long
 * by parsing each number to be series of '1'
 * and joining it with '/'
 *
 * '3R3p' -> '111R111p'
 *
 * @returns {string.split('')}
 */
export function normalizeFenString(fen) {
  let nFen = fen.split("").filter((el) => el !== "/");
  let answer = [];
  let fenLengthWithoutSlash = 0;

  for (let i = 0; i < nFen.length; i++) {
    const cur = nFen[i];

    if (!isNaN(parseInt(cur))) {
      const num = parseInt(cur);
      for (let j = 0; j < num; j++) {
        if (fenLengthWithoutSlash % 8 === 0 && fenLengthWithoutSlash !== 0) {
          answer.push("/");
        }
        answer.push("1");
        fenLengthWithoutSlash++;
      }
    } else {
      if (fenLengthWithoutSlash % 8 === 0 && fenLengthWithoutSlash !== 0) {
        answer.push("/");
      }
      answer.push(cur);
      fenLengthWithoutSlash++;
    }
  }

  return answer;
}

export async function drawFileOnCanvas(file, canvas) {
  const img = new Image();
  const fileReader = new FileReader();
  const c = canvas.getContext("2d");

  fileReader.readAsDataURL(file);

  return new Promise((res, rej) => {
    fileReader.onload = () => {
      img.src = fileReader.result;

      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        c.filter = "grayscale(1)";
        c.drawImage(img, 0, 0);

        res();
      };

      img.onerror = (err) => rej(err);
    };
  });
}
