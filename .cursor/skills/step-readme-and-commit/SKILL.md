---
name: step-readme-and-commit
description: >-
  Prefer extremely small increments with minimal code changes; after each change
  update README.md for the current step and end with a suggested git commit
  message and description. Use when implementing increments, finishing a change,
  documenting a step, scoping the next slice, or when the user asks for a commit
  message.
---

# Step README + commit suggestion

## Core rule: extremely small slices

Keep every increment **as small as possible** so people can easily understand it.

- Prefer the **smallest** change that still demonstrates one clear idea
- Make **minimal** edits to existing code — avoid drive-by refactors, extra files, or “while we’re here” features
- One user-visible behavior (or one docs habit) per increment when possible
- If a request is bigger than one easy-to-review slice, **propose the next tiny slice** and wait — do not implement the whole backlog in one go
- Mock before real backends; UI before multiplayer sync; one scenario before many

## When

After **every** completed change in this project (feature increment, bugfix, docs, refactor), before ending the turn:

1. Update [`README.md`](../../README.md) so it matches what exists **now**
2. End the assistant reply with a **Suggested commit** block (do not create the commit unless the user asks)

## README updates

Keep the README aimed at non-technical readers. For the current step, refresh only what changed:

- What this step does (user flow in plain language)
- How we got here / what was cut or deferred (if relevant)
- Which files matter and why
- How to run / try it
- What is **not** in this step
- A short “suggested next increment” if obvious — keep that suggestion tiny too

Do not rewrite the whole README from scratch unless the step is a major reset. Prefer small, accurate edits.

If the repo uses step prototypes under `examples/`, keep those linked and labeled.

## Suggested commit (required at end of reply)

Always include this block at the end of the final response after a change:

```markdown
### Suggested commit

**Subject:** <≤72 chars, imperative, focuses on why>

**Description:**
<1–3 short sentences: what changed and why it matters for this step.
Mention mock vs real backend, UX scope, or docs if relevant.>
```

### Subject style

- Imperative: `Add`, `Document`, `Wire`, not `Added` / `Adds`
- Prefer product language over framework noise when possible
- Examples:
  - `Document Step 1 join-to-stage flow`
  - `Add mock join and create-room screens`
  - `Port Commons prototype styles into Next.js app`

### Description style

- Plain language; fine for non-technical readers to skim
- Note scope limits when useful (“mock API only”, “no voting yet”)
- Do **not** run `git commit` unless the user explicitly asks

## Do not

- Ship a large multi-feature change when a smaller slice would teach the same idea
- Expand scope mid-increment without checking with the user
- Skip the README update because the change “was small”
- Commit automatically
- Invent Step N numbering that contradicts the README
