const canvasContainer = document.getElementById('canvas-container');
const screenSizeSelect = document.getElementById('screen-size');
const currentSizeLabel = document.getElementById('current-size');
const customSizeRow = document.getElementById('custom-size');
const customWidthInput = document.getElementById('custom-width');
const customHeightInput = document.getElementById('custom-height');
const applyCustomBtn = document.getElementById('apply-custom');

const screenDropdown = document.getElementById('screen-select');
const addScreenBtn = document.getElementById('add-screen');
const duplicateScreenBtn = document.getElementById('duplicate-screen');
const deleteScreenBtn = document.getElementById('delete-screen');

const helpButton = document.getElementById('help-button');
const previewButton = document.getElementById('preview-button');
const helpModal = document.getElementById('help-modal');
const closeHelpBtn = document.getElementById('close-help');
const modalBackdrop = document.getElementById('modal-backdrop');

const selectionBar = document.getElementById('selection-bar');
const selectionLabel = document.getElementById('selection-label');
const linkSelect = document.getElementById('link-select');
const clearLinkBtn = document.getElementById('clear-link');

const previewBackdrop = document.getElementById('preview-backdrop');
const previewScreenSelect = document.getElementById('preview-screen-select');
const previewCanvasContainer = document.getElementById('preview-canvas-container');
const closePreviewBtn = document.getElementById('close-preview');
const previewModal = document.getElementById('preview-modal');
const previewFullscreenBtn = document.getElementById('preview-fullscreen');

let selectedElement = null;
let dragState = null;
let resizeState = null;
let lastFocusedBeforeHelp = null;

const GRID_SIZE = 16;
const MIN_WIDTH = 60;
const MIN_HEIGHT = 40;
const PASTE_OFFSET_STEP = 16;

let clipboardItem = null;
let pasteIteration = 0;
let isUpdatingLinkSelect = false;
let previewActiveScreenId = null;
let previousBodyOverflow = '';
let previewLayoutObserver = null;

const screens = new Map();
let screenCounter = 1;
let activeScreenId = null;

const SIZE_PRESETS = {
  '375x667': { width: 375, height: 667 },
  '768x1024': { width: 768, height: 1024 },
  '1280x720': { width: 1280, height: 720 },
  '1440x900': { width: 1440, height: 900 },
  '1920x1080': { width: 1920, height: 1080 }
};

const COMPONENT_DEFAULTS = {
  button: { width: 140, height: 48 },
  input: { width: 260, height: 48 },
  dropdown: { width: 260, height: 48 },
  card: { width: 280, height: 200 },
  heading: { width: 280, height: 60 },
  paragraph: { width: 320, height: 120 },
  image: { width: 200, height: 160 }
};

let scaleFrameId = null;
let layoutObserver = null;

function getCanvasScale(canvasEl) {
  if (!canvasEl) return 1;
  const scale = parseFloat(canvasEl.dataset?.scale);
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

function scheduleCanvasScale(canvasEl) {
  if (!canvasEl) return;
  if (scaleFrameId) {
    cancelAnimationFrame(scaleFrameId);
  }
  scaleFrameId = window.requestAnimationFrame(() => {
    scaleFrameId = null;
    applyCanvasScale(canvasEl);
  });
}

function applyCanvasScale(canvasEl) {
  if (!canvasEl) return;

  const container = canvasEl.closest('.canvas-container');
  if (!container) return;

  const width = canvasEl.offsetWidth;
  const height = canvasEl.offsetHeight;

  if (!width || !height) {
    canvasEl.dataset.scale = '1';
    canvasEl.style.transform = 'scale(1)';
    canvasEl.style.position = '';
    canvasEl.style.top = '';
    canvasEl.style.left = '';
    container.style.height = '';
    return;
  }

  const containerStyles = window.getComputedStyle(container);
  const paddingLeft = parseFloat(containerStyles.paddingLeft || '0');
  const paddingRight = parseFloat(containerStyles.paddingRight || '0');
  const paddingTop = parseFloat(containerStyles.paddingTop || '0');
  const paddingBottom = parseFloat(containerStyles.paddingBottom || '0');

  let availableWidth = container.clientWidth - (paddingLeft + paddingRight);
  if (!Number.isFinite(availableWidth) || availableWidth <= 0) {
    availableWidth = width;
  }

  const containerRect = container.getBoundingClientRect();
  const viewportAvailable = window.innerHeight - containerRect.top - paddingTop - paddingBottom - 16;
  let availableHeight = Number.isFinite(viewportAvailable) ? viewportAvailable : height;
  const footer = document.querySelector('.status-bar');
  if (footer) {
    const footerRect = footer.getBoundingClientRect();
    const footerAvailable = footerRect.top - containerRect.top - paddingTop - paddingBottom - 16;
    if (Number.isFinite(footerAvailable)) {
      availableHeight = Math.min(availableHeight, footerAvailable);
    }
  }
  if (!Number.isFinite(availableHeight) || availableHeight <= 0) {
    availableHeight = Number.isFinite(viewportAvailable) && viewportAvailable > 0
      ? viewportAvailable
      : 120;
  }

  const rawScale = Math.min(1, availableWidth / width, availableHeight / height);
  const scale = Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 1;

  const scaledHeight = height * scale;
  const targetHeight = Math.max(scaledHeight + paddingTop + paddingBottom, 0);
  const currentHeight = parseFloat(container.style.height || '0');
  if (!Number.isFinite(currentHeight) || Math.abs(currentHeight - targetHeight) > 0.5) {
    container.style.height = `${targetHeight}px`;
  }

  canvasEl.dataset.scale = String(scale);
  canvasEl.style.position = 'absolute';
  canvasEl.style.top = `${paddingTop}px`;
  canvasEl.style.left = `${paddingLeft}px`;
  canvasEl.style.transformOrigin = 'top left';
  canvasEl.style.transform = `scale(${scale})`;
  canvasEl.style.margin = '0';
}

function init() {
  attachPaletteEvents();
  attachGlobalEvents();
  attachScreenControls();
  attachScreenManager();
  attachHelpModal();
  attachSelectionControls();
  attachPreviewControls();
  if (typeof ResizeObserver !== 'undefined' && canvasContainer) {
    layoutObserver = new ResizeObserver(() => {
      if (activeScreenId && screens.has(activeScreenId)) {
        scheduleCanvasScale(screens.get(activeScreenId).canvas);
      }
    });
    layoutObserver.observe(canvasContainer);
  }
  if (typeof ResizeObserver !== 'undefined' && previewCanvasContainer) {
    previewLayoutObserver = new ResizeObserver(() => {
      scaleAllPreviewCanvases();
    });
    previewLayoutObserver.observe(previewCanvasContainer);
  }
  window.addEventListener('resize', () => {
    if (activeScreenId && screens.has(activeScreenId)) {
      scheduleCanvasScale(screens.get(activeScreenId).canvas);
    }
    if (isPreviewOpen()) {
      scaleAllPreviewCanvases();
    }
  });

  const firstScreenId = createScreen('Screen 1');
  setActiveScreen(firstScreenId);
}

function attachPaletteEvents() {
  const items = document.querySelectorAll('.palette-item');
  items.forEach((item) => {
    item.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', event.target.dataset.type);
      event.dataTransfer.effectAllowed = 'copy';
    });
  });
}

