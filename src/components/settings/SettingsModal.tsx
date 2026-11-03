import React, { useEffect } from 'react';
import { Check, Globe2, Settings, UserCheck, X } from 'lucide-react';
import { Language, User } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
}

const LANGUAGE_OPTIONS: { id: Language; labelKey: string; sample: string }[] = [
  { id: 'am', labelKey: 'settings.amharic', sample: 'የስራ ሰሌዳ · ፋይናንስ · መጋዘን' },
  { id: 'en', labelKey: 'settings.english', sample: 'Task Board · Finance · Store' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const { language, setLanguage, t } = useLanguage();

  // Close on Escape and keep the page behind the dialog from scrolling.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const roleLabel = (role: User['role']) => {
    switch (role) {
      case 'admin':
        return t('header.roleAdmin');
      case 'reception':
        return t('header.roleRecorder');
      case 'finance':
        return t('header.roleFinance');
      case 'manager':
        return t('header.roleManager');
      case 'storekeeper':
        return t('header.roleStorekeeper');
      default:
        return role;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative w-full sm:max-w-xl bg-cream rounded-t-2xl sm:rounded-2xl shadow-2xl border border-line max-h-[92dvh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 bg-white border-b border-line px-4 sm:px-6 py-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center shrink-0 shadow-soft">
              <Settings className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="settings-title" className="text-base sm:text-lg font-extrabold text-ink leading-tight">
                {t('settings.title')}
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">{t('settings.description')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target shrink-0 flex items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-sand/60 transition cursor-pointer"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto smooth-scroll">
          <div className="p-4 sm:p-6 space-y-4">
            {/* Language preference */}
            <section
              aria-labelledby="settings-language-heading"
              className="bg-white border border-line rounded-2xl p-4 space-y-3.5"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                  <Globe2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 id="settings-language-heading" className="text-sm font-bold text-ink">
                    {t('settings.language')}
                  </h3>
                  <p className="text-xs text-ink-muted leading-relaxed mt-0.5">
                    {t('settings.languageDescription')}
                  </p>
                </div>
              </div>

              <div
                role="radiogroup"
                aria-labelledby="settings-language-heading"
                className="grid gap-2.5 sm:grid-cols-2"
              >
                {LANGUAGE_OPTIONS.map((option) => {
                  const selected = language === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setLanguage(option.id)}
                      className={`group text-left rounded-xl border p-3 transition cursor-pointer ${
                        selected
                          ? 'border-brand bg-sand/60 ring-2 ring-brand/15'
                          : 'border-line bg-white hover:border-brand/40 hover:bg-cream/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold text-ink">
                              {t(option.labelKey)}
                            </span>
                            {option.id === 'am' && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand text-white">
                                {t('settings.defaultBadge')}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-ink-muted mt-1 truncate">
                            {option.sample}
                          </p>
                        </div>
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition ${
                            selected
                              ? 'bg-brand text-white'
                              : 'border border-line text-transparent group-hover:border-brand/40'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {t('settings.instantHint')}
              </p>
            </section>

            {/* Signed-in account */}
            {currentUser && (
              <section
                aria-labelledby="settings-account-heading"
                className="bg-white border border-line rounded-2xl p-4 space-y-3.5"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sand text-brand flex items-center justify-center shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 id="settings-account-heading" className="text-sm font-bold text-ink">
                      {t('settings.account')}
                    </h3>
                    <p className="text-xs text-ink-muted mt-0.5">{t('settings.accountHint')}</p>
                  </div>
                </div>

                <dl className="rounded-xl border border-line divide-y divide-line overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                    <dt className="text-xs text-ink-muted">{t('settings.name')}</dt>
                    <dd className="text-xs font-semibold text-ink truncate">{currentUser.name}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                    <dt className="text-xs text-ink-muted">{t('settings.role')}</dt>
                    <dd className="text-xs font-semibold text-ink">{roleLabel(currentUser.role)}</dd>
                  </div>
                  {currentUser.email && (
                    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                      <dt className="text-xs text-ink-muted">{t('settings.email')}</dt>
                      <dd className="text-xs font-medium text-ink-muted truncate">
                        {currentUser.email}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 bg-white border-t border-line px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <span className="hidden sm:block text-[11px] text-ink-muted">
            {t('settings.technicalFallback')}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition cursor-pointer shadow-soft"
          >
            {t('settings.done')}
          </button>
        </div>
      </div>
    </div>
  );
};
