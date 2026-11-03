export interface GeneratedPdf {
  blob: Blob;
  filename: string;
}

export interface ShareFileInput extends GeneratedPdf {
  title: string;
  text: string;
}

/**
 * Sharing for locally generated documents. There is no public document URL,
 * so the PDF itself is handed to the device share sheet (Telegram, WhatsApp,
 * email...) when the browser supports it. Otherwise the caller falls back to
 * Telegram text share, copying the document details, or a plain download.
 */
export class ShareService {
  static async shareFile(input: ShareFileInput): Promise<'shared' | 'unsupported'> {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
      return 'unsupported';
    }

    const file = new File([input.blob], input.filename, { type: 'application/pdf' });
    const data: ShareData = {
      title: input.title,
      text: input.text,
      files: [file],
    };

    if (typeof navigator.canShare === 'function' && !navigator.canShare(data)) {
      return 'unsupported';
    }

    await navigator.share(data);
    return 'shared';
  }

  static openTelegram(text: string) {
    const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
    const url = `https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  static async copy(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fall through to the legacy copy path
    }

    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(area);
      return copied;
    } catch {
      return false;
    }
  }

  static download(pdf: GeneratedPdf) {
    const url = URL.createObjectURL(pdf.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = pdf.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}
