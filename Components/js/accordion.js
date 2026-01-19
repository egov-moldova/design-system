document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-accordion]").forEach((accordion) => {
    accordion.addEventListener("click", (e) => {
      const trigger = e.target.closest(".accordion__trigger");
      if (!trigger) return;

      const expanded = trigger.getAttribute("aria-expanded") === "true";
      const panelId = trigger.getAttribute("aria-controls");
      const panel = document.getElementById(panelId);

      trigger.setAttribute("aria-expanded", String(!expanded));
      panel.hidden = expanded;
    });
  });
});