function attachCanvasEvents(canvasEl) {
  canvasEl.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  });

  canvasEl.addEventListener('drop', (event) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('text/plain');
    if (!type) return;
    const rect = canvasEl.getBoundingClientRect();
    const scale = getCanvasScale(canvasEl);
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;
    addComponentToCanvas(canvasEl, type, x, y);
  });

  canvasEl.addEventListener('mousedown', (event) => {
    if (event.target === canvasEl) {
      clearSelection();
    }
  });
}

function attachGlobalEvents() {
  document.addEventListener('mousemove', (event) => {
    if (dragState) {
      event.preventDefault();
      moveElement(event);
    } else if (resizeState) {
      event.preventDefault();
      resizeElement(event);
    }
  });

  document.addEventListener('mouseup', () => {
    dragState = null;
    resizeState = null;
  });

  document.addEventListener('keydown', (event) => {
    if (isPreviewOpen()) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePreview();
      }
      return;
    }

    if (isHelpOpen() && event.key === 'Escape') {
      closeHelpModal();
      return;
    }

    const isModifier = event.ctrlKey || event.metaKey;
    const lowerKey = event.key.toLowerCase();
    const isTypingContext = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) || (event.target && event.target.isContentEditable);

    if (isModifier && lowerKey === 'c' && !isTypingContext) {
      if (selectedElement && !selectedElement.classList.contains('editing')) {
        event.preventDefault();
        copySelectedElement();
      }
      return;
    }

    if (isModifier && lowerKey === 'v' && !isTypingContext) {
      event.preventDefault();
      pasteClipboardElement();
      return;
    }

    if (isModifier && lowerKey === 'd' && !isTypingContext) {
      if (selectedElement && !selectedElement.classList.contains('editing')) {
        event.preventDefault();
        copySelectedElement();
        pasteClipboardElement();
      }
      return;
    }

    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
      return;
    }
    if (event.target && event.target.isContentEditable) {
      return;
    }

    if (!selectedElement) return;
    if (selectedElement.classList.contains('editing')) return;

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      removeSelectedElement();
    } else if (event.key === 'Escape') {
      clearSelection();
    }
  });
}

function attachScreenControls() {
  screenSizeSelect.addEventListener('change', () => {
    const value = screenSizeSelect.value;
    if (value === 'custom') {
      customSizeRow.style.display = 'flex';
      customWidthInput.focus();
      return;
    }
    const preset = SIZE_PRESETS[value];
    if (!preset) return;
    customSizeRow.style.display = 'none';
    setCanvasSize(preset.width, preset.height, activeScreenId, value);
  });

  applyCustomBtn.addEventListener('click', () => {
    const width = parseInt(customWidthInput.value, 10);
    const height = parseInt(customHeightInput.value, 10);
    if (!width || !height) return;
    setCanvasSize(width, height, activeScreenId, 'custom');
  });
}

function attachScreenManager() {
  screenDropdown.addEventListener('change', (event) => {
    setActiveScreen(event.target.value);
  });

  addScreenBtn.addEventListener('click', () => {
    const suggested = `Screen ${screenCounter}`;
    const nameInput = prompt('Name for the new screen?', suggested);
    const screenId = createScreen(nameInput && nameInput.trim() ? nameInput.trim() : suggested);
    setActiveScreen(screenId);
  });

  duplicateScreenBtn.addEventListener('click', () => {
    duplicateActiveScreen();
  });

  deleteScreenBtn.addEventListener('click', () => {
    deleteActiveScreen();
  });
}

function attachHelpModal() {
  helpButton.addEventListener('click', openHelpModal);
  closeHelpBtn.addEventListener('click', closeHelpModal);
  modalBackdrop.addEventListener('click', closeHelpModal);
}

function isHelpOpen() {
  return !helpModal.classList.contains('hidden');
}

function openHelpModal() {
  if (isHelpOpen()) return;
  lastFocusedBeforeHelp = document.activeElement;
  helpModal.classList.remove('hidden');
  modalBackdrop.classList.remove('hidden');
  closeHelpBtn.focus();
}

function closeHelpModal() {
  if (!isHelpOpen()) return;
  helpModal.classList.add('hidden');
  modalBackdrop.classList.add('hidden');
  if (lastFocusedBeforeHelp && typeof lastFocusedBeforeHelp.focus === 'function') {
    lastFocusedBeforeHelp.focus({ preventScroll: true });
  }
}

function attachSelectionControls() {
  if (!selectionBar || !linkSelect || !clearLinkBtn || !selectionLabel) return;
  linkSelect.addEventListener('change', () => {
    if (isUpdatingLinkSelect) return;
    if (!selectedElement) return;
    const target = linkSelect.value;
    if (target && screens.has(target)) {
      selectedElement.dataset.targetScreen = target;
    } else {
      delete selectedElement.dataset.targetScreen;
    }
    applyLinkState(selectedElement);
    refreshSelectionBar();
  });

  clearLinkBtn.addEventListener('click', () => {
    if (!selectedElement) return;
    delete selectedElement.dataset.targetScreen;
    applyLinkState(selectedElement);
    refreshSelectionBar();
  });
}

