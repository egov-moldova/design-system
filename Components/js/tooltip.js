class Tooltip {
  constructor(el) {
    this.el = el;
    this.message = el.dataset.tooltip || "";
    this.placement = el.dataset.placement || "top-center";
    this.size = el.dataset.size || "";
    this.hasClose = el.dataset.close === "true";   // <--- nou
    this.tooltip = null;
    this.persistent = false;

    this.init();
  }

  init() {
    // Hover / focus
    this.el.addEventListener("mouseenter", () => { if (!this.persistent) this.show(); });
    this.el.addEventListener("mouseleave", () => { if (!this.persistent) this.hide(); });
    this.el.addEventListener("focus", () => { if (!this.persistent) this.show(); });
    this.el.addEventListener("blur", () => { if (!this.persistent) this.hide(); });

    // Click toggle persistent
    this.el.addEventListener("click", (e) => {
      e.stopPropagation();

      if (this.persistent) {
        this.hide();
        this.persistent = false;
      } else {
        this.show();
        this.persistent = true;
      }
    });

    // Click în afara tooltipului → închide persistent
    document.addEventListener("click", (e) => {
      if (
        this.persistent &&
        this.tooltip &&
        !this.el.contains(e.target) &&
        !this.tooltip.contains(e.target)
      ) {
        this.hide();
        this.persistent = false;
      }
    });

    // Repozitionare fluidă
    window.addEventListener("resize", () => { if (this.tooltip) this.position(); });
    window.addEventListener("scroll", () => { if (this.tooltip) this.position(); });
  }

  create() {
    const wrapper = document.createElement("div");
    wrapper.className = `tooltip tooltip--${this.placement}`;
    if (this.size) wrapper.classList.add(`tooltip--${this.size}`);

    // Inner text
    const inner = document.createElement("div");
    inner.className = "tooltip-inner";
    inner.innerText = this.message;

    // Arrow
    const arrow = document.createElement("div");
    arrow.className = "tooltip-arrow";

    // ----------------------------------------------
    // ✔ Close button (opțional)
    // ----------------------------------------------
    if (this.hasClose) {
      const closeBtn = document.createElement("button");
      closeBtn.className = "tooltip-close";
      closeBtn.setAttribute("aria-label", "Close");
      closeBtn.innerHTML = `<span class="class="p-8 bg-gray-200 radius-8 d-inline-flex text-black">
                  <svg class="icon small" aria-hidden="true"> 
                    <use href="assets/icons/sprite.svg#icon-cross-large"></use> 
                  </svg>
                </span>`;
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.hide();
        this.persistent = false;
      });

      wrapper.append(closeBtn);
    }

    wrapper.append(inner, arrow);
    document.body.appendChild(wrapper);

    this.tooltip = wrapper;
  }

  computeBestPlacement(ttRect, rect) {
    const spacing = 8;
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;

    let [side, align = "center"] = this.placement.split("-");

    const fits = {
      top: rect.top >= ttRect.height + spacing,
      bottom: vpH - rect.bottom >= ttRect.height + spacing,
      left: rect.left >= ttRect.width + spacing,
      right: vpW - rect.right >= ttRect.width + spacing
    };

    if (!fits[side]) {
      if (side === "top" && fits.bottom) side = "bottom";
      else if (side === "bottom" && fits.top) side = "top";
      else if (side === "left" && fits.right) side = "right";
      else if (side === "right" && fits.left) side = "left";
    }

    if (side === "top" || side === "bottom") {
      if (rect.left + ttRect.width > vpW) align = "right";
      else if (rect.left + rect.width / 2 - ttRect.width / 2 < 0) align = "left";
    } else {
      if (rect.top + ttRect.height > vpH) align = "bottom";
      else if (rect.top + rect.height / 2 - ttRect.height / 2 < 0) align = "top";
    }

    return { side, align };
  }

  position() {
    if (!this.tooltip) return;

    const rect = this.el.getBoundingClientRect();
    const tt = this.tooltip;
    const ttRect = tt.getBoundingClientRect();

    const { side, align } = this.computeBestPlacement(ttRect, rect);

    tt.className = `tooltip tooltip--${side}-${align}`;
    if (this.size) tt.classList.add(`tooltip--${this.size}`);
    if (this.hasClose) tt.classList.add("tooltip--with-close");

    const spacing = 8;
    let top = 0, left = 0;

    if (side === "top") {
      top = rect.top - ttRect.height - spacing;
      left =
        align === "left" ? rect.left :
        align === "right" ? rect.right - ttRect.width :
        rect.left + rect.width / 2 - ttRect.width / 2;
    }
    else if (side === "bottom") {
      top = rect.bottom + spacing;
      left =
        align === "left" ? rect.left :
        align === "right" ? rect.right - ttRect.width :
        rect.left + rect.width / 2 - ttRect.width / 2;
    }
    else if (side === "left") {
      left = rect.left - ttRect.width - spacing;
      top =
        align === "top" ? rect.top :
        align === "bottom" ? rect.bottom - ttRect.height :
        rect.top + rect.height / 2 - ttRect.height / 2;
    }
    else if (side === "right") {
      left = rect.right + spacing;
      top =
        align === "top" ? rect.top :
        align === "bottom" ? rect.bottom - ttRect.height :
        rect.top + rect.height / 2 - ttRect.height / 2;
    }

    tt.style.transition = "top 0.12s ease, left 0.12s ease";
    tt.style.top = `${Math.max(top + window.scrollY, 0)}px`;
    tt.style.left = `${Math.max(left + window.scrollX, 0)}px`;
  }

  show() {
    if (!this.tooltip) this.create();
    this.position();
    requestAnimationFrame(() => this.tooltip.classList.add("show"));
  }

  hide() {
    if (!this.tooltip) return;
    this.tooltip.classList.remove("show");

    setTimeout(() => {
      if (this.tooltip) {
        this.tooltip.remove();
        this.tooltip = null;
      }
    }, 140);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-tooltip]").forEach(el => new Tooltip(el));
});
