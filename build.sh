#!/bin/bash

# Build script for Courserac Firefox Extension

echo "Building Courserac Firefox Extension..."

# Create build directory
mkdir -p build

# Copy all necessary files to build directory
cp manifest.json build/
cp content.js build/
cp content.css build/
cp background.js build/
cp -r assets build/
cp README.md build/

# Create zip file for distribution
cd build
zip -r ../courserac-firefox-extension.zip ./*
cd ..

echo "Extension built successfully!"
echo "Files created:"
echo "- build/ (directory with all extension files)"
echo "- courserac-firefox-extension.zip (ready for distribution)"
echo ""
echo "To install in Firefox:"
echo "1. Go to about:debugging"
echo "2. Click 'This Firefox'"
echo "3. Click 'Load Temporary Add-on...'"
echo "4. Select manifest.json from the build/ directory"
echo ""
echo "Or rename the .zip file to .xpi and drag it into Firefox."
