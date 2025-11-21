#!/bin/bash

# Lichess Analysis Pipeline Runner (Unix/Mac)
# This script runs the Lichess chess opening popularity analysis pipeline

set -e  # Exit on error

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
fi

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 not found. Please install Python 3.7+"
    exit 1
fi

# Check if required packages are installed
echo "Checking dependencies..."
python3 -c "import requests, chess, zstandard, tqdm, dateutil" 2>/dev/null || {
    echo "Error: Required Python packages not found."
    echo "Please install dependencies: pip install -r requirements.txt"
    exit 1
}

# Create logs directory
mkdir -p logs

# Set up log file with timestamp
LOG_FILE="logs/pipeline_$(date +%Y%m%d_%H%M%S).log"

echo "=========================================="
echo "Lichess Analysis Pipeline"
echo "=========================================="
echo "Log file: $LOG_FILE"
echo ""

# Run the pipeline
# Use $@ to pass all arguments to the script
python3 run_pipeline.py "$@" 2>&1 | tee "$LOG_FILE"

EXIT_CODE=${PIPESTATUS[0]}

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "Pipeline completed successfully!"
    echo "Log saved to: $LOG_FILE"
    echo "=========================================="
else
    echo ""
    echo "=========================================="
    echo "Pipeline failed with exit code: $EXIT_CODE"
    echo "Check log file: $LOG_FILE"
    echo "=========================================="
fi

exit $EXIT_CODE
