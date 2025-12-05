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

        // Show banner if user hasn't accepted yet
        if (!localStorage.getItem('cookieConsent')) {
            banner.classList.remove('d-none');
            overlay.classList.remove('d-none');
        }

        let isExpanded = false;

        function showDetails() {
            info.classList.add('d-none');
            mainButtons.classList.add('d-none');
            btnToggle.classList.remove('d-none');
            detail.classList.add('show');
            isExpanded = true;
            btnToggle.classList.add("rotate-180");
        }

        function hideDetails() {
            info.classList.remove('d-none');
            mainButtons.classList.remove('d-none');
            detail.classList.remove('show');
            isExpanded = false;
            btnToggle.classList.remove("rotate-180");
            btnToggle.classList.add("d-none");
        }

        // Toggle button – singurul existent
        btnToggle.onclick = () => {
            isExpanded ? hideDetails() : showDetails();
        };

        // Când apasă "Gestionează cookie-urile"
        btnManage.onclick = () => showDetails();

        // Accept necesare
        btnNecessary.onclick = () => 
            saveConsent({ necessary: true, statistics: false });

        // Accept toate
        btnAll.onclick = () => 
            saveConsent({ necessary: true, statistics: true });

        // Confirmă selecția detaliată
        btnConfirm.onclick = () => 
            saveConsent({ necessary: true, statistics: statsToggle.checked });

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
        setTimeout(initCookieBanner, 100);
    }
})();
