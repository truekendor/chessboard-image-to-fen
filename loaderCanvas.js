const canvas = document.createElement("canvas");
const c = canvas.getContext("2d");

canvas.classList.add("canvas-loader");

canvas.width = 80;
canvas.height = 80;

let animationId;

const diff = 0.8;
let angle1 = 0;
let angle2 = 2;
let angle1Diff = 0.05;
let angle2Diff = 0.15;

c.strokeStyle = "white";
c.lineWidth = 8;

const modalBackdrop = document.createElement("div");
modalBackdrop.classList.add("loader-backdrop");

function animate() {
  animationId = requestAnimationFrame(animate);

  c.clearRect(0, 0, canvas.width, canvas.height);

  c.beginPath();
  c.arc(
    canvas.width / 2,
    canvas.width / 2,
    canvas.width / 2 - 10,
    angle1,
    angle2
  );

  angle1 += angle1Diff;
  angle2 += angle2Diff;

  if (Math.abs(angle1 - angle2) > Math.PI * 2 - diff) {
    let temp = angle1Diff;
    angle1Diff = angle2Diff;
    angle2Diff = temp;
  } else if (Math.abs(angle1 - angle2) < diff) {
    let temp = angle1Diff;
    angle1Diff = angle2Diff;
    angle2Diff = temp;
  }

  c.stroke();
  c.closePath();
}

export function appendLoader() {
  const text = document.createElement("h3");
  text.textContent = "Loading Mobilenet v3...";

  modalBackdrop.append(text);
  modalBackdrop.append(canvas);
  document.body.append(modalBackdrop);
  animate();
}

export function removeLoader() {
  cancelAnimationFrame(animationId);
  document.body.removeChild(modalBackdrop);
}
