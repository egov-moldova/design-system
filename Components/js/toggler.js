document.addEventListener("DOMContentLoaded", () => {
  const togglers = document.querySelectorAll("[data-toggle]");

  togglers.forEach(toggle => {
    const targetSelector = toggle.dataset.toggle;
    if (!targetSelector) return; // 🔒 protecție împotriva selector gol

    const target = document.querySelector(targetSelector);
    if (!target) return;

    const animation = toggle.dataset.animation || "fade";
    const position = toggle.dataset.position || "static";
    const closeMode = toggle.dataset.close || "outside";
    const exclusive = toggle.dataset.exclusive === "true";

    toggle.setAttribute("aria-expanded", "false");

    toggle.addEventListener("click", (e) => {
      e.stopPropagation();

      if (exclusive) {
        togglers.forEach(other => {
          if (other !== toggle) {
            const otherSelector = other.dataset.toggle;
            if (!otherSelector) return;
            const otherTarget = document.querySelector(otherSelector);
            if (otherTarget) closePanel(other, otherTarget);
          }
        });
      }

      applyAnimation(target, animation);
      const isHidden = target.classList.toggle("hidden");
      toggle.classList.toggle("is-active", !isHidden);
      toggle.setAttribute("aria-expanded", !isHidden);
    });

    if (closeMode === "outside") {
      document.addEventListener("click", (e) => {
        if (!target.contains(e.target) && !toggle.contains(e.target)) {
          closePanel(toggle, target);
        }
      });
    }
  });

  function closePanel(toggle, target) {
    target.classList.add("hidden");
    toggle.classList.remove("is-active");
    toggle.setAttribute("aria-expanded", "false");
  }

  function applyAnimation(el, type) {
    switch (type) {
      case "fade":
        el.style.transition = "opacity 0.25s ease, transform 0.25s ease";
        break;
      case "slide":
        el.style.transition = "max-height 0.3s ease";
        el.style.overflow = "hidden";
        el.style.maxHeight = el.classList.contains("hidden") ? "0" : "500px";
        break;
      default:
        el.style.transition = "none";
    }
  }
});
