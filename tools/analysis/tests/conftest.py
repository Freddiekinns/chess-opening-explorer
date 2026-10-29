import sys
from pathlib import Path

# Tests import the pipeline as `lib.*`, the way run_pipeline.py does.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
