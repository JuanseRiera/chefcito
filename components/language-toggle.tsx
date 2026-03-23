'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/lib/i18n/locale-context';

export function LanguageToggle() {
  const locale = useLocale();
  const pathname = usePathname();
  const otherLocale = locale === 'en' ? 'es' : 'en';
  const newPath = pathname.replace(`/${locale}`, `/${otherLocale}`);

  return (
    <Link
      href={newPath}
      className="text-brown-light hover:text-burgundy transition-colors text-sm font-medium"
    >
      {locale === 'en' ? 'ES' : 'EN'}
    </Link>
  );
}
