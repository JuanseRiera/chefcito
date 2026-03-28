'use client';

import { RecipeCreationChat } from '@/components/recipe-creation-chat';
import { useDictionary } from '@/lib/i18n/dictionary-context';

export default function CreateRecipePage() {
  const dict = useDictionary();

  return (
    <div className="max-w-xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
      <h1 className="font-serif text-3xl text-charcoal mb-1">
        {dict.recipeCreation.title}
      </h1>
      <p className="text-brown-light mb-6 text-sm">
        {dict.recipeCreation.subtitle}
      </p>
      <div className="flex-1 flex flex-col min-h-0">
        <RecipeCreationChat />
      </div>
    </div>
  );
}
