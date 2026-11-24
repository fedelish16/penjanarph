export async function compressSchoolLogoFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error(
      'Sila pilih fail imej sahaja (PNG, JPG, WebP atau SVG) untuk logo sekolah.'
    );
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Gagal membaca fail logo sekolah.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Fail imej logo tidak dapat diproses.'));
    image.src = rawDataUrl;
  });

  const maxSide = 180;
  const srcW = img.naturalWidth || img.width || 120;
  const srcH = img.naturalHeight || img.height || 120;
  const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
  const targetW = Math.max(24, Math.round(srcW * scale));
  const targetH = Math.max(24, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Pelayar tidak menyokong pemprosesan imej kanvas.');
  }
  ctx.clearRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);

  // Preserve transparency via PNG first; fallback to JPEG if PNG exceeds 75KB
  const pngUrl = canvas.toDataURL('image/png');
  if (pngUrl.length <= 75_000) {
    return pngUrl;
  }

  // White background before JPEG fallback
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export async function decodeDataUrlForDocx(dataUrl: string): Promise<{
  data: Uint8Array;
  width: number;
  height: number;
  type: 'png' | 'jpg';
} | null> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return null;
  }

  const match = /^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;

  const mimeSubtype = match[1].toLowerCase();
  const base64 = match[2];

  // Ensure PNG or JPG bytes for docx ImageRun
  let finalDataUrl = dataUrl;
  let imgType: 'png' | 'jpg' =
    mimeSubtype === 'jpeg' || mimeSubtype === 'jpg' ? 'jpg' : 'png';

  const img = await new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = dataUrl;
  });

  if (!img) return null;

  const natW = img.naturalWidth || 120;
  const natH = img.naturalHeight || 120;
  const maxPrintPx = 56;
  const ratio = Math.min(1, maxPrintPx / Math.max(natW, natH));
  const width = Math.max(24, Math.round(natW * ratio));
  const height = Math.max(24, Math.round(natH * ratio));

  if (mimeSubtype !== 'png' && mimeSubtype !== 'jpeg' && mimeSubtype !== 'jpg') {
    const canvas = document.createElement('canvas');
    canvas.width = natW;
    canvas.height = natH;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, natW, natH);
      finalDataUrl = canvas.toDataURL('image/png');
      imgType = 'png';
    }
  }

  const finalBase64 = finalDataUrl.split(',')[1] || base64;
  const binary = atob(finalBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return {
    data: bytes,
    width,
    height,
    type: imgType,
  };
}