function attachPreviewControls() {
  if (previewButton) {
    previewButton.addEventListener('click', openPreview);
  }
  if (closePreviewBtn) {
    closePreviewBtn.addEventListener('click', closePreview);
  }
  if (previewBackdrop) {
    previewBackdrop.addEventListener('click', (event) => {
      if (event.target === previewBackdrop) {
        closePreview();
      }
    });
  }
  if (previewScreenSelect) {
    previewScreenSelect.addEventListener('change', (event) => {
      activatePreviewScreen(event.target.value);
    });
  }
  if (previewFullscreenBtn) {
    previewFullscreenBtn.addEventListener('click', togglePreviewFullscreen);
  }
}

function createScreen(name) {
  const id = `screen-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const canvasEl = createCanvasElement(id);
  canvasEl.style.display = 'none';
  canvasContainer.appendChild(canvasEl);

  const { width, height } = SIZE_PRESETS['1280x720'];
  canvasEl.style.width = `${width}px`;
  canvasEl.style.height = `${height}px`;

  const screenData = {
    id,
    name,
    canvas: canvasEl,
    width,
    height,
    presetKey: '1280x720',
    option: null
  };

  const option = document.createElement('option');
  option.value = id;
  option.textContent = name;
  screenDropdown.appendChild(option);
  screenData.option = option;

  screens.set(id, screenData);
  screenCounter += 1;
  refreshSelectionBar();
  return id;
}

function setActiveScreen(id) {
  if (!screens.has(id)) return;
  if (activeScreenId === id) return;

  if (activeScreenId) {
    const current = screens.get(activeScreenId);
    current.canvas.style.display = 'none';
  }

  clearSelection();
  activeScreenId = id;

  const active = screens.get(id);
  active.canvas.style.display = 'block';
  scheduleCanvasScale(active.canvas);
  screenDropdown.value = id;
  updateSizeControls(active.width, active.height, active.presetKey);
  refreshSelectionBar();
}

function duplicateActiveScreen() {
  if (!activeScreenId || !screens.has(activeScreenId)) return;
  const source = screens.get(activeScreenId);
  const suggested = `${source.name} copy`;
  const nameInput = prompt('Name for the duplicated screen?', suggested);
  const duplicateName = nameInput && nameInput.trim() ? nameInput.trim() : suggested;

  const newScreenId = createScreen(duplicateName);
  const target = screens.get(newScreenId);

  setCanvasSize(source.width, source.height, newScreenId, source.presetKey);
  copyScreenContents(source.canvas, target.canvas);
  setActiveScreen(newScreenId);
}

function deleteActiveScreen() {
  if (!activeScreenId || !screens.has(activeScreenId)) return;
  if (screens.size === 1) {
    alert('Keep at least one screen in the project.');
    return;
  }

  const options = Array.from(screenDropdown.options);
  const currentIndex = options.findIndex((option) => option.value === activeScreenId);
  const candidateAfter = currentIndex >= 0 ? options[currentIndex + 1] : null;
  const candidateBefore = currentIndex > 0 ? options[currentIndex - 1] : null;
  const fallbackId = candidateAfter?.value || candidateBefore?.value || null;

  const screenToRemove = screens.get(activeScreenId);
  const confirmed = confirm(`Delete "${screenToRemove.name}"? This cannot be undone.`);
  if (!confirmed) return;

  clearSelection();
  if (screenToRemove.canvas.parentElement) {
    screenToRemove.canvas.parentElement.removeChild(screenToRemove.canvas);
  }
  if (screenToRemove.option) {
    screenToRemove.option.remove();
  }
  screens.delete(activeScreenId);
  clearLinksToScreen(screenToRemove.id);
  refreshSelectionBar();

  const nextId = fallbackId && screens.has(fallbackId)
    ? fallbackId
    : screens.size > 0
      ? screens.keys().next().value
      : null;

  activeScreenId = null;
  if (nextId) {
    setActiveScreen(nextId);
  } else {
    const newScreenId = createScreen(`Screen ${screenCounter}`);
    setActiveScreen(newScreenId);
  }
}

function createCanvasElement(id) {
  const canvasEl = document.createElement('div');
  canvasEl.className = 'canvas';
  canvasEl.id = id;
  canvasEl.setAttribute('tabindex', '0');
  canvasEl.setAttribute('aria-label', 'Wireframe canvas');
  canvasEl.dataset.scale = '1';
  attachCanvasEvents(canvasEl);
  return canvasEl;
}

function addComponentToCanvas(canvasEl, type, x, y) {
  const defaults = COMPONENT_DEFAULTS[type] || { width: 200, height: 120 };
  const element = buildComponent(type);
  const snappedWidth = snapDimensionWithin(defaults.width, MIN_WIDTH, canvasEl.offsetWidth);
  const snappedHeight = snapDimensionWithin(defaults.height, MIN_HEIGHT, canvasEl.offsetHeight);
  const position = clampPosition(canvasEl, x - snappedWidth / 2, y - snappedHeight / 2, snappedWidth, snappedHeight);
  element.style.width = `${snappedWidth}px`;
  element.style.height = `${snappedHeight}px`;
  element.style.left = `${position.x}px`;
  element.style.top = `${position.y}px`;

  canvasEl.appendChild(element);
  selectElement(element);
}

function buildComponent(type) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('wire-item');
  wrapper.dataset.type = type;
  wrapper.setAttribute('tabindex', '0');

  switch (type) {
    case 'button': {
      const button = document.createElement('div');
      button.className = 'wire-button';
      button.textContent = 'Button';
      wrapper.appendChild(button);
      break;
    }
    case 'input': {
      const input = document.createElement('div');
      input.className = 'wire-input';
      input.textContent = 'Input field';
      wrapper.appendChild(input);
      break;
    }
    case 'dropdown': {
      const dropdown = document.createElement('div');
      dropdown.className = 'wire-dropdown';
      dropdown.textContent = 'Dropdown';
      wrapper.appendChild(dropdown);
      break;
    }
    case 'card': {
      const card = document.createElement('div');
      card.className = 'wire-card';
      const heading = document.createElement('h3');
      heading.textContent = 'Card title';
      const body = document.createElement('p');
      body.textContent = 'Supporting description text goes here.';
      const button = document.createElement('div');
      button.className = 'wire-button';
      button.textContent = 'Action';
      card.append(heading, body, button);
      wrapper.appendChild(card);
      break;
    }
    case 'heading': {
      const heading = document.createElement('div');
      heading.className = 'wire-heading';
      heading.textContent = 'Heading';
      wrapper.appendChild(heading);
      break;
    }
    case 'paragraph': {
      const paragraph = document.createElement('div');
      paragraph.className = 'wire-paragraph';
      paragraph.textContent = 'Lorem ipsum placeholder copy for quick wireframes.';
      wrapper.appendChild(paragraph);
      break;
    }
    case 'image': {
      const image = document.createElement('div');
      image.className = 'wire-image';
      image.textContent = 'Image';
      wrapper.appendChild(image);
      break;
    }
    default: {
      wrapper.textContent = 'Component';
    }
  }

  configureWireItem(wrapper);
  return wrapper;
}

function configureWireItem(element) {
  element.setAttribute('tabindex', '0');
  removeHandles(element);
  addHandles(element);
  if (!element.__wireConfigured) {
    makeSelectable(element);
    enableEditing(element);
    element.__wireConfigured = true;
  }
  applyLinkState(element);
}

function removeHandles(element) {
  element.querySelectorAll('.resize-handle').forEach((handle) => handle.remove());
}

function addHandles(element) {
  ['nw', 'ne', 'sw', 'se'].forEach((corner) => {
    const handle = document.createElement('div');
    handle.className = `resize-handle handle-${corner}`;
    handle.dataset.direction = corner;
    handle.addEventListener('mousedown', (event) => {
      event.stopPropagation();
      event.preventDefault();
      selectElement(element);
      startResize(element, corner, event);
    });
    element.appendChild(handle);
  });
}

function makeSelectable(element) {
  element.addEventListener('mousedown', (event) => {
    if (event.target.classList.contains('resize-handle')) return;
    if (element.classList.contains('editing')) return;
    event.preventDefault();
    selectElement(element);
    startDrag(element, event);
  });

  element.addEventListener('focus', () => {
    selectElement(element);
  });
}

function enableEditing(element) {
  element.addEventListener('dblclick', (event) => {
    if (event.target.classList.contains('resize-handle')) return;
    element.classList.add('editing');
    element.setAttribute('contenteditable', 'true');
    element.focus();
  });

  element.addEventListener('blur', () => {
    if (!element.classList.contains('editing')) return;
    element.classList.remove('editing');
    element.removeAttribute('contenteditable');
  });

  element.addEventListener('keydown', (event) => {
    if (!element.classList.contains('editing')) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      element.blur();
    }
  });
}

function selectElement(element) {
  if (selectedElement && selectedElement !== element) {
    selectedElement.classList.remove('selected');
    selectedElement.removeAttribute('contenteditable');
    selectedElement.classList.remove('editing');
  }
  selectedElement = element;
  element.classList.add('selected');
  element.focus({ preventScroll: true });
  refreshSelectionBar();
}

function clearSelection() {
  if (selectedElement) {
    selectedElement.classList.remove('selected');
    selectedElement.removeAttribute('contenteditable');
    selectedElement.classList.remove('editing');
    selectedElement = null;
  }
  refreshSelectionBar();
}

function startDrag(element, event) {
  const canvasEl = element.parentElement;
  const rect = element.getBoundingClientRect();
  const scale = getCanvasScale(canvasEl);
  dragState = {
    element,
    canvas: canvasEl,
    offsetX: (event.clientX - rect.left) / scale,
    offsetY: (event.clientY - rect.top) / scale
  };
}

function moveElement(event) {
  const { element, canvas, offsetX, offsetY } = dragState;
  const canvasRect = canvas.getBoundingClientRect();
  const scale = getCanvasScale(canvas);
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  const x = (event.clientX - canvasRect.left) / scale - offsetX;
  const y = (event.clientY - canvasRect.top) / scale - offsetY;
  const clamped = clampPosition(canvas, x, y, width, height);
  element.style.left = `${clamped.x}px`;
  element.style.top = `${clamped.y}px`;
}

function startResize(element, direction, event) {
  const canvasEl = element.parentElement;
  const rect = element.getBoundingClientRect();
  const canvasRect = canvasEl.getBoundingClientRect();
  const scale = getCanvasScale(canvasEl);
  resizeState = {
    element,
    canvas: canvasEl,
    direction,
    startWidth: element.offsetWidth,
    startHeight: element.offsetHeight,
    startLeft: (rect.left - canvasRect.left) / scale,
    startTop: (rect.top - canvasRect.top) / scale
  };
}

function resizeElement(event) {
  const {
    element,
    canvas,
    direction,
    startWidth,
    startHeight,
    startLeft,
    startTop
  } = resizeState;

  const canvasRect = canvas.getBoundingClientRect();
  const scale = getCanvasScale(canvas);
  const pointerX = (event.clientX - canvasRect.left) / scale;
  const pointerY = (event.clientY - canvasRect.top) / scale;

  let left = startLeft;
  let top = startTop;
  let right = left + startWidth;
  let bottom = top + startHeight;

  if (direction.includes('e')) {
    right = Math.max(left + MIN_WIDTH, pointerX);
  }
  if (direction.includes('s')) {
    bottom = Math.max(top + MIN_HEIGHT, pointerY);
  }
  if (direction.includes('w')) {
    left = Math.min(right - MIN_WIDTH, pointerX);
  }
  if (direction.includes('n')) {
    top = Math.min(bottom - MIN_HEIGHT, pointerY);
  }

  left = Math.max(0, left);
  top = Math.max(0, top);
  right = Math.min(canvas.offsetWidth, right);
  bottom = Math.min(canvas.offsetHeight, bottom);

  left = snapValue(left);
  top = snapValue(top);
  right = snapValue(right);
  bottom = snapValue(bottom);

  if (right - left < MIN_WIDTH) {
    if (direction.includes('w')) {
      left = right - MIN_WIDTH;
    } else {
      right = left + MIN_WIDTH;
    }
  }

  if (bottom - top < MIN_HEIGHT) {
    if (direction.includes('n')) {
      top = bottom - MIN_HEIGHT;
    } else {
      bottom = top + MIN_HEIGHT;
    }
  }

  left = Math.max(0, Math.min(left, canvas.offsetWidth - MIN_WIDTH));
  top = Math.max(0, Math.min(top, canvas.offsetHeight - MIN_HEIGHT));
  right = Math.min(canvas.offsetWidth, Math.max(right, left + MIN_WIDTH));
  bottom = Math.min(canvas.offsetHeight, Math.max(bottom, top + MIN_HEIGHT));

  let width = snapDimensionWithin(right - left, MIN_WIDTH, canvas.offsetWidth);
  let height = snapDimensionWithin(bottom - top, MIN_HEIGHT, canvas.offsetHeight);

  const position = clampPosition(canvas, left, top, width, height);
  const widthLimit = canvas.offsetWidth - position.x;
  const heightLimit = canvas.offsetHeight - position.y;
  width = snapDimensionWithin(width, MIN_WIDTH, widthLimit);
  height = snapDimensionWithin(height, MIN_HEIGHT, heightLimit);
  const finalPosition = clampPosition(canvas, position.x, position.y, width, height);

  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
  element.style.left = `${finalPosition.x}px`;
  element.style.top = `${finalPosition.y}px`;
}

function clampPosition(canvasEl, x, y, width, height) {
  const maxX = Math.max(0, canvasEl.offsetWidth - width);
  const maxY = Math.max(0, canvasEl.offsetHeight - height);
  const clampedX = Math.min(Math.max(0, x), maxX);
  const clampedY = Math.min(Math.max(0, y), maxY);
  const snappedX = Math.min(Math.max(0, snapValue(clampedX)), maxX);
  const snappedY = Math.min(Math.max(0, snapValue(clampedY)), maxY);
  return { x: snappedX, y: snappedY };
}

function removeSelectedElement() {
  if (!selectedElement) return;
  selectedElement.remove();
  selectedElement = null;
  refreshSelectionBar();
}

function copySelectedElement() {
  if (!selectedElement) return;
  const clone = selectedElement.cloneNode(true);
  clone.classList.remove('selected', 'editing');
  clone.removeAttribute('contenteditable');
  removeHandles(clone);

  clipboardItem = {
    outerHTML: clone.outerHTML,
    width: selectedElement.offsetWidth,
    height: selectedElement.offsetHeight,
    left: parseFloat(selectedElement.style.left) || 0,
    top: parseFloat(selectedElement.style.top) || 0,
    targetScreen: selectedElement.dataset.targetScreen || ''
  };
  pasteIteration = 0;
}

function pasteClipboardElement() {
  if (!clipboardItem || !activeScreenId || !screens.has(activeScreenId)) return;
  const screen = screens.get(activeScreenId);
  const canvas = screen.canvas;

  const temp = document.createElement('div');
  temp.innerHTML = clipboardItem.outerHTML;
  const element = temp.firstElementChild;
  if (!element) return;

  let width = snapDimensionWithin(clipboardItem.width, MIN_WIDTH, canvas.offsetWidth);
  let height = snapDimensionWithin(clipboardItem.height, MIN_HEIGHT, canvas.offsetHeight);
  const offsetShift = (pasteIteration + 1) * PASTE_OFFSET_STEP;
  const targetLeft = clipboardItem.left + offsetShift;
  const targetTop = clipboardItem.top + offsetShift;
  let position = clampPosition(canvas, targetLeft, targetTop, width, height);
  const widthLimit = canvas.offsetWidth - position.x;
  const heightLimit = canvas.offsetHeight - position.y;
  width = snapDimensionWithin(width, MIN_WIDTH, widthLimit);
  height = snapDimensionWithin(height, MIN_HEIGHT, heightLimit);
  position = clampPosition(canvas, position.x, position.y, width, height);

  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
  element.style.left = `${position.x}px`;
  element.style.top = `${position.y}px`;

  if (clipboardItem.targetScreen && screens.has(clipboardItem.targetScreen)) {
    element.dataset.targetScreen = clipboardItem.targetScreen;
  } else {
    delete element.dataset.targetScreen;
  }
  configureWireItem(element);
  canvas.appendChild(element);
  selectElement(element);

  clipboardItem.left = position.x;
  clipboardItem.top = position.y;
  clipboardItem.width = width;
  clipboardItem.height = height;
  clipboardItem.targetScreen = element.dataset.targetScreen || '';
  pasteIteration = (pasteIteration + 1) % 6;
}

function setCanvasSize(width, height, screenId = activeScreenId, presetKey = null) {
  if (!screenId || !screens.has(screenId)) return;
  const screen = screens.get(screenId);

  const keyToUse = presetKey || findPresetKey(width, height) || 'custom';
  screen.width = width;
  screen.height = height;
  screen.presetKey = keyToUse;
  screen.canvas.style.width = `${width}px`;
  screen.canvas.style.height = `${height}px`;

  enforceBounds(screen.canvas);

  if (screenId === activeScreenId) {
    updateSizeControls(width, height, keyToUse);
    scheduleCanvasScale(screen.canvas);
  }
}

function updateSizeControls(width, height, presetKey) {
  const matchedPreset = presetKey !== 'custom' ? presetKey : findPresetKey(width, height);
  const keyToUse = matchedPreset && SIZE_PRESETS[matchedPreset] ? matchedPreset : 'custom';

  screenSizeSelect.value = keyToUse;
  currentSizeLabel.textContent = `${width} \u00D7 ${height}`;
  customWidthInput.value = width;
  customHeightInput.value = height;

  if (keyToUse === 'custom') {
    customSizeRow.style.display = 'flex';
  } else {
    customSizeRow.style.display = 'none';
  }
}

function findPresetKey(width, height) {
  return Object.entries(SIZE_PRESETS).find(
    ([, size]) => size.width === width && size.height === height
  )?.[0];
}

function enforceBounds(canvasEl) {
  const items = canvasEl.querySelectorAll('.wire-item');
  items.forEach((item) => {
    let width = snapDimensionWithin(item.offsetWidth, MIN_WIDTH, canvasEl.offsetWidth);
    let height = snapDimensionWithin(item.offsetHeight, MIN_HEIGHT, canvasEl.offsetHeight);
    const left = parseFloat(item.style.left) || 0;
    const top = parseFloat(item.style.top) || 0;
    let position = clampPosition(canvasEl, left, top, width, height);
    const widthLimit = canvasEl.offsetWidth - position.x;
    const heightLimit = canvasEl.offsetHeight - position.y;
    width = snapDimensionWithin(width, MIN_WIDTH, widthLimit);
    height = snapDimensionWithin(height, MIN_HEIGHT, heightLimit);
    position = clampPosition(canvasEl, position.x, position.y, width, height);
    item.style.width = `${width}px`;
    item.style.height = `${height}px`;
    item.style.left = `${position.x}px`;
    item.style.top = `${position.y}px`;
    applyLinkState(item);
  });
}

function copyScreenContents(sourceCanvas, targetCanvas) {
  targetCanvas.innerHTML = '';
  const items = sourceCanvas.querySelectorAll('.wire-item');
  items.forEach((item) => {
    const clone = item.cloneNode(true);
    clone.classList.remove('selected', 'editing');
    clone.removeAttribute('contenteditable');
    delete clone.__wireConfigured;
    removeHandles(clone);
    configureWireItem(clone);
    targetCanvas.appendChild(clone);
  });
}

function applyLinkState(element) {
  if (!element) return;
  const target = element.dataset.targetScreen;
  if (target && screens.has(target)) {
    element.classList.add('has-link');
  } else {
    if (target && !screens.has(target)) {
      delete element.dataset.targetScreen;
    }
    element.classList.remove('has-link');
  }
}

function clearLinksToScreen(screenId) {
  screens.forEach((screen) => {
    const items = screen.canvas.querySelectorAll('.wire-item');
    items.forEach((item) => {
      if (item.dataset.targetScreen === screenId) {
        delete item.dataset.targetScreen;
        applyLinkState(item);
      }
    });
  });
  if (clipboardItem && clipboardItem.targetScreen === screenId) {
    clipboardItem.targetScreen = '';
  }
  if (selectedElement && selectedElement.dataset.targetScreen === screenId) {
    delete selectedElement.dataset.targetScreen;
    applyLinkState(selectedElement);
  }
}

function refreshSelectionBar() {
  if (!selectionBar || !linkSelect || !selectionLabel || !clearLinkBtn) return;
  const hasSelection = Boolean(selectedElement);
  selectionBar.classList.toggle('inactive', !hasSelection);
  linkSelect.disabled = !hasSelection;
  clearLinkBtn.disabled = !hasSelection;
  if (!hasSelection) {
    selectionLabel.textContent = 'No element selected';
    if (!isUpdatingLinkSelect) {
      isUpdatingLinkSelect = true;
      linkSelect.value = '';
      isUpdatingLinkSelect = false;
    }
    return;
  }
  const targetId = selectedElement.dataset.targetScreen;
  if (targetId && screens.has(targetId)) {
    selectionLabel.textContent = `${formatElementLabel(selectedElement)} -> ${screens.get(targetId).name}`;
  } else {
    selectionLabel.textContent = `${formatElementLabel(selectedElement)} selected`;
  }
  refreshLinkSelectOptions();
}

function refreshLinkSelectOptions() {
  if (!linkSelect) return;
  isUpdatingLinkSelect = true;
  const currentTarget = selectedElement && selectedElement.dataset.targetScreen && screens.has(selectedElement.dataset.targetScreen)
    ? selectedElement.dataset.targetScreen
    : '';
  linkSelect.innerHTML = '';
  const noneOption = document.createElement('option');
  noneOption.value = '';
  noneOption.textContent = 'No link';
  linkSelect.appendChild(noneOption);
  screens.forEach((screen) => {
    const option = document.createElement('option');
    option.value = screen.id;
    option.textContent = screen.name;
    linkSelect.appendChild(option);
  });
  if (selectedElement) {
    if (selectedElement.dataset.targetScreen && !screens.has(selectedElement.dataset.targetScreen)) {
      delete selectedElement.dataset.targetScreen;
      applyLinkState(selectedElement);
    }
    linkSelect.value = selectedElement.dataset.targetScreen && screens.has(selectedElement.dataset.targetScreen)
      ? selectedElement.dataset.targetScreen
      : '';
  } else {
    linkSelect.value = '';
  }
  isUpdatingLinkSelect = false;
}

function formatElementLabel(element) {
  const type = (element.dataset.type || 'Element').trim();
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function isPreviewOpen() {
  return previewBackdrop && !previewBackdrop.classList.contains('hidden');
}

function openPreview() {
  if (!previewBackdrop || !previewCanvasContainer || !previewScreenSelect) return;
  if (isPreviewOpen()) return;
  if (!screens.size) return;
  if (isHelpOpen()) {
    closeHelpModal();
  }
  updatePreviewFullscreenUi(false);
  if (!previewActiveScreenId || !screens.has(previewActiveScreenId)) {
    previewActiveScreenId = activeScreenId || screens.keys().next().value;
  }
  buildPreviewScreens();
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  previewBackdrop.classList.remove('hidden');
  if (previewButton) {
    previewButton.setAttribute('aria-pressed', 'true');
  }
  previewScreenSelect.focus();
  window.requestAnimationFrame(() => {
    scaleAllPreviewCanvases();
  });
}

function closePreview() {
  if (!isPreviewOpen()) return;
  updatePreviewFullscreenUi(false);
  previewBackdrop.classList.add('hidden');
  if (previewCanvasContainer) {
    previewCanvasContainer.innerHTML = '';
  }
  if (previewScreenSelect) {
    previewScreenSelect.innerHTML = '';
  }
  document.body.style.overflow = previousBodyOverflow;
  if (previewButton) {
    previewButton.setAttribute('aria-pressed', 'false');
    previewButton.focus({ preventScroll: true });
  }
  previewActiveScreenId = null;
}

function buildPreviewScreens() {
  if (!previewCanvasContainer || !previewScreenSelect) return;
  previewCanvasContainer.innerHTML = '';
  previewScreenSelect.innerHTML = '';

  const screenList = Array.from(screens.values());
  if (!screenList.length) return;
  if (!previewActiveScreenId || !screens.has(previewActiveScreenId)) {
    previewActiveScreenId = screenList[0].id;
  }

  screenList.forEach((screenData) => {
    const option = document.createElement('option');
    option.value = screenData.id;
    option.textContent = screenData.name;
    previewScreenSelect.appendChild(option);

    const wrapper = createPreviewCanvas(screenData);
    previewCanvasContainer.appendChild(wrapper);
  });

  previewScreenSelect.value = previewActiveScreenId;
  activatePreviewScreen(previewActiveScreenId);
}

function activatePreviewScreen(screenId) {
  if (!previewCanvasContainer) return;
  if (!screens.has(screenId)) return;
  previewActiveScreenId = screenId;
  const canvases = previewCanvasContainer.querySelectorAll('.preview-canvas-wrapper');
  canvases.forEach((wrapper) => {
    const canvas = wrapper.querySelector('.preview-canvas');
    if (canvas && canvas.dataset.screenId === screenId) {
      wrapper.style.display = '';
    } else {
      wrapper.style.display = 'none';
    }
  });
  scaleAllPreviewCanvases();
}

function createPreviewCanvas(screenData) {
  const wrapper = document.createElement('div');
  wrapper.className = 'preview-canvas-wrapper';

  const canvas = document.createElement('div');
  canvas.className = 'preview-canvas';
  canvas.dataset.screenId = screenData.id;
  canvas.style.width = `${screenData.width}px`;
  canvas.style.height = `${screenData.height}px`;
  wrapper.appendChild(canvas);

  const items = screenData.canvas.querySelectorAll('.wire-item');
  items.forEach((item) => {
    const previewItem = document.createElement('div');
    previewItem.className = 'preview-item';
    const width = parsePx(item.style.width, item.offsetWidth || MIN_WIDTH);
    const height = parsePx(item.style.height, item.offsetHeight || MIN_HEIGHT);
    const left = parsePx(item.style.left, item.offsetLeft || 0);
    const top = parsePx(item.style.top, item.offsetTop || 0);
    previewItem.style.width = `${width}px`;
    previewItem.style.height = `${height}px`;
    previewItem.style.left = `${left}px`;
    previewItem.style.top = `${top}px`;

    if (item.dataset.targetScreen && screens.has(item.dataset.targetScreen)) {
      previewItem.dataset.targetScreen = item.dataset.targetScreen;
    }

    const interactive = buildPreviewElement(item);
    previewItem.appendChild(interactive);

    const targetScreen = previewItem.dataset.targetScreen;
    if (targetScreen) {
      const buttons = previewItem.querySelectorAll('button');
      const select = previewItem.querySelector('select');
      const input = previewItem.querySelector('input');
      if (!select && !input) {
        attachPreviewNavigation(previewItem, targetScreen);
      }
      buttons.forEach((button) => {
        attachPreviewNavigation(button, targetScreen);
      });
      if (select) {
        attachPreviewNavigation(select, targetScreen, 'change');
      }
      if (input) {
        input.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            handlePreviewNavigation(targetScreen);
          }
        });
      }
    }

    canvas.appendChild(previewItem);
  });

  return wrapper;
}

function buildPreviewElement(source) {
  const type = source.dataset.type;
  const textContent = source.textContent.trim();
  const fallback = (value, defaultValue) => (value && value.trim()) || defaultValue;

  switch (type) {
    case 'button': {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = fallback(source.querySelector('.wire-button')?.textContent, 'Button');
      return button;
    }
    case 'input': {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = fallback(textContent, 'Input field');
      return input;
    }
    case 'dropdown': {
      const select = document.createElement('select');
      const baseLabel = fallback(textContent, 'Select option');
      ['Option 1', 'Option 2', 'Option 3'].forEach((label, index) => {
        const option = document.createElement('option');
        option.value = `${index + 1}`;
        option.textContent = index === 0 ? baseLabel : `${baseLabel} ${index + 1}`;
        select.appendChild(option);
      });
      return select;
    }
    case 'card': {
      const card = document.createElement('div');
      card.className = 'preview-card';
      const heading = document.createElement('h3');
      heading.textContent = fallback(source.querySelector('h3')?.textContent, 'Card title');
      const body = document.createElement('p');
      body.textContent = fallback(source.querySelector('p')?.textContent, 'Supporting description text goes here.');
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = fallback(source.querySelector('.wire-button')?.textContent, 'Action');
      card.append(heading, body, button);
      return card;
    }
    case 'heading': {
      const heading = document.createElement('div');
      heading.className = 'preview-heading';
      heading.textContent = fallback(textContent, 'Heading');
      return heading;
    }
    case 'paragraph': {
      const paragraph = document.createElement('p');
      paragraph.className = 'preview-paragraph';
      paragraph.textContent = fallback(textContent, 'Placeholder copy for quick wireframes.');
      return paragraph;
    }
    case 'image': {
      const image = document.createElement('div');
      image.className = 'preview-image';
      image.textContent = fallback(textContent, 'Image');
      return image;
    }
    default: {
      const box = document.createElement('div');
      box.className = 'preview-heading';
      box.textContent = fallback(textContent, 'Element');
      return box;
    }
  }
}

function attachPreviewNavigation(node, targetScreenId, trigger = 'click') {
  if (!node || !targetScreenId) return;
  if (trigger === 'change') {
    node.addEventListener('change', (event) => {
      event.stopPropagation();
      handlePreviewNavigation(targetScreenId);
    });
  } else {
    node.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      handlePreviewNavigation(targetScreenId);
    });
    if (
      node instanceof HTMLElement &&
      !(node instanceof HTMLButtonElement) &&
      !(node instanceof HTMLAnchorElement) &&
      !(node instanceof HTMLInputElement) &&
      !(node instanceof HTMLSelectElement)
    ) {
      if (node.tabIndex < 0) {
        node.tabIndex = 0;
      }
      node.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handlePreviewNavigation(targetScreenId);
        }
      });
    }
  }
}

function handlePreviewNavigation(targetScreenId) {
  if (!screens.has(targetScreenId)) return;
  activatePreviewScreen(targetScreenId);
  if (previewScreenSelect) {
    previewScreenSelect.value = targetScreenId;
  }
}

function snapValue(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function snapDimension(value, min) {
  const snapped = Math.round(value / GRID_SIZE) * GRID_SIZE;
  const base = snapped === 0 ? GRID_SIZE : snapped;
  return Math.max(min, base);
}

function snapDimensionWithin(value, min, max) {
  if (!Number.isFinite(max) || max <= 0) {
    return Math.max(0, Math.min(value, max || 0));
  }
  if (max <= min) {
    return Math.max(0, Math.min(value, max));
  }
  let candidate = snapDimension(value, min);
  if (candidate > max) {
    const snappedMax = Math.floor(max / GRID_SIZE) * GRID_SIZE;
    if (snappedMax >= min) {
      candidate = snappedMax || min;
    } else {
      candidate = Math.max(min, Math.min(value, max));
    }
  }
  return Math.max(min, Math.min(candidate, max));
}

function parsePx(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function updatePreviewFullscreenUi(isFullscreen) {
  if (previewModal) {
    previewModal.classList.toggle('fullscreen', Boolean(isFullscreen));
  }
  if (previewFullscreenBtn) {
    previewFullscreenBtn.setAttribute('aria-pressed', isFullscreen ? 'true' : 'false');
    previewFullscreenBtn.textContent = isFullscreen ? 'Exit fullscreen' : 'Fullscreen';
    previewFullscreenBtn.title = isFullscreen ? 'Exit fullscreen preview' : 'Enter fullscreen preview';
  }
}

function togglePreviewFullscreen() {
  if (!previewModal) return;
  const nextState = !previewModal.classList.contains('fullscreen');
  updatePreviewFullscreenUi(nextState);
  scaleAllPreviewCanvases();
}

function scaleAllPreviewCanvases() {
  if (!previewCanvasContainer || !isPreviewOpen()) return;
  const canvases = Array.from(previewCanvasContainer.querySelectorAll('.preview-canvas'));
  if (!canvases.length) return;
  window.requestAnimationFrame(() => {
    canvases.forEach((canvas) => applyPreviewCanvasScale(canvas));
  });
}

function applyPreviewCanvasScale(canvasEl) {
  if (!canvasEl || !previewCanvasContainer) return;
  const wrapper = canvasEl.closest('.preview-canvas-wrapper');
  if (!wrapper) return;
  const wrapperStyles = window.getComputedStyle(wrapper);
  if (wrapperStyles.display === 'none') return;

  const canvasWidth = parsePx(canvasEl.style.width, canvasEl.offsetWidth || 0);
  const canvasHeight = parsePx(canvasEl.style.height, canvasEl.offsetHeight || 0);
  if (!canvasWidth || !canvasHeight) {
    canvasEl.style.transform = 'scale(1)';
    canvasEl.style.top = '';
    canvasEl.style.left = '';
    canvasEl.style.margin = '';
    wrapper.style.width = '';
    wrapper.style.height = '';
    return;
  }

  const containerStyles = window.getComputedStyle(previewCanvasContainer);
  const containerWidth = Math.max(
    previewCanvasContainer.clientWidth
      - parseFloat(containerStyles.paddingLeft || '0')
      - parseFloat(containerStyles.paddingRight || '0'),
    0
  );
  const containerHeight = Math.max(
    previewCanvasContainer.clientHeight
      - parseFloat(containerStyles.paddingTop || '0')
      - parseFloat(containerStyles.paddingBottom || '0'),
    0
  );

  const paddingLeft = parseFloat(wrapperStyles.paddingLeft || '0');
  const paddingRight = parseFloat(wrapperStyles.paddingRight || '0');
  const paddingTop = parseFloat(wrapperStyles.paddingTop || '0');
  const paddingBottom = parseFloat(wrapperStyles.paddingBottom || '0');

  const availableWidth = Math.max(containerWidth - (paddingLeft + paddingRight), 0);
  const availableHeight = Math.max(containerHeight - (paddingTop + paddingBottom), 0);

  let rawScale = Math.min(1, availableWidth / canvasWidth, availableHeight / canvasHeight);
  if (!Number.isFinite(rawScale) || rawScale <= 0) {
    rawScale = Math.min(1, containerWidth / canvasWidth, containerHeight / canvasHeight);
  }
  const scale = Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 1;

  const scaledWidth = canvasWidth * scale;
  const scaledHeight = canvasHeight * scale;

  wrapper.style.width = `${scaledWidth + paddingLeft + paddingRight}px`;
  wrapper.style.height = `${scaledHeight + paddingTop + paddingBottom}px`;

  canvasEl.dataset.scale = String(scale);
  canvasEl.style.transformOrigin = 'top left';
  canvasEl.style.transform = `scale(${scale})`;
  canvasEl.style.position = 'absolute';
  canvasEl.style.top = `${paddingTop}px`;
  canvasEl.style.left = `${paddingLeft}px`;
  canvasEl.style.margin = '0';
}

window.addEventListener('load', init);
