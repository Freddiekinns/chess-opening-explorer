# Error Handling Patterns

**Trigger**: For error-prone operations and resilience requirements

## **Error Handling Principles**
- **Fail fast**: Detect errors early in the process
- **Fail safe**: Graceful degradation when errors occur
- **Provide context**: Clear error messages for debugging
- **Plan recovery**: Every error should have recovery path

## **Input Validation Patterns**
- **Early validation**: Check inputs at API boundaries
- **Clear messages**: Specific error messages for each validation failure
- **Type safety**: Use TypeScript interfaces and runtime validation
- **Sanitization**: Clean and normalize valid inputs

## **External Service Handling**
- **Retry logic**: Exponential backoff for transient failures
- **Circuit breakers**: Stop calling failing services temporarily
- **Fallbacks**: Default values or cached data when services fail
- **Timeouts**: Set reasonable timeouts to prevent hanging

## **Error Propagation**
- **Consistent format**: Standardized error response structure
- **Correlation IDs**: Track requests across services
- **Logging strategy**: Log errors with context, not sensitive data
- **User-friendly**: Hide technical details from end users

## **Recovery Strategies**
- **Graceful degradation**: Reduce functionality rather than complete failure
- **Data persistence**: Save user work before errors occur
- **Manual intervention**: Clear escalation paths for critical failures
- **Health checks**: Monitor system health and auto-recovery
