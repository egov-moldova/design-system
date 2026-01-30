document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.search-input').forEach((searchInput) => {
    const input = searchInput.querySelector('input');
    const clearBtn = searchInput.querySelector('.btn-icon.clear');
    const searchBtn = searchInput.querySelector('.btn-search');

    if (!input) return;

    let typingTimer;

    const resetState = () => {
      searchInput.classList.remove('has-value', 'is-typing', 'is-ready');
      clearTimeout(typingTimer);
    };

    input.addEventListener('input', () => {
      const hasValue = input.value.trim() !== '';

      if (!hasValue) {
        resetState();
        return;
      }

      searchInput.classList.add('has-value');
      searchInput.classList.remove('is-ready');
      searchInput.classList.add('is-typing');

      clearTimeout(typingTimer);

      typingTimer = setTimeout(() => {
        searchInput.classList.remove('is-typing');
        searchInput.classList.add('is-ready');
      }, 500);
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        resetState();
        input.focus();
      });
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') searchBtn?.click();
    });
  });
});
