/**
 * Digital stamp assets for official documents.
 *
 * Garages use a physical rubber stamp that gets scanned once. Until the real
 * scan is uploaded, this service renders a blue, scanned-looking Feyamet
 * sample stamp to a transparent PNG so the same image is used on screen,
 * in print and inside exported / shared PDFs.
 */

const SAVED_STAMP_KEY = 'feyamet_stamp_image_v1';
const INK = '#1e40af';
const SIZE = 512;

const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const drawArcText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  centerAngle: number,
  step: number,
  fontSize: number,
  bottom = false
) => {
  const chars = [...text];
  const start = centerAngle - (step * (chars.length - 1)) / 2;
  ctx.save();
  ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  chars.forEach((char, index) => {
    const angle = start + index * step;
    ctx.save();
    ctx.translate(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.rotate(angle + (bottom ? -Math.PI / 2 : Math.PI / 2));
    ctx.fillText(char, 0, 0);
    ctx.restore();
  });
  ctx.restore();
};

const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) => {
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI / 4) * i - Math.PI / 2;
    const r = i % 2 === 0 ? radius : radius * 0.38;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
};

const buildSampleStamp = (): string => {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const random = mulberry32(20261103);
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;

  // Double outer ring
  ctx.lineWidth = 13;
  ctx.beginPath();
  ctx.arc(cx, cy, 234, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 218, 0, Math.PI * 2);
  ctx.stroke();

  drawArcText(ctx, 'FEYAMET AUTO GARAGE', cx, cy, 186, -Math.PI / 2, 0.119, 30);
  drawArcText(ctx, 'ADDIS ABABA · ETHIOPIA', cx, cy, 188, Math.PI / 2, -0.089, 22, true);
  drawStar(ctx, cx - 152, cy + 8, 11);
  drawStar(ctx, cx + 152, cy + 8, 11);

  // Inner content
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 20px Arial, Helvetica, sans-serif';
  ctx.fillText('REPAIR COST', cx, cy - 48);
  ctx.font = 'bold 62px Arial, Helvetica, sans-serif';
  ctx.fillText('ESTIMATE', cx, cy + 4);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx - 104, cy + 34);
  ctx.lineTo(cx + 104, cy + 34);
  ctx.stroke();
  ctx.font = 'bold 19px Arial, Helvetica, sans-serif';
  ctx.fillText('SAMPLE', cx, cy + 58);

  // Ink flecks: uneven pressure like a real stamp on paper
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 260; i += 1) {
    const x = random() * SIZE;
    const y = random() * SIZE;
    ctx.beginPath();
    ctx.arc(x, y, 0.5 + random() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Worn gaps so it reads as a scan, not a perfect vector shape
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 1500; i += 1) {
    const x = random() * SIZE;
    const y = random() * SIZE;
    ctx.globalAlpha = 0.05 + random() * 0.35;
    ctx.beginPath();
    ctx.arc(x, y, 0.4 + random() * 2.3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 60; i += 1) {
    const x = random() * SIZE;
    const y = random() * SIZE;
    ctx.globalAlpha = 0.2 + random() * 0.45;
    ctx.beginPath();
    ctx.arc(x, y, 2 + random() * 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  return canvas.toDataURL('image/png');
};

export class StampService {
  private static sample: string | null = null;

  /** Blue sample stamp used until the garage uploads a scan of its own stamp. */
  static getSampleStamp(): string {
    if (this.sample) return this.sample;
    if (typeof document === 'undefined') return '';
    this.sample = buildSampleStamp();
    return this.sample;
  }

  static getSavedStamp(): string | null {
    try {
      const saved = localStorage.getItem(SAVED_STAMP_KEY);
      return saved && saved.startsWith('data:image/') ? saved : null;
    } catch {
      return null;
    }
  }

  static saveStamp(dataUrl: string) {
    try {
      localStorage.setItem(SAVED_STAMP_KEY, dataUrl);
    } catch {
      // Quota or private mode: the current session still shows the new stamp.
    }
  }

  static clearSavedStamp() {
    try {
      localStorage.removeItem(SAVED_STAMP_KEY);
    } catch {
      // Nothing to clear.
    }
  }

  /**
   * Reads an uploaded stamp scan, keeps transparency where possible and
   * scales it down so it fits comfortably in local storage and in the PDF.
   */
  static normalizeStamp(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read the stamp image.'));
      reader.onload = () => {
        const src = String(reader.result || '');
        if (!src.startsWith('data:image/')) {
          reject(new Error('Unsupported stamp image.'));
          return;
        }
        const image = new Image();
        image.onerror = () => reject(new Error('Could not open the stamp image.'));
        image.onload = () => {
          const maxSide = 600;
          const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas is not available.'));
            return;
          }
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
        };
        image.src = src;
      };
      reader.readAsDataURL(file);
    });
  }
}
