# Planning Protocol

**Trigger**: For high-level planning, PRD creation, and feature design

## **Planning Mode Process**
1. **Acknowledge**: Announce entering `Planning Mode`
2. **Create PRD**: Use framework below to structure requirements
3. **Wait for Approval**: Get explicit approval before moving to implementation

## **PRD Structure**
```markdown
# PRD-[ID]: [Feature Name]

## Status & Priority
- Status: [Draft/Review/Ready/✅ Completed]
- Priority: [P0-Critical/P1-High/P2-Medium/P3-Low]  
- Effort: [S/M/L/XL] ([1-2/3-5/8-13/21+] days)

## Problem & Solution
[What problem does this solve and how]

## Success Metrics
[Measurable outcomes that define success]

## User Stories & Acceptance Criteria
[Specific user stories with testable criteria]

## Technical Approach
[High-level implementation strategy, APIs, data flow]

## Dependencies & Risks
[External dependencies and potential blockers]
```

## **Key Principles**
- **Consult Memory Bank**: Check `memory_bank.md` for existing patterns
- **Reference Guidelines**: Security, performance, error handling requirements
- **Stakeholder Alignment**: Validate requirements before implementation
- **Testable Criteria**: All acceptance criteria must be verifiable

## **Completion Protocol**
When implementation finishes:
1. **Archive PRD**: Move to `docs/archive/PRD-[ID]-COMPLETED.md`
2. **Create IMPL doc**: Document implementation in `docs/IMPL-[ID].md`
3. **Update Memory Bank**: Add new patterns and architectural decisions
