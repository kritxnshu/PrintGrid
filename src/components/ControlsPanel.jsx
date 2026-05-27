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
          <label className="space-y-2">
            <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Rows</span>
            <input
              type="number"
              min="1"
              max="12"
              value={rows}
              onChange={(event) => onRowsChange(event.target.value)}
              className={`w-full rounded-2xl border px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-2 ${
                isDarkMode
                  ? 'border-slate-700 bg-slate-950 text-slate-100 focus:ring-blue-900/40'
                  : 'border-slate-300 bg-white text-slate-900 focus:ring-blue-100'
              }`}
            />
          </label>

          <label className="space-y-2">
            <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Columns</span>
            <input
              type="number"
              min="1"
              max="12"
              value={columns}
              onChange={(event) => onColumnsChange(event.target.value)}
              className={`w-full rounded-2xl border px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-2 ${
                isDarkMode
                  ? 'border-slate-700 bg-slate-950 text-slate-100 focus:ring-blue-900/40'
                  : 'border-slate-300 bg-white text-slate-900 focus:ring-blue-100'
              }`}
            />
          </label>
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
