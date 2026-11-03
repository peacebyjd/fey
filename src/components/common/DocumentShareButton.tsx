import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Loader2, Send, Share2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { GeneratedPdf, ShareService } from '../../services/shareService';

interface DocumentShareButtonProps {
  /** Document name shown in the menu. */
  title: string;
  /** Short details copied or shared with the document. */
  text: string;
  /** Builds the document on demand so nothing is generated on render. */
  getPdf: () => GeneratedPdf;
}

type ShareStatus = 'idle' | 'working' | 'shared' | 'copied' | 'downloaded' | 'error';

export const DocumentShareButton: React.FC<DocumentShareButtonProps> = ({ title, text, getPdf }) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<ShareStatus>('idle');
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const flash = (next: ShareStatus) => {
    setStatus(next);
    window.setTimeout(() => setStatus('idle'), 2600);
  };

  const handleShare = async (channel: 'device' | 'telegram' | 'copy') => {
    setIsOpen(false);
    setStatus('working');
    try {
      const pdf = getPdf();

      if (channel === 'copy') {
        const copied = await ShareService.copy(`${title}\n${text}\n${pdf.filename}`);
        flash(copied ? 'copied' : 'error');
        return;
      }

      const outcome = await ShareService.shareFile({ ...pdf, title, text });
      if (outcome === 'shared') {
        flash('shared');
        return;
      }

      if (channel === 'telegram') {
        ShareService.openTelegram(`${title}\n${text}`);
        setStatus('idle');
        return;
      }

      // No file sharing support here: keep the document moving by downloading it.
      ShareService.download(pdf);
      flash('downloaded');
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        setStatus('idle');
        return;
      }
      flash('error');
    }
  };

  const statusLabel =
    status === 'copied'
      ? t('share.copied')
      : status === 'shared'
      ? t('share.shared')
      : status === 'downloaded'
      ? t('share.downloaded')
      : status === 'error'
      ? t('share.failed')
      : t('share.button');

  return (
    <div ref={wrapperRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        title={statusLabel}
        aria-label={statusLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`h-8 w-8 flex items-center justify-center rounded-lg border transition cursor-pointer ${
          status === 'shared' || status === 'copied' || status === 'downloaded'
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
            : 'border-line bg-white text-ink-muted hover:text-brand hover:bg-sand/50'
        }`}
      >
        {status === 'working' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : status === 'shared' || status === 'copied' || status === 'downloaded' ? (
          <Check className="w-4 h-4" />
        ) : (
          <Share2 className="w-4 h-4" />
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1.5 z-[80] w-60 rounded-xl border border-line bg-white shadow-2xl p-1.5 text-left"
        >
          <p className="px-2 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">
            {t('share.menuTitle')}
          </p>
          <button
            type="button"
            role="menuitem"
            onClick={() => handleShare('device')}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-semibold text-ink hover:bg-sand/60 cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-brand shrink-0" />
            <span className="flex-1">{t('share.device')}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => handleShare('telegram')}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-semibold text-ink hover:bg-sand/60 cursor-pointer"
          >
            <Send className="w-4 h-4 text-brand shrink-0" />
            <span className="flex-1">{t('share.telegram')}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => handleShare('copy')}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-semibold text-ink hover:bg-sand/60 cursor-pointer"
          >
            <Copy className="w-4 h-4 text-brand shrink-0" />
            <span className="flex-1">{t('share.copy')}</span>
          </button>
        </div>
      )}

      <span className="sr-only" role="status" aria-live="polite">
        {status !== 'idle' ? statusLabel : ''}
      </span>
    </div>
  );
};
