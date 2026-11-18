/**
 * Achica una imagen en el navegador antes de subirla: lado mayor de hasta
 * `maxSide` px y WebP (o JPEG si el navegador no lo genera). Las fotos de
 * celular pesan 5–15 MB y Cloudinary rechaza las de más de 10 MB; así quedan
 * en unos cientos de KB sin pérdida visible en la tienda.
 *
 * Si la imagen ya es chica, es un GIF (puede ser animado) o el navegador no la
 * puede decodificar (p. ej. HEIC), se devuelve tal cual.
 */
export async function compressImage(file: File, { maxSide = 2000, quality = 0.85, skipBelowBytes = 700 * 1024 } = {}): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= skipBelowBytes) return file;

    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const toBlob = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    let blob = await toBlob('image/webp');
    if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg');
    if (!blob || blob.size >= file.size) return file;

    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
    const name = file.name.replace(/\.[^.]+$/, '') + '.' + ext;
    return new File([blob], name, { type: blob.type, lastModified: file.lastModified });
  } finally {
    bitmap.close();
  }
}

export const compressImages = (files: File[]) => Promise.all(files.map((f) => compressImage(f)));
