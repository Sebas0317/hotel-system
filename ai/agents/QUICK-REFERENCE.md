# Quick Agent Reference Guide

## 🤖 AI Agents Available for EcoBosque Hotel System

### Agent Quick Selection

| What do you need? | Use Agent | File |
|-------------------|-----------|------|
| **React components** | 🎨 Frontend Specialist | `frontend-specialist.md` |
| **API endpoints** | 🔧 Backend Specialist | `backend-specialist.md` |
| **Performance testing** | 🧪 Testing & QA | `testing-qa-specialist.md` |
| **Design improvements** | 🎨 UI/UX Design | `ui-ux-design-specialist.md` |
| **Deployment/CI-CD** | 🚀 DevOps | `devops-infrastructure-specialist.md` |
| **Security review** | 🔒 Security | `security-auth-specialist.md` |

## Common Tasks & Agents

### Building Features
```
New page/component → Frontend Specialist
New API endpoint → Backend Specialist  
User flow design → UI/UX Design Specialist
```

### Testing & Quality
```
Performance audit → Testing & QA Specialist
Accessibility review → UI/UX Design Specialist
Security scan → Security Specialist
Bundle analysis → Frontend Specialist
```

### Deployment & Operations
```
Setup deployment → DevOps Specialist
Configure CI/CD → DevOps Specialist
Add monitoring → DevOps Specialist
SSL/HTTPS setup → Security Specialist
```

### Optimization
```
Improve performance → Testing & QA + Frontend
Reduce bundle size → Frontend Specialist
Optimize API → Backend Specialist
Cache strategy → DevOps + Backend
```

## Running Tests

```bash
# Performance & accessibility audit
npm run audit

# Lint frontend
cd frontend && npm run lint

# Build production
cd frontend && npm run build

# View reports
start lighthouse-reports\*.report.html
```

## Agent Locations

All agents are in: `ai/agents/`

- ✅ `frontend-specialist.md`
- ✅ `backend-specialist.md`
- ✅ `testing-qa-specialist.md`
- ✅ `ui-ux-design-specialist.md`
- ✅ `devops-infrastructure-specialist.md`
- ✅ `security-auth-specialist.md`

## Current Performance

| Category | Score | Status |
|----------|-------|--------|
| ⚡ Performance | 90-92% | ✅ Good |
| ♿ Accessibility | 96% | ✅ Good |
| ✅ Best Practices | 100% | ✅ Excellent |
| 🔍 SEO | 91% | ✅ Good |

## Quick Commands

```bash
# Start development
cd backend && npm run dev        # Backend (port 3001)
cd frontend && npm run dev       # Frontend (port 5173)

# Run audits
npm run audit                    # Performance/a11y/SEO tests

# Build
cd frontend && npm run build     # Production build
```

---
**Need help?** See `ai/agents/README.md` for full documentation
