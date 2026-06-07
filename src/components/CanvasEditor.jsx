import { useEffect, useMemo, useRef, useState } from 'react';
import Konva from 'konva';
import { Group, Image as KonvaImage, Layer, Rect, Stage, Text } from 'react-konva';
import { getFitDimensions, getGridCells } from '../utils/layout';

const PREVIEW_MAX_WIDTH = 960;
const PREVIEW_MAX_HEIGHT = 760;
const DIMENSION_SEPARATOR = '\u00D7';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const clampCropOffset = (offset, fitStart, fitSize, cellSize) => {
  if (fitSize <= cellSize) {
    return 0;
  }

  const minimumOffset = cellSize - fitSize - fitStart;
  const maximumOffset = -fitStart;

  return clamp(offset, minimumOffset, maximumOffset);
};

const setStageCursor = (node, cursor) => {
  const container = node?.getStage?.()?.container?.();

  if (container) {
    container.style.cursor = cursor;
  }
};

function EditableCanvasImage({ image, fit, brightness, contrast }) {
  const imageRef = useRef(null);

  useEffect(() => {
    const node = imageRef.current;

    if (!node) {
      return undefined;
    }

    const hasFilters = Math.abs(brightness) > 0.001 || Math.abs(contrast) > 0.001;

    if (hasFilters) {
      node.filters([Konva.Filters.Brighten, Konva.Filters.Contrast]);
      node.cache();
    } else {
      node.filters([]);
      node.clearCache();
    }

    node.getLayer()?.batchDraw();

    return () => {
      node.clearCache();
    };
  }, [brightness, contrast, fit.height, fit.width, image.element]);

  return (
    <KonvaImage
      ref={imageRef}
      image={image.element}
      x={fit.x + (image.cropX ?? 0)}
      y={fit.y + (image.cropY ?? 0)}
      width={fit.width}
      height={fit.height}
      brightness={brightness}
      contrast={contrast * 100}
      listening={false}
    />
  );
}

