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
const dialogBackdrop = document.getElementById('dialog-backdrop');
const screenModal = document.getElementById('screen-modal');
const screenModalTitle = document.getElementById('screen-modal-title');
const screenModalForm = document.getElementById('screen-modal-form');
const screenModalBody = document.getElementById('screen-modal-body');
const screenModalConfirm = document.getElementById('screen-modal-confirm');
const screenModalCancel = document.getElementById('screen-modal-cancel');
const screenModalClose = document.getElementById('screen-modal-close');

const selectionBar = document.getElementById('selection-bar');
const selectionLabel = document.getElementById('selection-label');
const linkControls = document.getElementById('link-controls');
const linkSelect = document.getElementById('link-select');
const clearLinkBtn = document.getElementById('clear-link');

const propertiesForm = document.getElementById('properties-form');
const propertiesEmptyState = document.getElementById('properties-empty');

const previewBackdrop = document.getElementById('preview-backdrop');
const previewScreenSelect = document.getElementById('preview-screen-select');
const previewCanvasContainer = document.getElementById('preview-canvas-container');
const closePreviewBtn = document.getElementById('close-preview');
const previewModal = document.getElementById('preview-modal');
const previewFullscreenBtn = document.getElementById('preview-fullscreen');
const analysisButton = document.getElementById('analysis-button');
const previewTitle = document.getElementById('preview-title');
const previewModePreviewBtn = document.getElementById('preview-mode-preview');
const previewModeAnalysisBtn = document.getElementById('preview-mode-analysis');
const analysisPanel = document.getElementById('analysis-panel');
const analysisMoveCount = document.getElementById('analysis-move-count');
const analysisClickCount = document.getElementById('analysis-click-count');
const analysisResetBtn = document.getElementById('analysis-reset');
const analysisEmptyState = document.getElementById('analysis-panel-empty');
const analysisSummaryCards = document.getElementById('analysis-summary-cards');
const analysisAverageSessionTime = document.getElementById('analysis-average-session-time');
const analysisTotalClicksValue = document.getElementById('analysis-total-clicks');
const analysisHotspotClicksValue = document.getElementById('analysis-hotspot-clicks');
const analysisSessionBlock = document.getElementById('analysis-session-block');
const analysisSessionScreenSelect = document.getElementById('analysis-session-screen');
const analysisSessionTableBody = document.getElementById('analysis-session-table-body');
const analysisSessionEmpty = document.getElementById('analysis-session-empty');
const analysisHotspotBlock = document.getElementById('analysis-hotspot-block');
const analysisHotspotTableBody = document.getElementById('analysis-hotspot-table-body');
const analysisHotspotEmpty = document.getElementById('analysis-hotspot-empty');

let selectedElement = null;
let dragState = null;
let resizeState = null;
let lastFocusedBeforeHelp = null;
let lastFocusedBeforeScreenModal = null;
let screenModalState = null;
let inlineScreenRenameInput = null;
let inlineScreenRenameTargetId = null;
let inlineScreenRenameKeyHandler = null;
let inlineScreenRenameBlurHandler = null;

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
let previewMode = 'preview';
const previewInteractionData = new Map();
let lastPointerSample = null;
const analysisRenderQueue = new Set();
let analysisRenderScheduled = false;
const ANALYSIS_MAX_MOVE_POINTS = 1200;
const ANALYSIS_MAX_CLICK_POINTS = 400;
const ANALYSIS_MOVE_MIN_DISTANCE = 12;
const ANALYSIS_MOVE_MIN_INTERVAL = 40;
const HEAT_POINT_RADIUS = 56;
const HEATMAP_GRADIENT_STOPS = [
  { stop: 0, r: 56, g: 142, b: 60, a: 0 },
  { stop: 0.2, r: 76, g: 175, b: 80, a: 0.38 },
  { stop: 0.45, r: 255, g: 214, b: 0, a: 0.46 },
  { stop: 0.75, r: 255, g: 160, b: 0, a: 0.58 },
  { stop: 1, r: 229, g: 57, b: 53, a: 0.7 }
];
const HEAT_INTENSITY_EXPONENT = 0.65;
const hotspotDetails = new Map();
let hotspotIdCounter = 0;
const interactionSessions = new Map();
let interactionSessionCounter = 0;
let activeInteractionSession = null;
let pendingAnalyticsRefresh = false;

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
  image: { width: 200, height: 160 },
  text: { width: 260, height: 100 },
  'radio-group': { width: 240, height: 140 },
  slider: { width: 260, height: 70 }
};

const PROPERTY_SCHEMAS = {
  common: [
    {
      id: 'width',
      label: 'Width (px)',
      type: 'number',
      min: MIN_WIDTH,
      get: (element) => Math.round(parsePx(element.style.width, element.offsetWidth || MIN_WIDTH)),
      set: (element, value) => applyElementSizeChange(element, { width: parseFloat(value) })
    },
    {
      id: 'height',
      label: 'Height (px)',
      type: 'number',
      min: MIN_HEIGHT,
      get: (element) => Math.round(parsePx(element.style.height, element.offsetHeight || MIN_HEIGHT)),
      set: (element, value) => applyElementSizeChange(element, { height: parseFloat(value) })
    }
  ],
  button: [
    {
      id: 'button-label',
      label: 'Label',
      type: 'text',
      get: (element) => getElementText(element, '.wire-button', element.dataset.label || 'Button'),
      set: (element, value) => setElementText(element, '.wire-button', value, 'Button', 'label')
    }
  ],
  input: [
    {
      id: 'input-placeholder',
      label: 'Placeholder',
      type: 'text',
      get: (element) => element.dataset.placeholder || getElementText(element, '.wire-input', 'Input field'),
      set: (element, value) => {
        element.dataset.placeholder = value.trim() || 'Input field';
        const target = element.querySelector('.wire-input');
        if (target) {
          target.textContent = element.dataset.placeholder;
        }
      }
    }
  ],
  dropdown: [
    {
      id: 'dropdown-label',
      label: 'Label',
      type: 'text',
      get: (element) => element.dataset.label || getElementText(element, '.wire-dropdown-label', 'Dropdown'),
      set: (element, value) => {
        element.dataset.label = value.trim() || 'Dropdown';
        updateDropdownVisual(element);
      }
    },
    {
      id: 'dropdown-options',
      label: 'Options (one per line)',
      type: 'textarea',
      rows: 3,
      get: (element) => (element.dataset.options || 'Option 1\nOption 2\nOption 3'),
      set: (element, value) => {
        element.dataset.options = normaliseOptions(value, ['Option 1', 'Option 2', 'Option 3']).join('\n');
        updateDropdownVisual(element);
      }
    }
  ],
  card: [
    {
      id: 'card-title',
      label: 'Title',
      type: 'text',
      get: (element) => element.dataset.title || getElementText(element, '.wire-card h3', 'Card title'),
      set: (element, value) => {
        element.dataset.title = value.trim() || 'Card title';
        updateCardVisual(element);
      }
    },
    {
      id: 'card-body',
      label: 'Description',
      type: 'textarea',
      rows: 3,
      get: (element) =>
        element.dataset.body || getElementText(element, '.wire-card p', 'Supporting description text goes here.'),
      set: (element, value) => {
        element.dataset.body = value.trim() || 'Supporting description text goes here.';
        updateCardVisual(element);
      }
    },
    {
      id: 'card-cta',
      label: 'Button label',
      type: 'text',
      get: (element) => element.dataset.cta || getElementText(element, '.wire-card .wire-button', 'Action'),
      set: (element, value) => {
        element.dataset.cta = value.trim() || 'Action';
        updateCardVisual(element);
      }
    }
  ],
  heading: [
    {
      id: 'heading-text',
      label: 'Text',
      type: 'text',
      get: (element) => element.dataset.text || getElementText(element, '.wire-heading', 'Heading'),
      set: (element, value) => setElementText(element, '.wire-heading', value, 'Heading', 'text')
    }
  ],
  paragraph: [
    {
      id: 'paragraph-text',
      label: 'Paragraph',
      type: 'textarea',
      rows: 4,
      get: (element) =>
        element.dataset.text ||
        getElementText(element, '.wire-paragraph', 'Lorem ipsum placeholder copy for quick wireframes.'),
      set: (element, value) =>
        setElementText(
          element,
          '.wire-paragraph',
          value,
          'Lorem ipsum placeholder copy for quick wireframes.',
          'text'
        )
    }
  ],
  text: [
    {
      id: 'text-content',
      label: 'Text',
      type: 'textarea',
      rows: 4,
      get: (element) => element.dataset.text || getElementText(element, '.wire-text', 'Sample text'),
      set: (element, value) => setElementText(element, '.wire-text', value, 'Sample text', 'text')
    }
  ],
  image: [
    {
      id: 'image-label',
      label: 'Label',
      type: 'text',
      get: (element) => element.dataset.label || getElementText(element, '.wire-image', 'Image'),
      set: (element, value) => setElementText(element, '.wire-image', value, 'Image', 'label')
    }
  ],
  'radio-group': [
    {
      id: 'radio-label',
      label: 'Group label',
      type: 'text',
      get: (element) => element.dataset.label || getElementText(element, '.wire-radio-label', 'Radio group'),
      set: (element, value) => {
        element.dataset.label = value.trim() || 'Radio group';
        updateRadioGroupVisual(element);
      }
    },
    {
      id: 'radio-options',
      label: 'Options (one per line)',
      type: 'textarea',
      rows: 3,
      get: (element) => element.dataset.options || 'Option A\nOption B',
      set: (element, value) => {
        element.dataset.options = normaliseOptions(value, ['Option A', 'Option B']).join('\n');
        updateRadioGroupVisual(element);
      }
    }
  ],
  slider: [
    {
      id: 'slider-label',
      label: 'Label',
      type: 'text',
      get: (element) => element.dataset.label || getElementText(element, '.wire-slider-label', 'Slider'),
      set: (element, value) => {
        element.dataset.label = value.trim() || 'Slider';
        updateSliderVisual(element);
      }
    },
    {
      id: 'slider-min',
      label: 'Min',
      type: 'number',
      get: (element) => parseFloat(element.dataset.min ?? '0'),
      set: (element, value) => {
        element.dataset.min = String(value);
        updateSliderVisual(element);
      }
    },
    {
      id: 'slider-max',
      label: 'Max',
      type: 'number',
      get: (element) => parseFloat(element.dataset.max ?? '100'),
      set: (element, value) => {
        element.dataset.max = String(value);
        updateSliderVisual(element);
      }
    },
    {
      id: 'slider-value',
      label: 'Value',
      type: 'number',
      get: (element) => parseFloat(element.dataset.value ?? '50'),
      set: (element, value) => {
        element.dataset.value = String(value);
        updateSliderVisual(element);
      }
    }
  ]
};

