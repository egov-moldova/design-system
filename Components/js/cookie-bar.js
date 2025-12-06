(function () {
    function initCookieBanner() {
        const banner = document.getElementById("cookie-banner");
        const overlay = document.getElementById("cookie-overlay");
        const info = document.getElementById("cookie-info");
        const detail = document.getElementById("cookie-detail");
        const mainButtons = document.getElementById("cookie-main-buttons");
        const btnToggle = document.getElementById("btnToggleBanner");
        const btnManage = document.getElementById("btnManage");
        const btnConfirm = document.getElementById("btnConfirm");

        if (!banner || !overlay) return;

        // Show banner if no prior consent
        if (!localStorage.getItem("cookieConsent")) {
            banner.classList.remove("d-none");
            overlay.classList.remove("d-none");
        }

        let isExpanded = false;

        // Scroll Shadows
        const cookieBody = banner.querySelector(".cookie-body");
        const topShadowClass = "cookie-scroll--top";
        const bottomShadowClass = "cookie-scroll--bottom";

        function updateShadows() {
            if (!cookieBody) return;

            const scrollTop = cookieBody.scrollTop;
            const maxScroll = cookieBody.scrollHeight - cookieBody.clientHeight;

            cookieBody.classList.toggle(topShadowClass, scrollTop > 0);
            cookieBody.classList.toggle(bottomShadowClass, scrollTop < maxScroll);
        }

        if (cookieBody) {
            cookieBody.addEventListener("scroll", updateShadows);
        }

        // EXPAND
        function showDetails() {
            if (isExpanded) return;

            // Hide header + main buttons instantly (no glitch)
            info.classList.add("d-none");
            mainButtons.classList.add("d-none");

            // Show collapse arrow
            btnToggle.classList.remove("d-none");
            btnToggle.classList.add("rotate-180");

            // Expand details
            detail.classList.add("show");

            // Update shadows after expansion
            setTimeout(updateShadows, 50);

            isExpanded = true;
        }

        // COLLAPSE
        function hideDetails() {
            if (!isExpanded) return;

            // Collapse details
            detail.classList.remove("show");

            // Reset arrow
            btnToggle.classList.remove("rotate-180");
            btnToggle.classList.add("d-none");

            // Instantly show header + buttons
            info.classList.remove("d-none");
            mainButtons.classList.remove("d-none");

            // Remove scroll shadows
            cookieBody.classList.remove(topShadowClass, bottomShadowClass);

            isExpanded = false;
        }

        // Events
        btnToggle.onclick = () => (isExpanded ? hideDetails() : showDetails());
        btnManage.onclick = () => showDetails();
        btnConfirm.onclick = () => saveConsent();

        function saveConsent() {
            localStorage.setItem(
                "cookieConsent",
                JSON.stringify({ necessary: true, statistics: true })
            );

            banner.classList.add("fade-out");
            overlay.classList.add("fade-out");

            banner.addEventListener("transitionend", () => banner.remove(), { once: true });
            overlay.addEventListener("transitionend", () => overlay.remove(), { once: true });
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initCookieBanner);
    } else {
        initCookieBanner();
    }
})();
