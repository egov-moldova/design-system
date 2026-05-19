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

        
        if (!localStorage.getItem("cookieConsent")) {
            banner.classList.remove("mud-hidden");
            overlay.classList.remove("mud-hidden");
        }

        let isExpanded = false;

        
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

        
        function showDetails() {
            if (isExpanded) return;

            
            info.classList.add("mud-hidden");
            mainButtons.classList.add("mud-hidden");

            
            btnToggle.classList.remove("mud-hidden");
            btnToggle.classList.add("rotate-180");

            
            detail.classList.add("show");

            
            setTimeout(updateShadows, 50);

            isExpanded = true;
        }

        
        function hideDetails() {
            if (!isExpanded) return;

            
            detail.classList.remove("show");

            
            btnToggle.classList.remove("rotate-180");
            btnToggle.classList.add("mud-hidden");

            
            info.classList.remove("mud-hidden");
            mainButtons.classList.remove("mud-hidden");

            
            cookieBody.classList.remove(topShadowClass, bottomShadowClass);

            isExpanded = false;
        }

        
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
