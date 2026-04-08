import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Geist, Geist_Mono, Playfair_Display } from 'next/font/google';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { DictionaryProvider } from '@/lib/i18n/dictionary-context';
import { LocaleProvider } from '@/lib/i18n/locale-context';
import { hasLocale } from '@/lib/i18n/config';
import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from './dictionaries';
import '../globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  display: 'swap',
});

export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'es' }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return { title: 'Chefcito' };
  const dict = await getDictionary(lang);
  return {
    title: 'Chefcito',
    description: dict.metadata.description,
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang as Locale);

  return (
    <html
      lang={lang}
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-parchment text-brown">
        <DictionaryProvider dictionary={dict}>
          <LocaleProvider locale={lang as Locale}>
            <Navbar dict={dict} lang={lang as Locale} />
            <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-(--page-vertical-padding)">
              {children}
            </main>
            <Footer dict={dict} />
          </LocaleProvider>
        </DictionaryProvider>
      </body>
    </html>
  );
}
