// Unique image counter to help generate unique IDs.
let imageCounter = 0;

const loadImageBtn = document.getElementById('load-image-btn');
const imagePromptInput = document.getElementById('image-prompt');
const cardImageContainer = document.getElementById('card-image-container');
const statusDiv = document.getElementById('status');
const cardDiv = document.getElementById('card');
const printBtn = document.getElementById('print-btn');

// New DOM elements for outline mode and painting features.
const outlineModeCheckbox = document.getElementById('outline-mode');
const paintPanel = document.getElementById('paint-panel');
const brushColorInput = document.getElementById('brush-color');
const brushSizeInput = document.getElementById('brush-size');
const clearPaintBtn = document.getElementById('clear-paint-btn');

// Global variable to store the current overlay canvas for painting.
let currentOverlayCanvas = null;

// Toggle the display of the paint panel based on the Outline Mode checkbox.
outlineModeCheckbox.addEventListener('change', () => {
  if (outlineModeCheckbox.checked) {
    paintPanel.style.display = 'block';
  } else {
    paintPanel.style.display = 'none';
  }
});

loadImageBtn.addEventListener('click', () => {
  const promptText = imagePromptInput.value.trim();
  if (!promptText) {
    statusDiv.textContent = "Please enter an image prompt!";
    return;
  }

  // Clear previous image/canvas and hide card preview.
  cardImageContainer.innerHTML = '';
  cardDiv.style.display = 'none';
  statusDiv.textContent = "Loading image...";

  imageCounter++;
  const uniqueId = `img-${Date.now()}-${imageCounter}`;

  // Create an image element with the prompt text as src and alt.
  const imgElement = document.createElement('img');
  imgElement.id = uniqueId;
  imgElement.src = promptText;
  imgElement.alt = promptText;
  // If Outline Mode is selected, hide the raw image (we'll process it into a canvas).
  if (outlineModeCheckbox.checked) {
    imgElement.style.display = 'none';
  }
  cardImageContainer.appendChild(imgElement);

  const originalSrc = promptText;
  const checkInterval = setInterval(() => {
    // Check if the image has loaded by using its complete property and naturalWidth.
    if (imgElement.complete && imgElement.naturalWidth !== 0) {
      clearInterval(checkInterval);
      statusDiv.textContent = "Image loaded successfully!";
      if (outlineModeCheckbox.checked) {
        // Process the loaded image to create an outline version with a painting overlay.
        cardImageContainer.innerHTML = '';
        const canvasWrapper = createCanvasWrapperWithOutline(imgElement);
        cardImageContainer.appendChild(canvasWrapper);
      } else {
        imgElement.classList.add('loaded');
      }
      cardDiv.style.display = 'block';
    }
  }, 100);
});

printBtn.addEventListener('click', () => {
  window.print();
});

// Create a canvas wrapper that contains the outline processed canvas and an overlay canvas for painting.
function createCanvasWrapperWithOutline(imgElement) {
  const width = imgElement.naturalWidth;
  const height = imgElement.naturalHeight;

  // Create the canvas for the outline effect.
  const outlineCanvas = document.createElement('canvas');
  outlineCanvas.width = width;
  outlineCanvas.height = height;
  outlineCanvas.style.position = 'absolute';
  outlineCanvas.style.top = '0';
  outlineCanvas.style.left = '0';
  const outlineCtx = outlineCanvas.getContext('2d');
  outlineCtx.drawImage(imgElement, 0, 0, width, height);
  let imageData = outlineCtx.getImageData(0, 0, width, height);
  let processedData = applyEdgeDetection(imageData, width, height);
  outlineCtx.putImageData(processedData, 0, 0);

  // Create the overlay canvas for painting.
  const overlayCanvas = document.createElement('canvas');
  overlayCanvas.width = width;
  overlayCanvas.height = height;
  overlayCanvas.style.position = 'absolute';
  overlayCanvas.style.top = '0';
  overlayCanvas.style.left = '0';

  // Store the overlay canvas globally to allow clearing.
  currentOverlayCanvas = overlayCanvas;

  // Create a wrapper div to stack the canvases.
  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.style.width = width + 'px';
  wrapper.style.height = height + 'px';
  wrapper.appendChild(outlineCanvas);
  wrapper.appendChild(overlayCanvas);

  // Set up painting on the overlay canvas.
  setUpPainting(overlayCanvas);
  return wrapper;
}

// Apply a simple Laplacian edge detection filter to the image data.
function applyEdgeDetection(imageData, width, height) {
  const src = imageData.data;
  const output = new ImageData(width, height);
  const dst = output.data;
  const gray = new Uint8ClampedArray(width * height);

  // Convert the image to grayscale.
  for (let i = 0; i < width * height; i++) {
    const r = src[i * 4];
    const g = src[i * 4 + 1];
    const b = src[i * 4 + 2];
    gray[i] = 0.3 * r + 0.59 * g + 0.11 * b;
  }

  // Apply the Laplacian kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const weight = (kx === 0 && ky === 0) ? 8 : -1;
          const idx = ((y + ky) * width + (x + kx));
          sum += weight * gray[idx];
        }
      }
      sum = Math.abs(sum);
      if (sum > 255) sum = 255;
      const index = (y * width + x) * 4;
      dst[index] = sum;
      dst[index + 1] = sum;
      dst[index + 2] = sum;
      dst[index + 3] = 255;
    }
  }

  // Set border pixels to white.
  for (let x = 0; x < width; x++) {
    let topIndex = x * 4;
    let bottomIndex = ((height - 1) * width + x) * 4;
    dst[topIndex] = 255; dst[topIndex+1] = 255; dst[topIndex+2] = 255; dst[topIndex+3] = 255;
    dst[bottomIndex] = 255; dst[bottomIndex+1] = 255; dst[bottomIndex+2] = 255; dst[bottomIndex+3] = 255;
  }
  for (let y = 0; y < height; y++) {
    let leftIndex = (y * width) * 4;
    let rightIndex = (y * width + (width - 1)) * 4;
    dst[leftIndex] = 255; dst[leftIndex+1] = 255; dst[leftIndex+2] = 255; dst[leftIndex+3] = 255;
    dst[rightIndex] = 255; dst[rightIndex+1] = 255; dst[rightIndex+2] = 255; dst[rightIndex+3] = 255;
  }
  return output;
}

// Set up painting functionality on the overlay canvas.
function setUpPainting(canvas) {
  const ctx = canvas.getContext('2d');
  let isPainting = false;
  let lastX = 0, lastY = 0;

  canvas.addEventListener('mousedown', (e) => {
    isPainting = true;
    const rect = canvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isPainting) return;
    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    ctx.strokeStyle = brushColorInput.value;
    ctx.lineWidth = brushSizeInput.value;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastX = x;
    lastY = y;
  });

  canvas.addEventListener('mouseup', () => isPainting = false);
  canvas.addEventListener('mouseout', () => isPainting = false);
}

// Clear the overlay canvas when the user clicks "Clear Painting".
clearPaintBtn.addEventListener('click', () => {
  if (currentOverlayCanvas) {
    const ctx = currentOverlayCanvas.getContext('2d');
    ctx.clearRect(0, 0, currentOverlayCanvas.width, currentOverlayCanvas.height);
  }
});