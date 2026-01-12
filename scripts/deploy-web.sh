#!/bin/bash
set -e

# Deploy presentation to GitHub static repository
# Usage: ./scripts/deploy-web.sh <slides-directory> <target-folder-name>

SLIDES_DIR="$1"
TARGET_FOLDER="$2"
STATIC_REPO="static"

if [ -z "$SLIDES_DIR" ] || [ -z "$TARGET_FOLDER" ]; then
  echo "Usage: npm run deploy:web <slides-directory> <target-folder-name>"
  echo "Example: npm run deploy:web ./brushing-teeth brushgpt-demo"
  exit 1
fi

# Resolve to absolute path
SLIDES_DIR=$(cd "$SLIDES_DIR" && pwd)

echo "Building web presentation..."
echo "  Source: $SLIDES_DIR"
echo "  Target: $TARGET_FOLDER"

# Create temp directory for build
TEMP_DIR=$(mktemp -d)
OUTPUT_FILE="$TEMP_DIR/index.html"

# Build the web presentation
npx ts-node scripts/build-web.ts "$SLIDES_DIR" "$OUTPUT_FILE"

if [ ! -f "$OUTPUT_FILE" ]; then
  echo "Error: Build failed - no output file generated"
  rm -rf "$TEMP_DIR"
  exit 1
fi

echo ""
echo "Deploying to GitHub..."

# Get the GitHub username
GH_USER=$(gh api user -q .login)

if [ -z "$GH_USER" ]; then
  echo "Error: Could not get GitHub username. Make sure you're logged in with 'gh auth login'"
  rm -rf "$TEMP_DIR"
  exit 1
fi

# Clone or update the static repository
REPO_DIR="$TEMP_DIR/repo"

# Check if the static repo exists
if ! gh repo view "$GH_USER/$STATIC_REPO" > /dev/null 2>&1; then
  echo "Creating $STATIC_REPO repository..."
  gh repo create "$STATIC_REPO" --public --description "Static files hosting"
fi

echo "Cloning $STATIC_REPO repository..."
gh repo clone "$GH_USER/$STATIC_REPO" "$REPO_DIR" -- --depth 1 2>/dev/null || {
  # If clone fails (empty repo), initialize it
  mkdir -p "$REPO_DIR"
  cd "$REPO_DIR"
  git init
  git remote add origin "https://github.com/$GH_USER/$STATIC_REPO.git"
}

# Create target folder and copy files
mkdir -p "$REPO_DIR/$TARGET_FOLDER"
cp "$OUTPUT_FILE" "$REPO_DIR/$TARGET_FOLDER/"

# Commit and push
cd "$REPO_DIR"
git add .
git commit -m "Deploy presentation: $TARGET_FOLDER" || {
  echo "No changes to commit"
  rm -rf "$TEMP_DIR"
  exit 0
}

git push -u origin main 2>/dev/null || git push -u origin master 2>/dev/null || {
  # If push fails, might be a new repo - set up branch and push
  git branch -M main
  git push -u origin main
}

# Clean up
rm -rf "$TEMP_DIR"

# Output the URL
echo ""
echo "Deployment complete!"
echo ""
echo "Your presentation is available at:"
echo "  https://$GH_USER.github.io/$STATIC_REPO/$TARGET_FOLDER/"
echo ""
echo "Note: If this is a new repo, you may need to enable GitHub Pages:"
echo "  1. Go to https://github.com/$GH_USER/$STATIC_REPO/settings/pages"
echo "  2. Set Source to 'Deploy from a branch'"
echo "  3. Select 'main' branch and '/ (root)' folder"
