---
description: "Testing standards and best practices for all code"
applyTo: "**/*.test.*, **/*.spec.*, **/tests/**"
---

# Testing Standards

## Testing Philosophy

- **Test behavior, not implementation**: Focus on what the code does, not how it does it
- **Write tests first when fixing bugs**: Reproduce the bug with a test, then fix it
- **Keep tests simple and readable**: Tests are documentation
- **Test edge cases and error conditions**: Don't just test the happy path
- **Make tests independent**: Each test should run in isolation

## Test Organization

### File Structure

```
src/
  components/
    OpeningCard/
      OpeningCard.jsx
      OpeningCard.test.jsx
      OpeningCard.module.css
  utils/
    stats.js
    stats.test.js
```

### Test Naming

```javascript
// Good: Descriptive test names
describe("calculateWinRate", () => {
  it("returns percentage when given wins and total games", () => {});
  it("returns 0 when wins is 0", () => {});
  it("throws error when total is 0", () => {});
  it("handles floating point precision correctly", () => {});
});

// Bad: Vague test names
describe("calculateWinRate", () => {
  it("works", () => {});
  it("test 1", () => {});
});
```

## JavaScript Testing (Jest)

### Basic Structure

```javascript
import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { calculateWinRate, formatEcoCode } from "./utils.js";

describe("Chess Opening Utils", () => {
  describe("calculateWinRate", () => {
    it("calculates win rate as percentage", () => {
      const result = calculateWinRate(50, 100);
      expect(result).toBe(50);
    });

    it("handles zero wins", () => {
      const result = calculateWinRate(0, 100);
      expect(result).toBe(0);
    });

    it("throws error for zero total games", () => {
      expect(() => calculateWinRate(10, 0)).toThrow(
        "total must be greater than zero",
      );
    });
  });

  describe("formatEcoCode", () => {
    it("formats ECO code correctly", () => {
      expect(formatEcoCode("e60")).toBe("E60");
      expect(formatEcoCode("B20")).toBe("B20");
    });

    it("throws error for invalid ECO code", () => {
      expect(() => formatEcoCode("X99")).toThrow("Invalid ECO code");
    });
  });
});
```

### Async Testing

```javascript
describe("fetchOpeningData", () => {
  it("fetches opening data successfully", async () => {
    const data = await fetchOpeningData("E60");

    expect(data).toBeDefined();
    expect(data.ecoCode).toBe("E60");
    expect(data.name).toBeTruthy();
  });

  it("handles API errors gracefully", async () => {
    await expect(fetchOpeningData("INVALID")).rejects.toThrow(
      "Failed to fetch opening",
    );
  });

  it("retries on network failure", async () => {
    // Mock implementation that fails twice then succeeds
    const mockFetch = jest
      .fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({ data: "success" });

    const result = await fetchWithRetry(mockFetch);

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ data: "success" });
  });
});
```

### Mocking

```javascript
import { jest } from "@jest/globals";

describe("OpeningProcessor", () => {
  let mockFetcher;
  let processor;

  beforeEach(() => {
    // Create mock
    mockFetcher = {
      fetch: jest.fn(),
    };

    processor = new OpeningProcessor(mockFetcher);
  });

  it("processes opening with fetched data", async () => {
    // Setup mock return value
    mockFetcher.fetch.mockResolvedValue({
      name: "King's Indian Defense",
      ecoCode: "E60",
    });

    const result = await processor.process("E60");

    // Verify mock was called correctly
    expect(mockFetcher.fetch).toHaveBeenCalledWith("E60");
    expect(mockFetcher.fetch).toHaveBeenCalledTimes(1);

    // Verify result
    expect(result.ecoCode).toBe("E60");
  });
});
```

## React Testing (React Testing Library)

### Component Testing

```javascript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import OpeningCard from "./OpeningCard";

describe("OpeningCard", () => {
  const mockOpening = {
    name: "King's Indian Defense",
    ecoCode: "E60",
    moves: ["d4", "Nf6", "c4", "g6"],
    popularity: 0.15,
  };

  it("renders opening information", () => {
    render(<OpeningCard opening={mockOpening} />);

    expect(screen.getByText("King's Indian Defense")).toBeInTheDocument();
    expect(screen.getByText("E60")).toBeInTheDocument();
    expect(screen.getByText(/15%/)).toBeInTheDocument();
  });

  it("calls onClick handler when clicked", () => {
    const handleClick = jest.fn();

    render(<OpeningCard opening={mockOpening} onClick={handleClick} />);

    fireEvent.click(screen.getByRole("button"));

    expect(handleClick).toHaveBeenCalledWith(mockOpening);
  });

  it("shows loading state", () => {
    render(<OpeningCard opening={mockOpening} isLoading={true} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
```