const propertyFieldRefs = new Map();
let activePropertySchema = [];

let scaleFrameId = null;
let layoutObserver = null;

function getElementText(element, selector, fallback = '') {
  if (!element) return fallback;
  if (selector) {
    const target = element.querySelector(selector);
    if (target) {
      const text = target.textContent || '';
      return text.trim() || fallback;
    }
  } else {
    const text = element.textContent || '';
    return text.trim() || fallback;
  }
  return fallback;
}

function setElementText(element, selector, value, fallback, datasetKey) {
  if (!element) return;
  const resolved = value && value.trim() ? value.trim() : fallback;
  if (datasetKey) {
    element.dataset[datasetKey] = resolved;
  }
  const target = selector ? element.querySelector(selector) : element;
  if (target) {
    target.textContent = resolved;
  }
  refreshHotspotMetadata(element);
}

function normaliseOptions(rawValue, fallbackOptions) {
  const options = (rawValue || '')
    .split(/\r?\n/)
    .map((option) => option.trim())
    .filter(Boolean);
  if (!options.length) {
    return [...fallbackOptions];
  }
  return options;
}

function applyElementSizeChange(element, { width, height }) {
  if (!element) return;
  const canvas = element.parentElement;
  if (!canvas) return;
  const currentWidth = parsePx(element.style.width, element.offsetWidth || MIN_WIDTH);
  const currentHeight = parsePx(element.style.height, element.offsetHeight || MIN_HEIGHT);
  let nextWidth = Number.isFinite(width) ? width : currentWidth;
  let nextHeight = Number.isFinite(height) ? height : currentHeight;
  const maxWidth = canvas.offsetWidth;
  const maxHeight = canvas.offsetHeight;
  nextWidth = snapDimensionWithin(nextWidth, MIN_WIDTH, maxWidth);
  nextHeight = snapDimensionWithin(nextHeight, MIN_HEIGHT, maxHeight);
  const left = parsePx(element.style.left, element.offsetLeft || 0);
  const top = parsePx(element.style.top, element.offsetTop || 0);
  const position = clampPosition(canvas, left, top, nextWidth, nextHeight);
  element.style.width = `${nextWidth}px`;
  element.style.height = `${nextHeight}px`;
  element.style.left = `${position.x}px`;
  element.style.top = `${position.y}px`;
  syncPropertiesFormFromElement(element, ['width', 'height']);
}

function updateDropdownVisual(element) {
  if (!element) return;
  const label = element.querySelector('.wire-dropdown-label');
  if (label) {
    const text = element.dataset.label || 'Dropdown';
    label.textContent = text;
  }
  const dropdown = element.querySelector('.wire-dropdown');
  if (!dropdown) return;
  dropdown.innerHTML = '';
  const options = normaliseOptions(
    element.dataset.options,
    ['Option 1', 'Option 2', 'Option 3']
  );
  options.slice(0, 3).forEach((option, index) => {
    const row = document.createElement('div');
    row.className = 'wire-dropdown-option';
    const marker = document.createElement('span');
    marker.className = 'wire-dropdown-bullet';
    marker.textContent = '◦';
    const text = document.createElement('span');
    text.className = 'wire-dropdown-text';
    text.textContent = index === 0 ? option : `${option}`;
    row.append(marker, text);
    dropdown.appendChild(row);
  });
  refreshHotspotMetadata(element);
}

function updateCardVisual(element) {
  if (!element) return;
  const card = element.querySelector('.wire-card');
  if (!card) return;
  const heading = card.querySelector('h3');
  const body = card.querySelector('p');
  const button = card.querySelector('.wire-button');
  const title = element.dataset.title || 'Card title';
  const description = element.dataset.body || 'Supporting description text goes here.';
  const cta = element.dataset.cta || 'Action';
  if (heading) heading.textContent = title;
  if (body) body.textContent = description;
  if (button) button.textContent = cta;
  refreshHotspotMetadata(element);
}

function updateRadioGroupVisual(element) {
  if (!element) return;
  const label = element.querySelector('.wire-radio-label');
  if (label) {
    label.textContent = element.dataset.label || 'Radio group';
  }
  const container = element.querySelector('.wire-radio-options');
  if (!container) return;
  container.innerHTML = '';
  const options = normaliseOptions(element.dataset.options, ['Option A', 'Option B']);
  options.forEach((option) => {
    const row = document.createElement('div');
    row.className = 'wire-radio-option';
    const bullet = document.createElement('span');
    bullet.className = 'wire-radio-bullet';
    const text = document.createElement('span');
    text.className = 'wire-radio-text';
    text.textContent = option;
    row.append(bullet, text);
    container.appendChild(row);
  });
  refreshHotspotMetadata(element);
}

function updateSliderVisual(element) {
  if (!element) return;
  const min = Number.parseFloat(element.dataset.min ?? '0');
  const max = Number.parseFloat(element.dataset.max ?? '100');
  let value = Number.parseFloat(element.dataset.value ?? '50');
  let resolvedMin = Number.isFinite(min) ? min : 0;
  let resolvedMax = Number.isFinite(max) ? max : 100;
  if (resolvedMin === resolvedMax) {
    resolvedMax = resolvedMin + 1;
  } else if (resolvedMin > resolvedMax) {
    const temp = resolvedMin;
    resolvedMin = resolvedMax;
    resolvedMax = temp;
  }
  if (!Number.isFinite(value)) {
    value = (resolvedMin + resolvedMax) / 2;
  }
  value = Math.min(Math.max(value, resolvedMin), resolvedMax);
  element.dataset.min = String(resolvedMin);
  element.dataset.max = String(resolvedMax);
  element.dataset.value = String(value);

  const label = element.querySelector('.wire-slider-label');
  if (label) {
    label.textContent = element.dataset.label || 'Slider';
  }
  const valueLabel = element.querySelector('.wire-slider-value');
  if (valueLabel) {
    valueLabel.textContent = `${value}`;
  }
  const track = element.querySelector('.wire-slider-track');
  const fill = element.querySelector('.wire-slider-fill');
  const handle = element.querySelector('.wire-slider-handle');
  if (!track || !handle || !fill) {
    refreshHotspotMetadata(element);
    return;
  }
  const percent = ((value - resolvedMin) / (resolvedMax - resolvedMin)) * 100;
  fill.style.width = `${percent}%`;
  handle.style.left = `${percent}%`;
  refreshHotspotMetadata(element);
}

function refreshHotspotMetadata(element) {
  if (!element || !element.dataset) return;
  const targetScreenId = element.dataset.targetScreen;
  const hotspotId = element.dataset.hotspotId;
  if (!targetScreenId || !screens.has(targetScreenId)) {
    if (hotspotId) {
      hotspotDetails.delete(hotspotId);
      delete element.dataset.hotspotId;
      delete element.dataset.hotspotLabel;
      scheduleDetailedAnalyticsRefresh();
    }
    return;
  }
  const ensuredId = ensureHotspotId(element);
  const metadata = buildHotspotMetadata(element, ensuredId);
  const previous = hotspotDetails.get(ensuredId);
  if (!previous || !isHotspotMetadataEqual(previous, metadata)) {
    hotspotDetails.set(ensuredId, metadata);
    element.dataset.hotspotLabel = metadata.name;
    scheduleDetailedAnalyticsRefresh();
  }
}

function ensureHotspotId(element) {
  if (!element || !element.dataset) return '';
  const existing = element.dataset.hotspotId;
  if (existing) {
    const numeric = Number.parseInt(existing.replace('hotspot-', ''), 10);
    if (Number.isFinite(numeric)) {
      hotspotIdCounter = Math.max(hotspotIdCounter, numeric);
    }
    return existing;
  }
  hotspotIdCounter += 1;
  const generated = `hotspot-${hotspotIdCounter}`;
  element.dataset.hotspotId = generated;
  return generated;
}

function buildHotspotMetadata(element, hotspotId) {
  return {
    id: hotspotId,
    screenId: getElementScreenId(element),
    targetScreenId: element.dataset?.targetScreen || '',
    name: deriveHotspotLabel(element)
  };
}

function getElementScreenId(element) {
  if (!element) return '';
  const canvas = element.closest('.canvas');
  return canvas ? canvas.id : '';
}

function deriveHotspotLabel(element) {
  if (!element || !element.dataset) return 'Hotspot';
  const fallback = formatElementLabel(element);
  const type = element.dataset.type || '';
  switch (type) {
    case 'button':
      return (element.dataset.label || getElementText(element, '.wire-button', 'Button')).trim() || fallback;
    case 'input':
      return (element.dataset.placeholder || 'Input field').trim() || fallback;
    case 'dropdown':
      return (element.dataset.label || 'Dropdown').trim() || fallback;
    case 'card':
      return (element.dataset.title || 'Card hotspot').trim() || fallback;
    case 'heading':
      return (element.dataset.text || getElementText(element, '.wire-heading', 'Heading')).trim() || fallback;
    case 'paragraph':
      return (element.dataset.text || getElementText(element, '.wire-paragraph', 'Paragraph')).trim() || fallback;
    case 'text':
      return (element.dataset.text || getElementText(element, '.wire-text', 'Text')).trim() || fallback;
    case 'image':
      return (element.dataset.label || 'Image').trim() || fallback;
    case 'radio-group':
      return (element.dataset.label || 'Radio group').trim() || fallback;
    case 'slider':
      return (element.dataset.label || 'Slider').trim() || fallback;
    default:
      return fallback;
  }
}

function isHotspotMetadataEqual(a, b) {
  if (!a || !b) return false;
  return a.name === b.name && a.targetScreenId === b.targetScreenId && a.screenId === b.screenId;
}

function getHotspotMeta(hotspotId) {
  return hotspotDetails.get(hotspotId) || null;
}

function getPropertySchemaForElement(element) {
  if (!element) return [];
  const type = element.dataset.type || '';
  const specific = PROPERTY_SCHEMAS[type] || [];
  return [...PROPERTY_SCHEMAS.common, ...specific];
}

function renderPropertiesForElement(element) {
  if (!propertiesForm || !propertiesEmptyState) return;
  propertyFieldRefs.clear();
  activePropertySchema = [];
  propertiesForm.innerHTML = '';

  if (!element) {
    propertiesForm.setAttribute('hidden', 'true');
    propertiesEmptyState.removeAttribute('hidden');
    propertiesEmptyState.textContent = 'Select an element to edit its basics.';
    return;
  }

  const schema = getPropertySchemaForElement(element);
  activePropertySchema = schema;
  if (!schema.length) {
    propertiesForm.setAttribute('hidden', 'true');
    propertiesEmptyState.removeAttribute('hidden');
    propertiesEmptyState.textContent = 'No editable properties for this element.';
    return;
  }

  propertiesEmptyState.setAttribute('hidden', 'true');
  propertiesForm.removeAttribute('hidden');

  schema.forEach((definition) => {
    const field = createPropertyField(definition, element);
    propertiesForm.appendChild(field);
  });
}

