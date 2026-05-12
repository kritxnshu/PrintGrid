import { PREVIEW_DPI } from './layout';

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const PNG_CHUNK_TYPE_PHYS = new Uint8Array([112, 72, 89, 115]);
const JFIF_IDENTIFIER = [0x4a, 0x46, 0x49, 0x46, 0x00];

let crcTable;

const waitForBlob = (canvas, mimeType, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error('Unable to encode exported canvas.'));
      },
      mimeType,
      quality,
    );
  });

const createCrcTable = () => {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let crc = index;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }

    table[index] = crc >>> 0;
  }

  return table;
};

const getCrc32 = (bytes) => {
  if (!crcTable) {
    crcTable = createCrcTable();
  }

  let crc = 0xffffffff;

  for (let index = 0; index < bytes.length; index += 1) {
    crc = crcTable[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
};

const readUint32 = (bytes, offset) =>
  bytes[offset] * 0x1000000 +
  ((bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]);

const writeUint32 = (target, offset, value) => {
  target[offset] = (value >>> 24) & 0xff;
  target[offset + 1] = (value >>> 16) & 0xff;
  target[offset + 2] = (value >>> 8) & 0xff;
  target[offset + 3] = value & 0xff;
};

const combineByteArrays = (parts) => {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const merged = new Uint8Array(totalLength);
  let cursor = 0;

  parts.forEach((part) => {
    merged.set(part, cursor);
    cursor += part.length;
  });

  return merged;
};

const buildPngPhysChunk = (dpi) => {
  const pixelsPerMeter = Math.round(dpi / 0.0254);
  const chunkData = new Uint8Array(9);
  writeUint32(chunkData, 0, pixelsPerMeter);
  writeUint32(chunkData, 4, pixelsPerMeter);
  chunkData[8] = 1;

  const crcInput = new Uint8Array(PNG_CHUNK_TYPE_PHYS.length + chunkData.length);
  crcInput.set(PNG_CHUNK_TYPE_PHYS, 0);
  crcInput.set(chunkData, PNG_CHUNK_TYPE_PHYS.length);

  const chunk = new Uint8Array(4 + PNG_CHUNK_TYPE_PHYS.length + chunkData.length + 4);
  writeUint32(chunk, 0, chunkData.length);
  chunk.set(PNG_CHUNK_TYPE_PHYS, 4);
  chunk.set(chunkData, 8);
  writeUint32(chunk, 8 + chunkData.length, getCrc32(crcInput));

  return chunk;
};

const applyPngResolution = (bytes, dpi) => {
  const signature = bytes.slice(0, PNG_SIGNATURE.length);

  if (!signature.every((value, index) => value === PNG_SIGNATURE[index])) {
    return bytes;
  }

  const pHYsChunk = buildPngPhysChunk(dpi);
  const parts = [bytes.slice(0, PNG_SIGNATURE.length)];
  let offset = PNG_SIGNATURE.length;
  let inserted = false;

  while (offset < bytes.length) {
    const chunkLength = readUint32(bytes, offset);
    const chunkTypeOffset = offset + 4;
    const chunkEnd = offset + chunkLength + 12;
    const chunkType = String.fromCharCode(
      bytes[chunkTypeOffset],
      bytes[chunkTypeOffset + 1],
      bytes[chunkTypeOffset + 2],
      bytes[chunkTypeOffset + 3],
    );

    if (chunkType === 'pHYs') {
      if (!inserted) {
        parts.push(pHYsChunk);
        inserted = true;
      }
    } else {
      parts.push(bytes.slice(offset, chunkEnd));

      if (chunkType === 'IHDR' && !inserted) {
        parts.push(pHYsChunk);
        inserted = true;
      }
    }

    offset = chunkEnd;
  }

  if (!inserted) {
    parts.push(pHYsChunk);
  }

  return combineByteArrays(parts);
};

const buildJfifSegment = (dpi) => {
  const density = Math.min(65535, Math.max(1, Math.round(dpi)));

  return new Uint8Array([
    0xff,
    0xe0,
    0x00,
    0x10,
    0x4a,
    0x46,
    0x49,
    0x46,
    0x00,
    0x01,
    0x02,
    0x01,
    (density >>> 8) & 0xff,
    density & 0xff,
    (density >>> 8) & 0xff,
    density & 0xff,
    0x00,
    0x00,
  ]);
};

const applyJpegResolution = (bytes, dpi) => {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return bytes;
  }

  const density = Math.min(65535, Math.max(1, Math.round(dpi)));
  const nextBytes = bytes.slice();
  let offset = 2;

  while (offset < nextBytes.length) {
    if (nextBytes[offset] !== 0xff) {
      break;
    }

    const marker = nextBytes[offset + 1];

    if (marker === 0xda || marker === 0xd9) {
      break;
    }

    const segmentLength = (nextBytes[offset + 2] << 8) | nextBytes[offset + 3];

    if (
      marker === 0xe0 &&
      JFIF_IDENTIFIER.every((value, index) => nextBytes[offset + 4 + index] === value)
    ) {
      nextBytes[offset + 11] = 0x01;
      nextBytes[offset + 12] = (density >>> 8) & 0xff;
      nextBytes[offset + 13] = density & 0xff;
      nextBytes[offset + 14] = (density >>> 8) & 0xff;
      nextBytes[offset + 15] = density & 0xff;

      return nextBytes;
    }

    offset += segmentLength + 2;
  }

  return combineByteArrays([nextBytes.slice(0, 2), buildJfifSegment(dpi), nextBytes.slice(2)]);
};

export const buildExportCanvas = (stage, outputDimensions) => {
  const targetWidth = Math.max(1, Math.round(outputDimensions.widthPx));
  const targetHeight = Math.max(1, Math.round(outputDimensions.heightPx));
  const stageWidth = Math.max(1, Number(stage.width()) || 1);
  const stageHeight = Math.max(1, Number(stage.height()) || 1);
  const sourcePixelRatio = Math.max(targetWidth / stageWidth, targetHeight / stageHeight, 1);
  const sourceCanvas = stage.toCanvas({ pixelRatio: sourcePixelRatio });

  if (sourceCanvas.width === targetWidth && sourceCanvas.height === targetHeight) {
    return sourceCanvas;
  }

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = targetWidth;
  finalCanvas.height = targetHeight;

  const context = finalCanvas.getContext('2d', { alpha: false });
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, targetWidth, targetHeight);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);

  sourceCanvas.width = 0;
  sourceCanvas.height = 0;

  return finalCanvas;
};

export const createExportBlob = async ({ canvas, format, dpi, quality = 0.98 }) => {
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const encodedBlob = await waitForBlob(canvas, mimeType, format === 'jpeg' ? quality : undefined);
  const encodedBytes = new Uint8Array(await encodedBlob.arrayBuffer());
  const bytesWithResolution = format === 'png'
    ? applyPngResolution(encodedBytes, dpi)
    : applyJpegResolution(encodedBytes, dpi);

  return new Blob([bytesWithResolution], { type: mimeType });
};

export const downloadBlob = (blob, fileName) => {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1500);
};

export const getSafeExportDpi = (dpi) => {
  const parsed = Number(dpi) || PREVIEW_DPI;
  return Math.max(PREVIEW_DPI, parsed);
};
