# Final High-Level Architecture Overview: Chefcito

## 1. Introduction
This document outlines the finalized high-level architecture for the "Chefcito" application, a multi-agent cooking assistant designed for a course project. It focuses on the primary components, their interactions, and the underlying technologies, presented without implementation specifics.

## 2. Core Architectural Principles
*   **Modular Design:** Components are loosely coupled to facilitate independent development, testing, and maintenance.
*   **Multi-Agent System:** Leverages a custom-built, supervisor-orchestrated agent system for intelligent and automated task execution.
*   **Retrieval Augmented Generation (RAG):** Integrates a RAG system for intelligent, context-aware, and personalized recipe search and suggestions based on various criteria.
*   **Full-Stack JavaScript (Next.js 16):** Utilizes Next.js 16's App Router for unified frontend and backend development, enabling server components and robust API routes.

## 3. High-Level Components

### 3.1 User Interface (UI)
*   **Technology:** Next.js 16 Frontend (React Components, leveraging Server Components).
*   **Responsibility:** Provides the user-facing application for:
    *   Inputting recipe URLs.
    *   Viewing extracted, formatted, and attributed recipes.
    *   Adding personal notes, modifications, ratings, and recording actual cooking times for recipes.
    *   Planning weekly meals.
    *   Searching recipes based on available ingredients, nutritional profiles, and desired cooking times.
    *   Managing dietary preferences.
*   **Interaction:** Communicates with the Backend API via HTTP/REST.

### 3.2 Backend API & Agent Orchestration
*   **Technology:** Next.js 16 Backend (API Routes/Server Actions).
*   **Responsibility:** Serves as the central hub for:
    *   Handling requests from the UI.
    *   Orchestrating the Multi-Agent System.
    *   Interacting with the Data Services Layer.
    *   Providing API endpoints for all application functionalities.
*   **Interaction:**
    *   Receives requests from UI.
    *   Invokes the Supervisor for agent-driven tasks.
    *   Communicates with Data Services Layer.
    *   Interacts with the RAG System.

### 3.3 Multi-Agent System (MAS)
*   **Core Components:**
    *   **Supervisor:** A custom-built TypeScript module/class responsible for the central orchestration. It receives requests from the Backend API, determines the necessary sequence of agent actions, manages data flow between agents, and handles high-level error reporting. This custom implementation ensures full control and avoids external MAS framework dependencies.
    *   **Agents:** Specialized, independent TypeScript modules/classes, each responsible for a specific, focused task.
        *   **Recipe Extraction & Initial RAG Preparation Agent:** Handles web scraping, content parsing, data formatting (including ingredient categorization, measurement standardization, original URL, and author attribution), and extracts initial RAG data (key ingredients, basic nutritional info) for new recipes.
        *   **Reduced Content & Personalization Agent:** Processes user input (notes, modifications, ratings, actual cooking time), generates a concise "reduced content" summary for quick recall, and prepares this enhanced data for updating RAG embeddings. This agent also acts as a "reviewer" for consolidating recipe information.
        *   **Meal Planning Agent:** Responsible for recipe retrieval (leveraging RAG), plan generation (considering dietary preferences, estimated cooking time from RAG, and nutritional heuristics), grocery list generation.
        *   **Ingredient & Smart Search Agent:** Processes user-provided ingredients (and other search criteria), refines RAG search results, and intelligently presents recipe suggestions, highlighting matched and missing items.
*   **Interaction:**
    *   Agents communicate with the Supervisor.
    *   Agents interact with the Data Services Layer to persist or retrieve data.
    *   Agents interact directly with the RAG System for embedding and retrieval.

### 3.4 Data Services Layer
*   **Technology:** TypeScript modules, leveraging Prisma ORM.
*   **Responsibility:** Provides an abstraction layer for all database interactions. Ensures data consistency and integrity.
*   **Components:** Dedicated services for managing:
    *   Recipes.
    *   User data and preferences.
    *   Meal plans.
    *   Grocery lists.
    *   User-specific recipe notes and personalization.
    *   RAG system interactions (embedding storage, retrieval queries).
*   **Interaction:** Used by the Backend API and various Agents to persist and retrieve application data.

### 3.5 Relational Database (PostgreSQL)
*   **Technology:** PostgreSQL with `pgvector` extension.
*   **Responsibility:**
    *   Stores all structured application data (recipes, users, meal plans, personalized notes, cooking times, original URLs, authors).
    *   Stores vector embeddings for the RAG system directly within PostgreSQL using `pgvector`, simplifying infrastructure.
*   **Interaction:** Accessed exclusively via the Data Services Layer.

### 3.6 Retrieval Augmented Generation (RAG) System
*   **Core Components:**
    *   **Vector Database:** Implemented within PostgreSQL using the `pgvector` extension. This stores numerical vector embeddings of recipes, encompassing ingredients, nutritional data, cooking times, personalized summaries, and other relevant attributes.
    *   **Embedding Model:** An external or internal model responsible for converting various forms of text (e.g., user queries, recipe content, personalized notes) into high-dimensional numerical vector representations suitable for similarity search.
*   **Responsibility:** Enables intelligent, context-aware, and personalized search and retrieval of recipes based on natural language queries and a combination of attributes.
*   **Interaction:**
    *   Agents (e.g., Recipe Extraction, Reduced Content & Personalization) feed processed data to the RAG System for embedding and indexing.
    *   Agents (e.g., Ingredient & Smart Search, Meal Planning) query the RAG System for relevant recipe suggestions based on vectorized user inputs.

## 4. High-Level Data Flow Example (Recipe Extraction & Initial RAG Indexing)
1.  **UI:** User inputs a recipe URL.
2.  **Backend API:** Receives the URL via an API endpoint, invokes the Supervisor.
3.  **Supervisor:** Orchestrates a sequence of agents:
    *   Calls **Recipe Extraction & Initial RAG Preparation Agent** to:
        *   Fetch HTML from the URL.
        *   Parse and format the recipe content (title, ingredients, instructions, original URL, author).
        *   Categorize ingredients and standardize measurements.
        *   Extract initial RAG data (key ingredients list, basic nutritional info).
    *   Calls **Reduced Content & Personalization Agent** to:
        *   Generate an initial "reduced content" summary from the extracted recipe.
        *   Prepare this summary (along with other relevant recipe data like cooking time estimates, if available from initial parsing) for RAG embedding. This agent, in this phase, acts as a "reviewer" of the extracted information for RAG.
    *   Interacts with the **Data Services Layer** to save the fully processed new recipe into PostgreSQL.
    *   Sends the prepared recipe data (including key ingredients, nutritional info, initial reduced content summary, and other attributes) to the **RAG System** for embedding and indexing in `pgvector`.
4.  **Backend API:** Returns success/failure status and the newly created recipe data to the UI.
5.  **UI:** Displays the new recipe to the user.
