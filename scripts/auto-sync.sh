#!/bin/bash

# Auto-sync script for SoulGuide development
# This script automatically commits and pushes changes to GitHub

set -e

PROJECT_DIR="/home/ubuntu/soulguide"
cd "$PROJECT_DIR"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log messages
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${YELLOW}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if there are changes
if git diff-index --quiet HEAD --; then
    log "No changes to commit"
    exit 0
fi

# Stage all changes
log "Staging changes..."
git add -A

# Get the list of changed files
CHANGED_FILES=$(git diff --cached --name-only)
log "Changed files:\n$CHANGED_FILES"

# Create commit message
TIMESTAMP=$(date +'%Y-%m-%d %H:%M:%S')
COMMIT_MSG="auto: Update code at $TIMESTAMP

Changed files:
$CHANGED_FILES"

# Commit changes
log "Committing changes..."
git commit -m "$COMMIT_MSG" || {
    error "Failed to commit"
    exit 1
}

# Push to GitHub
log "Pushing to GitHub..."
git push origin main || {
    error "Failed to push to GitHub"
    exit 1
}

success "Auto-sync completed successfully!"
log "Your changes are now available in GitHub Codespace"
