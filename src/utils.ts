/**
 * Parses "normalized" FEN @see normalizeFenString
 * back to regular FEN string
 *
 * @example
 * ["1","1","1","r","Q","1","1","1"] -> "3rQ3"
 */
export function parseFenFromArray(
  fenArray: readonly string[]
): readonly [string, string] {
  const fen = [];

  for (let i = 0; i < 8; i++) {
    const rowArray: Array<string | number> = [];

    for (let j = 0; j < 8; j++) {
      const cur = fenArray[i * 8 + j];

      if (!(cur === "s" || cur === " " || isNumber(cur))) {
        rowArray.push(cur);
        continue;
      }

      if (rowArray.length === 0) {
        rowArray.push(1);
        continue;
      }

      if (isNumber(rowArray[rowArray.length - 1])) {
        rowArray[rowArray.length - 1] =
          parseInt(`${rowArray[rowArray.length - 1]}`) + 1;
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

  return [fen.join("/"), reversedFen] as const;
}

export function isNumber(value: unknown): boolean {
  if (typeof value !== "string" && typeof value !== "number") {
    return false;
  }

  return (
    typeof parseInt(`${value}`) === "number" && !isNaN(parseInt(`${value}`))
  );
}

/**
 * Replaces numbers in FEN string with a series of '1'
 *
 * @example
 * "3rQ3" -> ["1","1","1","r","Q","1","1","1"]  ("111rQ111")
 */
export function normalizeFenString(fen: string): string[] {
  const nFen = fen.split("").filter((el) => el !== "/");
  const answer: string[] = [];
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
