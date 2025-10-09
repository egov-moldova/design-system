document.querySelectorAll('.segmented-control').forEach(group => {
  const buttons = group.querySelectorAll('.segment-item');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
    });
  });
});
