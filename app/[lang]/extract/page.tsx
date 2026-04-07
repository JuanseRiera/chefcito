import { notFound } from 'next/navigation';
import { ExtractPageClient } from '@/components/extract-page-client';
import { getDictionary } from '@/app/[lang]/dictionaries';
import { hasLocale } from '@/lib/i18n/config';
import type { Locale } from '@/lib/i18n/config';

export default async function ExtractPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang as Locale);

  return (
    <ExtractPageClient
      extractLabels={dict.extract}
      extractFormLabels={dict.extractForm}
      extractionProgressLabels={dict.extractionProgress}
      extractionResultLabels={dict.extractionResult}
      lang={lang}
    />
  );
}
