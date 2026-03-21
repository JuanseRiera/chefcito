# API Reference

## POST `/api/recipes/extract`

Extracts a recipe from a given URL using the multi-agent pipeline (fetch, extract, curate) and persists it to the database. The response is streamed as **Server-Sent Events (SSE)** so the client can display real-time progress.

### Request

**Content-Type:** `application/json`

```json
{
  "url": "https://example.com/my-recipe"
}
```

| Field | Type   | Required | Description                               |
| :---- | :----- | :------- | :---------------------------------------- |
| `url` | string | Yes      | A valid URL pointing to a recipe webpage. |

### Response

**Content-Type:** `text/event-stream`

The response is an SSE stream. Each message has an `event` type and a JSON `data` payload. The stream closes automatically after the final event (`result` or `error`).

### SSE Event Types

#### `progress`

Sent as the pipeline advances through each stage.

```
event: progress
data: {"stage":"extracting","message":"Parsing recipe content..."}
```

| Field     | Type   | Description                                                                   |
| :-------- | :----- | :---------------------------------------------------------------------------- |
| `stage`   | string | Current pipeline stage (see [Pipeline Stages](#pipeline-stages) below).       |
| `message` | string | Human-readable description of the current step.                               |
| `attempt` | number | _(Optional)_ Included when `stage` is `retrying`. The current attempt number. |

#### `result`

Sent once on success, after the recipe has been persisted.

```
event: result
data: {"recipe":{"id":"clx...","title":"Pasta Carbonara","ingredients":[...],"instructionSteps":[...]}}
```

| Field    | Type   | Description                                                          |
| :------- | :----- | :------------------------------------------------------------------- |
| `recipe` | object | The persisted recipe including `ingredients` and `instructionSteps`. |

The `recipe` object shape matches the Prisma `Recipe` model with its relations:

```typescript
{
  id: string;
  title: string;
  description: string | null;
  originalUrl: string | null;
  author: string | null;
  isFormatted: boolean;
  servings: number | null;
  prepTime: number | null; // minutes
  cookTime: number | null; // minutes
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  ingredients: Array<{
    id: string;
    recipeId: string;
    quantity: number | null;
    unit: string | null;
    name: string;
    category: string | null;
  }>;
  instructionSteps: Array<{
    id: string;
    recipeId: string;
    stepNumber: number;
    instruction: string;
  }>;
}
```

#### `error`

Sent if the pipeline fails at any point. The stream closes after this event.

```
event: error
data: {"code":"PARSING_FAILED","message":"Could not parse recipe from this URL."}
```

| Field     | Type   | Description                                                          |
| :-------- | :----- | :------------------------------------------------------------------- |
| `code`    | string | Machine-readable error code (see [Error Codes](#error-codes) below). |
| `message` | string | Human-readable error description.                                    |

### Pipeline Stages

| Stage        | Description                                        |
| :----------- | :------------------------------------------------- |
| `fetching`   | Fetching HTML from the provided URL.               |
| `extracting` | LLM is parsing the recipe from the page content.   |
| `curating`   | LLM is reviewing the extracted recipe for quality. |
| `retrying`   | Curation rejected the result; re-extracting.       |
| `persisting` | Saving the approved recipe to the database.        |

### Error Codes

| Code                  | Cause                                             |
| :-------------------- | :------------------------------------------------ |
| `INVALID_INPUT`       | Request body failed validation (bad/missing URL). |
| `PARSING_FAILED`      | LLM could not parse a recipe from the page.       |
| `RATE_LIMITED`        | LLM provider rate limit hit.                      |
| `SERVICE_UNAVAILABLE` | Circuit breaker is open (service degraded).       |
| `INTERNAL_ERROR`      | Unexpected internal error.                        |

### Example

```bash
curl -N -X POST http://localhost:3000/api/recipes/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/pasta-carbonara"}'
```

```
event: progress
data: {"stage":"fetching","message":"Loading recipe from URL..."}

event: progress
data: {"stage":"extracting","message":"Reading recipe details..."}

event: progress
data: {"stage":"curating","message":"Checking recipe quality..."}

event: progress
data: {"stage":"persisting","message":"Saving your recipe..."}

event: result
data: {"recipe":{"id":"clx123","title":"Pasta Carbonara","description":"A classic Roman pasta dish.","ingredients":[...],"instructionSteps":[...]}}
```
