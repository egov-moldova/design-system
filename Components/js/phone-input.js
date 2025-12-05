// phone-input.js

document.addEventListener("DOMContentLoaded", () => {
  const countrySelect = document.getElementById("country-select");
  const flagSpan = document.getElementById("selected-flag");
  const phoneInput = document.getElementById("phone-input");

  if (!countrySelect || !flagSpan || !phoneInput) return;

  // setează valoarea inițială
  phoneInput.value = countrySelect.value + " ";

  countrySelect.addEventListener("change", () => {
    const selected = countrySelect.selectedOptions[0];
    const flag = selected.dataset.flag;
    const prefix = selected.value;

    // actualizează flag-ul
    flagSpan.textContent = flag;

    // setează prefixul în input
    phoneInput.value = prefix + " ";
  });
});
