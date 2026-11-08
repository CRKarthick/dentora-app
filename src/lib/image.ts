"use client";

/**
 * Image helpers.
 *
 * Profile pictures are stored inline in the local database as data URLs.
 * Images are reduced before saving to keep both SQLite and localStorage small.
 */

const MAX_DIMENSION = 256;
const JPEG_QUALITY = 0.85;

/**
 * Read an image file and return a square, center-cropped data URL suitable for
 * an avatar. Rejects non-image files.
 */
export async function fileToAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  const source = await loadImage(file);

  // Center-crop to a square so the circular avatar never distorts the photo.
  const side = Math.min(source.width, source.height);
  const sx = (source.width - side) / 2;
  const sy = (source.height - side) / 2;
  const size = Math.min(side, MAX_DIMENSION);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not process the image.");
  }

  context.drawImage(source, sx, sy, side, side, 0, 0, size, size);

  if ("close" in source && typeof source.close === "function") {
    source.close();
  }

  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }

  // Fallback for browsers without createImageBitmap.
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Could not read the image."));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
