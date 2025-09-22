document.querySelectorAll('.search-input').forEach((searchInput) => {
  const input = searchInput.querySelector('input');
  const clearBtn = searchInput.querySelector('.btn-icon.clear');
  const loadingIcon = searchInput.querySelector('.btn-icon.loading');
  const searchBtn = searchInput.querySelector('.btn-icon.search');

  // când utilizatorul tastează
  input.addEventListener('input', () => {
    clearBtn.style.display = input.value.trim() !== '' ? 'inline-flex' : 'none';
  });

  // click pe butonul ✖
  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.style.display = 'none';
    input.focus();
  });

  // click pe butonul de search
  searchBtn.addEventListener('click', () => {
    if (input.value.trim() === '') return;

    searchInput.classList.add('loading');
    loadingIcon.style.display = 'inline-flex';

    setTimeout(() => {
      searchInput.classList.remove('loading');
      loadingIcon.style.display = 'none';
      alert(`Căutare pentru: ${input.value}`);
    }, 1500);
  });
});
