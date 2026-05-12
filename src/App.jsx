import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { jsPDF } from 'jspdf';
import CanvasEditor from './components/CanvasEditor';
import ControlsPanel from './components/ControlsPanel';
import UploadPanel from './components/UploadPanel';
import headerLogo from './assets/printgrid-header.png';
import { buildExportCanvas, createExportBlob, downloadBlob, getSafeExportDpi } from './utils/export';
import {
  CUSTOM_PAPER_SIZE_KEY,
  EXPORT_DPI_OPTIONS,
  getCellCount,
  getGridCells,
  getImagesForPage,
  getPageCount,
  getPaperDimensions,
  PAPER_SIZES,
} from './utils/layout';

const MAX_GRID_SIZE = 12;
const THEME_STORAGE_KEY = 'printgrid-theme';
const MIN_CUSTOM_PAPER_MM = 25;
const MAX_CUSTOM_PAPER_MM = 1000;
const DEFAULT_CUSTOM_PAPER = {
  widthMm: PAPER_SIZES.A4.widthMm,
  heightMm: PAPER_SIZES.A4.heightMm,
};
const FORMAT_LABELS = {
  pdf: 'PDF',
  png: 'PNG',
  jpeg: 'JPEG',
};
const DOWNLOAD_OPTIONS = [
  {
    format: 'pdf',
    label: 'Download PDF',
    helper: 'Best for printing and multi-page sheets',
  },
  {
    format: 'png',
    label: 'Download PNG',
    helper: 'Lossless image export with embedded print resolution',
  },
  {
    format: 'jpeg',
    label: 'Download JPEG',
    helper: 'High-quality image export with smaller file sizes',
  },
];

const waitForStagePaint = () =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });

const wait = (duration) =>
  new Promise((resolve) => {
    setTimeout(resolve, duration);
  });

const createImageId = (fileName) => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${fileName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const loadImageFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const imageElement = new window.Image();

      imageElement.onload = () => {
        resolve({
          id: createImageId(file.name),
          name: file.name,
          src: reader.result,
          width: imageElement.naturalWidth,
          height: imageElement.naturalHeight,
          element: imageElement,
          scale: 1,
        });
      };

      imageElement.onerror = () => reject(new Error(`Unable to load ${file.name}`));
      imageElement.src = reader.result;
    };

    reader.onerror = () => reject(new Error(`Unable to read ${file.name}`));
    reader.readAsDataURL(file);
  });

const clampGridValue = (value) => {
  const numericValue = Number.parseInt(value, 10);

  if (Number.isNaN(numericValue)) {
    return 1;
  }

  return Math.min(MAX_GRID_SIZE, Math.max(1, numericValue));
};

const clampPaperDimensionMm = (value, fallback) => {
  const numericValue = Number.parseFloat(value);

  if (Number.isNaN(numericValue)) {
    return fallback;
  }

  return Math.min(MAX_CUSTOM_PAPER_MM, Math.max(MIN_CUSTOM_PAPER_MM, numericValue));
};

const formatPaperDimensionMm = (value) => {
  const roundedValue = Math.round(Number(value) * 10) / 10;

  if (Number.isNaN(roundedValue)) {
    return '0';
  }

  return Number.isInteger(roundedValue) ? `${roundedValue}` : roundedValue.toFixed(1);
};

