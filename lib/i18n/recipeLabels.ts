interface RecipeMetricLabels {
  servings: string;
  minPrep: string;
  minCook: string;
  ingredients: string;
}

const labels: Record<string, RecipeMetricLabels> = {
  en: {
    servings: 'servings',
    minPrep: 'min prep',
    minCook: 'min cook',
    ingredients: 'ingredients',
  },
  es: {
    servings: 'porciones',
    minPrep: 'min preparación',
    minCook: 'min cocción',
    ingredients: 'ingredientes',
  },
};

export function getRecipeLabels(language: string): RecipeMetricLabels {
  return labels[language] ?? labels.en;
}
