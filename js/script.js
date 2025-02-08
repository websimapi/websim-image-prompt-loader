// Global variables
let imageCounter = 0;
let currentOutlineCanvas = null;  // For outline mode single canvas
let currentBaselineImageData = null; // Stores baseline outlined image data
let currentImageElement = null; // To reprocess outline when threshold changes

const loadImageBtn = document.getElementById('load-image-btn');
const imagePromptInput = document.getElementById('image-prompt');
const cardImageContainer = document.getElementById('card-image-container');
const statusDiv = document.getElementById('status');
const cardDiv = document.getElementById('card');
const printBtn = document.getElementById('print-btn');

const outlineModeCheckbox = document.getElementById('outline-mode');
const paintPanel = document.getElementById('paint-panel');
const brushColorInput = document.getElementById('brush-color');
const brushSizeInput = document.getElementById('brush-size');
const clearPaintBtn = document.getElementById('clear-paint-btn');

const edgeThresholdInput = document.getElementById('edge-threshold');
const edgeThresholdValueSpan = document.getElementById('edge-threshold-value');
const edgeThresholdControl = document.getElementById('edge-threshold-control');

let edgeThreshold = parseInt(edgeThresholdInput.value, 10);

// Toggle display of paint panel and edge threshold control based on Outline Mode checkbox.
outlineModeCheckbox.addEventListener('change', () => {
  if (outlineModeCheckbox.checked) {
    paintPanel.style.display = 'block';
    edgeThresholdControl.style.display = 'block';
  } else {
    paintPanel.style.display = 'none';
    edgeThresholdControl.style.display = 'none';
  }
});

