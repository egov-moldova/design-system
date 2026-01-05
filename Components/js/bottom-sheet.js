document.addEventListener("DOMContentLoaded", () => {
  const openers = document.querySelectorAll("[data-bottom-sheet-open]");
  const closers = document.querySelectorAll("[data-bottom-sheet-close]");

  function openSheet(id) {
    const sheet = document.getElementById(id);
    if (!sheet) return;

    sheet.setAttribute("aria-hidden", "false");

    const panel = sheet.querySelector(".bottom-sheet__panel");
    panel.focus();

    document.body.style.overflow = "hidden";
  }

  function closeSheet(sheet) {
    sheet.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  openers.forEach(btn => {
    btn.addEventListener("click", () => {
      openSheet(btn.dataset.bottomSheetOpen);
    });
  });

  closers.forEach(btn => {
    btn.addEventListener("click", () => {
      const sheet = btn.closest(".bottom-sheet");
      closeSheet(sheet);
    });
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      document.querySelectorAll(".bottom-sheet[aria-hidden='false']")
        .forEach(closeSheet);
    }
  });
});
