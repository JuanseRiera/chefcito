<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Workflow Rules (MANDATORY)

You MUST read and follow [docs/DEVELOPER_WORKFLOW.md](./docs/DEVELOPER_WORKFLOW.md) before performing any coding task.

**Key rules:**
- **Never push directly to `main`.** Always create a feature branch and open a Pull Request.
- **Use conventional commit messages** (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
- **Run `npm run lint` and `npm run build`** before committing. Fix any failures.
- **Create PRs with `gh pr create`** and provide the PR URL to the user.