function CanvasImageCell({
  cell,
  image,
  pageWidth,
  pageHeight,
  fitMode,
  isExporting,
  isCropModeEnabled,
  selectedImageId,
  dragIndex,
  onSelectImage,
  onCellDragStart,
  onCellDragEnd,
  onCropChange,
}) {
  const cropAreaRef = useRef(null);
  const cropStateRef = useRef({
    x: image.cropX ?? 0,
    y: image.cropY ?? 0,
  });
  const lastPointerPositionRef = useRef(null);
  const [isCropDragging, setIsCropDragging] = useState(false);

  const fit = useMemo(
    () =>
      getFitDimensions({
        imageWidth: image.width,
        imageHeight: image.height,
        cellWidth: cell.width,
        cellHeight: cell.height,
        fitMode,
        zoom: image.scale,
      }),
    [cell.height, cell.width, fitMode, image.height, image.scale, image.width],
  );

  const isSelected = selectedImageId === image.id;
  const cropModeActive = !isExporting && isCropModeEnabled && isSelected;
  const isActiveInEditor = !isExporting && (dragIndex === cell.index || isSelected);

  useEffect(() => {
    cropStateRef.current = {
      x: image.cropX ?? 0,
      y: image.cropY ?? 0,
    };
  }, [image.cropX, image.cropY]);

  useEffect(() => {
    if (!cropModeActive) {
      setIsCropDragging(false);
      lastPointerPositionRef.current = null;
      if (cropAreaRef.current) {
        setStageCursor(cropAreaRef.current, 'default');
      }
    }
  }, [cropModeActive]);

  useEffect(
    () => () => {
      if (cropAreaRef.current) {
        setStageCursor(cropAreaRef.current, 'default');
      }
    },
    [],
  );

  const applyCropDelta = (deltaX, deltaY) => {
    const rotationInRadians = -((image.rotation ?? 0) * Math.PI) / 180;
    const cosRotation = Math.cos(rotationInRadians);
    const sinRotation = Math.sin(rotationInRadians);
    const rotatedDeltaX = deltaX * cosRotation - deltaY * sinRotation;
    const rotatedDeltaY = deltaX * sinRotation + deltaY * cosRotation;
    const localDeltaX = rotatedDeltaX * (image.flipX ? -1 : 1);
    const localDeltaY = rotatedDeltaY * (image.flipY ? -1 : 1);
    const nextCropX = clampCropOffset(cropStateRef.current.x + localDeltaX, fit.x, fit.width, cell.width);
    const nextCropY = clampCropOffset(cropStateRef.current.y + localDeltaY, fit.y, fit.height, cell.height);

    cropStateRef.current = {
      x: nextCropX,
      y: nextCropY,
    };

    onCropChange(nextCropX, nextCropY);
  };

  const beginCropPan = (event) => {
    if (!cropModeActive) {
      return;
    }

    event.cancelBubble = true;
    onSelectImage(cell.index);

    const pointerPosition = event.target.getStage()?.getPointerPosition();

    if (!pointerPosition) {
      return;
    }

    lastPointerPositionRef.current = pointerPosition;
    setIsCropDragging(true);
    setStageCursor(event.target, 'grabbing');
  };

  const updateCropPan = (event) => {
    if (!cropModeActive || !isCropDragging) {
      return;
    }

    event.cancelBubble = true;
    const pointerPosition = event.target.getStage()?.getPointerPosition();
    const previousPointerPosition = lastPointerPositionRef.current;

    if (!pointerPosition || !previousPointerPosition) {
      return;
    }

    applyCropDelta(
      pointerPosition.x - previousPointerPosition.x,
      pointerPosition.y - previousPointerPosition.y,
    );

    lastPointerPositionRef.current = pointerPosition;
  };

  const endCropPan = (event, cursor = 'grab') => {
    if (!cropModeActive) {
      return;
    }

    if (event) {
      event.cancelBubble = true;
      setStageCursor(event.target, cursor);
    }

    setIsCropDragging(false);
    lastPointerPositionRef.current = null;
  };

  return (
    <Group
      x={cell.x}
      y={cell.y}
      draggable={!isExporting && !cropModeActive}
      onClick={() => onSelectImage(cell.index)}
      onTap={() => onSelectImage(cell.index)}
      onDragStart={(event) => onCellDragStart(event, cell.index)}
      onDragEnd={(event) => onCellDragEnd(event, cell.index)}
      dragBoundFunc={(position) => ({
        x: clamp(position.x, 0, pageWidth - cell.width),
        y: clamp(position.y, 0, pageHeight - cell.height),
      })}
    >
      <Group clipX={0} clipY={0} clipWidth={cell.width} clipHeight={cell.height}>
        <Rect width={cell.width} height={cell.height} fill="#ffffff" />
        <Group
          ref={cropAreaRef}
          onMouseEnter={(event) => {
            if (cropModeActive) {
              setStageCursor(event.target, isCropDragging ? 'grabbing' : 'grab');
            }
          }}
          onMouseLeave={(event) => {
            if (!cropModeActive) {
              return;
            }

            if (isCropDragging) {
              endCropPan(event, 'default');
              return;
            }

            setStageCursor(event.target, 'default');
          }}
          onMouseDown={beginCropPan}
          onMouseMove={updateCropPan}
          onMouseUp={(event) => endCropPan(event, 'grab')}
          onTouchStart={beginCropPan}
          onTouchMove={updateCropPan}
          onTouchEnd={(event) => endCropPan(event, 'grab')}
        >
          <Group
            x={cell.width / 2}
            y={cell.height / 2}
            offsetX={cell.width / 2}
            offsetY={cell.height / 2}
            rotation={image.rotation ?? 0}
            scaleX={image.flipX ? -1 : 1}
            scaleY={image.flipY ? -1 : 1}
          >
            <EditableCanvasImage
              image={image}
              fit={fit}
              brightness={image.brightness ?? 0}
              contrast={image.contrast ?? 0}
            />
          </Group>
        </Group>
      </Group>

      <Rect
        width={cell.width}
        height={cell.height}
        stroke={isActiveInEditor ? '#2563eb' : '#0f172a'}
        strokeWidth={isActiveInEditor ? 3 : 1.5}
        cornerRadius={4}
        listening={false}
      />

      {cropModeActive ? (
        <Group listening={false}>
          <Rect x={10} y={10} width={90} height={28} fill="rgba(37, 99, 235, 0.92)" cornerRadius={999} />
          <Text x={10} y={17} width={90} align="center" fontSize={12} fontStyle="bold" fill="#ffffff" text="Crop mode" />
        </Group>
      ) : null}
    </Group>
  );
}

