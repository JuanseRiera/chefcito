# Product Requirements Document: Chefcito

## 1. Introduction

### 1.1 App Name

Chefcito

### 1.2 Purpose

Chefcito is a cooking application designed to simplify the culinary journey for users, especially those getting into cooking. It leverages a multi-agent system with a supervisor pattern and a Retrieval Augmented Generation (RAG) system to provide intelligent assistance in recipe management, personalized meal planning, and dynamic ingredient-based recipe discovery.

### 1.3 Vision

To be the ultimate AI-powered cooking companion, making healthy, varied, and enjoyable home cooking accessible and easy for everyone, adapting to their unique preferences and available ingredients.

## 2. Features

### 2.1 Recipe Extraction and Formatting

- **Description:** Allows users to input a URL of an online recipe. The application will extract the core content (title, ingredients, instructions), categorize ingredients, standardize measurements, and present it in a consistent, easy-to-read format. This process will also generate a "Key Ingredients Only" list and extract nutritional data for immediate use in filling the RAG system. **Crucially, the original recipe URL and, if available, the author's name will also be extracted and saved to give proper credit.**
- **Sub-features:**
  - **Categorize Ingredients:** Automatically group ingredients by type (e.g., dairy, produce, spices, pantry).
  - **Standardize Measurements:** Convert and normalize units to a consistent system (e.g., cups to grams, ml to liters).
  - **Save to Personal Collection:** Extracted and formatted recipes are stored in the user's personal database for later access.
  - **Key Data for RAG:** Generate a concise list of key ingredients and extract relevant nutritional data (based on internal heuristics) during extraction to immediately populate the RAG system's index for that recipe.
  - **Author Attribution:** Extract and store the **original URL and the author's name (if found)** of the recipe for proper credit.

### 2.2 Ingredient-Based Recipe Search (RAG System)

- **Description:** Users can input a list of ingredients they have on hand, and the app will intelligently suggest recipes that can be made with those ingredients. This feature will leverage a Retrieval Augmented Generation (RAG) system for flexible and context-aware recipe matching, utilizing both ingredient and nutritional data from the indexed recipes.
- **Sub-features:**
  - **Vector Database Search:** User-provided ingredients (and potentially desired nutritional profiles) will be vectorized and used to query a vector database containing embeddings of all stored recipes.
  - **Recipe Refinement:** Retrieved recipe candidates will be further processed to identify the best matches and clearly indicate missing ingredients.
  - **Smart Matching:** The system will prioritize recipes that utilize the most available ingredients, while still suggesting viable options even if some ingredients are missing.
  - **Missing Ingredient Indication:** Clearly highlight ingredients still needed for a suggested recipe.

### 2.3 Reduced Content Reminders & Personalization

- **Description:** For recipes the user has cooked or is reviewing, this feature allows users to add personal notes, modify ingredients/steps, assign a rating, and **record the actual cooking time**. Once these personalizations are added, a concise "reduced content" section (a resume with quick recall instructions) is generated to serve as a quick reminder of the key aspects, including the user's unique input. This personalized reduced content and the recorded cooking time will be used to update the recipe's embedding in the RAG system, making future searches more tailored (e.g., "high protein food in less than an hour").
- **Sub-features:**
  - **Personal Notes, Modifications, and Rating Input:** Interface for users to add comments, modify recipe steps/ingredients, and assign a rating.
  - **Cooking Time Input:** Users can enter the actual time it took them to cook the meal.
  - **Brief Cooking Steps for Quick Recall:** Abbreviated, high-level instructions based on the original and user modifications.
  - **Personalized Modifications Summary:** Include a summary of user-added notes on how they adapted the recipe.
  - **Rating/Impressions:** Display the user-assigned rating and brief overall impressions.
  - **RAG System Enhancement:** The personalized reduced content and recorded cooking time will be used to update or enhance the recipe's embedding in the RAG system, making it more discoverable based on user experiences and time preferences.

### 2.4 Weekly Meal Planning

- **Description:** Helps users plan their meals for the week, prioritizing variety, basic nutritional goals, and accommodating dietary preferences. This feature will leverage the RAG system to suggest recipes based on desired nutritional profiles, ingredient availability, and **preferred cooking times**.
- **Sub-features:**
  - **AI Suggestions (Basic):** Suggests meals from the user's saved recipes, prioritizing variety and considering basic nutritional heuristics and preferred cooking times from the RAG system.
  - **Dietary Preferences Integration:** Meal suggestions and planning will dynamically adapt based on user-defined dietary preferences (e.g., vegetarian, vegan, gluten-free), leveraging the RAG system for filtering.
  - **Nutritional Analysis (Basic Heuristics):** Provide basic nutritional estimations for planned meals, drawing on the data indexed in the RAG system.
  - **Grocery List Generation:** Automatically compiles a comprehensive shopping list based on the planned weekly meals, intelligently grouping similar items.

## 3. Future Considerations (Foundations to be laid)

- **Calendar Integration:** An interface for a future Calendar Integration Agent will be designed. This will enable automatic scheduling of meals based on cooking time estimates and user availability in their personal calendar.
- **Ingredient Inventory:** Future expansion to track ingredients users have on hand, suggest recipes based on current stock, and automatically add missing items to a grocery list. This would involve a dedicated agent and data model for inventory management.

## 4. Non-Goals (for initial implementation)

- Real-time external API integration for comprehensive nutritional analysis.
- Complex error recovery or advanced retry mechanisms beyond basic logging and user notification.
- Highly interactive UI/UX features like drag-and-drop meal planning or advanced animations.
- Robust multi-user authentication, authorization, or user management beyond a single-user context.
- Recipe sharing features with other users.
- Cost estimation for meals or grocery lists.
- Voice control integration.
- Shopping list optimization for grocery store routes.

## 5. Success Metrics

- **Successful Recipe Extraction Rate:** Percentage of valid URLs from which recipes are successfully extracted, parsed, and formatted.
- **Accuracy and Relevance of Ingredient-Based Search (RAG):** User satisfaction with recipe suggestions given available ingredients and desired nutritional/time profiles, including the quality of missing ingredient indication.
- **Personalization Engagement:** Rate at which users add notes, modifications, ratings, and cooking times to recipes.
- **User Adoption of Meal Planning:** Frequency of users creating, saving, and utilizing weekly meal plans.
- **Readability and Consistency of Formatted Recipes:** User feedback on the clarity, consistency, and usefulness of presented recipes and their reduced content summaries.
- **Agent Stability:** Low error rate for individual agents and the overall supervisor orchestration.
- **Code Maintainability:** Clean, modular codebase facilitating future feature additions and system expansion.
- **Performance:** Acceptable response times for recipe extraction and ingredient-based search.
