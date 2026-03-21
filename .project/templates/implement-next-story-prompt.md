# Implement Next Story — Prompt Template

Use this template to generate an implementation prompt for the next story that has
a refined plan but has not been implemented yet.
It works with any LLM or coding agent that has access to the repository files.

---

## Steps

1. Read the global plan to understand the story order and overall goals.

2. Identify the next story to implement: find the story that has a refined plan
   but whose code has not been written yet.

3. Gather context by reading:
   - The refined plan for that story — this is the source of truth for implementation
   - The existing code the story builds on
   - The developer workflow documentation
   - Any architecture or design documents relevant to the story

4. Output a ready-to-paste prompt for a coding LLM or agent that:
   - States the role, task, and strict constraints clearly
   - Points to the refined plan as the primary specification
   - Describes the current project state (tech stack, relevant existing files)
   - Lists explicit step-by-step execution instructions
   - Includes workflow instructions (branching, commits, PR)
   - Is self-contained enough that the agent can implement the story end-to-end
     without needing extra context

Output only the prompt text, ready to copy-paste.
