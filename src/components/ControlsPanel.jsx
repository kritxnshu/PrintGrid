const GRID_MIN = 1;
const GRID_MAX = 12;

const clampGridControlValue = (value) => {
  const numericValue = Number.parseInt(value, 10);

  if (Number.isNaN(numericValue)) {
    return GRID_MIN;
  }

  return Math.min(GRID_MAX, Math.max(GRID_MIN, numericValue));
};

function GridStepper({ label, value, isDarkMode, onChange }) {
  const handleStep = (direction) => {
    onChange(clampGridControlValue(value + direction));
  };

  const handleInputChange = (event) => {
    const nextValue = event.target.value;

    if (nextValue === '') {
      onChange(GRID_MIN);
      return;
    }

    onChange(clampGridControlValue(nextValue));
  };

  const handleFocus = (event) => {
    event.target.select();
  };

  const buttonClassName = `flex h-6 w-8 items-center justify-center text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${
    isDarkMode
      ? 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
  }`;

  return (
    <label className="space-y-2">
      <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{label}</span>
      <div
        className={`flex overflow-hidden rounded-2xl border transition focus-within:border-blue-500 focus-within:ring-2 ${
          isDarkMode
            ? 'border-slate-700 bg-slate-950 focus-within:ring-blue-900/40'
            : 'border-slate-300 bg-white focus-within:ring-blue-100'
        }`}
      >
        <input
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          min={GRID_MIN}
          max={GRID_MAX}
          value={value}
          onFocus={handleFocus}
          onChange={handleInputChange}
          className={`min-w-0 flex-1 bg-transparent px-3 py-2 text-base outline-none sm:text-sm ${
            isDarkMode ? 'text-slate-100' : 'text-slate-900'
          }`}
        />
        <div className={`flex shrink-0 flex-col border-l ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <button
            type="button"
            aria-label={`Increase ${label.toLowerCase()}`}
            disabled={value >= GRID_MAX}
            onClick={() => handleStep(1)}
            className={buttonClassName}
          >
            {'\u25B2'}
          </button>
          <button
            type="button"
            aria-label={`Decrease ${label.toLowerCase()}`}
            disabled={value <= GRID_MIN}
            onClick={() => handleStep(-1)}
            className={buttonClassName}
          >
            {'\u25BC'}
          </button>
        </div>
      </div>
    </label>
  );
}

function ControlsPanel({
  rows,
  columns,
  gap,
  fitMode,
  isDarkMode,
  cellCount,
  cellWidth,
  cellHeight,
  pageCount,
  onRowsChange,
  onColumnsChange,
  onGapChange,
  onFitModeChange,
}) {
  return (
    <section
      className={`rounded-3xl p-5 shadow-sm ring-1 transition-colors duration-300 ${
        isDarkMode ? 'bg-slate-900 ring-slate-800' : 'bg-white ring-slate-200'
      }`}
    >
      <div>
        <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>Layout</h2>
        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Set the page grid here, then click a photo on the canvas to edit it below the preview.
        </p>
      </div>

      <div className="mt-5 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <GridStepper label="Rows" value={rows} isDarkMode={isDarkMode} onChange={onRowsChange} />
          <GridStepper label="Columns" value={columns} isDarkMode={isDarkMode} onChange={onColumnsChange} />
        </div>

        <label className="block">
          <div className="mb-2 flex items-center justify-between">
            <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Gap</span>
            <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{gap}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="20"
            value={gap}
            onChange={(event) => onGapChange(event.target.value)}
            className={`h-2 w-full cursor-pointer appearance-none rounded-full accent-blue-600 ${
              isDarkMode ? 'bg-slate-800' : 'bg-slate-200'
            }`}
          />
        </label>

        <div>
          <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Fit mode</span>
          <div className={`mt-2 grid grid-cols-2 gap-2 rounded-2xl p-1 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
            {['cover', 'contain'].map((mode) => {
              const active = fitMode === mode;

              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onFitModeChange(mode)}
                  className={`rounded-xl px-3 py-2 text-sm font-medium capitalize transition ${
                    active
                      ? isDarkMode
                        ? 'bg-slate-950 text-slate-100 shadow-sm'
                        : 'bg-white text-slate-900 shadow-sm'
                      : isDarkMode
                        ? 'text-slate-400 hover:text-slate-100'
                        : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {mode}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`mt-5 rounded-2xl p-4 text-sm ${isDarkMode ? 'bg-slate-950 text-slate-400' : 'bg-slate-50 text-slate-600'}`}>
        <div className="flex items-center justify-between">
          <span>Cells per page</span>
          <span className={`font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{cellCount}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span>Cell size</span>
          <span className={`font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
            {Math.round(cellWidth)} {'\u00D7'} {Math.round(cellHeight)} px
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span>Printable pages</span>
          <span className={`font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{pageCount}</span>
        </div>
      </div>
    </section>
  );
}

export default ControlsPanel;
