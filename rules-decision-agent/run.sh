#!/bin/bash
if [ -z "$1" ]; then
  echo "Usage: ./run.sh \"<business prompt>\""
  echo "Example: ./run.sh \"Vendor V-9001 failed quality inspection 3 times this quarter.\""
  exit 1
fi

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Build
echo "Building agent..."
npm run build

# Run
echo "Running agent..."
node dist/index.js "$*"
