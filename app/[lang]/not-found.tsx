'use client';

import { LinkButton } from '@/components/ui/button';
import { useDictionary } from '@/lib/i18n/dictionary-context';
import { useLocale } from '@/lib/i18n/locale-context';

export default function NotFound() {
  const dict = useDictionary();
  const lang = useLocale();

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="font-serif text-3xl text-charcoal mb-4">
        {dict.notFound.title}
      </h1>
      <p className="text-brown-light mb-8 max-w-md">
        {dict.notFound.description}
      </p>
      <LinkButton href={`/${lang}/`} variant="outline">
        {dict.notFound.backHome}
      </LinkButton>
    </div>
  );
}
