export const PREVIEW_DPI = 96;
export const EXPORT_DPI_OPTIONS = [96, 150, 300];
export const CUSTOM_PAPER_SIZE_KEY = 'Custom';

const MM_PER_INCH = 25.4;
const DEFAULT_PAPER_KEY = 'A4';
const MIN_PAPER_MM = 25;
const MAX_PAPER_MM = 1000;

const inchesToMm = (inches) => inches * MM_PER_INCH;

const clampPaperMm = (value, fallback) => {
  const numericValue = Number.parseFloat(value);

  if (Number.isNaN(numericValue)) {
    return fallback;
  }

  return Math.min(MAX_PAPER_MM, Math.max(MIN_PAPER_MM, numericValue));
};

export const PAPER_SIZES = {
  A6: {
    label: 'A6',
    widthMm: 105,
    heightMm: 148,
  },
  A5: {
    label: 'A5',
    widthMm: 148,
    heightMm: 210,
  },
  A4: {
    label: 'A4',
    widthMm: 210,
    heightMm: 297,
  },
  A3: {
    label: 'A3',
    widthMm: 297,
    heightMm: 420,
  },
  Letter: {
    label: 'Letter',
    widthMm: 215.9,
    heightMm: 279.4,
  },
  Legal: {
    label: 'Legal',
    widthMm: 215.9,
    heightMm: 355.6,
  },
  '4x6': {
    label: '4 \u00D7 6 in',
    widthMm: inchesToMm(4),
    heightMm: inchesToMm(6),
  },
  '5x7': {
    label: '5 \u00D7 7 in',
    widthMm: inchesToMm(5),
    heightMm: inchesToMm(7),
  },
  '8x10': {
    label: '8 \u00D7 10 in',
    widthMm: inchesToMm(8),
    heightMm: inchesToMm(10),
  },
  '8x12': {
    label: '8 \u00D7 12 in',
    widthMm: inchesToMm(8),
    heightMm: inchesToMm(12),
  },
  [CUSTOM_PAPER_SIZE_KEY]: {
    label: 'Custom',
    widthMm: 210,
    heightMm: 297,
  },
};

export const mmToPx = (mm, dpi = PREVIEW_DPI) => Math.round((mm / MM_PER_INCH) * dpi);

export const getPaperDimensions = ({
  paperSize = DEFAULT_PAPER_KEY,
  orientation = 'portrait',
  dpi = PREVIEW_DPI,
  customPaper,
} = {}) => {
  const fallbackPaper = PAPER_SIZES[DEFAULT_PAPER_KEY];
  const presetPaper = PAPER_SIZES[paperSize] ?? fallbackPaper;
  const basePaper =
    paperSize === CUSTOM_PAPER_SIZE_KEY
      ? {
          ...presetPaper,
          widthMm: clampPaperMm(customPaper?.widthMm, fallbackPaper.widthMm),
          heightMm: clampPaperMm(customPaper?.heightMm, fallbackPaper.heightMm),
        }
      : presetPaper;
  const isPortrait = orientation === 'portrait';
  const widthMm = isPortrait ? basePaper.widthMm : basePaper.heightMm;
  const heightMm = isPortrait ? basePaper.heightMm : basePaper.widthMm;

  return {
    label: basePaper.label,
    widthMm,
    heightMm,
    widthPx: mmToPx(widthMm, dpi),
    heightPx: mmToPx(heightMm, dpi),
  };
};

export const getCellCount = (rows, columns) =>
  Math.max(1, Number(rows) || 1) * Math.max(1, Number(columns) || 1);

export const getPageCount = (imageCount, rows, columns) =>
  Math.max(1, Math.ceil(Math.max(0, imageCount) / getCellCount(rows, columns)));

export const getImagesForPage = (images, pageIndex, rows, columns) => {
  const cellCount = getCellCount(rows, columns);
  const start = pageIndex * cellCount;

  return images.slice(start, start + cellCount);
};

export const getGridCells = ({ pageWidth, pageHeight, rows, columns, gap }) => {
  const safeRows = Math.min(12, Math.max(1, Number(rows) || 1));
  const safeColumns = Math.min(12, Math.max(1, Number(columns) || 1));
  const safeGap = Math.max(0, Number(gap) || 0);

  const rawCellWidth = (pageWidth - safeGap * (safeColumns - 1)) / safeColumns;
  const rawCellHeight = (pageHeight - safeGap * (safeRows - 1)) / safeRows;
  const cellWidth = Math.max(1, rawCellWidth);
  const cellHeight = Math.max(1, rawCellHeight);

  return Array.from({ length: safeRows * safeColumns }, (_, index) => {
    const row = Math.floor(index / safeColumns);
    const column = index % safeColumns;

    return {
      index,
      row,
      column,
      x: column * (cellWidth + safeGap),
      y: row * (cellHeight + safeGap),
      width: cellWidth,
      height: cellHeight,
    };
  });
};

export const getFitDimensions = ({
  imageWidth,
  imageHeight,
  cellWidth,
  cellHeight,
  fitMode = 'cover',
  zoom = 1,
}) => {
  if (!imageWidth || !imageHeight || !cellWidth || !cellHeight) {
    return {
      x: 0,
      y: 0,
      width: cellWidth,
      height: cellHeight,
    };
  }

  const scale =
    fitMode === 'contain'
      ? Math.min(cellWidth / imageWidth, cellHeight / imageHeight)
      : Math.max(cellWidth / imageWidth, cellHeight / imageHeight);

  const safeZoom = Math.max(0.4, Number(zoom) || 1);
  const width = imageWidth * scale * safeZoom;
  const height = imageHeight * scale * safeZoom;

  return {
    x: (cellWidth - width) / 2,
    y: (cellHeight - height) / 2,
    width,
    height,
  };
};

