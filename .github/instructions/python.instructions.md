---
description: "Python development standards for analysis tools and data pipelines"
applyTo: "**/*.py"
---

# Python Development Standards

## Project Context

Python is used in this project primarily for:

- Data analysis and processing (`tools/analysis/`)
- LLM enrichment pipelines
- Lichess API integration
- Statistical calculations
- Data transformation and validation

## Python Version

- **Target**: Python 3.9+
- Use modern Python features (f-strings, type hints, dataclasses)
- Avoid deprecated features

## Code Style

### PEP 8 Compliance

- Follow [PEP 8](https://pep8.org/) style guide
- Use tools: `black` for formatting, `flake8` for linting
- Line length: 88 characters (Black default)

### Naming Conventions

```python
# Variables and functions: snake_case
opening_name = "Sicilian Defense"
def calculate_win_rate(wins, total):
    pass

# Classes: PascalCase
class OpeningAnalyzer:
    pass

# Constants: UPPER_SNAKE_CASE
MAX_RETRIES = 3
API_BASE_URL = "https://lichess.org/api"

# Private members: leading underscore
class DataFetcher:
    def __init__(self):
        self._cache = {}

    def _internal_method(self):
        pass
```

### Imports

**Order and Grouping**

```python
# 1. Standard library
import json
import logging
from pathlib import Path
from typing import List, Dict, Optional

# 2. Third-party packages
import requests
import pandas as pd
from tqdm import tqdm

# 3. Local modules
from lib.config import Config
from lib.data_fetcher import DataFetcher
from lib.utils import format_eco_code
```

**Import Style**

```python
# Good: Explicit imports
from typing import List, Dict, Optional
from pathlib import Path

# Avoid: Wildcard imports
from typing import *  # Don't do this
```

## Type Hints

**Use Type Hints Extensively**

```python
from typing import List, Dict, Optional, Union, Tuple

def fetch_opening_stats(
    eco_code: str,
    time_period: Optional[str] = None
) -> Dict[str, float]:
    """Fetch statistics for a chess opening.

    Args:
        eco_code: ECO code of the opening (e.g., 'E60')
        time_period: Optional time period filter

    Returns:
        Dictionary containing win/draw/loss percentages

    Raises:
        ValueError: If eco_code is invalid
        APIError: If API request fails
    """
    pass

def process_games(games: List[Dict]) -> Tuple[int, int, int]:
    """Process games and return win/draw/loss counts."""
    pass

class OpeningData:
    name: str
    eco_code: str
    moves: List[str]
    popularity: Optional[float] = None
```

**Use Modern Type Syntax (Python 3.9+)**

```python
# Good: Modern syntax
def get_openings() -> list[dict[str, str]]:
    pass

# Also acceptable: typing module
from typing import List, Dict
def get_openings() -> List[Dict[str, str]]:
    pass
```

## Data Classes

**Use dataclasses for Data Structures**

```python
from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class Opening:
    """Represents a chess opening."""
    id: str
    name: str
    eco_code: str
    moves: List[str]
    popularity: Optional[float] = None
    videos: List[str] = field(default_factory=list)

    def __post_init__(self):
        """Validate data after initialization."""
        if not self.eco_code.match(r'^[A-E]\d{2}$'):
            raise ValueError(f"Invalid ECO code: {self.eco_code}")

@dataclass
class GameStats:
    """Statistics for an opening."""
    total_games: int
    white_wins: int
    black_wins: int
    draws: int

    @property
    def white_win_rate(self) -> float:
        """Calculate white win rate percentage."""
        return (self.white_wins / self.total_games) * 100 if self.total_games > 0 else 0.0
```

## Error Handling

**Be Specific with Exceptions**

```python
# Bad: Catching everything
try:
    data = fetch_data()
except:
    pass

# Good: Specific exceptions
try:
    data = fetch_opening_data(eco_code)
except requests.HTTPError as e:
    logger.error(f"HTTP error fetching {eco_code}: {e}")
    raise
except requests.Timeout:
    logger.warning(f"Timeout fetching {eco_code}, retrying...")
    return retry_fetch(eco_code)
except ValueError as e:
    logger.error(f"Invalid data for {eco_code}: {e}")
    return None
```

**Custom Exceptions**

```python
class DataPipelineError(Exception):
    """Base exception for data pipeline errors."""
    pass

class APIError(DataPipelineError):
    """API request failed."""
    pass

class ValidationError(DataPipelineError):
    """Data validation failed."""
    pass

# Usage
def fetch_data(url: str) -> dict:
    response = requests.get(url)
    if not response.ok:
        raise APIError(f"Failed to fetch {url}: {response.status_code}")
    return response.json()
```

## Logging

**Use Structured Logging**

```python
import logging

# Configure at module level
logger = logging.getLogger(__name__)

def process_opening(opening_id: str) -> None:
    """Process a single opening."""
    logger.info(f"Processing opening {opening_id}")

    try:
        data = fetch_data(opening_id)
        logger.debug(f"Fetched {len(data)} records for {opening_id}")

        result = transform_data(data)
        logger.info(f"Successfully processed {opening_id}")

    except Exception as e:
        logger.error(
            f"Failed to process {opening_id}",
            exc_info=True,
            extra={"opening_id": opening_id}
        )
        raise
```

**Log Levels**

- `DEBUG`: Detailed diagnostic information
- `INFO`: General informational messages
- `WARNING`: Warning messages for recoverable issues
- `ERROR`: Error messages for failures
- `CRITICAL`: Critical errors that may cause termination

## File I/O

**Use pathlib for File Operations**

```python
from pathlib import Path
import json

# Good: pathlib
def load_openings(data_dir: Path) -> list[dict]:
    """Load openings from JSON file."""
    openings_file = data_dir / "openings.json"

    if not openings_file.exists():
        raise FileNotFoundError(f"Openings file not found: {openings_file}")

    with openings_file.open('r', encoding='utf-8') as f:
        return json.load(f)

def save_stats(stats: dict, output_path: Path) -> None:
    """Save statistics to JSON file."""
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open('w', encoding='utf-8') as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)
```

**Context Managers**

```python
# Always use context managers for resources
with open('data.json', 'r') as f:
    data = json.load(f)

# Custom context managers
from contextlib import contextmanager

@contextmanager
def api_session(api_key: str):
    """Create an API session with automatic cleanup."""
    session = requests.Session()
    session.headers['Authorization'] = f'Bearer {api_key}'
    try:
        yield session
    finally:
        session.close()

# Usage
with api_session(api_key) as session:
    response = session.get(url)
```

## Functions and Methods

**Docstrings**

```python
def calculate_popularity(
    games_played: int,
    total_games: int,
    time_period: str = "month"
) -> float:
    """Calculate opening popularity as a percentage.

    Args:
        games_played: Number of games with this opening
        total_games: Total number of games in the dataset
        time_period: Time period for the calculation (default: "month")

    Returns:
        Popularity as a percentage (0-100)

    Raises:
        ValueError: If total_games is zero or negative

    Example:
        >>> calculate_popularity(150, 1000)
        15.0
    """
    if total_games <= 0:
        raise ValueError("total_games must be positive")

    return (games_played / total_games) * 100
```

**Keep Functions Focused**

```python
# Bad: Function does too much
def process_everything(data):
    # Fetch, validate, transform, save...
    pass

# Good: Single responsibility
def validate_opening_data(data: dict) -> bool:
    """Validate opening data structure."""
    required_fields = ['id', 'name', 'eco_code', 'moves']
    return all(field in data for field in required_fields)

def transform_opening_data(data: dict) -> Opening:
    """Transform raw data to Opening object."""
    return Opening(
        id=data['id'],
        name=data['name'],
        eco_code=data['eco_code'],
        moves=data['moves']
    )

def save_opening(opening: Opening, output_dir: Path) -> None:
    """Save opening to file."""
    output_file = output_dir / f"{opening.id}.json"
    with output_file.open('w') as f:
        json.dump(opening.__dict__, f, indent=2)
```

## List Comprehensions and Generators

**Use Comprehensions Wisely**

```python
# Good: Simple, readable
eco_codes = [opening['eco_code'] for opening in openings]

# Good: With filter
popular = [o for o in openings if o['popularity'] > 0.1]

# Bad: Too complex
result = [
    transform(validate(fetch(id)))
    for id in ids
    if check(id) and verify(id) and id not in exclude
]

# Better: Use regular loop for complex logic
result = []
for id in ids:
    if id in exclude:
        continue
    if not (check(id) and verify(id)):
        continue

    data = fetch(id)
    validated = validate(data)
    result.append(transform(validated))
```

**Use Generators for Large Datasets**

```python
def process_openings(openings_file: Path):
    """Process openings one at a time (memory efficient)."""
    with openings_file.open('r') as f:
        for line in f:
            opening = json.loads(line)
            yield process_opening(opening)

# Usage
for processed in process_openings(file_path):
    save_result(processed)
```

## Testing

**Use pytest**

```python
import pytest
from lib.stats import calculate_win_rate

def test_calculate_win_rate():
    """Test win rate calculation."""
    assert calculate_win_rate(50, 100) == 50.0
    assert calculate_win_rate(0, 100) == 0.0
    assert calculate_win_rate(100, 100) == 100.0

def test_calculate_win_rate_zero_total():
    """Test that zero total raises error."""
    with pytest.raises(ValueError, match="total games"):
        calculate_win_rate(10, 0)

@pytest.fixture
def sample_opening():
    """Provide sample opening data for tests."""
    return Opening(
        id="e60",
        name="King's Indian Defense",
        eco_code="E60",
        moves=["d4", "Nf6", "c4", "g6"]
    )

def test_opening_validation(sample_opening):
    """Test opening data validation."""
    assert sample_opening.eco_code == "E60"
    assert len(sample_opening.moves) == 4
```

## Common Patterns

### Configuration Management

```python
from dataclasses import dataclass
from pathlib import Path
import os

@dataclass
class Config:
    """Application configuration."""
    data_dir: Path
    api_key: str
    max_retries: int = 3
    timeout: int = 30

    @classmethod
    def from_env(cls) -> 'Config':
        """Load configuration from environment variables."""
        return cls(
            data_dir=Path(os.getenv('DATA_DIR', './data')),
            api_key=os.getenv('API_KEY', ''),
            max_retries=int(os.getenv('MAX_RETRIES', '3')),
            timeout=int(os.getenv('TIMEOUT', '30'))
        )
```

### Retry Logic

```python
import time
from functools import wraps

def retry(max_attempts: int = 3, delay: float = 1.0):
    """Decorator to retry function on failure."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts - 1:
                        raise
                    logger.warning(
                        f"Attempt {attempt + 1} failed: {e}. Retrying..."
                    )
                    time.sleep(delay * (attempt + 1))
        return wrapper
    return decorator

@retry(max_attempts=3, delay=2.0)
def fetch_data(url: str) -> dict:
    """Fetch data with automatic retry."""
    response = requests.get(url)
    response.raise_for_status()
    return response.json()
```

## Tools and Automation

- **Formatting**: `black` (auto-format code)
- **Linting**: `flake8` or `pylint`
- **Type Checking**: `mypy`
- **Testing**: `pytest`
- **Documentation**: Docstrings + Sphinx (if needed)

## Remember

- Explicit is better than implicit
- Readability counts
- Simple is better than complex
- Use Python's built-in features effectively
- Write tests for critical functionality
