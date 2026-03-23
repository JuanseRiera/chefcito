'use client';

import { createContext, useContext } from 'react';
import type { Dictionary } from '@/app/[lang]/dictionaries';

const DictionaryContext = createContext<Dictionary | null>(null);

export function DictionaryProvider({
  dictionary,
  children,
}: {
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  return (
    <DictionaryContext.Provider value={dictionary}>
      {children}
    </DictionaryContext.Provider>
  );
}

export function useDictionary(): Dictionary {
  const dict = useContext(DictionaryContext);
  if (!dict)
    throw new Error('useDictionary must be used within a DictionaryProvider');
  return dict;
}