function App() {
  const stageRef = useRef(null);
  const downloadMenuRef = useRef(null);

  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }

    return window.localStorage.getItem(THEME_STORAGE_KEY) ?? 'light';
  });
  const [paperSize, setPaperSize] = useState('A4');
  const [customPaper, setCustomPaper] = useState(DEFAULT_CUSTOM_PAPER);
  const [orientation, setOrientation] = useState('portrait');
  const [rows, setRows] = useState(2);
  const [columns, setColumns] = useState(2);
  const [gap, setGap] = useState(8);
  const [fitMode, setFitMode] = useState('cover');
  const [images, setImages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [exportDpi, setExportDpi] = useState(300);
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Upload a few photos to start building a print sheet.');

  const isDarkMode = theme === 'dark';
  const paperOption = PAPER_SIZES[paperSize] ?? PAPER_SIZES.A4;
  const isCustomPaper = paperSize === CUSTOM_PAPER_SIZE_KEY;

  const pageDimensions = useMemo(
    () => getPaperDimensions({ paperSize, orientation, customPaper }),
    [customPaper, orientation, paperSize],
  );

  const exportDimensions = useMemo(
    () => getPaperDimensions({ paperSize, orientation, dpi: exportDpi, customPaper }),
    [customPaper, exportDpi, orientation, paperSize],
  );

  const cellCount = useMemo(() => getCellCount(rows, columns), [columns, rows]);
  const pageCount = useMemo(() => getPageCount(images.length, rows, columns), [columns, images.length, rows]);

  const cells = useMemo(
    () =>
      getGridCells({
        pageWidth: pageDimensions.widthPx,
        pageHeight: pageDimensions.heightPx,
        rows,
        columns,
        gap,
      }),
    [columns, gap, pageDimensions.heightPx, pageDimensions.widthPx, rows],
  );

  const currentPageImages = useMemo(
    () => getImagesForPage(images, currentPage, rows, columns),
    [columns, currentPage, images, rows],
  );

  const selectedImage = useMemo(
    () => images.find((image) => image.id === selectedImageId) ?? null,
    [images, selectedImageId],
  );

  const firstCell = cells[0] ?? {
    width: pageDimensions.widthPx,
    height: pageDimensions.heightPx,
  };

  useEffect(() => {
    const rootElement = document.documentElement;
    const bodyElement = document.body;
    const appRoot = document.getElementById('root');

    rootElement.dataset.theme = theme;
    rootElement.classList.toggle('dark', isDarkMode);
    bodyElement.classList.toggle('dark', isDarkMode);
    appRoot?.classList.toggle('dark', isDarkMode);
    bodyElement.style.backgroundColor = isDarkMode ? '#020617' : '#f1f5f9';
    bodyElement.style.color = isDarkMode ? '#f8fafc' : '#0f172a';
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [isDarkMode, theme]);

  useEffect(() => {
    setCurrentPage((previousPage) => Math.min(previousPage, pageCount - 1));
  }, [pageCount]);

  useEffect(() => {
    if (selectedImageId && !images.some((image) => image.id === selectedImageId)) {
      setSelectedImageId(null);
    }
  }, [images, selectedImageId]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setIsDownloadMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  const handleFilesSelected = async (fileList) => {
    const selectedFiles = Array.from(fileList);

    if (!selectedFiles.length) {
      return;
    }

    const results = await Promise.allSettled(selectedFiles.map(loadImageFile));
    const loadedImages = results
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value);
    const failedCount = results.length - loadedImages.length;

    if (loadedImages.length > 0) {
      setImages((previousImages) => [...previousImages, ...loadedImages]);
    }

    if (loadedImages.length > 0 && failedCount === 0) {
      setStatusMessage(`${loadedImages.length} image${loadedImages.length > 1 ? 's' : ''} added successfully.`);
      return;
    }

    if (loadedImages.length > 0) {
      setStatusMessage(
        `${loadedImages.length} image${loadedImages.length > 1 ? 's' : ''} added, ${failedCount} skipped.`,
      );
      return;
    }

    setStatusMessage('Those files could not be loaded. Try standard image formats like JPG or PNG.');
  };

  const handleSwap = (fromIndex, toIndex) => {
    const fromGlobalIndex = currentPage * cellCount + fromIndex;
    const toGlobalIndex = currentPage * cellCount + toIndex;

    if (
      fromGlobalIndex === toGlobalIndex ||
      fromGlobalIndex >= images.length ||
      toGlobalIndex >= images.length
    ) {
      return;
    }

    setImages((previousImages) => {
      const nextImages = [...previousImages];
      const draggedImage = nextImages[fromGlobalIndex];

      nextImages[fromGlobalIndex] = nextImages[toGlobalIndex];
      nextImages[toGlobalIndex] = draggedImage;

      return nextImages;
    });
  };

  const handleSelectImage = (cellIndex) => {
    const globalIndex = currentPage * cellCount + cellIndex;
    const image = images[globalIndex];

    if (image) {
      setSelectedImageId(image.id);
    }
  };

  const handleRemoveImage = (imageId) => {
    const imageToRemove = images.find((image) => image.id === imageId);

    if (!imageToRemove) {
      return;
    }

    setImages((previousImages) => previousImages.filter((image) => image.id !== imageId));
    setStatusMessage(`${imageToRemove.name} removed from the layout.`);

    if (selectedImageId === imageId) {
      setSelectedImageId(null);
    }
  };

  const handleSelectedImageScaleChange = (scale) => {
    if (!selectedImageId) {
      return;
    }

    const safeScale = Math.max(0.4, Math.min(2.5, Number(scale) || 1));

    setImages((previousImages) =>
      previousImages.map((image) =>
        image.id === selectedImageId ? { ...image, scale: safeScale } : image,
      ),
    );
  };

  const handleCustomPaperChange = (field, value) => {
    setCustomPaper((previousCustomPaper) => ({
      ...previousCustomPaper,
      [field]: clampPaperDimensionMm(value, previousCustomPaper[field]),
    }));
  };

  const forEachExportPage = async (onPageRendered) => {
    const originalPage = currentPage;

    try {
      for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
        flushSync(() => {
          setCurrentPage(pageIndex);
        });

        await waitForStagePaint();
        const exportCanvas = buildExportCanvas(stageRef.current, exportDimensions);

        try {
          await onPageRendered(exportCanvas, pageIndex);
        } finally {
          exportCanvas.width = 0;
          exportCanvas.height = 0;
        }

        await wait(40);
      }
    } finally {
      flushSync(() => {
        setCurrentPage(originalPage);
      });
    }
  };

  const downloadPdf = async () => {
    const pdfOrientation =
      pageDimensions.widthMm > pageDimensions.heightMm ? 'landscape' : 'portrait';
    const pdf = new jsPDF({
      orientation: pdfOrientation,
      unit: 'mm',
      format: [pageDimensions.widthMm, pageDimensions.heightMm],
      compress: true,
    });

    await forEachExportPage(async (exportCanvas, pageIndex) => {
      if (pageIndex > 0) {
        pdf.addPage([pageDimensions.widthMm, pageDimensions.heightMm], pdfOrientation);
      }

      pdf.addImage(
        exportCanvas,
        'PNG',
        0,
        0,
        pageDimensions.widthMm,
        pageDimensions.heightMm,
        undefined,
        'FAST',
      );
    });

    pdf.save(`print-${exportDpi}dpi.pdf`);
    setStatusMessage(
      `PDF downloaded at ${exportDpi} DPI${pageCount > 1 ? ` with ${pageCount} pages` : ''}.`,
    );
  };

  const downloadImageFiles = async (format) => {
    const label = FORMAT_LABELS[format];
    const extension = format === 'jpeg' ? 'jpg' : 'png';

    await forEachExportPage(async (exportCanvas, pageIndex) => {
      const exportBlob = await createExportBlob({
        canvas: exportCanvas,
        format,
        dpi: getSafeExportDpi(exportDpi),
        quality: 0.98,
      });

      const fileName =
        pageCount > 1
          ? `print-${exportDpi}dpi-page-${pageIndex + 1}.${extension}`
          : `print-${exportDpi}dpi.${extension}`;

      downloadBlob(exportBlob, fileName);
      await wait(120);
    });

    setStatusMessage(
      pageCount > 1
        ? `${pageCount} ${label} files downloaded at ${exportDpi} DPI.`
        : `${label} downloaded at ${exportDpi} DPI.`,
    );
  };

  const handleDownload = async (format) => {
    if (!stageRef.current || isExporting) {
      return;
    }

    const label = FORMAT_LABELS[format];

    setIsDownloadMenuOpen(false);
    setIsExporting(true);
    setStatusMessage(`Preparing ${label} at ${exportDpi} DPI...`);

    try {
      if (format === 'pdf') {
        await downloadPdf();
      } else {
        await downloadImageFiles(format);
      }
    } catch (error) {
      console.error(error);
      setStatusMessage(`${label} download failed. Please try again.`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      <header
        className={`border-b backdrop-blur transition-colors duration-300 ${
          isDarkMode ? 'border-slate-800 bg-slate-950/95' : 'border-slate-200 bg-white/95'
        }`}
      >
        <div className="mx-auto flex max-w-screen-2xl flex-col gap-4 px-4 py-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center justify-center xl:justify-start">
            <div
              className={`group relative overflow-hidden rounded-[30px] border px-3 py-2 shadow-[0_16px_40px_rgba(15,23,42,0.08)] ring-1 backdrop-blur ${
                isDarkMode
                  ? 'border-slate-700/80 bg-[linear-gradient(135deg,#020617_0%,#111827_45%,#172554_100%)] ring-slate-900/80'
                  : 'border-slate-200/80 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_45%,#eef2ff_100%)] ring-white/80'
              }`}
            >
              <div
                className={`pointer-events-none absolute inset-y-0 left-0 w-24 ${
                  isDarkMode
                    ? 'bg-[radial-gradient(circle_at_left,rgba(59,130,246,0.25),transparent_72%)]'
                    : 'bg-[radial-gradient(circle_at_left,rgba(59,130,246,0.14),transparent_72%)]'
                }`}
              />
              <img
                src={headerLogo}
                alt="PrintGrid"
                className="relative h-[64px] w-auto max-w-[220px] object-contain object-left select-none sm:h-[76px] sm:max-w-[280px] md:h-[86px] md:max-w-[340px] xl:h-[92px] xl:max-w-[380px]"
                draggable="false"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <button
              type="button"
              onClick={() => setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))}
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                isDarkMode
                  ? 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-600 hover:text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              {isDarkMode ? 'Switch to light' : 'Switch to dark'}
            </button>

            <label
              className={`rounded-2xl border px-3 py-2 transition-colors duration-300 ${
                isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
              }`}
            >
              <span
                className={`mb-1 block text-xs font-medium uppercase tracking-wide ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Paper size
              </span>
              <select
                value={paperSize}
                onChange={(event) => setPaperSize(event.target.value)}
                className={`bg-transparent text-sm font-medium outline-none ${
                  isDarkMode ? 'text-slate-100' : 'text-slate-900'
                }`}
              >
                {Object.entries(PAPER_SIZES).map(([value, paper]) => (
                  <option key={value} value={value}>
                    {paper.label}
                  </option>
                ))}
              </select>
            </label>

            {isCustomPaper ? (
              <div className="flex flex-wrap items-end gap-3">
                <label
                  className={`rounded-2xl border px-3 py-2 transition-colors duration-300 ${
                    isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
                  }`}
                >
                  <span
                    className={`mb-1 block text-xs font-medium uppercase tracking-wide ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Width (mm)
                  </span>
                  <input
                    type="number"
                    min={MIN_CUSTOM_PAPER_MM}
                    max={MAX_CUSTOM_PAPER_MM}
                    step="0.1"
                    value={customPaper.widthMm}
                    onChange={(event) => handleCustomPaperChange('widthMm', event.target.value)}
                    className={`w-24 bg-transparent text-sm font-medium outline-none ${
                      isDarkMode ? 'text-slate-100' : 'text-slate-900'
                    }`}
                  />
                </label>

                <label
                  className={`rounded-2xl border px-3 py-2 transition-colors duration-300 ${
                    isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
                  }`}
                >
                  <span
                    className={`mb-1 block text-xs font-medium uppercase tracking-wide ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Height (mm)
                  </span>
                  <input
                    type="number"
                    min={MIN_CUSTOM_PAPER_MM}
                    max={MAX_CUSTOM_PAPER_MM}
                    step="0.1"
                    value={customPaper.heightMm}
                    onChange={(event) => handleCustomPaperChange('heightMm', event.target.value)}
                    className={`w-24 bg-transparent text-sm font-medium outline-none ${
                      isDarkMode ? 'text-slate-100' : 'text-slate-900'
                    }`}
                  />
                </label>
              </div>
            ) : null}

            <div
              className={`rounded-2xl border p-1 transition-colors duration-300 ${
                isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
              }`}
            >
              {['portrait', 'landscape'].map((value) => {
                const active = orientation === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setOrientation(value)}
                    className={`rounded-xl px-4 py-2 text-sm font-medium capitalize transition ${
                      active
                        ? isDarkMode
                          ? 'bg-slate-100 text-slate-900'
                          : 'bg-slate-900 text-white'
                        : isDarkMode
                          ? 'text-slate-400 hover:text-slate-100'
                          : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>

            <div
              className={`rounded-2xl px-4 py-3 text-sm transition-colors duration-300 ${
                isDarkMode ? 'bg-slate-900 text-slate-400' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <div className={`font-medium ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                {paperOption.label} · {formatPaperDimensionMm(pageDimensions.widthMm)} × {formatPaperDimensionMm(pageDimensions.heightMm)} mm
              </div>
              <div>
                {pageDimensions.widthPx} × {pageDimensions.heightPx} px preview
              </div>
            </div>

            <div ref={downloadMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsDownloadMenuOpen((open) => !open)}
                disabled={isExporting}
                aria-expanded={isDownloadMenuOpen}
                className="flex items-center gap-3 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                <span>{isExporting ? 'Preparing...' : 'Download'}</span>
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                  className={`h-4 w-4 transition-transform duration-200 ${
                    isDownloadMenuOpen ? 'rotate-180' : ''
                  }`}
                >
                  <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <div
                className={`absolute right-0 top-full z-20 mt-3 w-80 origin-top-right rounded-2xl border p-2 shadow-xl ring-1 ring-black/5 transition-all duration-200 ease-out ${
                  isDarkMode
                    ? 'border-slate-700 bg-slate-900 shadow-black/30'
                    : 'border-slate-200 bg-white shadow-slate-200/80'
                } ${
                  isDownloadMenuOpen
                    ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
                    : 'pointer-events-none -translate-y-2 scale-95 opacity-0'
                }`}
              >
                <div className={`rounded-xl px-3 py-3 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>Export quality</p>
                      <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        True output size with embedded print resolution
                      </p>
                    </div>
                    <div className={`text-right text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      <div>{exportDimensions.widthPx} × {exportDimensions.heightPx} px</div>
                      <div>{exportDpi} DPI</div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {EXPORT_DPI_OPTIONS.map((dpiOption) => {
                      const active = exportDpi === dpiOption;

                      return (
                        <button
                          key={dpiOption}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setExportDpi(dpiOption)}
                          className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                            active
                              ? isDarkMode
                                ? 'bg-slate-100 text-slate-900 shadow-sm'
                                : 'bg-slate-900 text-white shadow-sm'
                              : isDarkMode
                                ? 'bg-slate-900 text-slate-400 ring-1 ring-slate-700 hover:text-slate-100'
                                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-900'
                          }`}
                        >
                          {dpiOption} DPI
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-2 space-y-1">
                  {DOWNLOAD_OPTIONS.map((option) => (
                    <button
                      key={option.format}
                      type="button"
                      onClick={() => handleDownload(option.format)}
                      className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${
                        isDarkMode ? 'hover:bg-slate-950' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500/80" />
                      <span>
                        <span className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                          {option.label}
                        </span>
                        <span className={`mt-1 block text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {option.helper}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-screen-2xl gap-6 px-4 py-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <UploadPanel
            images={images}
            isDarkMode={isDarkMode}
            onFilesSelected={handleFilesSelected}
            onRemoveImage={handleRemoveImage}
          />

          <ControlsPanel
            rows={rows}
            columns={columns}
            gap={gap}
            fitMode={fitMode}
            isDarkMode={isDarkMode}
            cellCount={cellCount}
            cellWidth={firstCell.width}
            cellHeight={firstCell.height}
            pageCount={pageCount}
            selectedImage={selectedImage}
            onRowsChange={(value) => setRows(clampGridValue(value))}
            onColumnsChange={(value) => setColumns(clampGridValue(value))}
            onGapChange={(value) => setGap(Math.max(0, Math.min(20, Number(value) || 0)))}
            onFitModeChange={setFitMode}
            onSelectedImageScaleChange={handleSelectedImageScaleChange}
            onRemoveSelectedImage={() => {
              if (selectedImageId) {
                handleRemoveImage(selectedImageId);
              }
            }}
          />

          <section
            className={`rounded-3xl p-5 text-sm shadow-sm ring-1 transition-colors duration-300 ${
              isDarkMode
                ? 'bg-slate-900 text-slate-100 ring-slate-800'
                : 'bg-white text-slate-700 ring-slate-200'
            }`}
          >
            <h2 className="font-semibold">Session status</h2>
            <p className={`mt-2 leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>
              {statusMessage}
            </p>
          </section>
        </aside>

        <CanvasEditor
          stageRef={stageRef}
          isDarkMode={isDarkMode}
          pageWidth={pageDimensions.widthPx}
          pageHeight={pageDimensions.heightPx}
          rows={rows}
          columns={columns}
          gap={gap}
          fitMode={fitMode}
          images={currentPageImages}
          currentPage={currentPage}
          totalPages={pageCount}
          isExporting={isExporting}
          selectedImageId={selectedImageId}
          onPageChange={setCurrentPage}
          onSelectImage={handleSelectImage}
          onSwap={handleSwap}
        />
      </main>
    </div>
  );
}

export default App;
