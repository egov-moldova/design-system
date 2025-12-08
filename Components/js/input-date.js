document.addEventListener("DOMContentLoaded", () => {
    const dateInputs = document.querySelectorAll('input[placeholder="DD/MM/YYYY"], input[placeholder="dd/mm/yyyy"]');

    dateInputs.forEach(input => {
        input.addEventListener("keydown", restrictKeys);
        input.addEventListener("input", formatDate);
    });

    function restrictKeys(e) {
        const allowedKeys = ["Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete"];
        if (allowedKeys.includes(e.key)) return;

        if (!/^[0-9]$/.test(e.key)) e.preventDefault();
    }

    function formatDate(e) {
        const input = e.target;
        let digits = input.value.replace(/\D/g, ""); // păstrăm doar cifrele

        if (digits.length > 8) digits = digits.substring(0, 8);

        let day = digits.substring(0, 2);
        let month = digits.substring(2, 4);
        let year = digits.substring(4, 8);

        // limite pentru zi și lună
        if (day.length === 2 && parseInt(day) > 31) day = "31";
        if (month.length === 2 && parseInt(month) > 12) month = "12";

        // construim string-ul final
        let formatted = day;
        if (month) formatted += "/" + month;
        if (year) formatted += "/" + year;

        // determinăm poziția cursorului
        let cursorPos = input.selectionStart;
        const prevLength = input.value.length;

        input.value = formatted;

        const newLength = input.value.length;

        // ajustăm cursorul automat dacă am trecut peste "/"
        if (cursorPos === 2 || cursorPos === 5) cursorPos++;
        if (newLength > prevLength && cursorPos < newLength) cursorPos++;

        input.setSelectionRange(cursorPos, cursorPos);
    }
});
