interface Ingredient {
  id: string;
  quantity: number | null;
  unit: string | null;
  name: string;
  category: string | null;
}

interface IngredientListProps {
  ingredients: Ingredient[];
  otherCategoryLabel: string;
}

function formatIngredient(ing: Ingredient): string {
  const parts: string[] = [];
  if (ing.quantity != null) {
    parts.push(
      Number.isInteger(ing.quantity)
        ? ing.quantity.toString()
        : ing.quantity.toFixed(1),
    );
  }
  if (ing.unit) {
    parts.push(ing.unit);
  }
  parts.push(ing.name);
  return parts.join(' ');
}

function groupByCategory(
  ingredients: Ingredient[],
  otherLabel: string,
): Map<string, Ingredient[]> {
  const groups = new Map<string, Ingredient[]>();

  for (const ing of ingredients) {
    const category = ing.category?.trim() || otherLabel;
    const existing = groups.get(category);
    if (existing) {
      existing.push(ing);
    } else {
      groups.set(category, [ing]);
    }
  }

  return groups;
}

export function IngredientList({
  ingredients,
  otherCategoryLabel,
}: IngredientListProps) {
  const groups = groupByCategory(ingredients, otherCategoryLabel);

  return (
    <div className="space-y-4">
      {Array.from(groups.entries()).map(([category, items]) => (
        <div key={category}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gold mb-2">
            {category}
          </h3>
          <ul className="space-y-1">
            {items.map((ing) => (
              <li key={ing.id} className="flex items-start gap-2 text-sm">
                <span className="text-gold mt-1.5 shrink-0">&bull;</span>
                <span className="text-brown">{formatIngredient(ing)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
