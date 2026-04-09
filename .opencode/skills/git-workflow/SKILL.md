---
name: git-workflow
description: Git workflow conventions for EcoBosque project
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: github
---

## Commit Conventions

Use clear, descriptive commit messages:
- Start with imperative: "Add", "Fix", "Update", "Remove"
- Keep first line under 72 characters
- Add body for context if needed

## Standard Workflow

```bash
# 1. Check status
git status

# 2. Add changes
git add -A

# 3. Commit with message
git commit -m "Description of changes"

# 4. Push to remote
git push
```

## Branch Strategy

- `main` - Production branch
- Work directly on main for this project
- Always pull before making changes: `git pull`

## Common Commands

### View recent commits
```bash
git log --oneline -5
```

### Check diff
```bash
git diff
```

### Revert uncommitted changes
```bash
git checkout -- .
```

## Commit Message Examples

```
Add checkout request feature with admin bell notification
Fix RoomDetails routing in EcoWeb
Update room names in landing page
Remove unused landing folder
```

## Before Commit Checklist

- [ ] Run `npm run lint` in frontend
- [ ] Test changes work in browser
- [ ] Check no secrets committed