function createPropertyField(definition, element) {
  const wrapper = document.createElement('div');
  wrapper.className = definition.inline ? 'property-inline' : 'property-field';

  const label = document.createElement('label');
  label.textContent = definition.label;
  const inputId = `property-${definition.id}`;
  label.setAttribute('for', inputId);

  let control;
  if (definition.type === 'textarea') {
    control = document.createElement('textarea');
    if (definition.rows) {
      control.rows = definition.rows;
    }
  } else {
    control = document.createElement('input');
    control.type = definition.type || 'text';
  }
  control.id = inputId;
  control.value = formatPropertyValue(definition.get(element), control.type);
  if (definition.min !== undefined) {
    control.min = definition.min;
  }
  if (definition.max !== undefined) {
    control.max = definition.max;
  }
  if (definition.placeholder) {
    control.placeholder = definition.placeholder;
  }
  if (control.type === 'number') {
    control.step = definition.step !== undefined ? definition.step : 1;
  }

  const eventName = control.tagName === 'TEXTAREA' ? 'input' : 'input';
  control.addEventListener(eventName, (event) => {
    if (selectedElement !== element) return;
    if (control.type === 'number') {
      const parsed = Number.parseFloat(event.target.value);
      if (!Number.isFinite(parsed)) {
        syncPropertiesFormFromElement(element, [definition.id]);
        return;
      }
      definition.set(element, parsed);
    } else {
      definition.set(element, event.target.value);
    }
    syncPropertiesFormFromElement(element, [definition.id]);
  });

  propertyFieldRefs.set(definition.id, control);
  wrapper.append(label, control);
  return wrapper;
}

function formatPropertyValue(value, type) {
  if (type === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }
  if (value === null || value === undefined) return '';
  return String(value);
}

function syncPropertiesFormFromElement(element, specificIds = null) {
  if (!element || !activePropertySchema.length) return;
  const ids = specificIds ? new Set(specificIds) : null;
  activePropertySchema.forEach((definition) => {
    if (ids && !ids.has(definition.id)) return;
    const control = propertyFieldRefs.get(definition.id);
    if (!control) return;
    if (document.activeElement === control && (!ids || ids.size === 1)) {
      return;
    }
    const value = definition.get(element);
    control.value = formatPropertyValue(value, control.type);
  });
}

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
  attachScreenDialogs();
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

  renderPropertiesForElement(null);

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
    if (isScreenModalOpen()) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeScreenModal();
      }
      return;
    }

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

  screenDropdown.addEventListener('dblclick', (event) => {
    event.preventDefault();
    startInlineScreenRename();
  });

  addScreenBtn.addEventListener('click', () => {
    showAddScreenModal();
  });

  duplicateScreenBtn.addEventListener('click', () => {
    showDuplicateScreenModal();
  });

  deleteScreenBtn.addEventListener('click', () => {
    showDeleteScreenModal();
  });
}

function showAddScreenModal() {
  if (!screens) return;
  const suggested = `Screen ${screenCounter}`;
  openScreenModal({
    type: 'input',
    title: 'Add screen',
    message: 'Name the new screen.',
    defaultValue: suggested,
    placeholder: 'New screen name',
    confirmLabel: 'Create screen',
    onConfirm: (value) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return false;
      }
      const screenId = createScreen(trimmed);
      setActiveScreen(screenId);
      closeScreenModal();
      return true;
    }
  });
}

function showDuplicateScreenModal() {
  if (!activeScreenId || !screens.has(activeScreenId)) return;
  const source = screens.get(activeScreenId);
  const suggested = `${source.name} copy`;
  openScreenModal({
    type: 'input',
    title: 'Duplicate screen',
    message: `Create a copy of "${source.name}".`,
    defaultValue: suggested,
    placeholder: 'Duplicated screen name',
    confirmLabel: 'Duplicate screen',
    onConfirm: (value) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return false;
      }
      const newId = duplicateActiveScreen(trimmed);
      if (newId) {
        closeScreenModal();
        return true;
      }
      return false;
    }
  });
}

function showDeleteScreenModal() {
  if (!activeScreenId || !screens.has(activeScreenId)) return;

  if (screens.size === 1) {
    openScreenModal({
      type: 'info',
      title: 'Cannot delete screen',
      message: 'Keep at least one screen in the project.',
      confirmLabel: 'Got it',
      hideCancel: true
    });
    return;
  }

  const targetId = activeScreenId;
  const screenData = screens.get(targetId);
  openScreenModal({
    type: 'confirm',
    title: 'Delete screen',
    message: `Delete "${screenData.name}"? This cannot be undone.`,
    confirmLabel: 'Delete screen',
    cancelLabel: 'Cancel',
    destructive: true,
    onConfirm: () => {
      const deleted = performDeleteActiveScreen(targetId);
      if (deleted) {
        closeScreenModal();
        return true;
      }
      return false;
    }
  });
}

function startInlineScreenRename() {
  if (!screenDropdown) return;
  if (inlineScreenRenameInput) {
    inlineScreenRenameInput.focus({ preventScroll: true });
    inlineScreenRenameInput.select();
    return;
  }
  if (!activeScreenId || !screens.has(activeScreenId)) return;

  const screenData = screens.get(activeScreenId);
  inlineScreenRenameTargetId = activeScreenId;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'screen-rename-input';
  input.value = screenData.name;
  input.setAttribute('aria-label', 'Rename screen');
  input.maxLength = 80;

  inlineScreenRenameInput = input;
  inlineScreenRenameKeyHandler = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      finishInlineScreenRename(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      finishInlineScreenRename(false);
    }
  };
  inlineScreenRenameBlurHandler = () => {
    finishInlineScreenRename(true);
  };

  input.addEventListener('keydown', inlineScreenRenameKeyHandler);
  input.addEventListener('blur', inlineScreenRenameBlurHandler);

  screenDropdown.style.display = 'none';
  screenDropdown.insertAdjacentElement('afterend', input);

  window.requestAnimationFrame(() => {
    input.focus({ preventScroll: true });
    input.select();
  });
}

function finishInlineScreenRename(applyChanges) {
  if (!inlineScreenRenameInput) return;

  const input = inlineScreenRenameInput;
  if (inlineScreenRenameKeyHandler) {
    input.removeEventListener('keydown', inlineScreenRenameKeyHandler);
  }
  if (inlineScreenRenameBlurHandler) {
    input.removeEventListener('blur', inlineScreenRenameBlurHandler);
  }

  const newValue = input.value.trim();
  const targetId = inlineScreenRenameTargetId;

  inlineScreenRenameInput = null;
  inlineScreenRenameTargetId = null;
  inlineScreenRenameKeyHandler = null;
  inlineScreenRenameBlurHandler = null;

  input.remove();
  screenDropdown.style.display = '';

  if (applyChanges && targetId && screens.has(targetId) && newValue) {
    if (targetId === activeScreenId) {
      renameActiveScreen(newValue);
    } else {
      updateScreenName(targetId, newValue);
    }
  }

  screenDropdown.focus({ preventScroll: true });
}

function isScreenModalOpen() {
  return Boolean(screenModalState) && screenModal && !screenModal.classList.contains('hidden');
}

function openScreenModal(config = {}) {
  if (!screenModal || !screenModalForm || !dialogBackdrop) return;

  closeScreenModal(false);

  lastFocusedBeforeScreenModal = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;

  const type = config.type || 'confirm';
  screenModalState = {
    type,
    requireValue: type === 'input' ? config.requireValue !== false : false,
    onConfirm: typeof config.onConfirm === 'function' ? config.onConfirm : null,
    onCancel: typeof config.onCancel === 'function' ? config.onCancel : null,
    hideCancel: Boolean(config.hideCancel),
    destructive: Boolean(config.destructive),
    validate: typeof config.validate === 'function' ? config.validate : null,
    dismissible: config.dismissible !== false,
    input: null,
    inputListener: null
  };

  screenModalTitle.textContent = config.title || 'Screen settings';
  screenModalBody.innerHTML = '';

  if (type === 'input' && config.message) {
    const message = document.createElement('p');
    message.textContent = config.message;
    screenModalBody.appendChild(message);
  } else if (config.message) {
    const message = document.createElement('p');
    message.textContent = config.message;
    screenModalBody.appendChild(message);
  }

  if (type === 'input') {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'modal-input';
    input.value = config.defaultValue || '';
    input.placeholder = config.placeholder || '';
    input.setAttribute('aria-label', config.ariaLabel || 'Screen name');
    input.maxLength = typeof config.maxLength === 'number' ? config.maxLength : 80;
    screenModalBody.appendChild(input);
    screenModalState.input = input;
  }

  screenModalConfirm.textContent = config.confirmLabel || 'Confirm';
  screenModalConfirm.classList.toggle('button-danger', screenModalState.destructive);
  screenModalConfirm.disabled = false;

  if (screenModalState.hideCancel) {
    screenModalCancel.style.display = 'none';
    screenModalCancel.setAttribute('aria-hidden', 'true');
  } else {
    screenModalCancel.style.display = '';
    screenModalCancel.removeAttribute('aria-hidden');
    screenModalCancel.textContent = config.cancelLabel || 'Cancel';
  }

  updateScreenModalConfirmState();

  dialogBackdrop.classList.remove('hidden');
  dialogBackdrop.setAttribute('aria-hidden', 'false');
  screenModal.classList.remove('hidden');
  screenModal.setAttribute('aria-hidden', 'false');

  if (screenModalState.input) {
    const listener = () => updateScreenModalConfirmState();
    screenModalState.inputListener = listener;
    screenModalState.input.addEventListener('input', listener);
    window.requestAnimationFrame(() => {
      screenModalState?.input?.focus({ preventScroll: true });
      screenModalState?.input?.select();
    });
  } else {
    window.requestAnimationFrame(() => {
      screenModalConfirm.focus({ preventScroll: true });
    });
  }
}

function closeScreenModal(restoreFocus = true) {
  if (screenModalState && screenModalState.input && screenModalState.inputListener) {
    screenModalState.input.removeEventListener('input', screenModalState.inputListener);
  }

  screenModalBody.innerHTML = '';
  screenModalConfirm.classList.remove('button-danger');
  screenModalConfirm.disabled = false;
  screenModalCancel.style.display = '';
  screenModalCancel.removeAttribute('aria-hidden');

  if (!screenModal.classList.contains('hidden')) {
    screenModal.classList.add('hidden');
  }
  screenModal.setAttribute('aria-hidden', 'true');

  if (!dialogBackdrop.classList.contains('hidden')) {
    dialogBackdrop.classList.add('hidden');
  }
  dialogBackdrop.setAttribute('aria-hidden', 'true');

  const focusTarget = restoreFocus ? lastFocusedBeforeScreenModal : null;
  screenModalState = null;
  lastFocusedBeforeScreenModal = null;

  if (focusTarget && typeof focusTarget.focus === 'function') {
    focusTarget.focus({ preventScroll: true });
  }
}

