
// ------------------------------
// FILE INPUT FUNCTIONALITY
// ------------------------------
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const errorMessage = document.getElementById('error');

let files = [];

function handleFiles(selectedFiles) {
  [...selectedFiles].forEach(file => {
    files.push(file);
    displayFile(file);
  });
}

function displayFile(file) {
  const item = document.createElement('div');
  item.className = 'file-item';

  const fileName = document.createElement('div');
  fileName.className = 'filename';

  if (file.type.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.width = 32;
    img.height = 32;
    img.style.marginRight = '8px';
    img.style.objectFit = 'cover';
    fileName.appendChild(img);
  }

  fileName.append(file.name);

  const fileSize = document.createElement('div');
  fileSize.className = 'filesize';
  fileSize.textContent = `${(file.size / 1024).toFixed(1)} KB`;

  const removeBtn = document.createElement('button');
  removeBtn.className = 'remove-btn';
  removeBtn.textContent = '✕';
  removeBtn.onclick = (e) => {
    e.stopPropagation();
    files = files.filter(f => f !== file);
    fileList.removeChild(item);
  };

  item.appendChild(fileName);
  item.appendChild(fileSize);
  item.appendChild(removeBtn);

  fileList.appendChild(item);
}

if (dropzone && fileInput && fileList) {
  dropzone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    handleFiles(fileInput.files);
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('active');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('active');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('active');
    handleFiles(e.dataTransfer.files);
  });
}