edgeThresholdInput.addEventListener('input', () => {
  edgeThreshold = parseInt(edgeThresholdInput.value, 10);
  edgeThresholdValueSpan.textContent = edgeThreshold;
  if (outlineModeCheckbox.checked && currentOutlineCanvas && currentImageElement) {
    updateOutlineCanvas();
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

  // Create an image element.
  const imgElement = document.createElement('img');
  imgElement.id = uniqueId;
  imgElement.crossOrigin = 'anonymous';
  imgElement.src = promptText;
  imgElement.alt = promptText;
  
  if (outlineModeCheckbox.checked) {
    // In outline mode, we'll process the image using canvas.
    imgElement.style.display = 'none';
  }
  
  cardImageContainer.appendChild(imgElement);

  const originalSrc = promptText;
  const checkInterval = setInterval(() => {
    if (imgElement.complete && imgElement.naturalWidth !== 0) {
      clearInterval(checkInterval);
      statusDiv.textContent = "Image loaded successfully!";
      if (outlineModeCheckbox.checked) {
        // Process the loaded image to create an outline version with painting on a single canvas.
        cardImageContainer.innerHTML = '';
        currentImageElement = imgElement; // store for future updates
        const wrapper = createCanvasWrapperWithOutline(imgElement);
        cardImageContainer.appendChild(wrapper);
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

// Create a canvas wrapper with outlined image and painting functionality.
function createCanvasWrapperWithOutline(imgElement) {
  const width = imgElement.naturalWidth;
  const height = imgElement.naturalHeight;
  
  // Create a single canvas.
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  
  const ctx = canvas.getContext('2d');
  // Draw the original image onto the canvas.
  ctx.drawImage(imgElement, 0, 0, width, height);
  let imageData = ctx.getImageData(0, 0, width, height);
  let processedData = applyEdgeDetection(imageData, width, height, edgeThreshold);
  ctx.putImageData(processedData, 0, 0);
  
  // Store baseline outlined image data for clearing painting.
  currentBaselineImageData = ctx.getImageData(0, 0, width, height);
  
  // Create a wrapper div to maintain aspect ratio.
  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.style.width = '100%';
  wrapper.style.paddingTop = (height / width * 100) + '%';
  wrapper.appendChild(canvas);
  
  // Set up painting on this canvas.
  setUpPainting(canvas);
  currentOutlineCanvas = canvas;
  return wrapper;
}

// Update the outline canvas when edge threshold changes.
function updateOutlineCanvas() {
  const canvas = currentOutlineCanvas;
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d');
  // Redraw the original image and apply edge detection.
  ctx.drawImage(currentImageElement, 0, 0, width, height);
  let imageData = ctx.getImageData(0, 0, width, height);
  let processedData = applyEdgeDetection(imageData, width, height, edgeThreshold);
  ctx.putImageData(processedData, 0, 0);
  // Update the baseline image data.
  currentBaselineImageData = ctx.getImageData(0, 0, width, height);
}

// Enhanced edge detection using Laplacian kernel and adjustable threshold.
// Produces black outlines on a white background.
function applyEdgeDetection(imageData, width, height, threshold) {
  const src = imageData.data;
  const output = new ImageData(width, height);
  const dst = output.data;
  const gray = new Uint8ClampedArray(width * height);

  // Convert image to grayscale.
  for (let i = 0; i < width * height; i++) {
    const r = src[i * 4];
    const g = src[i * 4 + 1];
    const b = src[i * 4 + 2];
    gray[i] = 0.3 * r + 0.59 * g + 0.11 * b;
  }

  // Apply Laplacian kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
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
      let inverted = 255 - sum;
      // Use adjustable threshold: pixels with inverted value below threshold become black, else white.
      let finalColor = (inverted < threshold ? 0 : 255);
      const index = (y * width + x) * 4;
      dst[index] = finalColor;
      dst[index + 1] = finalColor;
      dst[index + 2] = finalColor;
      dst[index + 3] = 255;
    }
  }

  // Set border pixels to white.
  for (let x = 0; x < width; x++) {
    let topIndex = x * 4;
    let bottomIndex = ((height - 1) * width + x) * 4;
    dst[topIndex] = 255; dst[topIndex + 1] = 255; dst[topIndex + 2] = 255; dst[topIndex + 3] = 255;
    dst[bottomIndex] = 255; dst[bottomIndex + 1] = 255; dst[bottomIndex + 2] = 255; dst[bottomIndex + 3] = 255;
  }
  for (let y = 0; y < height; y++) {
    let leftIndex = (y * width) * 4;
    let rightIndex = (y * width + (width - 1)) * 4;
    dst[leftIndex] = 255; dst[leftIndex + 1] = 255; dst[leftIndex + 2] = 255; dst[leftIndex + 3] = 255;
    dst[rightIndex] = 255; dst[rightIndex + 1] = 255; dst[rightIndex + 2] = 255; dst[rightIndex + 3] = 255;
  }
  return output;
}

// Set up painting functionality on the provided canvas.
function setUpPainting(canvas) {
  const ctx = canvas.getContext('2d');
  let isPainting = false;
  let lastX = 0, lastY = 0;

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    if (getSelectedTool() === "fill") {
      floodFillAt(canvas, x, y, brushColorInput.value);
      return;
    } else {
      isPainting = true;
      lastX = x;
      lastY = y;
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isPainting) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
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

// Helper to get the currently selected painting tool.
function getSelectedTool() {
  const toolRadio = document.querySelector('input[name="paint-tool"]:checked');
  return toolRadio ? toolRadio.value : "brush";
}

// Flood fill implementation on the canvas for the fill bucket tool.
function floodFillAt(canvas, startX, startY, fillColor) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  let imageData;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch (e) {
    console.error("Unable to access image data for flood fill:", e);
    return;
  }
  const data = imageData.data;
  const x = Math.floor(startX);
  const y = Math.floor(startY);
  const targetIndex = (y * width + x) * 4;
  const targetColor = [
    data[targetIndex],
    data[targetIndex + 1],
    data[targetIndex + 2],
    data[targetIndex + 3]
  ];
  const fillColorArray = fillColorToArray(fillColor);
  if (matchColor(targetColor, fillColorArray, 0)) return;
  
  const fillTolerance = 32;
  const stack = [];
  stack.push([x, y]);
  while (stack.length) {
    const [cx, cy] = stack.pop();
    const idx = (cy * width + cx) * 4;
    const currentColor = [
      data[idx],
      data[idx + 1],
      data[idx + 2],
      data[idx + 3]
    ];
    if (!matchColor(currentColor, targetColor, fillTolerance)) continue;
    data[idx] = fillColorArray[0];
    data[idx + 1] = fillColorArray[1];
    data[idx + 2] = fillColorArray[2];
    data[idx + 3] = fillColorArray[3];
    if (cx > 0) stack.push([cx - 1, cy]);
    if (cx < width - 1) stack.push([cx + 1, cy]);
    if (cy > 0) stack.push([cx, cy - 1]);
    if (cy < height - 1) stack.push([cx, cy + 1]);
  }
  ctx.putImageData(imageData, 0, 0);
}

// Convert a hex color string to an RGBA array.
function fillColorToArray(hex) {
  if (hex[0] === '#') hex = hex.slice(1);
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return [r, g, b, 255];
}

// Compare two RGBA color arrays with an optional tolerance.
function matchColor(color1, color2, tolerance = 0) {
  return (
    Math.abs(color1[0] - color2[0]) <= tolerance &&
    Math.abs(color1[1] - color2[1]) <= tolerance &&
    Math.abs(color1[2] - color2[2]) <= tolerance &&
    Math.abs(color1[3] - color2[3]) <= tolerance
  );
}

// Clear the painting. In outline mode, restore the baseline outlined image.
clearPaintBtn.addEventListener('click', () => {
  if (outlineModeCheckbox.checked && currentOutlineCanvas && currentBaselineImageData) {
    const ctx = currentOutlineCanvas.getContext('2d');
    ctx.putImageData(currentBaselineImageData, 0, 0);
  } else if (currentOutlineCanvas) { // fallback, though normally non-outline mode doesn't have painting
    const ctx = currentOutlineCanvas.getContext('2d');
    ctx.clearRect(0, 0, currentOutlineCanvas.width, currentOutlineCanvas.height);
  }
});