import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GripVertical } from 'lucide-react';

export interface DragPayload {
  id: string;
  label: string;
  subLabel?: string;
  kind?: string;
}

export interface DragState<T extends DragPayload> {
  payload: T;
  x: number;
  y: number;
}

interface UseLongPressDragOptions<T extends DragPayload> {
  /** Called with the dragged item and the drop target id (null when dropped on empty space). */
  onDrop: (payload: T, targetId: string | null) => void;
  /** Hold time before a touch drag starts (ms). */
  longPressMs?: number;
  /** Hold time before a mouse drag starts (ms). */
  mouseLongPressMs?: number;
}

const findTargetAt = (x: number, y: number): string | null => {
  const element = document.elementFromPoint(x, y) as HTMLElement | null;
  const target = element?.closest<HTMLElement>('[data-drop-target]');
  return target?.dataset.dropTarget ?? null;
};

/**
 * Pointer-based long-press drag for phones, tablets, and desktop.
 *
 * - Touch / pen: hold ~260ms, then drag; the page does not scroll while dragging.
 * - Mouse: hold briefly (or start moving after the hold), then drag.
 * - Drop zones are any element with a `data-drop-target="id"` attribute.
 * - A floating card follows the finger, and the drop zone under it is reported
 *   through `activeTarget` so screens can highlight it.
 *
 * Attach `startDrag` to a card's `onPointerDown`; simple taps still pass
 * through so click handlers keep working.
 */
export function useLongPressDrag<T extends DragPayload>({
  onDrop,
  longPressMs = 260,
  mouseLongPressMs = 160,
}: UseLongPressDragOptions<T>) {
  const [drag, setDrag] = useState<DragState<T> | null>(null);
  const [activeTarget, setActiveTarget] = useState<string | null>(null);

  const onDropRef = useRef(onDrop);
  useEffect(() => {
    onDropRef.current = onDrop;
  }, [onDrop]);

  const dragRef = useRef<DragState<T> | null>(null);
  const suppressClickRef = useRef(false);
  const activeCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => activeCleanupRef.current?.(), []);

  const startDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>, payload: T, disabled = false) => {
      if (disabled || dragRef.current) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      // Never hijack taps on buttons, links, or form controls inside a card.
      if ((event.target as HTMLElement).closest('button, a, input, select, textarea, label')) return;

      const element = event.currentTarget;
      const pointerId = event.pointerId;
      const startX = event.clientX;
      const startY = event.clientY;
      const isTouch = event.pointerType !== 'mouse';
      let started = false;

      let timer: number | null = null;
      let frame: number | null = null;
      let pendingPoint: { x: number; y: number } | null = null;
      let lastTarget: string | null = null;

      const restoreSelection = () => {
        document.body.style.userSelect = '';
        document.documentElement.style.userSelect = '';
      };

      const preventTouchScroll = (e: TouchEvent) => {
        if (e.cancelable) e.preventDefault();
      };
      const preventContextMenu = (e: Event) => {
        e.preventDefault();
      };
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') cleanup();
      };

      const cleanup = () => {
        if (timer !== null) {
          window.clearTimeout(timer);
          timer = null;
        }
        if (frame !== null) {
          window.cancelAnimationFrame(frame);
          frame = null;
        }
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        window.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('touchmove', preventTouchScroll);
        document.removeEventListener('contextmenu', preventContextMenu, true);
        restoreSelection();
        try {
          if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
        } catch {
          // Pointer may already be gone.
        }
        if (started) {
          dragRef.current = null;
          setDrag(null);
          setActiveTarget(null);
        }
        activeCleanupRef.current = null;
      };

      const updateTarget = (x: number, y: number) => {
        const target = findTargetAt(x, y);
        if (target !== lastTarget) {
          lastTarget = target;
          setActiveTarget(target);
        }
      };

      const flush = () => {
        frame = null;
        if (!pendingPoint) return;
        const current = dragRef.current;
        if (!current) return;
        const next = { ...current, x: pendingPoint.x, y: pendingPoint.y };
        dragRef.current = next;
        setDrag(next);
        updateTarget(next.x, next.y);
      };

      const begin = () => {
        timer = null;
        started = true;
        suppressClickRef.current = true;
        try {
          element.setPointerCapture(pointerId);
        } catch {
          // Some browsers refuse capture for synthetic pointers.
        }

        const initial: DragState<T> = { payload, x: startX, y: startY };
        dragRef.current = initial;
        lastTarget = findTargetAt(startX, startY);
        setDrag(initial);
        setActiveTarget(lastTarget);
        navigator.vibrate?.(12);

        document.body.style.userSelect = 'none';
        document.documentElement.style.userSelect = 'none';
        document.addEventListener('touchmove', preventTouchScroll, { passive: false });
        document.addEventListener('contextmenu', preventContextMenu, true);
      };

      const onMove = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return;
        if (!started) {
          // A finger that starts scrolling cancels the pending long press.
          if (Math.hypot(e.clientX - startX, e.clientY - startY) > 8) cleanup();
          return;
        }
        if (e.cancelable) e.preventDefault();
        pendingPoint = { x: e.clientX, y: e.clientY };
        if (frame === null) frame = window.requestAnimationFrame(flush);
      };

      const onUp = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return;
        const wasDragging = started;
        const dropped = dragRef.current;
        const target = findTargetAt(e.clientX, e.clientY);
        cleanup();
        if (wasDragging && dropped) {
          onDropRef.current(dropped.payload, target);
          window.setTimeout(() => {
            suppressClickRef.current = false;
          }, 350);
        }
      };

      const onCancel = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return;
        cleanup();
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
      };

      activeCleanupRef.current?.();
      activeCleanupRef.current = cleanup;

      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
      window.addEventListener('keydown', onKeyDown);

      timer = window.setTimeout(begin, isTouch ? longPressMs : mouseLongPressMs);
    },
    [longPressMs, mouseLongPressMs]
  );

  /** True for a moment after a drop so the card's click handler does not also fire. */
  const shouldIgnoreClick = useCallback(() => suppressClickRef.current, []);

  return { drag, activeTarget, isDragging: drag !== null, startDrag, shouldIgnoreClick };
}

/** Floating card that follows the pointer while dragging. */
export function DragPreview<T extends DragPayload>({ drag }: { drag: DragState<T> | null }) {
  if (!drag || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed z-[130] pointer-events-none"
      style={{
        left: drag.x,
        top: drag.y,
        transform: 'translate(-50%, -118%)',
        maxWidth: 'min(260px, 80vw)',
      }}
    >
      <div className="flex items-center gap-2 rounded-xl border-2 border-brand bg-white px-3 py-2 shadow-2xl">
        <GripVertical className="w-4 h-4 text-brand shrink-0" />
        <div className="min-w-0">
          {drag.payload.kind && (
            <p className="text-[9px] font-bold uppercase tracking-wider text-brand leading-none">
              {drag.payload.kind}
            </p>
          )}
          <p className="text-xs font-bold text-ink truncate">{drag.payload.label}</p>
          {drag.payload.subLabel && (
            <p className="text-[10px] text-ink-muted truncate">{drag.payload.subLabel}</p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
