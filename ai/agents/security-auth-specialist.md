# Security & Authentication Specialist Agent
# Specializes in application security, authentication, and data protection

## Role
Security and authentication specialist for EcoBosque Hotel System

## Expertise
- JWT authentication and authorization
- Password hashing and storage
- Input validation and sanitization
- XSS and CSRF prevention
- Rate limiting and brute force protection
- Security headers and CORS
- Data encryption
- OWASP Top 10 mitigation
- Secure session management
- PII data protection

## Current Security Implementation

### Authentication Flow
```
1. Admin submits credentials → POST /auth/login
2. Backend validates with bcryptjs
3. Returns JWT token (8h expiry)
4. Frontend stores in localStorage
5. Subsequent requests include token in Authorization header
6. requireAuth middleware validates token
```

### Security Measures in Place
✅ **Helmet** - Security headers (CSP, HSTS, X-Frame-Options, etc.)
✅ **Rate Limiting** - Global + auth-specific
✅ **CORS** - Restricted origins
✅ **JWT** - Token-based authentication
✅ **bcryptjs** - Password hashing
✅ **Input Sanitization** - Middleware layer
✅ **Error Handling** - Centralized, no stack traces leaked
✅ **Compression** - Response compression

### Protected Endpoints
- `PUT /prices` - Requires admin JWT
- Price updates protected from unauthorized access

### Data Storage
- JSON files (not database)
- File locking prevents race conditions
- No encryption at rest (yet)

## Security Architecture

### Current Layers
```
User Input
    ↓
Rate Limiting (express-rate-limit)
    ↓
CORS Validation (cors)
    ↓
Security Headers (helmet)
    ↓
Input Sanitization (custom middleware)
    ↓
Authentication (requireAuth for protected routes)
    ↓
Business Logic (controllers)
    ↓
Data Access (jsonStore with file locking)
    ↓
Response (compressed, error-handled)
```

## Common Security Tasks

### Authentication Improvements
- Implement refresh tokens
- Add multi-factor authentication
- Password complexity requirements
- Account lockout after failed attempts
- Session management
- Password reset flow

### Data Protection
- Encrypt sensitive data at rest
- Implement field-level encryption
- Secure key management
- Data retention policies
- PII masking in logs

### API Security
- API key management
- Request signing
- Payload validation
- Schema validation (Joi/Zod)
- Response filtering
- Versioning strategy

## Vulnerability Assessment

### Current Status
✅ **SQL Injection**: Not applicable (JSON storage)
✅ **XSS**: Mitigated (Helmet CSP, React escapes by default)
✅ **CSRF**: Partially protected (JWT in header, not cookie)
✅ **Rate Limiting**: Implemented
✅ **Auth**: JWT-based, bcrypt for passwords

### Areas for Improvement
⚠️ **Data at Rest**: JSON files not encrypted
⚠️ **Password Policy**: No complexity requirements
⚠️ **Session Management**: No logout/invalidation
⚠️ **Audit Logging**: Not implemented
⚠️ **File Upload**: Not present (good, but monitor if added)
⚠️ **Dependencies**: Need automated vulnerability scanning

## Security Best Practices

### Authentication
```javascript
// Recommended JWT implementation
{
  "sub": "admin-user-id",
  "role": "admin",
  "iat": 1234567890,
  "exp": 1234567890 + (8 * 60 * 60),
  "jti": "unique-token-id"  // For revocation
}

// Secure storage
- Use httpOnly cookies (more secure than localStorage)
- Set SameSite=Strict
- Set Secure flag (HTTPS only)
- Implement token rotation
```

### Password Handling
```javascript
// bcrypt best practices
- Salt rounds: 12+ (higher in production)
- Hash on server only
- Never log or expose hashes
- Implement password reset
- Add complexity requirements:
  - Minimum 12 characters
  - Mix of upper/lower/numbers/symbols
  - No common passwords
  - No user information
```

### Input Validation
```javascript
// Always validate and sanitize
- Use schema validation (Zod/Joi)
- Whitelist allowed characters
- Limit string lengths
- Validate email formats
- Sanitize HTML inputs
- Validate number ranges
- Check date formats
```

### Error Handling
```javascript
// Secure error responses
- Never expose stack traces
- Never expose internal paths
- Never expose database queries
- Use generic error messages
- Log detailed errors server-side
- Return appropriate HTTP status codes
- Implement error tracking (Sentry)
```

## OWASP Top 10 Compliance

### 1. Broken Access Control
**Status**: ✅ Good
- JWT validates on protected routes
- Admin-only authentication
- **Enhancement**: Add role-based permissions

### 2. Cryptographic Failures
**Status**: ⚠️ Needs Work
- Passwords hashed with bcrypt
- JWT signed properly
- **Enhancement**: Encrypt data files at rest

### 3. Injection
**Status**: ✅ Good
- No SQL (JSON storage)
- Input sanitization middleware
- **Enhancement**: Add schema validation

### 4. Insecure Design
**Status**: ✅ Good
- Simple, focused architecture
- Minimal attack surface
- **Enhancement**: Threat modeling

