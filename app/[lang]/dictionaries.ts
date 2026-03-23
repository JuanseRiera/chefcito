import 'server-only';

const dictionaries = {
  en: () => import('./dictionaries/en.json').then((m) => m.default),
  es: () => import('./dictionaries/es.json').then((m) => m.default),
};

export type Dictionary = Awaited<ReturnType<(typeof dictionaries)['en']>>;
export const getDictionary = async (locale: 'en' | 'es') =>
  dictionaries[locale]();
