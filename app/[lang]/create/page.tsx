import { notFound } from 'next/navigation';
import { RecipeCreationChat } from '@/components/recipe-creation-chat';
import { getDictionary } from '@/app/[lang]/dictionaries';
import { hasLocale } from '@/lib/i18n/config';
import type { Locale } from '@/lib/i18n/config';

export default async function CreateRecipePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang as Locale);

  return (
    <div className="max-w-xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
      <h1 className="font-serif text-3xl text-charcoal mb-1">
        {dict.recipeCreation.title}
      </h1>
      <p className="text-brown-light mb-6 text-sm">
        {dict.recipeCreation.subtitle}
      </p>
      <div className="flex-1 flex flex-col min-h-0">
        <RecipeCreationChat labels={dict.recipeCreation} locale={lang} />
      </div>
    </div>
  );
}
