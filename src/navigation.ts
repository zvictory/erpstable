import { createNavigation } from 'next-intl/navigation';

export const locales = ['ru', 'uz', 'en'] as const;
export const { Link, redirect, usePathname, useRouter } =
    createNavigation({ locales, localePrefix: 'always' });
