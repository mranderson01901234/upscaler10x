#!/bin/bash
# build-pro-engine.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$SCRIPT_DIR/pro-engine-desktop/service"
BUILD_DIR="$SERVICE_DIR/build-temp"
DIST_DIR="$SERVICE_DIR/downloads"

echo "Building encrypted Pro Engine package..."
mkdir -p "$BUILD_DIR" "$DIST_DIR"

# Copy Pro Engine files
rsync -a --delete --exclude 'node_modules' --exclude 'downloads' --exclude 'build-temp' "$SERVICE_DIR/" "$BUILD_DIR/"

# Encrypt AI models (expects scripts/encrypt-models.js)
if [ -f "$SERVICE_DIR/scripts/encrypt-models.js" ]; then
  node "$SERVICE_DIR/scripts/encrypt-models.js" "$BUILD_DIR"
else
  echo "Warning: encrypt-models.js not found. Skipping model encryption step."
fi

# Create installer package
cd "$BUILD_DIR"
zip -r "$DIST_DIR/pro-engine-encrypted.zip" ./*

# Cleanup
cd "$SERVICE_DIR"
rm -rf "$BUILD_DIR"

echo "Pro Engine package created: $DIST_DIR/pro-engine-encrypted.zip"
if command -v du >/dev/null 2>&1; then
  du -h "$DIST_DIR/pro-engine-encrypted.zip" | awk '{print "Package size: "$1}'
fi 