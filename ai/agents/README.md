# AI Agents Directory - EcoBosque Hotel System

## Overview
This directory contains specialized AI agent configurations for different aspects of the EcoBosque Hotel System project. Each agent has deep expertise in their domain and can assist with specific tasks.

## Available Agents

### 🎨 Frontend Specialist
**File**: `frontend-specialist.md`

**Expertise**: React, Vite, TailwindCSS, UI components, performance optimization

**When to use**:
- Creating new React components
- Fixing UI bugs
- Optimizing render performance
- Improving accessibility
- Adding new pages/routes
- Refactoring component logic
- Implementing responsive design

**Key files**: `frontend/src/`

---

### 🔧 Backend Specialist
**File**: `backend-specialist.md`

**Expertise**: Node.js, Express, REST API, data management, middleware

**When to use**:
- Creating new API endpoints
- Implementing business logic
- Adding authentication/authorization
- Optimizing data access
- Fixing backend bugs
- Adding middleware
- Improving error handling

**Key files**: `backend/src/`

---

### 🧪 Testing & QA Specialist
**File**: `testing-qa-specialist.md`

**Expertise**: Lighthouse auditing, accessibility testing, performance benchmarking

**When to use**:
- Running performance audits
- Testing accessibility compliance
- Verifying SEO requirements
- Creating test plans
- Setting up automated testing
- Regression testing
- Quality assurance

**Tools**: Lighthouse CI, ESLint, Bundle analyzer

---

### 🎨 UI/UX Design Specialist
**File**: `ui-ux-design-specialist.md`

**Expertise**: User experience, visual design, interaction design, accessibility

**When to use**:
- Improving visual design
- Enhancing user flows
- Creating design systems
- Optimizing mobile experience
- Improving accessibility
- Adding micro-interactions
- Refining color schemes

**Focus**: Nature-inspired, eco-friendly aesthetic, mobile-first

---

### 🚀 DevOps & Infrastructure Specialist
**File**: `devops-infrastructure-specialist.md`

**Expertise**: Deployment, CI/CD, monitoring, scaling, infrastructure optimization

**When to use**:
- Setting up deployment pipelines
- Optimizing build process
- Configuring environments
- Implementing monitoring
- Creating backup strategies
- Setting up CI/CD
- Scaling the application

**Focus**: Docker, GitHub Actions, PM2, Nginx, monitoring

---

### 🔒 Security & Authentication Specialist
**File**: `security-auth-specialist.md`

**Expertise**: Application security, JWT auth, data protection, OWASP compliance

**When to use**:
- Implementing authentication
- Improving security
- Fixing vulnerabilities
- Adding input validation
- Implementing encryption
- Security auditing
- OWASP compliance

**Focus**: JWT, bcrypt, OWASP Top 10, encryption, audit logging

---

## How to Use Agents

### For AI Assistants
When working on a specific task, reference the appropriate agent:

```
@agent frontend-specialist - Create a new room card component
@agent backend-specialist - Add a new endpoint for room analytics
@agent testing-qa-specialist - Run performance audit and analyze results
@agent ui-ux-design-specialist - Improve the booking flow UX
@agent devops-specialist - Set up CI/CD pipeline
@agent security-specialist - Review authentication security
```

### Task Routing Guide

| Task Type | Primary Agent | Supporting Agent |
|-----------|--------------|------------------|
| New UI component | frontend-specialist | ui-ux-design-specialist |
| API endpoint | backend-specialist | security-specialist |
| Performance issue | testing-qa-specialist | frontend-specialist |
| Deployment | devops-specialist | backend-specialist |
| Security review | security-specialist | backend-specialist |
| Accessibility | ui-ux-design-specialist | frontend-specialist |
| Bug fix | Relevant specialist | testing-qa-specialist |

### Agent Collaboration

Complex tasks may require multiple agents:

