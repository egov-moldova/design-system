document.addEventListener("DOMContentLoaded", () => {
  const trackers = document.querySelectorAll(".progress-tracker");

  trackers.forEach(tracker => {
    const steps = tracker.querySelectorAll(".progress-step");
    if (steps.length <= 1) return;

    const orientation = tracker.dataset.orientation || "horizontal";
    const isVertical = orientation === "vertical";

    // 🔹 Dimensiunea totală disponibilă
    const totalLength = isVertical ? tracker.offsetHeight : tracker.offsetWidth;

    // 🔹 Dimensiunea unui cerc
    const circleSize = isVertical
      ? steps[0].querySelector(".progress-step__circle").offsetHeight
      : steps[0].querySelector(".progress-step__circle").offsetWidth;

    // 🔹 Calculăm spațiul dintre pași
    const connectorLength =
      (totalLength - steps.length * circleSize) / (steps.length - 1);

    // aplicăm la fiecare step variabila
    steps.forEach(step => {
      step.style.setProperty("--connector-length", `${connectorLength}px`);
    });
  });
});
