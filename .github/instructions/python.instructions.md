---
description: 'Python standards for this project'
applyTo: '**/*.py'
---

# Python Standards

## Project Context

Python is used for:

- Data analysis and processing (`tools/analysis/`)
- LLM enrichment pipelines
- Lichess API integration
- Statistical calculations

**Target**: Python 3.9+

## Project-Specific Patterns

### Data Class for Opening Data

```python
from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class Opening:
    id: str
    name: str
    eco_code: str
    moves: List[str]
    popularity: Optional[float] = None
    videos: List[str] = field(default_factory=list)
```

### File I/O with pathlib

```python
from pathlib import Path
import json

def load_openings(data_dir: Path) -> list[dict]:
    openings_file = data_dir / "openings.json"
    with openings_file.open('r', encoding='utf-8') as f:
        return json.load(f)

def save_data(data: dict, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open('w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
```

### Retry Decorator

```python
import time
from functools import wraps

def retry(max_attempts: int = 3, delay: float = 1.0):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts - 1:
                        raise
                    time.sleep(delay * (attempt + 1))
        return wrapper
    return decorator
```

### Logging Setup

```python
import logging

logger = logging.getLogger(__name__)

def process_opening(opening_id: str) -> None:
    logger.info(f"Processing {opening_id}")
    try:
        # ... processing logic
        logger.debug(f"Completed {opening_id}")
    except Exception as e:
        logger.error(f"Failed {opening_id}", exc_info=True)
        raise
```

## Key Rules

1. **Use type hints** for function signatures
2. **Use pathlib** for all file operations
3. **Use dataclasses** for data structures
4. **Handle errors explicitly** - avoid bare `except:`
5. **Use context managers** for resources (`with open()`)

## Tools

- **Formatting**: `black`
- **Linting**: `flake8`
- **Type Checking**: `mypy`
- **Testing**: `pytest`
