// Unique image counter to help generate unique IDs.
let imageCounter = 0;

const loadImageBtn = document.getElementById('load-image-btn');
const imagePromptInput = document.getElementById('image-prompt');
const cardImageContainer = document.getElementById('card-image-container');
const statusDiv = document.getElementById('status');
const cardDiv = document.getElementById('card');
const printBtn = document.getElementById('print-btn');

loadImageBtn.addEventListener('click', () => {
  const promptText = imagePromptInput.value.trim();
  if (!promptText) {
    statusDiv.textContent = "Please enter an image prompt!";
    return;
  }

  // Clear previous image and hide card if it was previously shown.
  cardImageContainer.innerHTML = '';
  cardDiv.style.display = 'none';
  statusDiv.textContent = "Loading image...";

  // Generate a unique ID for the image.
  imageCounter++;
  const uniqueId = `img-${Date.now()}-${imageCounter}`;

  // Create an img element with src and alt set to the prompt text.
  const imgElement = document.createElement('img');
  imgElement.id = uniqueId;
  imgElement.src = promptText;
  imgElement.alt = promptText;
  cardImageContainer.appendChild(imgElement);

  // Store the original prompt text to compare after the image loads.
  const originalSrc = promptText;

  // Poll to check when the image has loaded (src attribute updating).
  const checkInterval = setInterval(() => {
    if (imgElement.src !== originalSrc) {
      clearInterval(checkInterval);
      statusDiv.textContent = "Image loaded successfully!";
      imgElement.classList.add('loaded');
      cardDiv.style.display = 'block'; // Reveal the card
    }
  }, 100);
});

printBtn.addEventListener('click', () => {
  window.print();
});