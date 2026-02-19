---
description: 'Testing standards for this project'
applyTo: '**/*.test.*, **/*.spec.*'
---

# Testing Standards

## Test Organization

### Backend (Jest)

Tests in root `tests/` directory:

```
tests/
├── unit/
│   └── stats.test.js
└── integration/
    └── api.test.js
```

### Frontend (Vitest)

Tests alongside components in `packages/web/src/**/__tests__/`:

```
packages/web/src/
  components/
    OpeningCard/
      OpeningCard.tsx
      __tests__/
        OpeningCard.test.tsx
```

## Test Naming

```javascript
describe('calculateWinRate', () => {
  it('returns percentage when given wins and total games', () => {});
  it('throws error when total is 0', () => {});
});
```

## JavaScript (Jest)

```javascript
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('OpeningProcessor', () => {
  let processor;

  beforeEach(() => {
    processor = new OpeningProcessor();
  });

  it('processes opening correctly', async () => {
    const result = await processor.process({ ecoCode: 'E60' });
    expect(result.ecoCode).toBe('E60');
  });

  it('handles errors gracefully', async () => {
    await expect(processor.process(null)).rejects.toThrow();
  });
});
```

## React (Vitest + Testing Library)

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import OpeningCard from "../OpeningCard";

describe("OpeningCard", () => {
  const mockOpening = {
    name: "King's Indian Defense",
    ecoCode: "E60",
  };

  it("renders opening information", () => {
    render(<OpeningCard opening={mockOpening} />);
    expect(screen.getByText("King's Indian Defense")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<OpeningCard opening={mockOpening} onClick={handleClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledWith(mockOpening);
  });
});
```

## Python (pytest)

```python
import pytest

def test_calculate_win_rate():
    assert calculate_win_rate(50, 100) == 50.0

def test_raises_error_for_zero_total():
    with pytest.raises(ValueError, match="total must be greater"):
        calculate_win_rate(10, 0)

@pytest.fixture
def sample_opening():
    return {"eco_code": "E60", "name": "King's Indian"}
```

## Key Principles

1. **Test behavior, not implementation**
2. **Write test first when fixing bugs**
3. **Keep tests independent** - each test runs in isolation
4. **Test edge cases and errors** - not just happy path

## Coverage Goals

- Critical paths: 100%
- Business logic: 90%+
- UI components: 70%+

## Running Tests

```bash
# Backend
npm test

# Frontend
cd packages/web && npm test
```