function handleScreenModalConfirm() {
  if (!screenModalState) return;

  const maybeClose = () => {
    if (screenModalState) {
      closeScreenModal();
    }
  };

  if (screenModalState.input) {
    updateScreenModalConfirmState();
    if (screenModalConfirm.disabled) {
      screenModalState.input.reportValidity();
      return;
    }

    screenModalState.input.setCustomValidity('');
    const value = screenModalState.input.value.trim();
    try {
      const result = screenModalState.onConfirm ? screenModalState.onConfirm(value) : true;
      if (result && typeof result.then === 'function') {
        screenModalConfirm.disabled = true;
        result
          .then((resolved) => {
            if (resolved !== false) {
              maybeClose();
            } else {
              screenModalConfirm.disabled = false;
              updateScreenModalConfirmState();
            }
          })
          .catch((error) => {
            console.error(error);
            screenModalConfirm.disabled = false;
            updateScreenModalConfirmState();
          });
        return;
      }
      if (result === false) {
        return;
      }
      maybeClose();
    } catch (error) {
      console.error(error);
    }
  } else {
    try {
      const result = screenModalState.onConfirm ? screenModalState.onConfirm() : true;
      if (result && typeof result.then === 'function') {
        screenModalConfirm.disabled = true;
        result
          .then((resolved) => {
            if (resolved !== false) {
              maybeClose();
            } else {
              screenModalConfirm.disabled = false;
            }
          })
          .catch((error) => {
            console.error(error);
            screenModalConfirm.disabled = false;
          });
        return;
      }
      if (result === false) {
        return;
      }
      maybeClose();
    } catch (error) {
      console.error(error);
    }
  }
}

function handleScreenModalCancel() {
  if (screenModalState && typeof screenModalState.onCancel === 'function') {
    screenModalState.onCancel();
  }
  closeScreenModal();
}

function updateScreenModalConfirmState() {
  if (!screenModalState) return;
  if (screenModalState.input) {
    const value = screenModalState.input.value.trim();
    let disabled = screenModalState.requireValue && value.length === 0;
    let validationMessage = '';
    if (!disabled && screenModalState.validate) {
      const validationResult = screenModalState.validate(value);
      if (validationResult === false) {
        disabled = true;
      } else if (typeof validationResult === 'string') {
        disabled = true;
        validationMessage = validationResult;
      }
    }
    screenModalState.input.setCustomValidity(validationMessage);
    screenModalConfirm.disabled = disabled;
  } else {
    screenModalConfirm.disabled = false;
  }
}

function attachHelpModal() {
  helpButton.addEventListener('click', openHelpModal);
  closeHelpBtn.addEventListener('click', closeHelpModal);
  modalBackdrop.addEventListener('click', closeHelpModal);
}

