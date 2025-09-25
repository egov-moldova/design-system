document.querySelectorAll('.search-input').forEach((searchInput) => {
  const input = searchInput.querySelector('input');
  const clearBtn = searchInput.querySelector('.btn-icon.clear');
  const loadingIcon = searchInput.querySelector('.btn-icon.loading');
  const searchBtn = searchInput.querySelector('.btn-icon.search');

  if (!input) return; // dacă nu e input, nu continuăm

  // Când tastezi ceva
  input.addEventListener('input', () => {
    if (clearBtn) {
      clearBtn.classList.toggle('visible', input.value.trim() !== '');
    }
  });

  // Când apeși ENTER
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      searchBtn?.click();
    }
  });

  // Clear button
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.classList.remove('visible');
      input.focus();
    });
  }

  // Search button
  if (searchBtn && loadingIcon) {
    searchBtn.addEventListener('click', () => {
      if (input.value.trim() === '') return;

      searchInput.classList.add('loading');
      loadingIcon.classList.add('visible');

      setTimeout(() => {
        searchInput.classList.remove('loading');
        loadingIcon.classList.remove('visible');
        alert(`Căutare pentru: ${input.value}`);
      }, 1500);
    });
  }
});
