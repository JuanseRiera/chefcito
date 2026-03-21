# Plan Next Story — Prompt Template

Use this template to generate a planning prompt for the next unplanned story.
It works with any LLM that has access to the repository files.

---

## Steps

1. Read the global plan to understand the feature, story order, and overall goals.

2. Identify the next story to plan: find the story that has a rough plan but no refined plan yet.

3. Gather context by reading:
   - The rough plan for the next story
   - The most recently completed story's refined plan — use it as the structural template
   - The existing code that the next story will build on
   - Any architecture or design documents relevant to the story

4. Output a ready-to-paste prompt for an external LLM that:
   - States the role and task clearly
   - References files by path instead of inlining their content
   - Lists all tech stack constraints and scope boundaries for the story
   - Specifies the exact output format, matching the structure of previous refined plans
   - Is self-contained enough that the LLM can produce a precise, implementable plan without needing extra context

Output only the prompt text, ready to copy-paste.