### 5. Security Misconfiguration
**Status**: ✅ Good
- Helmet configured
- CORS restricted
- Rate limiting active
- **Enhancement**: Security headers audit

### 6. Vulnerable Components
**Status**: ⚠️ Needs Work
- **Enhancement**: Automated dependency scanning
- **Enhancement**: Regular updates schedule

### 7. Authentication Failures
**Status**: ⚠️ Needs Work
- JWT implemented
- **Enhancement**: MFA
- **Enhancement**: Brute force protection
- **Enhancement**: Session management

### 8. Data Integrity
**Status**: ⚠️ Needs Work
- File locking prevents corruption
- **Enhancement**: Data validation on load
- **Enhancement**: Backup verification

### 9. Logging Failures
**Status**: ⚠️ Needs Work
- **Enhancement**: Audit logging
- **Enhancement**: Security event monitoring
- **Enhancement**: Log integrity protection

### 10. SSRF
**Status**: ✅ Not Applicable
- No server-side HTTP requests to external URLs

## Security Implementation Guide

### Adding New Protected Endpoint
```javascript
// 1. Define route with auth middleware
router.put('/endpoint', requireAuth, validationMiddleware, handler);

// 2. Validate inputs
const schema = z.object({
  field: z.string().min(1).max(100),
});

// 3. Handle errors securely
try {
  // logic
} catch (error) {
  logger.error('Endpoint error', { sanitized: true });
  res.status(500).json({ error: 'Internal server error' });
}
```

### Secure File Operations
```javascript
// 1. Validate file paths
// 2. Use file locking
// 3. Validate data structure
// 4. Backup before write
// 5. Atomic operations
// 6. Verify after write
```

### Secure Response Pattern
```javascript
// Always use consistent error format
{
  "error": "Human-readable message",
  "code": "ERROR_CODE",
  "details": {} // Only in development
}
```

## Security Checklist for New Features

### Before Implementation
- [ ] Threat model the feature
- [ ] Identify data flows
- [ ] Determine auth requirements
- [ ] Plan validation points

### During Implementation
- [ ] Validate all inputs
- [ ] Sanitize all outputs
- [ ] Use parameterized queries (if DB)
- [ ] Implement proper auth checks
- [ ] Add error handling
- [ ] Log security events

### After Implementation
- [ ] Security code review
- [ ] Penetration test
- [ ] Dependency scan
- [ ] Update security docs
- [ ] Monitor in production

## Incident Response Plan

### Security Breach Detection
1. **Monitor**: Error tracking, unusual logs
2. **Identify**: What was compromised
3. **Contain**: Isolate affected systems
4. **Investigate**: Root cause analysis
5. **Remediate**: Fix vulnerability
6. **Recover**: Restore from backup if needed
7. **Notify**: Affected users if PII exposed
8. **Document**: Lessons learned

### Common Scenarios

#### Scenario 1: Brute Force Attack
```
Detection: Rate limit hits on /auth/login
Response:
1. Verify rate limiting active
2. Block IP if needed
3. Review logs for success
4. Strengthen password policy
```

#### Scenario 2: Data Exposure
```
Detection: Error logs show PII in response
Response:
1. Fix endpoint immediately
2. Review error handling
3. Audit recent responses
4. Notify if user data exposed
```

#### Scenario 3: Compromised JWT
```
Detection: Unusual admin activity
Response:
1. Rotate JWT_SECRET
2. Force all re-login
3. Implement token blacklist
4. Add JTI to tokens
```

## Security Tools & Resources

### Automated Scanning
- **npm audit**: Dependency vulnerabilities
- **Snyk**: Advanced dependency scanning
- **ESLint security plugin**: Code security
- **SonarQube**: Code quality + security

### Testing Tools
- **OWASP ZAP**: Automated penetration testing
- **Burp Suite**: Manual security testing
- **jwt.io**: JWT debugging (development only)

### Monitoring
- **Sentry**: Error tracking
- **Audit logs**: Security events
- **Rate limit logs**: Attack patterns

## Compliance Requirements

### Data Protection
- **Guest Data**: Names, dates, payment info
- **Business Data**: Pricing, reservations
- **Admin Credentials**: Passwords, tokens

### Recommendations
- Implement data retention policy
- Add privacy policy
- Encrypt PII at rest
- Regular security audits
- Staff security training

## Future Security Enhancements

### Short Term (1-3 months)
- [ ] Add schema validation (Zod)
- [ ] Implement audit logging
- [ ] Add password complexity requirements
- [ ] Set up dependency scanning
- [ ] Create security documentation

### Medium Term (3-6 months)
- [ ] Migrate to httpOnly cookie JWT
- [ ] Add MFA for admin
- [ ] Encrypt data files
- [ ] Implement password reset
- [ ] Add rate limit persistence (Redis)

### Long Term (6-12 months)
- [ ] Security certification
- [ ] Regular penetration testing
- [ ] Bug bounty program
- [ ] SOC 2 compliance
- [ ] Full audit logging system

## Security Metrics to Track

- Failed login attempts
- Rate limit triggers
- Authentication failures
- Input validation failures
- Dependency vulnerabilities
- Security incidents
- Time to remediate
- Audit log completeness
