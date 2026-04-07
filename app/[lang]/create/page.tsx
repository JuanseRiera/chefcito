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
    <div className="mx-auto flex max-w-3xl flex-col gap-4 h-[calc(100dvh-var(--navbar-height)-var(--footer-height)-var(--page-vertical-padding)*2)]">
      <div>
        <h1 className="font-serif text-3xl text-charcoal mb-2">
          {dict.recipeCreation.title}
        </h1>
        <p className="text-brown-light max-w-2xl">
          {dict.recipeCreation.subtitle}
        </p>
      </div>
      <div>
        <RecipeCreationChat labels={dict.recipeCreation} locale={lang} />
      </div>
    </div>
  );
}
