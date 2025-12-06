(function () {
    function initCookieBanner() {
        const banner = document.getElementById('cookie-banner');
        const overlay = document.getElementById('cookie-overlay');
        const info = document.getElementById('cookie-info');
        const detail = document.getElementById('cookie-detail');
        const btnToggle = document.getElementById('btnToggleBanner');
        const btnManage = document.getElementById('btnManage');
        const mainButtons = document.getElementById('cookie-main-buttons');
        const btnNecessary = document.getElementById('btnNecessary');
        const btnAll = document.getElementById('btnAll');
        const btnConfirm = document.getElementById('btnConfirm');
        const statsToggle = document.getElementById('statsToggle');

        if (!banner || !overlay) return;

        // Show banner only if user did not accept
        if (!localStorage.getItem('cookieConsent')) {
            banner.classList.remove('d-none');
            overlay.classList.remove('d-none');
        }

        let isExpanded = false;

        // ======================================================
        // OPEN DETAILS
        // ======================================================
        function showDetails() {
            info.classList.add("d-none");
            mainButtons.classList.add("d-none");

            btnToggle.classList.remove("d-none");
            btnToggle.classList.add("rotate-180");

            detail.classList.add("show");

            isExpanded = true;
        }

        // ======================================================
        // CLOSE DETAILS (WAIT FOR ANIMATION)
        // ======================================================
        function hideDetails() {
            // Start collapse animation
            detail.classList.remove("show");
            btnToggle.classList.remove("rotate-180");

            isExpanded = false;

            // Wait for CSS transition to finish
            detail.addEventListener(
                "transitionend",
                function handler(e) {
                    if (e.propertyName !== "max-height") return;

                    // restore visible parts ONLY AFTER animation
                    info.classList.remove("d-none");
                    mainButtons.classList.remove("d-none");

                    btnToggle.classList.add("d-none");

                    detail.removeEventListener("transitionend", handler);
                }
            );
        }

        // ======================================================
        // EVENTS
        // ======================================================

        btnToggle.onclick = () => {
            isExpanded ? hideDetails() : showDetails();
        };

        btnManage.onclick = () => showDetails();

        btnNecessary.onclick = () => saveConsent({ necessary: true, statistics: false });

        btnAll.onclick = () => saveConsent({ necessary: true, statistics: true });

        btnConfirm.onclick = () => saveConsent({
            necessary: true,
            statistics: statsToggle ? statsToggle.checked : false
        });

        // ======================================================
        // SAVE CONSENT
        // ======================================================
        function saveConsent(obj) {
            localStorage.setItem('cookieConsent', JSON.stringify(obj));

            banner.classList.add('fade-out');
            overlay.classList.add('fade-out');

            banner.addEventListener('transitionend', () => banner.remove(), { once: true });
            overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCookieBanner);
    } else {
        initCookieBanner();
    }
})();