### Testing Hooks

```javascript
import { renderHook, act } from "@testing-library/react";
import { useOpeningData } from "./useOpeningData";

describe("useOpeningData", () => {
  it("fetches opening data on mount", async () => {
    const { result } = renderHook(() => useOpeningData("E60"));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data.ecoCode).toBe("E60");
  });

  it("handles errors", async () => {
    const { result } = renderHook(() => useOpeningData("INVALID"));

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.data).toBeNull();
  });
});
```

## Python Testing (pytest)

### Basic Structure

```python
import pytest
from lib.stats import calculate_win_rate, format_eco_code

class TestCalculateWinRate:
    """Tests for calculate_win_rate function."""

    def test_calculates_percentage(self):
        """Test basic win rate calculation."""
        assert calculate_win_rate(50, 100) == 50.0
        assert calculate_win_rate(25, 100) == 25.0

    def test_handles_zero_wins(self):
        """Test with zero wins."""
        assert calculate_win_rate(0, 100) == 0.0

    def test_handles_perfect_score(self):
        """Test with all wins."""
        assert calculate_win_rate(100, 100) == 100.0

    def test_raises_error_for_zero_total(self):
        """Test error handling for invalid input."""
        with pytest.raises(ValueError, match="total must be greater than zero"):
            calculate_win_rate(10, 0)

    def test_raises_error_for_negative_values(self):
        """Test error handling for negative values."""
        with pytest.raises(ValueError):
            calculate_win_rate(-10, 100)

class TestFormatEcoCode:
    """Tests for format_eco_code function."""

    @pytest.mark.parametrize("input_code,expected", [
        ("e60", "E60"),
        ("B20", "B20"),
        ("a00", "A00"),
    ])
    def test_formats_correctly(self, input_code, expected):
        """Test ECO code formatting."""
        assert format_eco_code(input_code) == expected

    @pytest.mark.parametrize("invalid_code", [
        "X99",
        "E999",
        "AB0",
        "",
    ])
    def test_rejects_invalid_codes(self, invalid_code):
        """Test validation of invalid ECO codes."""
        with pytest.raises(ValueError, match="Invalid ECO code"):
            format_eco_code(invalid_code)
```

### Fixtures

```python
import pytest
from pathlib import Path
from lib.data_fetcher import DataFetcher

@pytest.fixture
def sample_opening():
    """Provide sample opening data for tests."""
    return {
        'id': 'e60',
        'name': "King's Indian Defense",
        'eco_code': 'E60',
        'moves': ['d4', 'Nf6', 'c4', 'g6']
    }

@pytest.fixture
def temp_data_dir(tmp_path):
    """Create temporary data directory."""
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    return data_dir

@pytest.fixture
def data_fetcher(temp_data_dir):
    """Create DataFetcher instance with temp directory."""
    return DataFetcher(data_dir=temp_data_dir)

def test_save_opening(data_fetcher, sample_opening, temp_data_dir):
    """Test saving opening to file."""
    data_fetcher.save_opening(sample_opening)

    output_file = temp_data_dir / "e60.json"
    assert output_file.exists()

    # Verify content
    import json
    with output_file.open() as f:
        saved = json.load(f)

    assert saved['eco_code'] == 'E60'
```

### Async Testing

```python
import pytest
from lib.api import fetch_opening_data

@pytest.mark.asyncio
async def test_fetch_opening_data():
    """Test async data fetching."""
    data = await fetch_opening_data('E60')

    assert data is not None
    assert data['eco_code'] == 'E60'

@pytest.mark.asyncio
async def test_fetch_handles_errors():
    """Test error handling in async function."""
    with pytest.raises(APIError):
        await fetch_opening_data('INVALID')
```

### Mocking

```python
from unittest.mock import Mock, patch, MagicMock
import pytest

def test_with_mock():
    """Test using mock objects."""
    mock_fetcher = Mock()
    mock_fetcher.fetch.return_value = {'eco_code': 'E60'}

    processor = OpeningProcessor(mock_fetcher)
    result = processor.process('E60')

    mock_fetcher.fetch.assert_called_once_with('E60')
    assert result['eco_code'] == 'E60'

@patch('lib.api.requests.get')
def test_with_patch(mock_get):
    """Test using patch decorator."""
    mock_response = Mock()
    mock_response.json.return_value = {'eco_code': 'E60'}
    mock_response.status_code = 200
    mock_get.return_value = mock_response

    result = fetch_from_api('E60')

    assert result['eco_code'] == 'E60'
    mock_get.assert_called_once()
```