function attachScreenDialogs() {
  if (!screenModalForm || !screenModal || !dialogBackdrop) return;

  screenModalForm.addEventListener('submit', (event) => {
    event.preventDefault();
    handleScreenModalConfirm();
  });

  screenModalCancel.addEventListener('click', (event) => {
    event.preventDefault();
    handleScreenModalCancel();
  });

  screenModalClose.addEventListener('click', (event) => {
    event.preventDefault();
    handleScreenModalCancel();
  });

  dialogBackdrop.addEventListener('click', () => {
    if (!screenModalState) return;
    if (screenModalState.dismissible === false) return;
    handleScreenModalCancel();
  });
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
    previewButton.addEventListener('click', () => openPreview('preview'));
  }
  if (analysisButton) {
    analysisButton.addEventListener('click', () => openPreview('analysis'));
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
  if (previewModePreviewBtn) {
    previewModePreviewBtn.addEventListener('click', () => setPreviewMode('preview'));
  }
  if (previewModeAnalysisBtn) {
    previewModeAnalysisBtn.addEventListener('click', () => setPreviewMode('analysis'));
  }
  if (analysisResetBtn) {
    analysisResetBtn.addEventListener('click', resetAnalysisDataForCurrentScreen);
  }
  if (analysisSessionScreenSelect) {
    analysisSessionScreenSelect.addEventListener('change', () => {
      scheduleDetailedAnalyticsRefresh();
    });
  }
  if (previewCanvasContainer) {
    if (typeof window !== 'undefined' && 'PointerEvent' in window) {
      previewCanvasContainer.addEventListener('pointermove', handlePreviewPointerMove);
    } else {
      previewCanvasContainer.addEventListener('mousemove', handlePreviewPointerMove);
    }
    previewCanvasContainer.addEventListener('click', handlePreviewClick, true);
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
  refreshLinkSelectOptions();
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
  refreshLinkSelectOptions();
  scheduleDetailedAnalyticsRefresh();
}

function renameActiveScreen(newName) {
  if (!activeScreenId || !screens.has(activeScreenId)) return false;
  return updateScreenName(activeScreenId, newName);
}

function updateScreenName(screenId, proposedName) {
  if (!screenId || !screens.has(screenId)) return false;
  const trimmed = typeof proposedName === 'string' ? proposedName.trim() : '';
  if (!trimmed) return false;

  const screenData = screens.get(screenId);
  if (screenData.name === trimmed) return false;

  screenData.name = trimmed;
  if (screenData.option) {
    screenData.option.textContent = trimmed;
  }
  if (screenId === activeScreenId) {
    refreshSelectionBar();
  }
  if (isPreviewOpen()) {
    buildPreviewScreens();
  }
  refreshLinkSelectOptions();
  scheduleDetailedAnalyticsRefresh();
  return true;
}

function duplicateActiveScreen(requestedName) {
  if (!activeScreenId || !screens.has(activeScreenId)) return null;
  const source = screens.get(activeScreenId);
  const fallbackName = `${source.name} copy`;
  const duplicateName = typeof requestedName === 'string' && requestedName.trim()
    ? requestedName.trim()
    : fallbackName;

  const newScreenId = createScreen(duplicateName);
  const target = screens.get(newScreenId);

  setCanvasSize(source.width, source.height, newScreenId, source.presetKey);
  copyScreenContents(source.canvas, target.canvas);
  setActiveScreen(newScreenId);
  refreshLinkSelectOptions();
  return newScreenId;
}

function performDeleteActiveScreen(screenId = activeScreenId) {
  if (!screenId || !screens.has(screenId)) return false;
  if (screens.size === 1) {
    return false;
  }

  const options = Array.from(screenDropdown.options);
  const currentIndex = options.findIndex((option) => option.value === screenId);
  const candidateAfter = currentIndex >= 0 ? options[currentIndex + 1] : null;
  const candidateBefore = currentIndex > 0 ? options[currentIndex - 1] : null;
  const fallbackId = candidateAfter?.value || candidateBefore?.value || null;

  const screenToRemove = screens.get(screenId);

  clearSelection();
  if (screenToRemove.canvas.parentElement) {
    screenToRemove.canvas.parentElement.removeChild(screenToRemove.canvas);
  }
  if (screenToRemove.option) {
    screenToRemove.option.remove();
  }
  screens.delete(screenId);
  previewInteractionData.delete(screenToRemove.id);
  clearSessionDataForScreen(screenToRemove.id);
  hotspotDetails.forEach((meta, hotspotId) => {
    if (meta.screenId === screenToRemove.id) {
      hotspotDetails.delete(hotspotId);
    }
  });
  clearLinksToScreen(screenToRemove.id);

  const deletingActive = activeScreenId === screenId;
  if (deletingActive) {
    refreshSelectionBar();
  }

  let nextId = fallbackId && screens.has(fallbackId)
    ? fallbackId
    : screens.size > 0
      ? screens.keys().next().value
      : null;

  if (deletingActive) {
    activeScreenId = null;
    if (nextId) {
      setActiveScreen(nextId);
    } else {
      const newScreenId = createScreen(`Screen ${screenCounter}`);
      setActiveScreen(newScreenId);
      nextId = newScreenId;
    }
  }

  refreshLinkSelectOptions();
  scheduleDetailedAnalyticsRefresh();
  return true;
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
      wrapper.dataset.label = 'Button';
      const button = document.createElement('div');
      button.className = 'wire-button';
      button.textContent = wrapper.dataset.label;
      wrapper.appendChild(button);
      break;
    }
    case 'input': {
      wrapper.dataset.placeholder = 'Input field';
      const input = document.createElement('div');
      input.className = 'wire-input';
      input.textContent = wrapper.dataset.placeholder;
      wrapper.appendChild(input);
      break;
    }
    case 'dropdown': {
      wrapper.dataset.label = 'Dropdown';
      wrapper.dataset.options = 'Option 1\nOption 2\nOption 3';
      const label = document.createElement('div');
      label.className = 'wire-dropdown-label';
      const dropdown = document.createElement('div');
      dropdown.className = 'wire-dropdown';
      wrapper.append(label, dropdown);
      updateDropdownVisual(wrapper);
      break;
    }
    case 'card': {
      wrapper.dataset.title = 'Card title';
      wrapper.dataset.body = 'Supporting description text goes here.';
      wrapper.dataset.cta = 'Action';
      const card = document.createElement('div');
      card.className = 'wire-card';
      const heading = document.createElement('h3');
      const body = document.createElement('p');
      const button = document.createElement('div');
      button.className = 'wire-button';
      card.append(heading, body, button);
      wrapper.appendChild(card);
      updateCardVisual(wrapper);
      break;
    }
    case 'heading': {
      wrapper.dataset.text = 'Heading';
      const heading = document.createElement('div');
      heading.className = 'wire-heading';
      heading.textContent = wrapper.dataset.text;
      wrapper.appendChild(heading);
      break;
    }
    case 'paragraph': {
      wrapper.dataset.text = 'Lorem ipsum placeholder copy for quick wireframes.';
      const paragraph = document.createElement('div');
      paragraph.className = 'wire-paragraph';
      paragraph.textContent = wrapper.dataset.text;
      wrapper.appendChild(paragraph);
      break;
    }
    case 'image': {
      wrapper.dataset.label = 'Image';
      const image = document.createElement('div');
      image.className = 'wire-image';
      image.textContent = wrapper.dataset.label;
      wrapper.appendChild(image);
      break;
    }
    case 'text': {
      wrapper.dataset.text = 'Sample text';
      const textBlock = document.createElement('div');
      textBlock.className = 'wire-text';
      textBlock.textContent = wrapper.dataset.text;
      wrapper.appendChild(textBlock);
      break;
    }
    case 'radio-group': {
      wrapper.dataset.label = 'Radio group';
      wrapper.dataset.options = 'Option A\nOption B';
      const label = document.createElement('div');
      label.className = 'wire-radio-label';
      const body = document.createElement('p');
      body.className = 'wire-radio-options';
      wrapper.append(label, body);
      updateRadioGroupVisual(wrapper);
      break;
    }
    case 'slider': {
      wrapper.dataset.label = 'Slider';
      wrapper.dataset.min = '0';
      wrapper.dataset.max = '100';
      wrapper.dataset.value = '50';
      const slider = document.createElement('div');
      slider.className = 'wire-slider';
      const header = document.createElement('div');
      header.className = 'wire-slider-header';
      const label = document.createElement('span');
      label.className = 'wire-slider-label';
      const value = document.createElement('span');
      value.className = 'wire-slider-value';
      header.append(label, value);
      const track = document.createElement('div');
      track.className = 'wire-slider-track';
      const fill = document.createElement('div');
      fill.className = 'wire-slider-fill';
      const handle = document.createElement('div');
      handle.className = 'wire-slider-handle';
      track.append(fill, handle);
      slider.append(header, track);
      wrapper.appendChild(slider);
      updateSliderVisual(wrapper);
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
    let target = element;
    if (event.altKey) {
      const duplicate = duplicateWireItem(element);
      if (duplicate) {
        target = duplicate;
      }
    }
    selectElement(target);
    startDrag(target, event);
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
  syncPropertiesFormFromElement(element, ['width', 'height']);
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

function duplicateWireItem(sourceElement) {
  if (!sourceElement || !sourceElement.parentElement) return null;
  const canvas = sourceElement.parentElement;
  const clone = sourceElement.cloneNode(true);
  clone.classList.remove('selected', 'editing');
  clone.removeAttribute('contenteditable');
  removeHandles(clone);

  let width = snapDimensionWithin(sourceElement.offsetWidth, MIN_WIDTH, canvas.offsetWidth);
  let height = snapDimensionWithin(sourceElement.offsetHeight, MIN_HEIGHT, canvas.offsetHeight);
  const left = parseFloat(sourceElement.style.left) || 0;
  const top = parseFloat(sourceElement.style.top) || 0;
  const position = clampPosition(canvas, left, top, width, height);

  const widthLimit = canvas.offsetWidth - position.x;
  const heightLimit = canvas.offsetHeight - position.y;
  width = snapDimensionWithin(width, MIN_WIDTH, widthLimit);
  height = snapDimensionWithin(height, MIN_HEIGHT, heightLimit);

  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;
  clone.style.left = `${position.x}px`;
  clone.style.top = `${position.y}px`;

  if (sourceElement.dataset.targetScreen && screens.has(sourceElement.dataset.targetScreen)) {
    clone.dataset.targetScreen = sourceElement.dataset.targetScreen;
  } else {
    delete clone.dataset.targetScreen;
  }

  configureWireItem(clone);
  canvas.appendChild(clone);
  return clone;
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
    const hotspotId = ensureHotspotId(element);
    element.dataset.hotspotId = hotspotId;
    refreshHotspotMetadata(element);
  } else {
    if (target && !screens.has(target)) {
      delete element.dataset.targetScreen;
    }
    if (element.dataset.hotspotId) {
      hotspotDetails.delete(element.dataset.hotspotId);
      delete element.dataset.hotspotId;
      delete element.dataset.hotspotLabel;
      scheduleDetailedAnalyticsRefresh();
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
  if (!selectionLabel) return;
  const hasSelection = Boolean(selectedElement);
  if (selectionBar) {
    selectionBar.classList.toggle('inactive', !hasSelection);
  }
  if (linkControls) {
    linkControls.classList.toggle('disabled', !hasSelection);
    linkControls.setAttribute('aria-disabled', hasSelection ? 'false' : 'true');
  }
  if (linkSelect) {
    linkSelect.disabled = !hasSelection;
  }
  if (clearLinkBtn) {
    clearLinkBtn.disabled = !hasSelection;
  }
  if (!hasSelection) {
    selectionLabel.textContent = 'No element selected';
    renderPropertiesForElement(null);
    if (linkSelect && !isUpdatingLinkSelect) {
      isUpdatingLinkSelect = true;
      linkSelect.value = '';
      isUpdatingLinkSelect = false;
    }
    return;
  }
  renderPropertiesForElement(selectedElement);
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

function setPreviewMode(mode) {
  const nextMode = mode === 'analysis' ? 'analysis' : 'preview';
  if (previewMode === nextMode) {
    applyPreviewModeUi();
    if (nextMode === 'analysis') {
      scheduleAnalysisRender(previewActiveScreenId);
    }
    return;
  }
  if (previewMode === 'preview' && nextMode === 'analysis') {
    finaliseActiveInteractionSession();
  }
  previewMode = nextMode;
  applyPreviewModeUi();
  if (previewMode === 'analysis') {
    scheduleAnalysisRender(previewActiveScreenId);
  }
  scheduleDetailedAnalyticsRefresh();
}

function applyPreviewModeUi() {
  const isOpen = isPreviewOpen();
  const isAnalysis = previewMode === 'analysis';
  if (previewTitle) {
    previewTitle.textContent = isAnalysis ? 'Analysis' : 'Preview';
  }
  if (previewModePreviewBtn) {
    previewModePreviewBtn.classList.toggle('active', !isAnalysis);
    previewModePreviewBtn.setAttribute('aria-pressed', !isAnalysis ? 'true' : 'false');
  }
  if (previewModeAnalysisBtn) {
    previewModeAnalysisBtn.classList.toggle('active', isAnalysis);
    previewModeAnalysisBtn.setAttribute('aria-pressed', isAnalysis ? 'true' : 'false');
  }
  if (analysisPanel) {
    analysisPanel.hidden = !isOpen || !isAnalysis;
  }
  updateAnalysisSummary();
  updateAnalysisOverlayVisibility();
  if (previewButton) {
    previewButton.setAttribute('aria-pressed', isOpen && !isAnalysis ? 'true' : 'false');
  }
  if (analysisButton) {
    analysisButton.setAttribute('aria-pressed', isOpen && isAnalysis ? 'true' : 'false');
  }
}

function updateAnalysisOverlayVisibility() {
  if (!previewCanvasContainer) return;
  const overlays = previewCanvasContainer.querySelectorAll('.analysis-overlay');
  overlays.forEach((overlay) => {
    const isAnalysis = previewMode === 'analysis' && isPreviewOpen();
    overlay.classList.toggle('visible', isAnalysis);
    overlay.setAttribute('aria-hidden', isAnalysis ? 'false' : 'true');
  });
}

function updateAnalysisSummary() {
  if (!analysisMoveCount || !analysisClickCount) return;
  const activeId = previewActiveScreenId;
  const totals = getInteractionTotals(activeId);
  analysisMoveCount.textContent = String(totals.moves);
  analysisClickCount.textContent = String(totals.clicks);
  if (analysisEmptyState) {
    const shouldShow = previewMode === 'analysis' && isPreviewOpen() && totals.moves === 0 && totals.clicks === 0;
    analysisEmptyState.hidden = !shouldShow;
  }
  scheduleDetailedAnalyticsRefresh();
}

function getInteractionState(screenId) {
  if (!screenId) return null;
  if (!previewInteractionData.has(screenId)) {
    previewInteractionData.set(screenId, { moves: [], clicks: [] });
  }
  return previewInteractionData.get(screenId);
}

function getInteractionTotals(screenId) {
  if (!screenId || !previewInteractionData.has(screenId)) {
    return { moves: 0, clicks: 0 };
  }
  const data = previewInteractionData.get(screenId);
  return {
    moves: data.moves.length,
    clicks: data.clicks.length
  };
}

function resetAnalysisDataForCurrentScreen() {
  if (!previewActiveScreenId) return;
  if (previewInteractionData.has(previewActiveScreenId)) {
    previewInteractionData.delete(previewActiveScreenId);
  }
  clearSessionDataForScreen(previewActiveScreenId);
  scheduleAnalysisRender(previewActiveScreenId);
  updateAnalysisSummary();
}

function handlePreviewPointerMove(event) {
  if (!isPreviewOpen() || previewMode !== 'preview') return;
  if (typeof event.pointerType === 'string' && event.pointerType !== 'mouse') return;
  const position = getPreviewEventCoordinates(event);
  if (!position) return;
  const hotspotInfo = resolvePreviewHotspotInfo(event, position);
  const now = performance.now();
  if (lastPointerSample && lastPointerSample.screenId === position.screenId) {
    const elapsed = now - lastPointerSample.time;
    const distance = Math.hypot(position.x - lastPointerSample.x, position.y - lastPointerSample.y);
    const hotspotChanged = lastPointerSample.hotspotId !== (hotspotInfo && hotspotInfo.id);
    if (!hotspotChanged && elapsed < ANALYSIS_MOVE_MIN_INTERVAL && distance < ANALYSIS_MOVE_MIN_DISTANCE) {
      return;
    }
  }
  lastPointerSample = { ...position, time: now, hotspotId: hotspotInfo ? hotspotInfo.id : null };
  recordPreviewMove(position.screenId, position.x, position.y, hotspotInfo);
}

function handlePreviewClick(event) {
  if (!isPreviewOpen() || previewMode !== 'preview') return;
  const position = getPreviewEventCoordinates(event);
  if (!position) return;
  const hotspotInfo = resolvePreviewHotspotInfo(event, position);
  recordPreviewClick(position.screenId, position.x, position.y, hotspotInfo);
}

function getPreviewEventCoordinates(event) {
  if (!previewCanvasContainer) return null;
  const canvas = event.target.closest('.preview-canvas');
  if (!canvas) return null;
  const screenId = canvas.dataset.screenId;
  if (!screenId || !screens.has(screenId)) return null;
  const rect = canvas.getBoundingClientRect();
  const scale = parseFloat(canvas.dataset.scale) || 1;
  if (!Number.isFinite(scale) || scale <= 0) return null;
  const x = (event.clientX - rect.left) / scale;
  const y = (event.clientY - rect.top) / scale;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { canvas, screenId, x, y };
}

function recordPreviewMove(screenId, x, y, hotspotInfo) {
  const state = getInteractionState(screenId);
  if (!state) return;
  const timestamp = Date.now();
  state.moves.push({
    x,
    y,
    time: timestamp,
    hotspotId: hotspotInfo ? hotspotInfo.id : null
  });
  if (state.moves.length > ANALYSIS_MAX_MOVE_POINTS) {
    state.moves.splice(0, state.moves.length - ANALYSIS_MAX_MOVE_POINTS);
  }
  registerSessionMove(screenId, hotspotInfo, timestamp);
  scheduleAnalysisRender(screenId);
  updateAnalysisSummary();
}

function recordPreviewClick(screenId, x, y, hotspotInfo) {
  const state = getInteractionState(screenId);
  if (!state) return;
  const timestamp = Date.now();
  state.clicks.push({
    x,
    y,
    time: timestamp,
    hotspotId: hotspotInfo ? hotspotInfo.id : null
  });
  if (state.clicks.length > ANALYSIS_MAX_CLICK_POINTS) {
    state.clicks.splice(0, state.clicks.length - ANALYSIS_MAX_CLICK_POINTS);
  }
  registerSessionClick(screenId, hotspotInfo, timestamp);
  scheduleAnalysisRender(screenId);
  updateAnalysisSummary();
}

function scheduleAnalysisRender(screenId) {
  if (!screenId) return;
  analysisRenderQueue.add(screenId);
  if (analysisRenderScheduled) return;
  analysisRenderScheduled = true;
  window.requestAnimationFrame(() => {
    analysisRenderQueue.forEach((id) => renderAnalysisForScreen(id));
    analysisRenderQueue.clear();
    analysisRenderScheduled = false;
  });
}

function renderAnalysisForScreen(screenId) {
  if (!previewCanvasContainer) return;
  const overlay = previewCanvasContainer.querySelector(`.analysis-overlay[data-screen-id="${screenId}"]`);
  if (!overlay) return;
  const ctx = overlay.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  const data = previewInteractionData.get(screenId);
  if (!data) return;
  if (data.moves.length > 0) {
    renderHeatmapOverlay(ctx, overlay, data.moves);
  }
  data.clicks.forEach(({ x, y }) => {
    drawClickMarker(ctx, x, y);
  });
}

function renderHeatmapOverlay(targetCtx, overlayCanvas, points) {
  const buffer = getHeatmapBuffer(overlayCanvas);
  const bufferCtx = buffer.getContext('2d');
  if (!bufferCtx) return;
  bufferCtx.clearRect(0, 0, buffer.width, buffer.height);
  points.forEach(({ x, y }) => {
    stampHeatIntensity(bufferCtx, x, y);
  });
  colouriseHeatmap(bufferCtx, targetCtx);
}

function getHeatmapBuffer(canvas) {
  if (!canvas.__heatmapBuffer) {
    canvas.__heatmapBuffer = document.createElement('canvas');
  }
  const buffer = canvas.__heatmapBuffer;
  if (buffer.width !== canvas.width || buffer.height !== canvas.height) {
    buffer.width = canvas.width;
    buffer.height = canvas.height;
  }
  return buffer;
}

function stampHeatIntensity(ctx, x, y) {
  ctx.save();
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, HEAT_POINT_RADIUS);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.42)');
  gradient.addColorStop(0.55, 'rgba(0, 0, 0, 0.18)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath();
  ctx.arc(x, y, HEAT_POINT_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function colouriseHeatmap(sourceCtx, targetCtx) {
  const { canvas } = sourceCtx;
  const width = canvas.width;
  const height = canvas.height;
  if (width === 0 || height === 0) return;
  const image = sourceCtx.getImageData(0, 0, width, height);
  const { data } = image;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    if (alpha <= 0) {
      data[i + 3] = 0;
      continue;
    }
    const colour = sampleHeatmapColour(Math.min(1, Math.pow(alpha, HEAT_INTENSITY_EXPONENT)));
    data[i] = colour.r;
    data[i + 1] = colour.g;
    data[i + 2] = colour.b;
    data[i + 3] = Math.round(colour.a * 255);
  }
  targetCtx.putImageData(image, 0, 0);
}

function sampleHeatmapColour(value) {
  const stops = HEATMAP_GRADIENT_STOPS;
  if (!stops.length) {
    return { r: 255, g: 87, b: 34, a: value };
  }
  if (value <= stops[0].stop) {
    return stops[0];
  }
  for (let index = 1; index < stops.length; index += 1) {
    const stop = stops[index];
    if (value <= stop.stop) {
      const prev = stops[index - 1];
      const range = stop.stop - prev.stop || 1;
      const t = (value - prev.stop) / range;
      return {
        r: Math.round(prev.r + (stop.r - prev.r) * t),
        g: Math.round(prev.g + (stop.g - prev.g) * t),
        b: Math.round(prev.b + (stop.b - prev.b) * t),
        a: prev.a + (stop.a - prev.a) * t
      };
    }
  }
  return stops[stops.length - 1];
}

function drawClickMarker(ctx, x, y) {
  ctx.save();
  ctx.strokeStyle = 'rgba(227, 35, 24, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(227, 35, 24, 0.55)';
  ctx.fill();
  ctx.restore();
}

function ensureActiveInteractionSession(timestamp) {
  const now = Number.isFinite(timestamp) ? timestamp : Date.now();
  if (!activeInteractionSession) {
    activeInteractionSession = {
      id: ++interactionSessionCounter,
      startTime: now,
      lastActivity: now,
      perScreen: new Map()
    };
  } else if (now > activeInteractionSession.lastActivity) {
    activeInteractionSession.lastActivity = now;
  }
  return activeInteractionSession;
}

function ensureSessionStats(session, screenId) {
  if (!session.perScreen.has(screenId)) {
    session.perScreen.set(screenId, {
      moves: 0,
      clicks: 0,
      hotspotClicks: 0,
      hotspotHovers: 0,
      uniqueHotspots: new Set(),
      hoverByHotspot: new Map(),
      clickByHotspot: new Map(),
      currentHover: null,
      lastActivity: session.startTime
    });
  }
  return session.perScreen.get(screenId);
}

function registerSessionMove(screenId, hotspotInfo, timestamp) {
  if (!screenId) return;
  const session = ensureActiveInteractionSession(timestamp);
  const stats = ensureSessionStats(session, screenId);
  stats.moves += 1;
  stats.lastActivity = timestamp;
  const hotspotId = hotspotInfo && hotspotInfo.id;
  if (hotspotId) {
    const hoverEntry = stats.hoverByHotspot.get(hotspotId) || { moves: 0, entries: 0 };
    hoverEntry.moves = (hoverEntry.moves || 0) + 1;
    hoverEntry.name = hotspotInfo.name || hoverEntry.name || '';
    hoverEntry.targetScreenId = hotspotInfo.targetScreenId || hoverEntry.targetScreenId || '';
    if (stats.currentHover !== hotspotId) {
      hoverEntry.entries = (hoverEntry.entries || 0) + 1;
      stats.hotspotHovers += 1;
      stats.currentHover = hotspotId;
    }
    stats.hoverByHotspot.set(hotspotId, hoverEntry);
    stats.uniqueHotspots.add(hotspotId);
  } else {
    stats.currentHover = null;
  }
  scheduleDetailedAnalyticsRefresh();
}

function registerSessionClick(screenId, hotspotInfo, timestamp) {
  if (!screenId) return;
  const session = ensureActiveInteractionSession(timestamp);
  const stats = ensureSessionStats(session, screenId);
  stats.clicks += 1;
  stats.lastActivity = timestamp;
  const hotspotId = hotspotInfo && hotspotInfo.id;
  if (hotspotId) {
    const clickEntry = stats.clickByHotspot.get(hotspotId) || { clicks: 0 };
    clickEntry.clicks = (clickEntry.clicks || 0) + 1;
    clickEntry.name = hotspotInfo.name || clickEntry.name || '';
    clickEntry.targetScreenId = hotspotInfo.targetScreenId || clickEntry.targetScreenId || '';
    stats.clickByHotspot.set(hotspotId, clickEntry);
    stats.hotspotClicks += 1;
    stats.uniqueHotspots.add(hotspotId);
  }
  scheduleDetailedAnalyticsRefresh();
}

function finaliseActiveInteractionSession() {
  if (!activeInteractionSession) return;
  const session = activeInteractionSession;
  const endTime = Number.isFinite(session.lastActivity) ? session.lastActivity : Date.now();
  const durationMs = Math.max(0, endTime - session.startTime);
  session.perScreen.forEach((stats, screenId) => {
    const hasActivity = stats.moves || stats.clicks || stats.hotspotClicks || stats.hotspotHovers;
    if (!hasActivity) return;
    const summary = {
      sessionId: session.id,
      startTime: session.startTime,
      endTime,
      durationMs,
      moves: stats.moves,
      clicks: stats.clicks,
      hotspotClicks: stats.hotspotClicks,
      hotspotHovers: stats.hotspotHovers,
      uniqueHotspotCount: stats.uniqueHotspots.size,
      hoverDetails: mapEntries(stats.hoverByHotspot, (value = {}) => ({
        entries: value.entries || 0,
        moves: value.moves || 0,
        name: value.name || '',
        targetScreenId: value.targetScreenId || ''
      })),
      clickDetails: mapEntries(stats.clickByHotspot, (value = {}) => ({
        clicks: value.clicks || 0,
        name: value.name || '',
        targetScreenId: value.targetScreenId || ''
      }))
    };
    if (!interactionSessions.has(screenId)) {
      interactionSessions.set(screenId, []);
    }
    interactionSessions.get(screenId).push(summary);
  });
  activeInteractionSession = null;
  scheduleDetailedAnalyticsRefresh();
}

function clearSessionDataForScreen(screenId) {
  if (!screenId) return;
  interactionSessions.delete(screenId);
  if (activeInteractionSession && activeInteractionSession.perScreen) {
    activeInteractionSession.perScreen.delete(screenId);
  }
  scheduleDetailedAnalyticsRefresh();
}

function getSessionSummariesForScreen(screenId) {
  if (!screenId) return [];
  const stored = interactionSessions.has(screenId) ? interactionSessions.get(screenId).slice() : [];
  if (activeInteractionSession && activeInteractionSession.perScreen.has(screenId)) {
    const stats = activeInteractionSession.perScreen.get(screenId);
    const hasActivity = stats.moves || stats.clicks || stats.hotspotClicks || stats.hotspotHovers;
    if (hasActivity) {
      const now = Date.now();
      stored.push({
        sessionId: activeInteractionSession.id,
        startTime: activeInteractionSession.startTime,
        endTime: now,
        durationMs: Math.max(0, now - activeInteractionSession.startTime),
        moves: stats.moves,
        clicks: stats.clicks,
        hotspotClicks: stats.hotspotClicks,
        hotspotHovers: stats.hotspotHovers,
        uniqueHotspotCount: stats.uniqueHotspots.size,
        hoverDetails: mapEntries(stats.hoverByHotspot, (value = {}) => ({
          entries: value.entries || 0,
          moves: value.moves || 0,
          name: value.name || '',
          targetScreenId: value.targetScreenId || ''
        })),
        clickDetails: mapEntries(stats.clickByHotspot, (value = {}) => ({
          clicks: value.clicks || 0,
          name: value.name || '',
          targetScreenId: value.targetScreenId || ''
        })),
        inProgress: true
      });
    }
  }
  return stored;
}

function collectAvailableAnalyticsScreens() {
  const ids = new Set();
  if (previewActiveScreenId && screens.has(previewActiveScreenId)) {
    ids.add(previewActiveScreenId);
  }
  interactionSessions.forEach((sessionList, screenId) => {
    if (sessionList && sessionList.length && screens.has(screenId)) {
      ids.add(screenId);
    }
  });
  if (activeInteractionSession) {
    activeInteractionSession.perScreen.forEach((stats, screenId) => {
      if (!screens.has(screenId)) return;
      if (stats && (stats.moves || stats.clicks || stats.hotspotClicks || stats.hotspotHovers)) {
        ids.add(screenId);
      }
    });
  }
  return Array.from(ids);
}

function buildSessionSelectOptions(screenIds, selectedId) {
  if (!analysisSessionScreenSelect) return;
  analysisSessionScreenSelect.innerHTML = '';
  screenIds.forEach((id) => {
    if (!screens.has(id)) return;
    const option = document.createElement('option');
    option.value = id;
    option.textContent = screens.get(id).name;
    analysisSessionScreenSelect.appendChild(option);
  });
  if (screenIds.length === 0) {
    analysisSessionScreenSelect.disabled = true;
    return;
  }
  analysisSessionScreenSelect.disabled = false;
  if (selectedId && screenIds.includes(selectedId)) {
    analysisSessionScreenSelect.value = selectedId;
  } else {
    analysisSessionScreenSelect.value = screenIds[0];
  }
}

function updateSummaryCards(screenId, sessions) {
  if (!analysisSummaryCards || !analysisAverageSessionTime || !analysisTotalClicksValue || !analysisHotspotClicksValue) {
    return;
  }
  if (!screenId || !sessions.length) {
    analysisSummaryCards.hidden = true;
    analysisAverageSessionTime.textContent = '0s';
    analysisTotalClicksValue.textContent = '0';
    analysisHotspotClicksValue.textContent = '0';
    return;
  }
  const totalDuration = sessions.reduce((total, session) => total + session.durationMs, 0);
  const avgDuration = totalDuration / sessions.length;
  const totalClicks = sessions.reduce((total, session) => total + session.clicks, 0);
  const totalHotspotClicks = sessions.reduce((total, session) => total + session.hotspotClicks, 0);
  analysisSummaryCards.hidden = false;
  analysisAverageSessionTime.textContent = formatDuration(avgDuration);
  analysisTotalClicksValue.textContent = String(totalClicks);
  analysisHotspotClicksValue.textContent = String(totalHotspotClicks);
}

function renderSessionTable(screenId, sessions) {
  if (!analysisSessionBlock || !analysisSessionTableBody || !analysisSessionEmpty) return;
  if (!screenId) {
    analysisSessionBlock.hidden = true;
    return;
  }
  analysisSessionBlock.hidden = false;
  analysisSessionTableBody.innerHTML = '';
  if (!sessions.length) {
    analysisSessionEmpty.hidden = false;
    return;
  }
  analysisSessionEmpty.hidden = true;
  const sorted = sessions.slice().sort((a, b) => b.startTime - a.startTime);
  sorted.forEach((session, index) => {
    const row = document.createElement('tr');
    if (session.inProgress) {
      row.dataset.live = 'true';
    }
    const sessionLabel = session.inProgress ? 'Live' : String(sorted.length - index);
    const sessionCell = createTableCell(sessionLabel, 'th');
    sessionCell.scope = 'row';
    row.appendChild(sessionCell);
    row.appendChild(createTableCell(formatClockTime(session.startTime)));
    row.appendChild(createTableCell(formatDuration(session.durationMs)));
    row.appendChild(createTableCell(String(session.clicks)));
    row.appendChild(createTableCell(String(session.moves)));
    row.appendChild(createTableCell(String(session.hotspotClicks)));
    row.appendChild(createTableCell(String(session.hotspotHovers)));
    row.appendChild(createTableCell(String(session.uniqueHotspotCount)));
    analysisSessionTableBody.appendChild(row);
  });
}

function renderHotspotTable(screenId, sessions) {
  if (!analysisHotspotBlock || !analysisHotspotTableBody || !analysisHotspotEmpty) return;
  if (!screenId) {
    analysisHotspotBlock.hidden = true;
    return;
  }
  analysisHotspotBlock.hidden = false;
  analysisHotspotTableBody.innerHTML = '';
  if (!sessions.length) {
    analysisHotspotEmpty.hidden = false;
    return;
  }
  const totalSessions = sessions.length;
  const aggregates = new Map();
  sessions.forEach((session) => {
    const visited = new Set();
    session.hoverDetails.forEach((detail) => {
      if (!detail.hotspotId) return;
      const record = ensureHotspotAggregate(aggregates, detail.hotspotId, detail.name, detail.targetScreenId);
      record.hovers += detail.entries || 0;
      record.hoverSamples += detail.moves || 0;
      visited.add(detail.hotspotId);
    });
    session.clickDetails.forEach((detail) => {
      if (!detail.hotspotId) return;
      const record = ensureHotspotAggregate(aggregates, detail.hotspotId, detail.name, detail.targetScreenId);
      record.clicks += detail.clicks || 0;
      visited.add(detail.hotspotId);
    });
    visited.forEach((hotspotId) => {
      const record = ensureHotspotAggregate(aggregates, hotspotId);
      record.uniqueSessions += 1;
    });
  });
  const entries = Array.from(aggregates.entries());
  if (!entries.length) {
    analysisHotspotEmpty.hidden = false;
    return;
  }
  analysisHotspotEmpty.hidden = true;
  entries.sort(([, a], [, b]) => (b.clicks + b.hovers) - (a.clicks + a.hovers));
  const screenName = screens.has(screenId) ? screens.get(screenId).name : screenId;
  entries.forEach(([hotspotId, stats]) => {
    const meta = getHotspotMeta(hotspotId);
    const row = document.createElement('tr');
    row.appendChild(createTableCell(screenName));
    const hotspotName = meta?.name || stats.name || 'Hotspot';
    row.appendChild(createTableCell(hotspotName));
    row.appendChild(createTableCell(String(stats.clicks)));
    row.appendChild(createTableCell(String(stats.hovers)));
    const totalCell = createTableCell(String(stats.clicks + stats.hovers));
    totalCell.dataset.hotspotTotal = 'true';
    row.appendChild(totalCell);
    row.appendChild(createTableCell(String(stats.uniqueSessions)));
    const sessionRate = totalSessions > 0 ? Math.round((stats.uniqueSessions / totalSessions) * 100) : 0;
    const rateCell = createTableCell(`${sessionRate}%`);
    rateCell.className = 'analysis-hotspot-rate';
    row.appendChild(rateCell);
    analysisHotspotTableBody.appendChild(row);
  });
}

function ensureHotspotAggregate(map, hotspotId, name, targetScreenId) {
  if (!map.has(hotspotId)) {
    map.set(hotspotId, {
      clicks: 0,
      hovers: 0,
      hoverSamples: 0,
      uniqueSessions: 0,
      name: name || '',
      targetScreenId: targetScreenId || ''
    });
  }
  const record = map.get(hotspotId);
  if (name && !record.name) {
    record.name = name;
  }
  if (targetScreenId && !record.targetScreenId) {
    record.targetScreenId = targetScreenId;
  }
  return record;
}

function createTableCell(text, type = 'td') {
  const cell = document.createElement(type);
  cell.textContent = text;
  return cell;
}

function formatDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.round(Number(durationMs || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 1) {
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }
  return `${seconds}s`;
}

function formatClockTime(timestamp) {
  if (!Number.isFinite(timestamp)) return '--';
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

function mapEntries(map, mapper) {
  const result = [];
  if (!map) return result;
  map.forEach((value, key) => {
    const transformed = mapper ? mapper(value, key) : {};
    result.push({ hotspotId: key, ...transformed });
  });
  return result;
}

function scheduleDetailedAnalyticsRefresh() {
  if (pendingAnalyticsRefresh) return;
  pendingAnalyticsRefresh = true;
  const run = () => {
    pendingAnalyticsRefresh = false;
    updateDetailedAnalyticsPanels();
  };
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: 400 });
  } else if (typeof window !== 'undefined') {
    window.requestAnimationFrame(run);
  } else {
    run();
  }
}

function updateDetailedAnalyticsPanels() {
  const screenIds = collectAvailableAnalyticsScreens();
  const selected = analysisSessionScreenSelect && analysisSessionScreenSelect.value;
  const resolvedScreenId = selected && screenIds.includes(selected)
    ? selected
    : (screenIds.includes(previewActiveScreenId) ? previewActiveScreenId : (screenIds[0] || ''));
  if (analysisSessionScreenSelect) {
    buildSessionSelectOptions(screenIds, resolvedScreenId);
  }
  const sessions = resolvedScreenId ? getSessionSummariesForScreen(resolvedScreenId) : [];
  updateSummaryCards(resolvedScreenId, sessions);
  renderSessionTable(resolvedScreenId, sessions);
  renderHotspotTable(resolvedScreenId, sessions);
}

function findWireItemForPreview(previewItem, screenId) {
  if (!previewItem || !screenId || !screens.has(screenId)) return null;
  const screen = screens.get(screenId);
  const hotspotId = previewItem.dataset.hotspotId;
  if (hotspotId) {
    const selector = `.wire-item[data-hotspot-id="${hotspotId}"]`;
    return screen.canvas.querySelector(selector);
  }
  const targetScreen = previewItem.dataset.targetScreen;
  if (!targetScreen) return null;
  const candidates = Array.from(
    screen.canvas.querySelectorAll(`.wire-item[data-target-screen="${targetScreen}"]`)
  );
  if (!candidates.length) {
    return null;
  }
  const expectedName = previewItem.dataset.hotspotName;
  if (expectedName) {
    const matched = candidates.find((item) => {
      const label = item.dataset.hotspotLabel || deriveHotspotLabel(item);
      return label === expectedName;
    });
    if (matched) return matched;
  }
  return candidates[0];
}

function resolvePreviewHotspotInfo(event, position) {
  if (!event || !position) return null;
  const hotspotElement = event.target?.closest?.('.preview-item[data-target-screen]');
  if (!hotspotElement) return null;
  let hotspotId = hotspotElement.dataset.hotspotId || '';
  let hotspotName = hotspotElement.dataset.hotspotName || '';
  let targetScreenId = hotspotElement.dataset.targetScreen || '';
  const sourceScreenId = hotspotElement.dataset.sourceScreenId || position.screenId || '';
  if (!hotspotId && sourceScreenId) {
    const wireItem = findWireItemForPreview(hotspotElement, sourceScreenId);
    if (wireItem) {
      hotspotId = ensureHotspotId(wireItem);
      refreshHotspotMetadata(wireItem);
      hotspotElement.dataset.hotspotId = hotspotId;
      hotspotElement.dataset.hotspotName = wireItem.dataset.hotspotLabel || deriveHotspotLabel(wireItem);
      hotspotName = hotspotElement.dataset.hotspotName;
      targetScreenId = wireItem.dataset.targetScreen || targetScreenId;
    }
  }
  const metadata = hotspotId ? getHotspotMeta(hotspotId) : null;
  return {
    id: hotspotId || metadata?.id || null,
    name: hotspotName || metadata?.name || 'Hotspot',
    targetScreenId: targetScreenId || metadata?.targetScreenId || '',
    sourceScreenId
  };
}

function openPreview(mode = 'preview') {
  if (!previewBackdrop || !previewCanvasContainer || !previewScreenSelect) return;
  if (!screens.size) return;
  const requestedMode = mode === 'analysis' ? 'analysis' : 'preview';
  if (isPreviewOpen()) {
    setPreviewMode(requestedMode);
    const focusTarget = requestedMode === 'analysis'
      ? (previewModeAnalysisBtn || analysisPanel || previewScreenSelect)
      : previewScreenSelect;
    if (focusTarget && typeof focusTarget.focus === 'function') {
      focusTarget.focus({ preventScroll: true });
    }
    return;
  }
  if (isHelpOpen()) {
    closeHelpModal();
  }
  previewMode = requestedMode;
  updatePreviewFullscreenUi(false);
  if (!previewActiveScreenId || !screens.has(previewActiveScreenId)) {
    previewActiveScreenId = activeScreenId || screens.keys().next().value;
  }
  buildPreviewScreens();
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  previewBackdrop.classList.remove('hidden');
  applyPreviewModeUi();
  const focusTarget = requestedMode === 'analysis'
    ? (previewModeAnalysisBtn || analysisPanel || previewScreenSelect)
    : previewScreenSelect;
  if (focusTarget && typeof focusTarget.focus === 'function') {
    focusTarget.focus({ preventScroll: true });
  }
  window.requestAnimationFrame(() => {
    scaleAllPreviewCanvases();
    if (previewMode === 'analysis') {
      scheduleAnalysisRender(previewActiveScreenId);
    }
  });
  scheduleDetailedAnalyticsRefresh();
}

function closePreview() {
  if (!isPreviewOpen()) return;
  finaliseActiveInteractionSession();
  updatePreviewFullscreenUi(false);
  previewBackdrop.classList.add('hidden');
  if (previewCanvasContainer) {
    previewCanvasContainer.innerHTML = '';
  }
  if (previewScreenSelect) {
    previewScreenSelect.innerHTML = '';
  }
  document.body.style.overflow = previousBodyOverflow;
  lastPointerSample = null;
  previewActiveScreenId = null;
  applyPreviewModeUi();
  const focusTarget = previewMode === 'analysis' ? analysisButton : previewButton;
  if (focusTarget && typeof focusTarget.focus === 'function') {
    focusTarget.focus({ preventScroll: true });
  }
  scheduleDetailedAnalyticsRefresh();
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
  if (isPreviewOpen()) {
    applyPreviewModeUi();
    if (previewMode === 'analysis') {
      scheduleAnalysisRender(previewActiveScreenId);
    }
  }
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
  scheduleAnalysisRender(screenId);
  updateAnalysisSummary();
  updateAnalysisOverlayVisibility();
  scheduleDetailedAnalyticsRefresh();
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
    previewItem.dataset.sourceScreenId = screenData.id;
    if (item.dataset.hotspotId) {
      previewItem.dataset.hotspotId = item.dataset.hotspotId;
      const hotspotLabel = item.dataset.hotspotLabel || deriveHotspotLabel(item);
      if (hotspotLabel) {
        previewItem.dataset.hotspotName = hotspotLabel;
      }
    }

    const interactive = buildPreviewElement(item);
    previewItem.appendChild(interactive);

    const targetScreen = previewItem.dataset.targetScreen;
    if (targetScreen) {
      const buttons = previewItem.querySelectorAll('button');
      const select = previewItem.querySelector('select');
      const inputs = previewItem.querySelectorAll('input');
      if (!select && !inputs.length) {
        attachPreviewNavigation(previewItem, targetScreen);
      }
      buttons.forEach((button) => {
        attachPreviewNavigation(button, targetScreen);
      });
      if (select) {
        attachPreviewNavigation(select, targetScreen, 'change');
      }
      inputs.forEach((input) => {
        if (input.type === 'radio' || input.type === 'checkbox' || input.type === 'range') {
          attachPreviewNavigation(input, targetScreen, 'change');
        } else {
          input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handlePreviewNavigation(targetScreen);
            }
          });
        }
      });
    }

    canvas.appendChild(previewItem);
  });

  const overlay = document.createElement('canvas');
  overlay.className = 'analysis-overlay';
  overlay.dataset.screenId = screenData.id;
  overlay.width = screenData.width;
  overlay.height = screenData.height;
  overlay.setAttribute('aria-hidden', 'true');
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  canvas.appendChild(overlay);

  return wrapper;
}

