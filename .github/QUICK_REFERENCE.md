---
applyTo: "**"
---

# Quick Decision Reference

## 🔄 TDD Workflow Decision Tree
```
New Development Task?
├─ Well-defined CRUD/simple logic → "TDD-Turbo: [task]"
├─ Security-sensitive feature → "TDD-Secure: [task]"  
├─ Complex business logic → "TDD: [task]" (full workflow)
└─ Architecture changes → Check memory_bank.md first
```

## 🧪 Test Strategy Decision Tree
```
External Dependency Present?
├─ YES → Mock required
│   ├─ API/Database → Full mock with error scenarios
│   ├─ File System → In-memory or temp directory
│   └─ Network → Mock with timeout simulation
└─ NO → Direct unit test acceptable
```

## ⚡ Performance Concern Triage
```
Test taking >1 second?
├─ External calls → Add mocks
├─ Large data sets → Use smaller fixtures  
├─ Complex setup → Move to beforeAll
└─ File I/O → Mock or use memory
```

## 🧠 Context Budget Management
```
Context Usage Warning Signs:
├─ File content >1000 lines → Use surgical edits only
├─ Multiple large files → Break into focused tasks
├─ Complex requirements → Create subtasks with clear scope
└─ Architectural changes → Consult memory bank first
```

## 🔧 Tool Selection Guide
```
Need to find code/patterns?
├─ Know exact text → grep_search (fast, low context)
├─ Conceptual search → semantic_search (medium context)
├─ File by name → file_search (fast, low context)
└─ Need full context → read_file (high context impact)
```

## 🧠 Context Efficiency Protocol

### Tool Selection for Context Conservation
| Tool | Use Case | Context Impact | When to Use |
|------|----------|----------------|-------------|
| `semantic_search` | Find relevant code patterns | Medium | Conceptual understanding needed |
| `grep_search` | Find specific strings/patterns | Low | Know exact text to find |
| `file_search` | Find files by name/pattern | Low | Know file naming patterns |
| `read_file` | Read specific file sections | High | Need detailed code context |
| `replace_string_in_file` | Make targeted edits | Low | All code modifications |

### Reading Strategy Best Practices
```
✅ PREFERRED: Large meaningful chunks
read_file(file, startLine: 1, endLine: 100)

❌ AVOID: Multiple small reads  
read_file(file, 1, 10) → read_file(file, 11, 20) → read_file(file, 21, 30)

✅ PREFERRED: Parallel context gathering
- Read multiple related files simultaneously
- Search for patterns across different areas

❌ AVOID: Sequential information gathering
- Read one file, then decide what to read next
```

## 🚨 Error Handling Decision Tree
```
External Service Call?
├─ YES → Implement retry logic, fallbacks, circuit breaker
│   ├─ Critical path → Graceful degradation required
│   ├─ Non-critical → Log and continue
│   └─ User-facing → Friendly error messages
└─ NO → Standard try/catch with meaningful logging
```

## 🏗️ Refactoring Trigger Matrix
```
Code Smell Detected:
├─ Duplication (3+ instances) → Extract method/constant
├─ Long method (>20 lines) → Single Responsibility violation
├─ Complex conditionals → Strategy pattern candidate
└─ Hard dependencies → Dependency injection needed
```

## 🔒 Security Checklist (Quick)
```
Input Processing?
├─ User input → Validate, sanitize, escape
├─ Database query → Use parameterized queries
├─ External API → Validate responses
└─ File operations → Validate paths, sanitize names
```

## 📊 Memory Bank Update Triggers
```
Should update memory_bank.md?
├─ New API endpoints → YES (document contracts)
├─ Architectural decisions → YES (document rationale)
├─ Performance benchmarks → YES (document targets)
├─ Security patterns → YES (document implementation)
└─ Reusable patterns → YES (document for consistency)
```

## 🎯 Mode Selection Guide

### Use TDD-Turbo When:
- Well-defined CRUD operations
- Similar to existing patterns  
- Simple data transformations
- Bug fixes with clear scope
- Repetitive implementations

### Use Standard TDD When:
- New architectural patterns
- Complex business logic
- Security-sensitive features
- External API integrations
- Unclear requirements

### Use TDD-Secure When:
- Authentication/authorization
- User input processing
- Admin interfaces
- Payment/sensitive data
- External integrations
