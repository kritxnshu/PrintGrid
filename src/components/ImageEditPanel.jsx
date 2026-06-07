import { useState } from 'react';

const formatSignedValue = (value) => `${value > 0 ? '+' : ''}${value.toFixed(2)}`;

const TABS = [
  { key: 'size', label: 'Size' },
  { key: 'rotate', label: 'Rotate' },
  { key: 'adjust', label: 'Adjust' },
  { key: 'crop', label: 'Crop' },
];

function ImageEditPanel({
  isDarkMode,
  selectedImage,
  isCropModeEnabled,
  onSelectedImageScaleChange,
  onRemoveSelectedImage,
  onRotationChange,
  onFlipChange,
  onBrightnessChange,
  onContrastChange,
  onCropChange,
  onCropModeToggle,
  onResetAllEdits,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState('size');

  if (!selectedImage) {
    return null;
  }

  const imageScalePercent = Math.round((selectedImage.scale ?? 1) * 100);
  const rotationValue = Math.round(selectedImage.rotation ?? 0);
  const brightnessValue = selectedImage.brightness ?? 0;
  const contrastValue = selectedImage.contrast ?? 0;

  const btnBase = `whitespace-nowrap rounded-xl border px-2.5 py-1.5 text-xs font-medium transition`;
  const btnNormal = isDarkMode
    ? `${btnBase} border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:text-slate-100`
    : `${btnBase} border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900`;
  const btnActive = isDarkMode
    ? `${btnBase} border-slate-100 bg-slate-100 text-slate-900`
    : `${btnBase} border-slate-900 bg-slate-900 text-white`;

  return (
    <div
      className={`mt-2 w-full rounded-2xl shadow-lg ring-1 transition-all duration-200 ${
        isDarkMode
          ? 'bg-slate-900 ring-slate-700/80 shadow-black/30'
          : 'bg-white ring-slate-200 shadow-slate-200/60'
      }`}
      style={{ maxWidth: 560 }}
    >
      {/* Header */}
      <div className={`flex items-center justify-between gap-2 border-b px-3 py-2 ${
        isDarkMode ? 'border-slate-800' : 'border-slate-100'
      }`}>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-xs font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            {selectedImage.name}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onRemoveSelectedImage}
            className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-red-700"
          >
            Remove
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-lg px-2 py-1 text-[11px] font-medium transition ${
              isDarkMode
                ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
            aria-label="Close editor"
          >
            {"\u2715"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex gap-0.5 overflow-x-auto border-b px-2 pt-1 ${
        isDarkMode ? 'border-slate-800' : 'border-slate-100'
      }`}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`relative shrink-0 rounded-t-lg px-3 py-1.5 text-xs font-medium transition ${
                isActive
                  ? isDarkMode
                    ? 'bg-slate-800 text-blue-400'
                    : 'bg-blue-50 text-blue-600'
                  : isDarkMode
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-blue-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="px-3 py-3">
        {activeTab === 'size' && (
          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <span className={`shrink-0 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Size</span>
              <input
                type="range"
                min="40"
                max="250"
                step="5"
                value={imageScalePercent}
                onChange={(event) => onSelectedImageScaleChange((Number(event.target.value) || 100) / 100)}
                className={`h-1.5 flex-1 cursor-pointer appearance-none rounded-full accent-blue-600 ${
                  isDarkMode ? 'bg-slate-800' : 'bg-slate-200'
                }`}
              />
              <span className={`w-10 text-right text-xs font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                {imageScalePercent}%
              </span>
            </div>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => onSelectedImageScaleChange(1)} className={btnNormal}>
                Reset size
              </button>
            </div>
          </div>
        )}

        {activeTab === 'rotate' && (
          <div className="space-y-2.5">
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => onRotationChange(rotationValue - 90)} className={btnNormal}>
                {'-90\u00B0'}
              </button>
              <button type="button" onClick={() => onRotationChange(rotationValue + 90)} className={btnNormal}>
                {'+90\u00B0'}
              </button>
              <button type="button" onClick={() => onRotationChange(rotationValue + 180)} className={btnNormal}>
                {'180\u00B0'}
              </button>
              <button type="button" onClick={() => onRotationChange(0)} className={btnNormal}>
                Reset
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className={`shrink-0 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Angle</span>
              <input
                type="number"
                min="0"
                max="360"
                step="1"
                value={rotationValue}
                onChange={(event) => onRotationChange(Number(event.target.value) || 0)}
                className={`w-16 rounded-lg border px-2 py-1 text-xs outline-none transition focus:border-blue-500 ${
                  isDarkMode
                    ? 'border-slate-700 bg-slate-800 text-slate-200'
                    : 'border-slate-300 bg-slate-50 text-slate-800'
                }`}
              />
            </div>
            <div className={`mt-1 border-t pt-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <span className={`mb-1.5 block text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Flip
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  aria-pressed={selectedImage.flipX}
                  onClick={() => onFlipChange('x')}
                  className={selectedImage.flipX ? btnActive : btnNormal}
                >
                  Flip H
                </button>
                <button
                  type="button"
                  aria-pressed={selectedImage.flipY}
                  onClick={() => onFlipChange('y')}
                  className={selectedImage.flipY ? btnActive : btnNormal}
                >
                  Flip V
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'adjust' && (
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Brightness</span>
                <span className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  {formatSignedValue(brightnessValue)}
                </span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                value={brightnessValue}
                onChange={(event) => onBrightnessChange(event.target.value)}
                className={`h-1.5 w-full cursor-pointer appearance-none rounded-full accent-blue-600 ${
                  isDarkMode ? 'bg-slate-800' : 'bg-slate-200'
                }`}
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Contrast</span>
                <span className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  {formatSignedValue(contrastValue)}
                </span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                value={contrastValue}
                onChange={(event) => onContrastChange(event.target.value)}
                className={`h-1.5 w-full cursor-pointer appearance-none rounded-full accent-blue-600 ${
                  isDarkMode ? 'bg-slate-800' : 'bg-slate-200'
                }`}
              />
            </div>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => onBrightnessChange(0)} className={btnNormal}>
                Reset brightness
              </button>
              <button type="button" onClick={() => onContrastChange(0)} className={btnNormal}>
                Reset contrast
              </button>
            </div>
          </div>
        )}

        {activeTab === 'crop' && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                aria-pressed={isCropModeEnabled}
                onClick={onCropModeToggle}
                className={isCropModeEnabled ? btnActive : btnNormal}
              >
                {isCropModeEnabled ? 'Done cropping' : 'Crop image'}
              </button>
              <button type="button" onClick={() => onCropChange(0, 0)} className={btnNormal}>
                Reset crop
              </button>
            </div>
            <p className={`text-[11px] leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {isCropModeEnabled
                ? 'Drag the photo on the canvas to reposition it within the cell.'
                : 'Enable crop mode, then drag the photo to reposition.'}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`border-t px-3 py-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
        <button
          type="button"
          onClick={onResetAllEdits}
          className="w-full rounded-xl bg-red-600/90 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600"
        >
          Reset all edits
        </button>
      </div>
    </div>
  );
}

export default ImageEditPanel;