function buildPreviewElement(source) {
  const type = source.dataset.type;
  const textContent = source.textContent.trim();
  const fallback = (value, defaultValue) => (value && value.toString().trim()) || defaultValue;

  switch (type) {
    case 'button': {
      const button = document.createElement('button');
      button.type = 'button';
      const label = source.dataset.label || source.querySelector('.wire-button')?.textContent;
      button.textContent = fallback(label, 'Button');
      return button;
    }
    case 'input': {
      const input = document.createElement('input');
      input.type = 'text';
      const placeholder = source.dataset.placeholder || textContent;
      input.placeholder = fallback(placeholder, 'Input field');
      return input;
    }
    case 'dropdown': {
      const select = document.createElement('select');
      const options = normaliseOptions(
        source.dataset.options,
        ['Option 1', 'Option 2', 'Option 3']
      );
      options.forEach((label, index) => {
        const option = document.createElement('option');
        option.value = `${index + 1}`;
        option.textContent = label;
        select.appendChild(option);
      });
      if (!options.length) {
        const option = document.createElement('option');
        option.value = '1';
        option.textContent = fallback(textContent, 'Select option');
        select.appendChild(option);
      }
      return select;
    }
    case 'card': {
      const card = document.createElement('div');
      card.className = 'preview-card';
      const headingEl = document.createElement('h3');
      const headingText = source.dataset.title || source.querySelector('h3')?.textContent;
      headingEl.textContent = fallback(headingText, 'Card title');
      const bodyEl = document.createElement('p');
      const bodyText = source.dataset.body || source.querySelector('p')?.textContent;
      bodyEl.textContent = fallback(bodyText, 'Supporting description text goes here.');
      const buttonEl = document.createElement('button');
      buttonEl.type = 'button';
      const ctaText = source.dataset.cta || source.querySelector('.wire-button')?.textContent;
      buttonEl.textContent = fallback(ctaText, 'Action');
      card.append(headingEl, bodyEl, buttonEl);
      return card;
    }
    case 'heading': {
      const heading = document.createElement('div');
      heading.className = 'preview-heading';
      const headingText = source.dataset.text || textContent;
      heading.textContent = fallback(headingText, 'Heading');
      return heading;
    }
    case 'paragraph': {
      const paragraph = document.createElement('p');
      paragraph.className = 'preview-paragraph';
      const paragraphText = source.dataset.text || textContent;
      paragraph.textContent = fallback(paragraphText, 'Placeholder copy for quick wireframes.');
      return paragraph;
    }
    case 'image': {
      const image = document.createElement('div');
      image.className = 'preview-image';
      const label = source.dataset.label || textContent;
      image.textContent = fallback(label, 'Image');
      return image;
    }
    case 'text': {
      const paragraph = document.createElement('p');
      paragraph.className = 'preview-paragraph';
      const text = source.dataset.text || textContent;
      paragraph.textContent = fallback(text, 'Sample text');
      return paragraph;
    }
    case 'radio-group': {
      const fieldset = document.createElement('fieldset');
      fieldset.className = 'preview-radio-group';
      const legend = document.createElement('legend');
      const label = source.dataset.label || textContent || 'Radio group';
      legend.textContent = fallback(label, 'Radio group');
      fieldset.appendChild(legend);
      const groupName = `radio-${Math.random().toString(16).slice(2, 8)}`;
      const options = normaliseOptions(source.dataset.options, ['Option A', 'Option B']);
      options.forEach((option, index) => {
        const row = document.createElement('label');
        row.className = 'preview-radio-option';
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = groupName;
        input.value = option || `option-${index + 1}`;
        const span = document.createElement('span');
        span.textContent = option;
        row.append(input, span);
        fieldset.appendChild(row);
      });
      if (!options.length) {
        const row = document.createElement('label');
        row.className = 'preview-radio-option';
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = groupName;
        input.value = 'option-1';
        const span = document.createElement('span');
        span.textContent = 'Option';
        row.append(input, span);
        fieldset.appendChild(row);
      }
      return fieldset;
    }
    case 'slider': {
      const wrapper = document.createElement('div');
      wrapper.className = 'preview-slider';
      const header = document.createElement('div');
      header.className = 'preview-slider-header';
      const label = document.createElement('span');
      label.className = 'preview-slider-label';
      const labelText = source.dataset.label || textContent || 'Slider';
      label.textContent = fallback(labelText, 'Slider');
      const valueBadge = document.createElement('span');
      valueBadge.className = 'preview-slider-value';
      header.append(label, valueBadge);
      const input = document.createElement('input');
      input.type = 'range';
      const min = Number.parseFloat(source.dataset.min ?? '0');
      const max = Number.parseFloat(source.dataset.max ?? '100');
      const value = Number.parseFloat(source.dataset.value ?? '50');
      const safeMin = Number.isFinite(min) ? min : 0;
      const safeMax = Number.isFinite(max) && max !== safeMin ? max : safeMin + 100;
      let safeValue = Number.isFinite(value) ? value : (safeMin + safeMax) / 2;
      if (safeMin > safeMax) {
        const tempMax = safeMin;
        input.min = String(safeMax);
        input.max = String(tempMax);
      } else {
        input.min = String(safeMin);
        input.max = String(safeMax);
      }
      safeValue = Math.min(Math.max(safeValue, Number.parseFloat(input.min)), Number.parseFloat(input.max));
      input.value = String(safeValue);
      valueBadge.textContent = input.value;
      input.addEventListener('input', () => {
        valueBadge.textContent = input.value;
      });
      wrapper.append(header, input);
      return wrapper;
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
