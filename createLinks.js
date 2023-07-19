export function createLichessLink(fen, reversedFen) {
  const linkLichess = document.createElement("a");
  const linkLichessReversed = document.createElement("a");

  linkLichess.addEventListener("dragstart", (e) => {
    e.preventDefault();
  });

  linkLichess.href = `https://lichess.org/editor/${fen}`;
  linkLichess.textContent = `Lichess white perspective: ${fen}`;
  linkLichess.target = "_blank";

  linkLichessReversed.href = `https://lichess.org/editor/${reversedFen}`;
  linkLichessReversed.textContent = `Lichess black perspective: ${reversedFen}`;
  linkLichessReversed.target = "_blank";

  return [linkLichess, linkLichessReversed];
}
