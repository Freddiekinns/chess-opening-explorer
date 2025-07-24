#!/usr/bin/env python3
"""
Check enrichment status of ECO files
"""

import json
import os
from pathlib import Path

def check_enrichment_status():
    """Check enrichment status of all ECO files"""
    
    # Get the project root directory (two levels up from this script)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    
    # ECO files to check
    eco_files = [
        project_root / "data/eco/ecoA.json",
        project_root / "data/eco/ecoB.json", 
        project_root / "data/eco/ecoC.json",
        project_root / "data/eco/ecoD.json",
        project_root / "data/eco/ecoE.json"
    ]
    
    total_positions = 0
    total_enriched = 0
    
    print("ECO File Enrichment Status:")
    print("=" * 50)
    
    for eco_file in eco_files:
        if not eco_file.exists():
            print(f"{eco_file}: File not found")
            continue
            
        try:
            with open(eco_file, 'r', encoding='utf-8') as f:
                eco_data = json.load(f)
            
            positions = len(eco_data)
            enriched = 0
            
            # Check each position for enrichment
            for fen, position_data in eco_data.items():
                if isinstance(position_data, dict) and 'analysis_json' in position_data:
                    analysis = position_data['analysis_json']
                    if isinstance(analysis, dict) and 'last_enriched_at' in analysis:
                        enriched += 1
            
            total_positions += positions
            total_enriched += enriched
            
            percentage = (enriched / positions * 100) if positions > 0 else 0
            
            print(f"{eco_file.name}: {enriched:,}/{positions:,} ({percentage:.1f}%) enriched")
            
        except Exception as e:
            print(f"{eco_file}: Error reading file - {e}")
    
    print("=" * 50)
    overall_percentage = (total_enriched / total_positions * 100) if total_positions > 0 else 0
    print(f"Overall: {total_enriched:,}/{total_positions:,} ({overall_percentage:.1f}%) enriched")
    
    return total_enriched, total_positions

if __name__ == "__main__":
    check_enrichment_status()
