import { useMemo, useState } from 'react';
import { Group, Image as KonvaImage, Layer, Rect, Stage, Text } from 'react-konva';
import { getFitDimensions, getGridCells } from '../utils/layout';

const PREVIEW_MAX_WIDTH = 960;
const PREVIEW_MAX_HEIGHT = 760;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

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
  selectedImageId,
  onPageChange,
  onSelectImage,
  onSwap,
}) {
  const [dragIndex, setDragIndex] = useState(null);

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
    () => Math.min(PREVIEW_MAX_WIDTH / pageWidth, PREVIEW_MAX_HEIGHT / pageHeight, 1),
    [pageHeight, pageWidth],
  );

  const showEditorGuides = !isExporting;

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
            {pageWidth} × {pageHeight} px at 96 DPI
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
        className={`flex flex-1 items-center justify-center overflow-auto rounded-3xl border p-4 shadow-inner transition-colors duration-300 ${
          isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-200/60'
        }`}
      >
        <div
          className="relative shrink-0"
          style={{
            width: pageWidth * previewScale,
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
                        <Group key={`cell-${cell.index}`} x={cell.x} y={cell.y}>
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

                  const fit = getFitDimensions({
                    imageWidth: image.width,
                    imageHeight: image.height,
                    cellWidth: cell.width,
                    cellHeight: cell.height,
                    fitMode,
                    zoom: image.scale,
                  });

                  const isSelected = selectedImageId === image.id;
                  const isActiveInEditor = !isExporting && (dragIndex === cell.index || isSelected);

                  return (
                    <Group
                      key={`${image.id}-${cell.index}`}
                      x={cell.x}
                      y={cell.y}
                      draggable={!isExporting}
                      onClick={() => onSelectImage(cell.index)}
                      onDragStart={(event) => handleDragStart(event, cell.index)}
                      onDragEnd={(event) => handleDragEnd(event, cell.index)}
                      dragBoundFunc={(position) => ({
                        x: clamp(position.x, 0, pageWidth - cell.width),
                        y: clamp(position.y, 0, pageHeight - cell.height),
                      })}
                    >
                      <Group clipX={0} clipY={0} clipWidth={cell.width} clipHeight={cell.height}>
                        <Rect width={cell.width} height={cell.height} fill="#ffffff" />
                        <KonvaImage
                          image={image.element}
                          x={fit.x}
                          y={fit.y}
                          width={fit.width}
                          height={fit.height}
                          listening={false}
                        />
                      </Group>

                      <Rect
                        width={cell.width}
                        height={cell.height}
                        stroke={isActiveInEditor ? '#2563eb' : '#0f172a'}
                        strokeWidth={isActiveInEditor ? 3 : 1.5}
                        cornerRadius={4}
                        listening={false}
                      />
                    </Group>
                  );
                })}
              </Layer>
            </Stage>
          </div>
        </div>
      </div>

      <p className={`text-center text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        Made with ?? by Kritanshu
      </p>
    </section>
  );
}

export default CanvasEditor;
