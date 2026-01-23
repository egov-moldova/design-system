document.addEventListener('click', (e) => {
  const token = e.target.closest('.token-name');
  if (!token) return;

  const value = token.textContent.trim();

  navigator.clipboard.writeText(value).then(() => {
    token.classList.add('is-copied');

    setTimeout(() => {
      token.classList.remove('is-copied');
    }, 1200);
  });
});
