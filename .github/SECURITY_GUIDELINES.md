# Security Guidelines

**Trigger**: For security-sensitive features and SecurityAuditor reviews

## **Security Principles**
- **Never trust user input**: Validate and sanitize all external data
- **Principle of least privilege**: Grant minimum necessary permissions
- **Defense in depth**: Multiple layers of security controls
- **Fail securely**: System should fail to secure state

## **Input Validation**
- **API boundaries**: Validate all request parameters and body data
- **SQL injection**: Use parameterized queries, never string concatenation
- **XSS prevention**: Encode dynamic content, sanitize HTML input
- **File uploads**: Validate file types, scan for malware, limit sizes

## **Authentication & Authorization**
- **Environment variables**: All secrets in env vars, never hardcoded
- **Session management**: Secure tokens, proper expiration, HTTPS only
- **Authorization checks**: Verify permissions for every protected endpoint
- **Password security**: Hash with salt, enforce strong password policies

## **Data Protection**
- **No sensitive logging**: Never log passwords, API keys, PII
- **Encryption**: HTTPS for all communication, encrypt sensitive data at rest
- **CORS policy**: Restrictive CORS settings for production
- **Error messages**: Don't expose internal system details to users

## **Security Checklist**
- [ ] Input validation implemented
- [ ] Parameterized queries used
- [ ] XSS protection in place  
- [ ] Authentication/authorization checks
- [ ] No secrets in code/logs
- [ ] HTTPS enforced
