#!/bin/bash
# CSS Migration Script - Systematic consolidation

echo "🎯 RefactorArchitect: CSS Consolidation Analysis"
echo "================================================"

# 1. Identify component imports that should use design system
echo "📋 Components still using individual CSS files:"
find ./src/components -name "*.tsx" -exec grep -l "import.*\.css" {} \; | while read file; do
  echo "  - $file"
done

echo ""
echo "🎯 Migration Strategy:"
echo "1. SearchBar, OpeningCard, PopularityIndicator → components.css"
echo "2. Layout components → main.css page layouts"
echo "3. Detail components → design system + main.css"
echo "4. Archive remaining CSS files"

echo ""
echo "📊 Expected outcome:"
echo "- Reduce from 19 CSS files to 4 core files"
echo "- Eliminate style duplication"
echo "- Maintain design consistency"
