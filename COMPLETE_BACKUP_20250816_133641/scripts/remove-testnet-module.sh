#!/bin/bash

# RiverBit TestNet Module Removal Script
# This script safely removes the testnet validation module

echo "🗑️  Removing RiverBit TestNet Validation Module..."

# Remove TestNet components
echo "Removing TestNet components..."
rm -f components/testnet/TestNetValidator.tsx
rm -f components/pages/TestNetPage.tsx

# Remove testnet directory if empty
if [ -d "components/testnet" ] && [ -z "$(ls -A components/testnet)" ]; then
    rmdir components/testnet
    echo "Removed empty testnet directory"
fi

# Create backup of App.tsx
cp App.tsx App.tsx.backup
echo "Created backup: App.tsx.backup"

# Remove TestNet imports and navigation from App.tsx
sed -i '' '/import TestNetPage from/d' App.tsx
sed -i '' '/testnet.*TestNet.*special.*true/d' App.tsx
sed -i '' '/case.*testnet/,/return <TestNetPage \/>;/d' App.tsx

echo "✅ TestNet module removed successfully!"
echo "📝 Backup created: App.tsx.backup"
echo "🔄 Please restart your development server"

# Optional: Show what was removed
echo ""
echo "Removed files:"
echo "  - components/testnet/TestNetValidator.tsx"
echo "  - components/pages/TestNetPage.tsx"
echo "  - Updated App.tsx (removed TestNet navigation)"
echo ""
echo "To restore, run: mv App.tsx.backup App.tsx"