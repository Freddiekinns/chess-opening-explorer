# Dependency Management Protocol

**Trigger**: Before adding any new dependencies to the project

## **Pre-Installation Requirements**
**You must explicitly state and wait for approval:**

1. **Dependency Details**:
   - Package name and exact version
   - Installation scope (dev, prod, peer)
   - License compatibility

2. **Justification**:
   - What problem this dependency solves
   - Why existing solutions won't work
   - Security and maintenance implications

3. **Impact Assessment**:
   - Bundle size impact (frontend)
   - Performance implications (backend)
   - Development workflow changes

## **Security Evaluation**
- Check npm audit and security ratings
- Verify active maintenance (recent commits, responsive maintainers)
- Assess attack surface and potential vulnerabilities
- Document any security trade-offs

## **Alternatives Analysis**
- Document why native/existing solutions won't work
- Consider lighter-weight alternatives
- Evaluate build-from-scratch vs dependency trade-off

**Wait for explicit approval before `npm install`**
