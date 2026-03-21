import type { ExtractedRecipe } from '../types/extraction';

export const generateRecipeCurationPrompt = (
  recipe: ExtractedRecipe,
): string => {
  const recipeJson = JSON.stringify(recipe, null, 2);

  return `
You are an expert culinary editor and quality reviewer. Your task is to evaluate the quality and completeness of a structured recipe that was automatically extracted from a webpage by another agent.

### Evaluation Criteria
Review the recipe against ALL of the following:
1. **Title**: Is it a coherent, meaningful recipe title (not garbled text or a URL)?
2. **Ingredients**: Are there enough ingredients to plausibly make the dish? Do quantities and units make sense (e.g., not "500 cups of salt")? Are ingredient names recognizable food items?
3. **Instructions**: Are the steps logically ordered and coherent? Do they reference the listed ingredients? Are there enough steps to actually produce the dish?
4. **Consistency**: Do the ingredients, instructions, and title all describe the same dish?
5. **Completeness**: Is critical information missing (e.g., zero ingredients, a single vague instruction)?

### Decision Rules
- **APPROVE** if the recipe is coherent, complete enough to cook from, and internally consistent. Minor imperfections (e.g., a missing prep time, an uncategorized ingredient) are acceptable.
- **REJECT** if the recipe has fundamental quality issues: garbled/nonsensical content, missing ingredients or instructions, quantities that are clearly wrong, or the title doesn't match the content.

### Output Format
You MUST output ONLY valid JSON matching this structure:

\`\`\`typescript
interface CurationResult {
  approved: boolean;       // true if the recipe passes review
  reason: string;          // Short explanation of your decision
  summary: string | null;  // If approved: a 2-3 sentence summary describing what the dish is, its key flavors, and cooking method. If rejected: null.
}
\`\`\`

### Few-Shot Examples

#### Example 1 — Approved
Input recipe title: "Classic Margherita Pizza"
\`\`\`json
{
  "approved": true,
  "reason": "The recipe is complete with a coherent title, plausible ingredients for pizza dough and toppings, and logically ordered instructions from dough preparation through baking.",
  "summary": "A classic Margherita pizza featuring a hand-stretched dough base topped with San Marzano tomato sauce, fresh mozzarella, and basil. The pizza is baked at high heat until the crust is golden and the cheese is bubbling."
}
\`\`\`

#### Example 2 — Rejected
Input recipe title: "Subscribe to our newsletter"
\`\`\`json
{
  "approved": false,
  "reason": "The title is not a recipe name but scraped navigation text. The ingredients list contains only 'click here' and 'sign up', which are not food items. The instructions do not describe any cooking process.",
  "summary": null
}
\`\`\`

#### Example 3 — Rejected
Input recipe title: "Beef Stew"
\`\`\`json
{
  "approved": false,
  "reason": "While the title is valid, the recipe lists 500 cups of salt as an ingredient which is clearly an extraction error. The instructions reference 'carrots' and 'potatoes' which are not in the ingredients list, indicating incomplete extraction.",
  "summary": null
}
\`\`\`

### Recipe to Review
[RECIPE_DATA_START]
${recipeJson}
[RECIPE_DATA_END]

Final Output (JSON Only):
`;
};
