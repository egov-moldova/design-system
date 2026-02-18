document.addEventListener("DOMContentLoaded", () => {
  const pickers = Array.from(document.querySelectorAll("[data-date-picker]"));
  if (!pickers.length) return;

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ];

  const mobileQuery = window.matchMedia("(max-width: 768px)");

  const pad = (value) => String(value).padStart(2, "0");

  const toISODate = (year, month, day) => `${year}-${pad(month + 1)}-${pad(day)}`;

  const formatDisplayDate = (isoDate) => {
    if (!isoDate) return "";
    const parts = isoDate.split("-");
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const compareISO = (a, b) => {
    if (!a || !b) return 0;
    if (a === b) return 0;
    return a < b ? -1 : 1;
  };

  const applyResponsive = () => {
    const isMobile = mobileQuery.matches;
    pickers.forEach((picker) => {
      picker.classList.toggle("is-mobile", isMobile);
      const panel = picker.querySelector(".date-picker-panel");
      if (panel) {
        panel.classList.toggle("is-mobile", isMobile);
      }
      const input = picker.querySelector(".js-date-picker-input");
      if (input) {
        if (isMobile) {
          input.setAttribute("readonly", "true");
          input.setAttribute("inputmode", "none");
        } else {
          input.removeAttribute("readonly");
          input.removeAttribute("inputmode");
        }
      }
    });
  };

  const buildMonthView = (state, container, setView, onSelect) => {
    if (!container) return;
    container.innerHTML = "";
    months.forEach((monthName, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "date-picker__option";
      if (index === state.month) button.classList.add("is-selected");
      button.textContent = monthName;
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        state.month = index;
        setView("day");
        if (typeof onSelect === "function") onSelect();
      });
      container.appendChild(button);
    });
  };

  const buildYearView = (state, container, setView, onSelect) => {
    if (!container) return;
    const rangeSize = 12;
    if (state.yearRangeStart == null) {
      state.yearRangeStart = state.year - (state.year % rangeSize);
    }
    container.innerHTML = "";
    for (let i = 0; i < rangeSize; i += 1) {
      const yearValue = state.yearRangeStart + i;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "date-picker__option";
      if (yearValue === state.year) button.classList.add("is-selected");
      button.textContent = String(yearValue);
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        state.year = yearValue;
        setView("day");
        if (typeof onSelect === "function") onSelect();
      });
      container.appendChild(button);
    }
  };

  const buildDayView = (state, container, type) => {
    if (!container) return;
    const year = state.year;
    const month = state.month;

    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const totalCells = 42;
    const rangeStart = state.rangeStart || "";
    const rangeEnd = state.rangeEnd || "";
    const selected = state.selected || "";
    const today = state.today || "";

    container.innerHTML = "";
    for (let i = 0; i < totalCells; i += 1) {
      const dayNumber = i - startOffset + 1;
      let day = dayNumber;
      let cellMonth = month;
      let cellYear = year;
      let isOutside = false;

      if (dayNumber < 1) {
        isOutside = true;
        day = daysInPrevMonth + dayNumber;
        cellMonth = month - 1;
        if (cellMonth < 0) {
          cellMonth = 11;
          cellYear -= 1;
        }
      } else if (dayNumber > daysInMonth) {
        isOutside = true;
        day = dayNumber - daysInMonth;
        cellMonth = month + 1;
        if (cellMonth > 11) {
          cellMonth = 0;
          cellYear += 1;
        }
      }

      const isoDate = toISODate(cellYear, cellMonth, day);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "date-picker__day";
      button.textContent = String(day);
      button.dataset.date = isoDate;

      if (isOutside) {
        button.classList.add("is-outside");
        button.disabled = true;
      }

      if (today && isoDate === today) {
        button.classList.add("is-today");
      }

      if (type === "range") {
        if (rangeStart && isoDate === rangeStart) {
          button.classList.add("is-range-start");
        }
        if (rangeEnd && isoDate === rangeEnd) {
          button.classList.add("is-range-end");
        }
        if (rangeStart && rangeEnd && isoDate > rangeStart && isoDate < rangeEnd) {
          button.classList.add("is-in-range");
        }
      } else if (selected && isoDate === selected) {
        button.classList.add("is-selected");
      }

      container.appendChild(button);
    }
  };

  pickers.forEach((picker) => {
    const input = picker.querySelector(".js-date-picker-input");
    const toggle = picker.querySelector(".js-date-picker-toggle");
    const panel = picker.querySelector(".date-picker-panel");
    const daysContainer = picker.querySelector(".js-date-picker-days");
    const monthsContainer = picker.querySelector(".js-date-picker-months");
    const yearsContainer = picker.querySelector(".js-date-picker-years");
    const monthLabel = picker.querySelector(".js-date-picker-month-label");
    const yearLabel = picker.querySelector(".js-date-picker-year-label");
    const label = picker.querySelector(".js-date-picker-label");

    if (!daysContainer) return;

    const now = new Date();
    const state = {
      type: picker.dataset.type || "default",
      view: picker.dataset.view || "day",
      year: parseInt(picker.dataset.year || now.getFullYear(), 10),
      month: parseInt(picker.dataset.month || now.getMonth(), 10),
      selected: picker.dataset.selected || "",
      rangeStart: picker.dataset.rangeStart || "",
      rangeEnd: picker.dataset.rangeEnd || "",
      today: picker.dataset.today || toISODate(now.getFullYear(), now.getMonth(), now.getDate()),
      yearRangeStart: null
    };

    const viewGrids = picker.querySelectorAll(".date-picker__grid[data-view]");

    const setView = (view) => {
      state.view = view;
      picker.dataset.view = view;
      viewGrids.forEach((grid) => {
        grid.hidden = grid.dataset.view !== view;
      });
      render();
    };

    const syncLabels = () => {
      if (label) {
        label.textContent = `${months[state.month]} ${state.year}`;
      }
      if (monthLabel) {
        monthLabel.textContent = months[state.month];
      }
      if (yearLabel) {
        yearLabel.textContent = String(state.year);
      }
    };

    const syncInput = () => {
      if (!input) return;
      if (state.type === "range") {
        const start = formatDisplayDate(state.rangeStart);
        const end = formatDisplayDate(state.rangeEnd);
        if (start && end) {
          input.value = `${start} - ${end}`;
        } else if (start) {
          input.value = `${start} - `;
        }
      } else if (state.selected) {
        input.value = formatDisplayDate(state.selected);
      }
    };

    const open = () => {
      if (!panel) return;
      applyResponsive();
      picker.classList.add("is-open");
      panel.hidden = false;
      panel.setAttribute("aria-hidden", "false");
      if (toggle) toggle.setAttribute("aria-expanded", "true");
    };

    const close = () => {
      if (!panel) return;
      picker.classList.remove("is-open");
      panel.hidden = true;
      panel.setAttribute("aria-hidden", "true");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    };

    const ensureOpen = () => {
      if (!panel || !panel.hidden) return;
      open();
    };

    const render = () => {
      syncLabels();
      buildDayView(state, daysContainer, state.type);
      buildMonthView(state, monthsContainer, setView, ensureOpen);
      buildYearView(state, yearsContainer, setView, ensureOpen);
      syncInput();
    };

    if (panel) {
      if (picker.dataset.open === "true") {
        open();
      } else {
        panel.hidden = true;
        panel.setAttribute("aria-hidden", "true");
      }
    }

    toggle?.addEventListener("click", (event) => {
      if (!panel) return;
      event.preventDefault();
      if (picker.classList.contains("is-mobile")) {
        open();
        return;
      }
      if (panel.hidden) {
        open();
      } else {
        close();
      }
    });

    const handleInputOpen = (event) => {
      if (!panel) return;
      if (picker.classList.contains("is-mobile")) {
        if (event && typeof event.preventDefault === "function") {
          event.preventDefault();
        }
        open();
        if (document.activeElement === input) {
          input.blur();
        }
        return;
      }
      open();
    };

    input?.addEventListener("focus", handleInputOpen);
    input?.addEventListener("click", handleInputOpen);
    input?.addEventListener("pointerdown", handleInputOpen, { passive: false });
    input?.addEventListener("touchstart", handleInputOpen, { passive: false });
    panel?.addEventListener("click", (event) => {
      const clickedInside = !!event.target.closest(".date-picker");
      if (!picker.classList.contains("is-mobile")) return;
      if (!clickedInside) {
        close();
      }
    });
    input?.addEventListener("blur", (event) => {
      if (!panel) return;
      if (picker.classList.contains("is-mobile")) return;
      if (state.type === "range") return;
      if (picker.contains(event.relatedTarget)) return;
      close();
    });

    picker.addEventListener("click", (event) => {
      const target = event.target.closest(".date-picker__day");
      if (!target || target.disabled) return;
      const isoDate = target.dataset.date;
      if (!isoDate) return;
      event.stopPropagation();

      if (state.type === "range") {
        if (!state.rangeStart || (state.rangeStart && state.rangeEnd)) {
          state.rangeStart = isoDate;
          state.rangeEnd = "";
        } else if (state.rangeStart && !state.rangeEnd) {
          if (compareISO(isoDate, state.rangeStart) < 0) {
            state.rangeEnd = state.rangeStart;
            state.rangeStart = isoDate;
          } else {
            state.rangeEnd = isoDate;
          }
        }
      } else {
        state.selected = isoDate;
      }

      picker.dataset.selected = state.selected;
      picker.dataset.rangeStart = state.rangeStart || "";
      picker.dataset.rangeEnd = state.rangeEnd || "";

      render();

      if (state.type === "range") {
        if (state.rangeStart && state.rangeEnd) {
          close();
        } else {
          open();
        }
      } else {
        close();
      }
    });

    picker.querySelectorAll(".js-date-picker-month-toggle").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        setView(state.view === "month" ? "day" : "month");
      });
    });

    picker.querySelectorAll(".js-date-picker-year-toggle").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        setView(state.view === "year" ? "day" : "year");
      });
    });

    picker.querySelectorAll(".js-date-picker-prev").forEach((button) => {
      button.addEventListener("click", () => {
        if (state.view === "year") {
          state.yearRangeStart = (state.yearRangeStart ?? state.year) - 12;
        } else if (state.view === "month") {
          state.year -= 1;
        } else {
          state.month -= 1;
          if (state.month < 0) {
            state.month = 11;
            state.year -= 1;
          }
        }
        render();
      });
    });

    picker.querySelectorAll(".js-date-picker-next").forEach((button) => {
      button.addEventListener("click", () => {
        if (state.view === "year") {
          state.yearRangeStart = (state.yearRangeStart ?? state.year) + 12;
        } else if (state.view === "month") {
          state.year += 1;
        } else {
          state.month += 1;
          if (state.month > 11) {
            state.month = 0;
            state.year += 1;
          }
        }
        render();
      });
    });

    render();
    setView(state.view);
  });

  document.addEventListener("click", (event) => {
    pickers.forEach((picker) => {
      const panel = picker.querySelector(".date-picker-panel");
      if (!panel) return;
      if (!picker.contains(event.target)) {
        panel.hidden = true;
        panel.setAttribute("aria-hidden", "true");
        const toggle = picker.querySelector(".js-date-picker-toggle");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
        picker.classList.remove("is-open");
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    pickers.forEach((picker) => {
      const panel = picker.querySelector(".date-picker-panel");
      if (!panel) return;
      panel.hidden = true;
      panel.setAttribute("aria-hidden", "true");
      const toggle = picker.querySelector(".js-date-picker-toggle");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
      picker.classList.remove("is-open");
    });
  });

  applyResponsive();
  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", applyResponsive);
  } else {
    window.addEventListener("resize", applyResponsive);
  }
});





