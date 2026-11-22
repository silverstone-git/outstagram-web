/** Shrinks heavy photos in the browser before upload: downscales and re-encodes (WebP, else JPEG)
 *  until the file fits `target` bytes or can't get smaller. GIFs, SVGs and videos are returned as-is
 *  (the server compresses images again and enforces the plan limit). */
export async function compressImage(file: File, target = 200_000): Promise<File> {
  if (!file.type.startsWith('image/') || /gif|svg/.test(file.type) || file.size <= target) return file;
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file; // HEIC etc. that this browser can't decode: let the server try
  }
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  const webp = await new Promise<boolean>((r) => { const c = document.createElement('canvas'); c.width = c.height = 1; c.toBlob((b) => r(!!b && b.type === 'image/webp'), 'image/webp'); });
  const type = webp ? 'image/webp' : 'image/jpeg';
  let best: Blob | null = null;
  let edge = Math.min(2048, Math.max(bmp.width, bmp.height));
  for (let round = 0; round < 6; round++) {
    const scale = Math.min(1, edge / Math.max(bmp.width, bmp.height));
    canvas.width = Math.max(1, Math.round(bmp.width * scale));
    canvas.height = Math.max(1, Math.round(bmp.height * scale));
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    for (const q of [0.82, 0.72, 0.62, 0.5]) {
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, type, q));
      if (blob && (!best || blob.size < best.size)) best = blob;
      if (blob && blob.size <= target) { round = 99; break; }
    }
    edge = Math.round(edge * 0.75);
  }
  bmp.close();
  if (!best || best.size >= file.size) return file;
  const name = file.name.replace(/\.[^.]+$/, '') + (webp ? '.webp' : '.jpg');
  return new File([best], name, { type, lastModified: Date.now() });
}

export const formatBytes = (b: number) => (b >= 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1000))} kB`);
