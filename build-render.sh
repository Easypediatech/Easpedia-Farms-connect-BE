#!/bin/bash
# Render Build Configuration for Memory Optimization

echo "Starting optimized build process..."

# Install dependencies with minimal memory usage
npm ci --omit=dev --prefer-offline --no-audit --no-fund

echo "Building application..."
# Build with memory limit
node --max-old-space-size=3072 node_modules/.bin/nest build

echo "Cleaning up..."
# Remove unnecessary files to reduce memory footprint
rm -rf node_modules/@types
rm -rf node_modules/typescript
rm -rf node_modules/@nestjs/cli

echo "Build completed successfully!"