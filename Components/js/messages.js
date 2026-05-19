

let toastContainer = document.querySelector('.toast-container');
if (!toastContainer) {
  toastContainer = document.createElement('div');
  toastContainer.classList.add('toast-container', 'toast-container--top-right'); 
  document.body.appendChild(toastContainer);
}

function showToast({
  type = 'info',
  style = 'solid',
  title = '',
  messages = [],      
  link = '',
  linkText = '',
  showClose = true,
  duration = 4000
} = {}) {
  const iconRefs = {
    info: 'icon-circle-info-filled',
    success: 'icon-circle-checkmark-filled',
    warning: 'icon-warning-filled',
    error: 'icon-circle-error-filled',
    neutral: 'icon-circle-neutral-filled'
  };

  
  const toast = document.createElement('div');
  toast.className = `toast toast--${type} toast--${style}`;

  
  let contentHTML = `<span class="toast__icon">
      <svg class="icon large" aria-hidden="true">
        <use href="assets/icons/sprite.svg#${iconRefs[type]}"></use>
      </svg>
    </span>
    <div class="toast__content">`;

  
  if (title) contentHTML += `<h5 class="toast__title">${title}</h5>`;

  
  messages.forEach(msg => {
    contentHTML += `<p class="toast__text">${msg}</p>`;
  });

  
  if (link && linkText) contentHTML += `<a href="${link}" class="toast__link">${linkText}</a>`;

  contentHTML += `</div>`;

  
  if (showClose) {
    contentHTML += `<button class="toast__close" aria-label="Close">
      <span class="d-inline-flex">
        <svg class="icon small" aria-hidden="true">
          <use href="assets/icons/sprite.svg#icon-cross-large"></use>
        </svg>
      </span>
    </button>`;
  }

  toast.innerHTML = contentHTML;
  toastContainer.appendChild(toast);

  
  setTimeout(() => toast.classList.add('show'), 10);

  
  if (showClose) toast.querySelector('.toast__close').addEventListener('click', () => removeToast(toast));

  
  setTimeout(() => removeToast(toast), duration);
}

function removeToast(toast) {
  toast.classList.add('is-hiding');
  toast.addEventListener('animationend', () => toast.remove());
}

function setToastPosition(position) {
  toastContainer.className = `toast-container toast-container--${position}`;
}
