// Unique image counter to help generate unique IDs.
let imageCounter = 0;

const loadImageBtn = document.getElementById('load-image-btn');
const imagePromptInput = document.getElementById('image-prompt');
const imageContainer = document.getElementById('image-container');
const statusDiv = document.getElementById('status');

loadImageBtn.addEventListener('click', () => {
  const promptText = imagePromptInput.value.trim();
  if (!promptText) {
    statusDiv.textContent = "Please enter an image prompt!";
    return;
  }

  // Generate a unique ID for the image
  imageCounter++;
  const uniqueId = `img-${Date.now()}-${imageCounter}`;

  // Create img element with src and alt set to the prompt text.
  const imgElement = document.createElement('img');
  imgElement.id = uniqueId;
  imgElement.src = promptText;
  imgElement.alt = promptText;
  imgElement.classList.add('dynamic-image');
  imageContainer.appendChild(imgElement);

  statusDiv.textContent = "Loading image...";

  // Store the original prompt text to later compare with the updated src.
  const originalSrc = promptText;

  // Polling to check if the src attribute has been changed by the browser after loading.
  const checkInterval = setInterval(() => {
    // When the image loads, the browser often converts a relative URL into an absolute URL,
    // which would differ from the original prompt text.
    if (imgElement.src !== originalSrc) {
      clearInterval(checkInterval);
      statusDiv.textContent = "Image loaded successfully!";
      imgElement.classList.add('loaded');
    }
  }, 100);
});