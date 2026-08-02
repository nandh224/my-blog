(() => {
  const GRID_SIZE = 16;
  const EXPORT_SCALE = 32; // 16 * 32 = 512px 출력

  const canvas = document.getElementById("grid");
  const ctx = canvas.getContext("2d");
  const swatchesEl = document.getElementById("swatches");
  const customColorInput = document.getElementById("custom-color-input");
  const currentColorPreview = document.getElementById("current-color-preview");
  const eraserBtn = document.getElementById("eraser-btn");
  const clearBtn = document.getElementById("clear-btn");
  const saveBtn = document.getElementById("save-btn");

  let pixels = createEmptyPixels();
  let currentColor = "#000000";
  let isErasing = false;
  let isPointerDown = false;
  let lastCell = null;

  function createEmptyPixels() {
    return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  }

  function paintCell(row, col, color) {
    pixels[row][col] = color;
    ctx.fillStyle = color;
    ctx.fillRect(col, row, 1, 1);
  }

  function eraseCell(row, col) {
    pixels[row][col] = null;
    ctx.clearRect(col, row, 1, 1);
  }

  function renderAll() {
    ctx.clearRect(0, 0, GRID_SIZE, GRID_SIZE);
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const color = pixels[r][c];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(c, r, 1, 1);
        }
      }
    }
  }

  function clearCanvas() {
    pixels = createEmptyPixels();
    renderAll();
  }

  function cellFromPointerEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const point = event.touches?.[0] || event.changedTouches?.[0] || event;
    const col = Math.floor(((point.clientX - rect.left) / rect.width) * GRID_SIZE);
    const row = Math.floor(((point.clientY - rect.top) / rect.height) * GRID_SIZE);
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
    return { row, col };
  }

  function applyToolAt(row, col) {
    if (isErasing) {
      eraseCell(row, col);
    } else {
      paintCell(row, col, currentColor);
    }
  }

  // 빠르게 드래그하면 mousemove가 모든 칸마다 발생하지 않아 사이 칸이 비는 문제를
  // 막기 위해, 이전 셀과 현재 셀 사이를 Bresenham 직선 알고리즘으로 채운다.
  function applyToolAlongLine(from, to) {
    let row = from.row;
    let col = from.col;
    const dCol = Math.abs(to.col - col);
    const dRow = -Math.abs(to.row - row);
    const stepCol = col < to.col ? 1 : -1;
    const stepRow = row < to.row ? 1 : -1;
    let err = dCol + dRow;
    while (true) {
      if (row !== from.row || col !== from.col) {
        applyToolAt(row, col);
      }
      if (row === to.row && col === to.col) break;
      const e2 = 2 * err;
      if (e2 >= dRow) {
        err += dRow;
        col += stepCol;
      }
      if (e2 <= dCol) {
        err += dCol;
        row += stepRow;
      }
    }
  }

  function paintAtEvent(event) {
    const cell = cellFromPointerEvent(event);
    if (!cell) return;
    if (lastCell && lastCell.row === cell.row && lastCell.col === cell.col) return;
    if (lastCell) {
      applyToolAlongLine(lastCell, cell);
    } else {
      applyToolAt(cell.row, cell.col);
    }
    lastCell = cell;
  }

  function selectColor(color) {
    currentColor = color;
    isErasing = false;
    eraserBtn.classList.remove("active");
    eraserBtn.setAttribute("aria-pressed", "false");
    currentColorPreview.style.background = color;
    swatchesEl.querySelectorAll(".swatch").forEach((el) => {
      el.classList.toggle("selected", el.dataset.color === color);
    });
  }

  swatchesEl.addEventListener("click", (e) => {
    const swatch = e.target.closest(".swatch");
    if (!swatch) return;
    selectColor(swatch.dataset.color);
  });

  customColorInput.addEventListener("input", (e) => {
    selectColor(e.target.value);
  });

  eraserBtn.addEventListener("click", () => {
    isErasing = !isErasing;
    eraserBtn.classList.toggle("active", isErasing);
    eraserBtn.setAttribute("aria-pressed", String(isErasing));
  });

  clearBtn.addEventListener("click", clearCanvas);

  canvas.addEventListener("mousedown", (e) => {
    isPointerDown = true;
    lastCell = null;
    paintAtEvent(e);
  });

  document.addEventListener("mousemove", (e) => {
    if (!isPointerDown) return;
    paintAtEvent(e);
  });

  document.addEventListener("mouseup", () => {
    isPointerDown = false;
    lastCell = null;
  });

  canvas.addEventListener("mouseleave", () => {
    lastCell = null;
  });

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    isPointerDown = true;
    lastCell = null;
    paintAtEvent(e);
  });

  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (!isPointerDown) return;
    paintAtEvent(e);
  });

  canvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    isPointerDown = false;
    lastCell = null;
  });

  canvas.addEventListener("touchcancel", () => {
    isPointerDown = false;
    lastCell = null;
  });

  function exportPng() {
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = GRID_SIZE * EXPORT_SCALE;
    exportCanvas.height = GRID_SIZE * EXPORT_SCALE;
    const exportCtx = exportCanvas.getContext("2d");
    exportCtx.imageSmoothingEnabled = false;

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const color = pixels[r][c];
        if (!color) continue; // 미채색 칸은 그대로 두어 투명 처리
        exportCtx.fillStyle = color;
        exportCtx.fillRect(c * EXPORT_SCALE, r * EXPORT_SCALE, EXPORT_SCALE, EXPORT_SCALE);
      }
    }

    const link = document.createElement("a");
    link.download = "pixel-art.png";
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
  }

  saveBtn.addEventListener("click", exportPng);

  selectColor(currentColor);
  renderAll();
})();
