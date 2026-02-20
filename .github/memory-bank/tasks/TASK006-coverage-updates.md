# [TASK006] - Coverage Updates (Backend + Frontend)

**Status:** Pending  
**Added:** 2026-02-20  
**Updated:** 2026-02-20

## Context

Backend coverage currently falls far below the configured 90% global thresholds.
Frontend coverage is now reported but sits around the mid-50% range. We need to
increase coverage for critical paths on both sides without regressing behavior.

## Goals

- Raise backend Jest coverage to meet or approach the 90% global thresholds.
- Raise frontend Vitest coverage toward the 70%+ UI target.
- Keep runtime behavior unchanged.

## Proposed Plan

1. **Backend**
   - Identify lowest-covered routes and services.
   - Add focused unit tests for edge cases and error paths.
   - Reduce reliance on integration tests for simple logic.

2. **Frontend**
   - Add targeted tests for low-coverage pages/components.
   - Prioritize user-critical flows (search, opening detail, practice mode).

## Acceptance Criteria

1. Backend coverage meets or exceeds 90% thresholds for statements, branches,
   functions, and lines.
2. Frontend coverage reaches 70%+ overall lines/statements.
3. No existing behavior regresses and all tests pass.

## Notes

Coverage reports are generated via:
- Backend: `npm run test:coverage`
- Frontend: `cd packages/web && npx vitest run --coverage`
