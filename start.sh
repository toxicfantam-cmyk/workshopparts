#!/bin/bash

# WorkshopParts One-Click Launcher
echo "=========================================================="
echo "🚗 Starting WorkshopParts System..."
echo "=========================================================="

cd "$(dirname "$0")"

# Start backend and frontend concurrently
npm run dev
