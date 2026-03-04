// phone-input.js

document.addEventListener("DOMContentLoaded", () => {
  const countrySelect = document.getElementById("country-select");
  const flagSpan = document.getElementById("selected-flag");
  const phoneInput = document.getElementById("phone-input");

  const applyStaticFlags = () => {
    const wrappers = document.querySelectorAll(".input-wrapper-number");

    wrappers.forEach((wrapper) => {
      const input = wrapper.querySelector('input[type="tel"]');
      const flag = wrapper.querySelector(".input-icon--flag");

      if (!input || !flag) return;

      const countryCode = (input.dataset.country || "").toLowerCase();
      if (!countryCode) return;

      flag.className = `input-icon input-icon--flag fi fi-${countryCode}`;
      flag.textContent = "";
      flag.setAttribute("aria-hidden", "true");
    });
  };

  const setCountryUI = (option) => {
    if (!option || !flagSpan || !phoneInput) return;

    const prefix = option.value || "";
    const countryCode = (option.dataset.country || "").toLowerCase();

    if (countryCode) {
      flagSpan.className = `phone-field__flag fi fi-${countryCode}`;
      flagSpan.textContent = "";
      flagSpan.setAttribute("aria-label", `Country flag ${countryCode.toUpperCase()}`);
    }

    phoneInput.dataset.phoneInput = "true";
    phoneInput.dataset.country = countryCode;
    phoneInput.dataset.dialCode = prefix;
    phoneInput.value = `${prefix} `;
  };

  applyStaticFlags();

  if (!countrySelect || !flagSpan || !phoneInput) return;

  setCountryUI(countrySelect.selectedOptions[0]);

  countrySelect.addEventListener("change", () => {
    setCountryUI(countrySelect.selectedOptions[0]);
  });
});
