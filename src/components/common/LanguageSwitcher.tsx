'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '../../navigation';
import { useTransition, useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const FLAG_EMOJIS = {
    ru: '🇷🇺',
    uz: '🇺🇿',
    en: '🇺🇸'
} as const;

export default function LanguageSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();

    console.log('LanguageSwitcher Render:', { locale, pathname });

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const languages = {
        ru: 'Русский',
        uz: 'O\'zbekcha',
        en: 'English'
    };

    const handleLanguageChange = (nextLocale: string) => {
        setIsOpen(false);
        if (nextLocale === locale) return;

        startTransition(() => {
            router.replace(pathname, { locale: nextLocale });
        });
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={twMerge(
                    "flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 h-11",
                    "bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm",
                    "hover:bg-white hover:border-slate-300",
                    "text-slate-700 font-medium text-sm",
                    "focus:outline-none focus:ring-2 focus:ring-blue-100",
                    isOpen && "ring-2 ring-blue-100 border-blue-300 bg-white"
                )}
                disabled={isPending}
            >
                <span className="text-xl leading-none">{FLAG_EMOJIS[locale as keyof typeof FLAG_EMOJIS]}</span>
                <span className="text-sm font-semibold text-slate-700">{(locale as string).toUpperCase()}</span>
                <ChevronDown
                    size={16}
                    className={clsx("text-slate-400 transition-transform duration-200", isOpen && "rotate-180")}
                />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-white shadow-lg border border-slate-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    {Object.entries(languages).map(([code, label]) => (
                        <button
                            key={code}
                            onClick={() => handleLanguageChange(code)}
                            className={twMerge(
                                "w-full text-left px-4 py-2.5 text-sm flex items-center justify-between gap-3 group transition-colors",
                                locale === code
                                    ? "bg-blue-50 text-blue-700 font-medium"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-lg">{FLAG_EMOJIS[code as keyof typeof FLAG_EMOJIS]}</span>
                                <span>{label}</span>
                            </div>
                            {locale === code && (
                                <Check size={16} className="text-blue-600" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
