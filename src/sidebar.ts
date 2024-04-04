export const detectionSidebar: HTMLDivElement =
  document.querySelector(".detection-sidebar")!;

const sidebarExpandBtn: HTMLButtonElement = document.querySelector(
  "button.sidebar-expand-btn"
)!;
sidebarExpandBtn.addEventListener("click", () => {
  console.log("click!");
  detectionSidebar.classList.toggle("shrink");
});