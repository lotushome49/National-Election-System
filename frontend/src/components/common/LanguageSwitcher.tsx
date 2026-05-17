import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { cn } from '../../utils/cn';

interface LanguageSwitcherProps {
  /** Visual variant of the switcher */
  variant?: 'sidebar' | 'pill' | 'outline' | 'minimal';
  className?: string;
}

/**
 * Language switcher between English (en) and Amharic (am).
 * Note: Both scripts are LTR — no RTL handling is required.
 */
export function LanguageSwitcher({ variant = 'outline', className }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();

  const toggle = () => {
    const next = i18n.language === 'en' ? 'am' : 'en';
    i18n.changeLanguage(next);
    // Update the HTML lang attribute for accessibility
    document.documentElement.lang = next;
  };

  const label = i18n.language === 'en' ? 'አማርኛ' : 'English';

  if (variant === 'sidebar') {
    return (
      <button
        onClick={toggle}
        className={cn(
          'w-full flex items-center gap-3 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all',
          className,
        )}
      >
        <Globe size={16} />
        {label}
      </button>
    );
  }

  if (variant === 'pill') {
    return (
      <button
        onClick={toggle}
        className={cn(
          'px-3 py-1 rounded-full bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-all',
          className,
        )}
      >
        {label}
      </button>
    );
  }

  if (variant === 'minimal') {
    return (
      <button
        onClick={toggle}
        className={cn(
          'px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100',
          className,
        )}
      >
        {label}
      </button>
    );
  }

  // default: 'outline'
  return (
    <button
      onClick={toggle}
      className={cn(
        'px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all text-[10px] font-black uppercase tracking-widest text-slate-400 border border-slate-100',
        className,
      )}
    >
      {label}
    </button>
  );
}
