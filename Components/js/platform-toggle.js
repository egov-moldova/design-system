const platformToggle = document.getElementById('platform-toggle');
const platformPanel = document.getElementById('platform-panel');

platformToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  
  
  const rect = platformToggle.getBoundingClientRect();

  
  platformPanel.style.top = `${rect.bottom + window.scrollY + 8}px`; 
  platformPanel.style.left = `${rect.right - platformPanel.offsetWidth + window.scrollX}px`;

  
  platformPanel.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
  if (!platformPanel.contains(e.target) && !platformToggle.contains(e.target)) {
    platformPanel.classList.add('hidden');
  }
});

window.addEventListener('resize', () => {
  if (!platformPanel.classList.contains('hidden')) {
    const rect = platformToggle.getBoundingClientRect();
    platformPanel.style.top = `${rect.bottom + window.scrollY + 8}px`;
    platformPanel.style.left = `${rect.right - platformPanel.offsetWidth + window.scrollX}px`;
  }
});
