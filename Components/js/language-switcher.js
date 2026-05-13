(function () {
  function syncLang(element, lang) {
    document.documentElement.lang =
      lang === 'ru' ? 'ru' : lang === 'en' ? 'en' : 'ro';
    element.dispatchEvent(
      new CustomEvent('languagechange', {
        bubbles: true,
        detail: { lang },
      })
    );
  }

  document.querySelectorAll('[data-language-switcher]').forEach(function (root) {
    var buttons = root.querySelectorAll('.language-switcher__btn[data-lang]');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var lang = btn.getAttribute('data-lang') || 'ro';
        buttons.forEach(function (b) {
          var active = b === btn;
          b.classList.toggle('active', active);
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        syncLang(btn, lang);
      });
    });
  });
})();