## Test Coverage

### Measuring Coverage

```bash
# JavaScript (Jest)
npm test -- --coverage

# Python (pytest with coverage)
pytest --cov=lib --cov-report=html
```

### Coverage Goals

- **Critical paths**: 100% coverage
- **Business logic**: 90%+ coverage
- **Utilities**: 80%+ coverage
- **UI components**: 70%+ coverage

### What to Test

**Always Test:**

- Public APIs and interfaces
- Business logic and calculations
- Error handling and edge cases
- Data validation
- Critical user flows

**Consider Testing:**

- Complex algorithms
- Data transformations
- Integration points
- Configuration handling

**Don't Test:**

- Third-party libraries
- Simple getters/setters
- Trivial code
- Generated code

## Integration Testing

### API Integration Tests

```javascript
describe("Opening API Integration", () => {
  it("fetches and processes opening data", async () => {
    const ecoCode = "E60";

    // Fetch from real API (or test API)
    const opening = await fetchOpening(ecoCode);
    const stats = await fetchStats(ecoCode);

    // Verify integration
    expect(opening.ecoCode).toBe(ecoCode);
    expect(stats.totalGames).toBeGreaterThan(0);
  });
});
```

### Database Integration Tests

```python
import pytest
from lib.database import Database

@pytest.fixture
def test_db():
    """Create test database."""
    db = Database(':memory:')  # In-memory SQLite
    db.create_tables()
    yield db
    db.close()

def test_save_and_retrieve(test_db, sample_opening):
    """Test database operations."""
    # Save
    test_db.save_opening(sample_opening)

    # Retrieve
    retrieved = test_db.get_opening('e60')

    assert retrieved['eco_code'] == 'E60'
    assert retrieved['name'] == sample_opening['name']
```

## Test Best Practices

### Arrange-Act-Assert Pattern

```javascript
it("calculates popularity correctly", () => {
  // Arrange: Set up test data
  const gamesPlayed = 150;
  const totalGames = 1000;

  // Act: Execute the code under test
  const result = calculatePopularity(gamesPlayed, totalGames);

  // Assert: Verify the result
  expect(result).toBe(15.0);
});
```

### Test Data Builders

```javascript
class OpeningBuilder {
  constructor() {
    this.opening = {
      id: "e60",
      name: "King's Indian Defense",
      ecoCode: "E60",
      moves: ["d4", "Nf6", "c4", "g6"],
    };
  }

  withEcoCode(code) {
    this.opening.ecoCode = code;
    return this;
  }

  withPopularity(popularity) {
    this.opening.popularity = popularity;
    return this;
  }

  build() {
    return { ...this.opening };
  }
}

// Usage
const opening = new OpeningBuilder()
  .withEcoCode("B20")
  .withPopularity(0.25)
  .build();
```

### Snapshot Testing (React)

```javascript
import { render } from "@testing-library/react";
import OpeningCard from "./OpeningCard";

it("matches snapshot", () => {
  const { container } = render(<OpeningCard opening={mockOpening} />);

  expect(container).toMatchSnapshot();
});
```

## Common Testing Pitfalls

### Testing Implementation Details

```javascript
// Bad: Testing internal state
it("sets loading state", () => {
  const component = new Component();
  component.fetchData();
  expect(component.state.loading).toBe(true);
});

// Good: Testing behavior
it("shows loading indicator while fetching", () => {
  render(<Component />);
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});
```

### Fragile Tests

```javascript
// Bad: Depends on exact text
expect(screen.getByText("King's Indian Defense - E60")).toBeInTheDocument();

// Good: More flexible
expect(screen.getByText(/King's Indian Defense/i)).toBeInTheDocument();
expect(screen.getByText(/E60/)).toBeInTheDocument();
```

### Not Cleaning Up

```javascript
// Bad: Leaves side effects
it("fetches data", async () => {
  await fetchData();
  // Database/cache not cleaned up
});

// Good: Clean up after test
afterEach(() => {
  clearCache();
  resetDatabase();
});
```

## Remember

- Write tests that document behavior
- Keep tests simple and focused
- Test edge cases and errors
- Make tests independent and isolated
- Use descriptive test names
- Aim for good coverage, not perfect coverage
