#!/bin/bash

# Script to generate .npmrc file from environment variables
# Usage: 
#   1. Set environment variables or create .env file
#   2. Run: ./setup-npmrc.sh

# Load .env file if it exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if required variables are set
if [ -z "$BITBUCKET_WORKSPACE" ] || [ -z "$BITBUCKET_REPO" ] || [ -z "$BITBUCKET_USERNAME" ] || [ -z "$BITBUCKET_APP_PASSWORD" ] || [ -z "$BITBUCKET_EMAIL" ]; then
    echo "❌ Error: Missing required environment variables"
    echo ""
    echo "Required variables:"
    echo "  - BITBUCKET_WORKSPACE"
    echo "  - BITBUCKET_REPO"
    echo "  - BITBUCKET_USERNAME"
    echo "  - BITBUCKET_EMAIL"
    echo "  - BITBUCKET_APP_PASSWORD"
    echo ""
    echo "Create a .env file or export these variables before running this script."
    exit 1
fi

# Generate .npmrc file
NPMRC_FILE="$HOME/.npmrc"

echo "📝 Generating .npmrc file at $NPMRC_FILE"

# Backup existing .npmrc if it exists
if [ -f "$NPMRC_FILE" ]; then
    echo "⚠️  Backing up existing .npmrc to .npmrc.backup"
    cp "$NPMRC_FILE" "$NPMRC_FILE.backup"
fi

# Create or append to .npmrc
cat > "$NPMRC_FILE" << EOF
# Bitbucket Package Registry Configuration
# Generated on $(date)

@${BITBUCKET_WORKSPACE}:registry=https://api.bitbucket.org/2.0/repositories/${BITBUCKET_WORKSPACE}/${BITBUCKET_REPO}/npm/
//api.bitbucket.org/2.0/repositories/${BITBUCKET_WORKSPACE}/${BITBUCKET_REPO}/npm/:_password=${BITBUCKET_APP_PASSWORD}
//api.bitbucket.org/2.0/repositories/${BITBUCKET_WORKSPACE}/${BITBUCKET_REPO}/npm/:username=${BITBUCKET_USERNAME}
//api.bitbucket.org/2.0/repositories/${BITBUCKET_WORKSPACE}/${BITBUCKET_REPO}/npm/:email=${BITBUCKET_EMAIL}
//api.bitbucket.org/2.0/repositories/${BITBUCKET_WORKSPACE}/${BITBUCKET_REPO}/npm/:always-auth=true
EOF

echo "✅ .npmrc file generated successfully!"
echo ""
echo "You can now publish packages with: yarn publish"
