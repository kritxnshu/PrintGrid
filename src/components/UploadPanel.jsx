import { useRef, useState } from 'react';

function UploadPanel({ images, isDarkMode, onFilesSelected, onRemoveImage }) {
  const inputRef = useRef(null);
  const dragDepthRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const submitFiles = async (fileList) => {
    const imageFiles = Array.from(fileList ?? []).filter((file) => file.type.startsWith('image/'));

    if (imageFiles.length > 0) {
      await onFilesSelected(imageFiles);
    }
  };

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const handleChange = async (event) => {
    const { files } = event.target;

    if (files?.length) {
      await submitFiles(files);
      event.target.value = '';
    }
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);

    const { files } = event.dataTransfer ?? {};

    if (files?.length) {
      await submitFiles(files);
    }
  };

  return (
    <section
      className={`rounded-3xl p-5 shadow-sm ring-1 transition-colors duration-300 ${
        isDarkMode ? 'bg-slate-900 ring-slate-800' : 'bg-white ring-slate-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>Upload</h2>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Add multiple photos at once.</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {images.length} loaded
        </span>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={openFilePicker}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openFilePicker();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mt-4 rounded-3xl border-2 border-dashed px-5 py-8 text-center transition-all duration-200 ease-out ${
          isDragging
            ? isDarkMode
              ? 'scale-[1.01] border-blue-500 bg-blue-950/40 shadow-inner ring-4 ring-blue-500/20'
              : 'scale-[1.01] border-blue-500 bg-blue-50 shadow-inner ring-4 ring-blue-100'
            : isDarkMode
              ? 'border-slate-700 bg-slate-950 hover:border-slate-600 hover:bg-slate-900'
              : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-white'
        }`}
        aria-label="Upload photos by browsing or dragging files here"
      >
        <div className="mx-auto flex max-w-xs flex-col items-center">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
              isDragging
                ? 'bg-blue-600 text-white'
                : isDarkMode
                  ? 'bg-slate-100 text-slate-900'
                  : 'bg-slate-900 text-white'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-7 w-7">
              <path
                d="M12 16V5M12 5L7.5 9.5M12 5L16.5 9.5M5 16.5V17.5C5 18.8807 6.11929 20 7.5 20H16.5C17.8807 20 19 18.8807 19 17.5V16.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <p className={`mt-4 text-base font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
            {isDragging ? 'Drop photos to upload' : 'Drag & drop photos here'}
          </p>
          <p className={`mt-2 text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Or click to browse from your device. JPG, PNG, and other image files work best.
          </p>
          <span
            className={`mt-4 inline-flex rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              isDarkMode
                ? 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            Upload photos
          </span>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleChange}
        className="hidden"
      />

      <p className={`mt-3 text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        Images fill the grid automatically. If you add more than one page can hold, PrintGrid
        creates extra pages for export.
      </p>

      <div className="mt-4 grid max-h-72 grid-cols-3 gap-2 overflow-y-auto pr-1">
        {images.length > 0 ? (
          images.map((image) => (
            <div
              key={image.id}
              className={`relative overflow-hidden rounded-2xl border ${
                isDarkMode ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-slate-50'
              }`}
              title={image.name}
            >
              <button
                type="button"
                onClick={() => onRemoveImage(image.id)}
                className={`absolute right-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold text-white transition hover:bg-red-600 ${
                  isDarkMode ? 'bg-slate-950/80' : 'bg-slate-900/80'
                }`}
                aria-label={`Remove ${image.name}`}
              >
                ×
              </button>
              <img src={image.src} alt={image.name} className="h-24 w-full object-cover" />
            </div>
          ))
        ) : (
          <div
            className={`col-span-3 rounded-2xl border border-dashed px-4 py-8 text-center text-sm ${
              isDarkMode
                ? 'border-slate-700 bg-slate-950 text-slate-400'
                : 'border-slate-300 bg-slate-50 text-slate-500'
            }`}
          >
            Your uploaded photos will appear here.
          </div>
        )}
      </div>
    </section>
  );
}

export default UploadPanel;
