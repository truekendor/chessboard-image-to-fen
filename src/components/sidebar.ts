import { DetectionCanvas } from "./detection-canvas";

export class Sidebar {
  private static sidebar: HTMLDivElement =
    document.querySelector(".detection-sidebar")!;

  private static sidebarExpandBtn: HTMLButtonElement = document.querySelector(
    "button.sidebar-expand-btn"
  )!;

  static expand() {
    this.sidebar.classList.remove("shrink");
  }

  static shrink() {
    this.sidebar.classList.add("shrink");
  }

  static getPredictionCards() {
    const cards = Sidebar.sidebar.querySelectorAll(".detection-card");

    return cards;
  }

  static removeCard(card: Element) {
    this.sidebar.removeChild(card);
  }

  static addCard(card: HTMLDivElement) {
    this.sidebar.append(card);
  }

  static removePredictions(detectionCanvasList: DetectionCanvas[]) {
    detectionCanvasList.length = 0;

    const cards = this.sidebar.querySelectorAll(".detection-card");
    cards.forEach((card) => {
      this.sidebar.removeChild(card);
    });
  }

  // eslint-disable-next-line no-unused-vars
  private static _ = (() => {
    this.sidebarExpandBtn.addEventListener("click", () => {
      this.sidebar.classList.toggle("shrink");
    });
  })();
}
