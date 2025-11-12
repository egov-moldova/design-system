const platformToggle = document.getElementById('platform-toggle');
const platformPanel = document.getElementById('platform-panel');

platformToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  
  // obținem poziția butonului în pagină
  const rect = platformToggle.getBoundingClientRect();

  // setăm poziția panoului sub buton
  platformPanel.style.top = `${rect.bottom + window.scrollY + 8}px`; // +8px spațiu
  platformPanel.style.left = `${rect.right - platformPanel.offsetWidth + window.scrollX}px`;

  // afișăm/ascundem
  platformPanel.classList.toggle('hidden');
});

// Închide panoul dacă se dă click în afară
document.addEventListener('click', (e) => {
  if (!platformPanel.contains(e.target) && !platformToggle.contains(e.target)) {
    platformPanel.classList.add('hidden');
  }
});

// Reajustează poziția dacă fereastra se redimensionează
window.addEventListener('resize', () => {
  if (!platformPanel.classList.contains('hidden')) {
    const rect = platformToggle.getBoundingClientRect();
    platformPanel.style.top = `${rect.bottom + window.scrollY + 8}px`;
    platformPanel.style.left = `${rect.right - platformPanel.offsetWidth + window.scrollX}px`;
  }
});
