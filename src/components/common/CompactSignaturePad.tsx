import React, { useRef, useState, useEffect } from 'react';
import { Pen, RotateCcw, Check, Sparkles } from 'lucide-react';

interface CompactSignaturePadProps {
  label: string;
  subLabel?: string;
  value: string;
  onChange: (value: string) => void;
  signerName?: string;
  placeholder?: string;
}

/**
 * Draw-only signature pad. Signatures are captured as a transparent PNG
 * data URL — there is no "type" fallback, so every signature is a real
 * drawn mark that prints cleanly on the official job card and PDF.
 */
export const CompactSignaturePad: React.FC<CompactSignaturePadProps> = ({
  label,
  subLabel,
  value,
  onChange,
  signerName = '',
  placeholder = 'Sign with finger, stylus, or mouse',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const isImageSignature = value.startsWith('data:image/');

  // Initialize canvas scale and restore an existing drawn signature
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#171717';
    ctx.lineWidth = 2.2;

    if (isImageSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasDrawn(true);
      };
      img.src = value;
    }
  }, [value, isImageSignature]);

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.setPointerCapture(e.pointerId);
    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if not captured
    }
    setIsDrawing(false);

    // Save as data URL
    const dataUrl = canvas.toDataURL('image/png');
    onChange(dataUrl);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      }
    }
    setHasDrawn(false);
    onChange('');
  };

  // Quick demo mark so staff can show a signed card on a fresh device.
  const handleSample = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const name = signerName.trim() || 'Feyamet Garage';

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#171717';
    ctx.textBaseline = 'middle';
    ctx.font = 'italic 26px "Segoe Script", "Brush Script MT", cursive';
    ctx.fillText(name, 14, height / 2 - 2, width - 28);

    ctx.strokeStyle = '#171717';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(12, height / 2 + 14);
    ctx.bezierCurveTo(width * 0.3, height / 2 + 6, width * 0.62, height / 2 + 22, width - 12, height / 2 + 10);
    ctx.stroke();

    setHasDrawn(true);
    onChange(canvas.toDataURL('image/png'));
  };

  return (
    <div className="bg-white border border-line rounded-lg p-2.5 space-y-1.5 shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <label className="text-[11px] font-bold text-ink">{label}</label>
          {subLabel && (
            <span className="text-[10px] text-ink-muted font-medium">{subLabel}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <span className="p-1 rounded text-[10px] font-medium flex items-center gap-1 bg-brand text-white">
            <Pen className="w-2.5 h-2.5" />
            <span>Draw</span>
          </span>

          <button
            type="button"
            onClick={handleSample}
            className="p-1 rounded text-[10px] font-medium bg-sand/70 text-ink hover:bg-sand flex items-center gap-0.5 transition"
            title="Fill a sample signature"
          >
            <Sparkles className="w-2.5 h-2.5" />
            <span>Sample</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={!hasDrawn && !value}
            className="p-1 rounded text-[10px] font-medium bg-coral/10 text-brand hover:bg-coral/15 flex items-center gap-0.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
            title="Clear signature"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className="relative border border-line rounded bg-[#FAFAFA] overflow-hidden select-none touch-none">
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          className="w-full h-[82px] cursor-crosshair block"
          style={{ touchAction: 'none' }}
        />
        {/* Baseline guide line */}
        <div className="absolute bottom-3 left-3 right-3 border-b border-line border-dashed pointer-events-none flex items-center justify-between text-[9px] text-ink-muted/70">
          <span className="font-serif italic font-bold">✕ sign here</span>
          {!hasDrawn && !value && (
            <span className="hidden sm:inline">{placeholder}</span>
          )}
        </div>
      </div>

      {/* Signature confirmation footer */}
      <div className="flex items-center justify-between text-[10px] text-ink-muted pt-0.5">
        <span className="truncate">
          {value ? (
            <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>Digital signature recorded</span>
            </span>
          ) : (
            <span className="text-ink-muted/70">
              {signerName ? `Awaiting signature: ${signerName}` : 'Draw a signature above'}
            </span>
          )}
        </span>
        <span className="font-mono text-[9px] text-ink-muted/70">
          feyamet auto garage
        </span>
      </div>
    </div>
  );
};