function CanvasEditor({
  stageRef,
  isDarkMode,
  pageWidth,
  pageHeight,
  rows,
  columns,
  gap,
  fitMode,
  images,
  currentPage,
  totalPages,
  isExporting,
  isCropModeEnabled,
  selectedImageId,
  onPageChange,
  onSelectImage,
  onSwap,
  onCropChange,
  renderEditPanel,
}) {
  const [dragIndex, setDragIndex] = useState(null);
  const previewViewportRef = useRef(null);
  const [availablePreviewWidth, setAvailablePreviewWidth] = useState(PREVIEW_MAX_WIDTH);

  const cells = useMemo(
    () =>
      getGridCells({
        pageWidth,
        pageHeight,
        rows,
        columns,
        gap,
      }),
    [columns, gap, pageHeight, pageWidth, rows],
  );

  const previewScale = useMemo(
    () =>
      Math.min(
        Math.min(PREVIEW_MAX_WIDTH, availablePreviewWidth) / pageWidth,
        PREVIEW_MAX_HEIGHT / pageHeight,
        1,
      ),
    [availablePreviewWidth, pageHeight, pageWidth],
  );

  const showEditorGuides = !isExporting;

  useEffect(() => {
    const viewport = previewViewportRef.current;

    if (!viewport) {
      return undefined;
    }

    const updateAvailableWidth = () => {
      const isDesktopLayout = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

      if (isDesktopLayout) {
        setAvailablePreviewWidth(PREVIEW_MAX_WIDTH);
        return;
      }

      setAvailablePreviewWidth(Math.max(180, viewport.clientWidth - 24));
    };

    updateAvailableWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateAvailableWidth);

      return () => {
        window.removeEventListener('resize', updateAvailableWidth);
      };
    }

    const resizeObserver = new ResizeObserver(updateAvailableWidth);
    resizeObserver.observe(viewport);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Find the selected cell to position the inline edit panel
  const selectedCellIndex = useMemo(() => {
    if (!selectedImageId) return -1;
    return images.findIndex((img) => img?.id === selectedImageId);
  }, [images, selectedImageId]);

  const selectedCell = selectedCellIndex >= 0 ? cells[selectedCellIndex] : null;


  const handleDragStart = (event, cellIndex) => {
    onSelectImage(cellIndex);
    event.target.moveToTop();
    event.target.getLayer()?.batchDraw();
    setDragIndex(cellIndex);
  };

  const handleDragEnd = (event, fromIndex) => {
    const node = event.target;
    const sourceCell = cells[fromIndex];

    if (!sourceCell) {
      setDragIndex(null);
      return;
    }

    const centerX = node.x() + sourceCell.width / 2;
    const centerY = node.y() + sourceCell.height / 2;

    const targetCell = cells.find(
      (cell) =>
        centerX >= cell.x &&
        centerX <= cell.x + cell.width &&
        centerY >= cell.y &&
        centerY <= cell.y + cell.height,
    );

    if (targetCell && targetCell.index !== fromIndex && images[targetCell.index]) {
      onSwap(fromIndex, targetCell.index);
    }

    node.position({ x: sourceCell.x, y: sourceCell.y });
    node.getLayer()?.batchDraw();
    setDragIndex(null);
  };

  const canvasWidth = pageWidth * previewScale;

  return (
    <section className="flex h-full w-full flex-col gap-4">
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-3xl px-5 py-4 shadow-sm ring-1 transition-colors duration-300 ${
          isDarkMode ? 'bg-slate-900 ring-slate-800' : 'bg-white ring-slate-200'
        }`}
      >
        <div>
          <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>Canvas preview</h2>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {pageWidth} {DIMENSION_SEPARATOR} {pageHeight} px at 96 DPI
          </p>
        </div>

        {totalPages > 1 ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0 || isExporting}
              className={`rounded-2xl border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                isDarkMode
                  ? 'border-slate-700 text-slate-300 hover:border-slate-600 hover:text-slate-100'
                  : 'border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900'
              }`}
            >
              Previous
            </button>
            <span className={`min-w-28 text-center text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1 || isExporting}
              className={`rounded-2xl border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                isDarkMode
                  ? 'border-slate-700 text-slate-300 hover:border-slate-600 hover:text-slate-100'
                  : 'border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900'
              }`}
            >
              Next
            </button>
          </div>
        ) : (
          <div
            className={`rounded-full px-4 py-2 text-sm ${
              isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Single-page layout
          </div>
        )}
      </div>

      <div
        ref={previewViewportRef}
        className={`flex flex-1 flex-col items-center justify-start overflow-auto rounded-3xl border p-3 shadow-inner transition-colors duration-300 sm:p-4 ${
          isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-200/60'
        }`}
      >
        <div
          className="relative shrink-0"
          style={{
            width: canvasWidth,
          }}
        >
          {/* Canvas */}
          <div
            style={{
              width: canvasWidth,
              height: pageHeight * previewScale,
            }}
          >
            <div
              style={{
                width: pageWidth,
                height: pageHeight,
                transform: `scale(${previewScale})`,
                transformOrigin: 'top left',
              }}
            >
              <Stage ref={stageRef} width={pageWidth} height={pageHeight}>
                <Layer>
                  <Rect
                    x={0}
                    y={0}
                    width={pageWidth}
                    height={pageHeight}
                    fill="#ffffff"
                    stroke={showEditorGuides ? '#cbd5e1' : undefined}
                    strokeWidth={showEditorGuides ? 2 : 0}
                  />

                  {showEditorGuides
                    ? cells.map((cell) => {
                        const image = images[cell.index];

                        return (
                          <Group key={`guide-${cell.index}`} x={cell.x} y={cell.y}>
                            <Rect
                              width={cell.width}
                              height={cell.height}
                              fill={image ? '#ffffff' : '#f8fafc'}
                              stroke="#cbd5e1"
                              strokeWidth={1}
                              dash={image ? [] : [6, 6]}
                              cornerRadius={4}
                            />
                            {!image ? (
                              <Text
                                y={cell.height / 2 - 9}
                                width={cell.width}
                                align="center"
                                fontSize={16}
                                fill="#94a3b8"
                                listening={false}
                                text="Empty"
                              />
                            ) : null}
                          </Group>
                        );
                      })
                    : null}

                  {cells.map((cell) => {
                    const image = images[cell.index];

                    if (!image) {
                      return null;
                    }

                    return (
                      <CanvasImageCell
                        key={`${image.id}-${cell.index}`}
                        cell={cell}
                        image={image}
                        pageWidth={pageWidth}
                        pageHeight={pageHeight}
                        fitMode={fitMode}
                        isExporting={isExporting}
                        isCropModeEnabled={isCropModeEnabled}
                        selectedImageId={selectedImageId}
                        dragIndex={dragIndex}
                        onSelectImage={onSelectImage}
                        onCellDragStart={handleDragStart}
                        onCellDragEnd={handleDragEnd}
                        onCropChange={onCropChange}
                      />
                    );
                  })}
                </Layer>
              </Stage>
            </div>
          </div>

          {/* Inline Edit Panel - positioned below the selected image */}
          {renderEditPanel && selectedCell && (
            <div
              className="mt-2 transition-all duration-200 ease-out"
              style={{
                width: Math.min(560, canvasWidth),
                marginLeft: Math.max(0, Math.min(
                  (selectedCell.x + selectedCell.width / 2) * previewScale - Math.min(560, canvasWidth) / 2,
                  canvasWidth - Math.min(560, canvasWidth)
                )),
              }}
            >
              {renderEditPanel()}
            </div>
          )}
        </div>
      </div>

      <p className={`text-center text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        Made with {'\u2665'} by Kritanshu
      </p>
    </section>
  );
}

export default CanvasEditor;



