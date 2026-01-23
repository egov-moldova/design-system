document.querySelectorAll('.segmented-control').forEach(group => {
  const buttons = group.querySelectorAll('.segment-item');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
    });
  });
});


// ==============================================
// 📋 Copy token name to clipboard (no toast)
// ==============================================

document.addEventListener('click', (e) => {
  const token = e.target.closest('.token-name');
  if (!token) return;

  copyToken(token);
});

document.addEventListener('keydown', (e) => {
  if (
    (e.key === 'Enter' || e.key === ' ') &&
    e.target.classList.contains('token-name')
  ) {
    e.preventDefault();
    copyToken(e.target);
  }
});

// ==============================================
// 🔹 Copy logic
// ==============================================
function copyToken(tokenEl) {
  const value = tokenEl.textContent.trim();

  navigator.clipboard.writeText(value).then(() => {
    showInlineFeedback(tokenEl, value);
  }).catch(() => {
    // fallback foarte simplu
    console.warn('Clipboard copy failed');
  });
}

// ==============================================
// 🔹 Inline feedback (no toast)
// ==============================================
function showInlineFeedback(el, originalValue) {
  const originalText = el.textContent;

  el.classList.add('is-copied');
  el.textContent = 'Copied';

  announceToScreenReader(`${originalValue} copied to clipboard`);

  setTimeout(() => {
    el.textContent = originalText;
    el.classList.remove('is-copied');
  }, 1200);
}

document.addEventListener('click', (e) => {
  const token = e.target.closest('.token-name');
  if (!token) return;

  copyToken(token);
});

document.addEventListener('keydown', (e) => {
  if (
    (e.key === 'Enter' || e.key === ' ') &&
    e.target.classList.contains('token-name')
  ) {
    e.preventDefault();
    copyToken(e.target);
  }
});

function copyToken(tokenEl) {
  const value = tokenEl.innerText.trim();

  navigator.clipboard.writeText(value).then(() => {
    tokenEl.classList.add('is-copied');

    setTimeout(() => {
      tokenEl.classList.remove('is-copied');
    }, 1500);
  });
}