**Example: Add new booking feature**
1. **ui-ux-design-specialist**: Design the booking flow
2. **frontend-specialist**: Implement booking UI components
3. **backend-specialist**: Create booking API endpoints
4. **security-specialist**: Review authentication and validation
5. **testing-qa-specialist**: Test performance and accessibility
6. **devops-specialist**: Deploy and monitor

## Agent Activation Prompts

### Frontend Specialist
```
Act as the frontend specialist. Focus on:
- React best practices
- Component architecture
- Performance optimization
- Code quality
- ESLint compliance
```

### Backend Specialist
```
Act as the backend specialist. Focus on:
- REST API design
- Business logic
- Data integrity
- Error handling
- Security
```

### Testing & QA Specialist
```
Act as the testing specialist. Focus on:
- Performance metrics
- Accessibility compliance
- Test automation
- Quality assurance
- Benchmarking
```

### UI/UX Design Specialist
```
Act as the UI/UX design specialist. Focus on:
- User experience
- Visual design
- Accessibility
- Mobile-first approach
- Eco-friendly aesthetic
```

### DevOps Specialist
```
Act as the DevOps specialist. Focus on:
- Build optimization
- Deployment strategy
- Monitoring
- Infrastructure
- CI/CD
```

### Security Specialist
```
Act as the security specialist. Focus on:
- Authentication
- Data protection
- OWASP compliance
- Input validation
- Security auditing
```

## Project Context

### Application Overview
- **Name**: EcoBosque Hotel System
- **Hotel**: El Bosque Hotel Boutique (Doradal, Colombia)
- **Type**: Hotel management system + public landing page
- **Users**: Admin staff, hotel guests

### Technology Stack
```
Frontend: React 19 + Vite 8 + TailwindCSS 3
Backend: Node.js 20 + Express 5
Data: JSON files with file locking
Auth: JWT + bcryptjs
Deployment: TBD (currently development)
```

### Current Performance Scores
| Metric | Score |
|--------|-------|
| Performance | 90-92% |
| Accessibility | 96% |
| Best Practices | 100% |
| SEO | 91% |

### Key Directories
```
hotel-system/
├── frontend/src/          # React application
├── backend/src/           # Express API
├── ai/agents/             # This directory
├── lighthouse-reports/    # Performance audit results
└── package.json           # Root configuration
```

## Best Practices for Working with Agents

1. **Be Specific**: Clearly state what you need
2. **Provide Context**: Reference relevant files/features
3. **Set Expectations**: Define success criteria
4. **Review Output**: Verify changes meet standards
5. **Test Thoroughly**: Run tests after changes
6. **Document Decisions**: Update docs if architecture changes

## Agent Development Guidelines

When agents suggest changes, they should:
1. Follow existing code patterns
2. Use project conventions
3. Maintain security standards
4. Consider performance impact
5. Ensure accessibility compliance
6. Document new functionality
7. Provide testing recommendations

## Continuous Improvement

### Agent Updates
- Review and update agent configurations monthly
- Add new expertise as project evolves
- Remove outdated information
- Track common task patterns

### Knowledge Sharing
- Agents should reference project documentation
- Follow conventions in QWEN.md and AGENTS.md
- Update their knowledge based on project changes
- Share learnings across agents

## Future Agent Additions

Potential specialists to add:
- **Database Specialist**: PostgreSQL, Redis, data modeling
- **API Documentation Specialist**: OpenAPI/Swagger
- **Internationalization Specialist**: Multi-language support
- **Analytics Specialist**: User tracking, business metrics
- **Mobile Specialist**: PWA, responsive optimization
- **Content Specialist**: SEO, copywriting, content strategy

## Support

For questions about agent usage or to request new agent types:
1. Check this documentation
2. Review project context (QWEN.md, AGENTS.md)
3. Consult with development team
4. Update agent files as needed

---

**Last Updated**: April 13, 2026
**Version**: 1.0
**Maintained By**: Development Team
