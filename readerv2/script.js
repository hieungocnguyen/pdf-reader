var url = "./bitcoin.pdf";
var { pdfjsLib } = globalThis;
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://mozilla.github.io/pdf.js/build/pdf.worker.mjs";

var pdfDoc = null,
  pageNum = 1,
  pageRendering = false,
  pageNumPending = null,
  scale = 1.5,
  canvas = document.getElementById("pdf-canvas"),
  ctx = canvas.getContext("2d");

//cropper
canvasCropper = document.getElementById("cropper-canvas");
const ctxCropper = canvasCropper.getContext("2d");
const exportBtn = document.getElementById("exportBtn");
const output = document.getElementById("output");
let isDrawing = false;
let startX = 0;
let startY = 0;
let rect = {};

//viewer
pdfViewer = document.getElementById("pdf-viewer");

/**
 * Get page info from document, resize canvas accordingly, and render page.
 * @param num Page number.
 */
function renderPage(num) {
  pageRendering = true;
  pdfDoc.getPage(num).then(function (page) {
    var viewport = page.getViewport({ scale: 1 });
    var viewerWidth = document.getElementById("pdf-viewer").clientWidth;
    var scale = viewerWidth / viewport.width;
    var scaledViewport = page.getViewport({ scale: scale });

    canvas.height = scaledViewport.height;
    canvas.width = scaledViewport.width;

    pdfViewer.style.height = scaledViewport.height + "px";

    canvasCropper.height = scaledViewport.height;
    canvasCropper.width = scaledViewport.width;

    // Render PDF page into canvas context
    var renderContext = {
      canvasContext: ctx,
      viewport: scaledViewport,
    };
    var renderTask = page.render(renderContext);

    // Wait for rendering to finish
    renderTask.promise.then(function () {
      pageRendering = false;
      if (pageNumPending !== null) {
        // New page rendering is pending
        renderPage(pageNumPending);
        pageNumPending = null;
      }
    });
  });

  // Update page counters
  document.getElementById("page-num").textContent = num;
}

/**
 * If another page rendering in progress, waits until the rendering is
 * finished. Otherwise, executes rendering immediately.
 */
function queueRenderPage(num) {
  if (pageRendering) {
    pageNumPending = num;
  } else {
    renderPage(num);
  }
}

/**
 * Displays previous page.
 */
function onPrevPage() {
  if (pageNum <= 1) {
    return;
  }
  pageNum--;
  queueRenderPage(pageNum);
}
document.getElementById("prev-page").addEventListener("click", onPrevPage);

/**
 * Displays next page.
 */
function onNextPage() {
  if (pageNum >= pdfDoc.numPages) {
    return;
  }
  pageNum++;
  queueRenderPage(pageNum);
}
document.getElementById("next-page").addEventListener("click", onNextPage);

/**
 * Asynchronously downloads PDF.
 */
pdfjsLib.getDocument(url).promise.then(function (pdfDoc_) {
  pdfDoc = pdfDoc_;
  document.getElementById("page-count").textContent = pdfDoc.numPages;

  // Initial/first page rendering
  renderPage(pageNum);
});


//cropper
canvasCropper.addEventListener("mousedown", startDrawing);
canvasCropper.addEventListener("mousemove", draw);
canvasCropper.addEventListener("mouseup", finishDrawing);
exportBtn.addEventListener("click", exportCropDimensions);

function startDrawing(e) {
  isDrawing = true;
  startX = e.offsetX;
  startY = e.offsetY;
}

function draw(e) {
  if (!isDrawing) return;

  const mouseX = e.offsetX;
  const mouseY = e.offsetY;

  const width = mouseX - startX;
  const height = mouseY - startY;

  rect = {
    x: startX,
    y: startY,
    width: width,
    height: height,
  };

  ctxCropper.clearRect(0, 0, canvas.width, canvas.height);
  ctxCropper.strokeRect(rect.x, rect.y, rect.width, rect.height);
}

function finishDrawing() {
  isDrawing = false;
}

function exportCropDimensions() {
  if (rect.width && rect.height) {
    output.innerHTML = `
        <p>Top: ${rect.y}px</p>
        <p>Left: ${rect.x}px</p>
        <p>Width: ${rect.width}px</p>
        <p>Height: ${rect.height}px</p>
      `;
  } else {
    output.innerHTML = "<p>No cropping area selected.</p>";
  }
}
