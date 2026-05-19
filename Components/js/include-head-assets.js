(() => {
  const fragmentPath = "elements/head-assets.html";
  try {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", fragmentPath, false);
    xhr.send(null);
    if (xhr.status === 200 || xhr.status === 0) {
      document.head.insertAdjacentHTML("beforeend", xhr.responseText.trim());
    } else {
      console.error("Head assets include failed:", xhr.status);
    }
  } catch (error) {
    console.error("Head assets include failed:", error);
  }
})();
