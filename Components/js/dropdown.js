document.addEventListener("DOMContentLoaded", () => {
  const toggles = document.querySelectorAll("[data-toggle]");

  toggles.forEach(toggle => {
    const target = toggle.nextElementSibling;
    if (!target) return;

    const exclusive = toggle.dataset.exclusive === "true";

    
    target.hidden = true;
    target.style.overflow = "hidden";
    target.style.maxHeight = "0";
    target.style.transition = "max-height 0.3s ease";

    function openPanel() {
      if (exclusive) {
        document.querySelectorAll("[data-toggle].is-active").forEach(btn => {
          if (btn !== toggle) {
            const otherTarget = btn.nextElementSibling;
            if (otherTarget) {
              closePanel(btn, otherTarget);
            }
          }
        });
      }

      toggle.classList.add("is-active");
      toggle.setAttribute("aria-expanded", "true");
      target.hidden = false;

      
      requestAnimationFrame(() => {
        const fullHeight = target.scrollHeight + "px";
        target.style.maxHeight = fullHeight;
      });
    }

    function closePanel(btn = toggle, panel = target) {
      btn.classList.remove("is-active");
      btn.setAttribute("aria-expanded", "false");
      panel.style.maxHeight = panel.scrollHeight + "px"; 
      requestAnimationFrame(() => {
        panel.style.maxHeight = "0";
      });

      
      setTimeout(() => {
        panel.hidden = true;
      }, 300);
    }

    
    toggle.addEventListener("click", e => {
      e.stopPropagation();
      const isOpen = toggle.classList.contains("is-active");
      if (isOpen) closePanel();
      else openPanel();
    });

    
    document.addEventListener("click", e => {
      if (!toggle.contains(e.target) && !target.contains(e.target)) {
        closePanel();
      }
    });

    
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") closePanel();
    });
  });
});
