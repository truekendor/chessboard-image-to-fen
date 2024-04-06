export const detectionSidebar: HTMLDivElement =
  document.querySelector(".detection-sidebar")!;

export function expandSidebar() {
  detectionSidebar.classList.remove("shrink");
}

const sidebarExpandBtn: HTMLButtonElement = document.querySelector(
  "button.sidebar-expand-btn"
)!;

sidebarExpandBtn.addEventListener("click", () => {
  detectionSidebar.classList.toggle("shrink");
});
