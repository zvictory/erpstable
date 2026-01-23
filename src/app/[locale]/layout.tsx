import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { GlobalKeyboardHandler } from '@/components/GlobalKeyboardHandler';
import { SessionProvider } from 'next-auth/react';
import { BusinessProvider } from '@/contexts/BusinessContext';
import { getBusinessSettings } from '@/app/actions/business';
import type { ModuleKey } from '@/config/modules';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Stable ERP Manual',
    description: 'Manufacturing Management System',
};

export default async function RootLayout({
    children,
    params: { locale }
}: Readonly<{
    children: React.ReactNode;
    params: { locale: string };
}>) {
    const messages = await getMessages({ locale });

    // Get business settings for context initialization
    const settingsResult = await getBusinessSettings();
    const businessSettings = settingsResult.success ? settingsResult.data : null;

    return (
        <html lang={locale}>
            <body className={inter.className}>
                <SessionProvider>
                    <NextIntlClientProvider messages={messages} locale={locale}>
                        <BusinessProvider
                            initialBusinessType={businessSettings?.businessType || null}
                            initialModules={(businessSettings?.enabledModules || []) as ModuleKey[]}
                            initialSetupCompleted={businessSettings !== null}
                        >
                            <GlobalKeyboardHandler />
                            {children}
                        </BusinessProvider>
                    </NextIntlClientProvider>
                </SessionProvider>
            </body>
        </html>
    );
}
