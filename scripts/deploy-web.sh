#!/bin/bash
set -e

# Deploy presentation to GitHub static repository
# Usage: ./scripts/deploy-web.sh <slides-directory> <target-folder-name> [--repo user/repo-name]

# Parse arguments
SLIDES_DIR=""
TARGET_FOLDER=""
CUSTOM_REPO=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --repo)
      CUSTOM_REPO="$2"
      shift 2
      ;;
    *)
      if [ -z "$SLIDES_DIR" ]; then
        SLIDES_DIR="$1"
      elif [ -z "$TARGET_FOLDER" ]; then
        TARGET_FOLDER="$1"
      fi
      shift
      ;;
  esac
done

if [ -z "$SLIDES_DIR" ] || [ -z "$TARGET_FOLDER" ]; then
  echo "Usage: npm run deploy:web <slides-directory> <target-folder-name> [--repo user/repo-name]"
  echo ""
  echo "Arguments:"
  echo "  <slides-directory>    Path to the folder containing your markdown slides"
  echo "  <target-folder-name>  Name of the folder in the target repository"
  echo ""
  echo "Options:"
  echo "  --repo user/repo      Deploy to a specific GitHub repository (default: <your-username>/static)"
  echo ""
  echo "Examples:"
  echo "  npm run deploy:web ./brushing-teeth brushgpt-demo"
  echo "  npm run deploy:web ./brushing-teeth brushgpt-demo -- --repo myorg/presentations"
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

# Determine the target repository
if [ -n "$CUSTOM_REPO" ]; then
  # Use custom repo (format: user/repo or org/repo)
  FULL_REPO="$CUSTOM_REPO"
  REPO_OWNER=$(echo "$CUSTOM_REPO" | cut -d'/' -f1)
  REPO_NAME=$(echo "$CUSTOM_REPO" | cut -d'/' -f2)
else
  # Default: use current user's "static" repo
  REPO_OWNER=$(gh api user -q .login)
  if [ -z "$REPO_OWNER" ]; then
    echo "Error: Could not get GitHub username. Make sure you're logged in with 'gh auth login'"
    rm -rf "$TEMP_DIR"
    exit 1
  fi
  REPO_NAME="static"
  FULL_REPO="$REPO_OWNER/$REPO_NAME"
fi

echo "  Repository: $FULL_REPO"

# Clone or update the repository
REPO_DIR="$TEMP_DIR/repo"

# Check if the repo exists
if ! gh repo view "$FULL_REPO" > /dev/null 2>&1; then
  if [ -n "$CUSTOM_REPO" ]; then
    echo "Error: Repository '$FULL_REPO' does not exist or you don't have access to it."
    rm -rf "$TEMP_DIR"
    exit 1
  fi
  echo "Creating $REPO_NAME repository..."
  gh repo create "$REPO_NAME" --public --description "Static files hosting"
fi

echo "Cloning $REPO_NAME repository..."
gh repo clone "$FULL_REPO" "$REPO_DIR" -- --depth 1 2>/dev/null || {
  # If clone fails (empty repo), initialize it
  mkdir -p "$REPO_DIR"
  cd "$REPO_DIR"
  git init
  git remote add origin "https://github.com/$FULL_REPO.git"
}

# Create target folder and copy files
mkdir -p "$REPO_DIR/$TARGET_FOLDER"
cp "$OUTPUT_FILE" "$REPO_DIR/$TARGET_FOLDER/"

# Copy all images and assets from the slides directory
echo "Copying assets from slides directory..."
if [ -d "$SLIDES_DIR" ]; then
  # Copy image files (png, jpg, jpeg, gif, svg)
  find "$SLIDES_DIR" -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.gif" -o -name "*.svg" \) -exec cp {} "$REPO_DIR/$TARGET_FOLDER/" \;

  # Count copied files
  IMAGE_COUNT=$(find "$SLIDES_DIR" -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.gif" -o -name "*.svg" \) | wc -l | tr -d ' ')
  if [ "$IMAGE_COUNT" -gt 0 ]; then
    echo "  Copied $IMAGE_COUNT image file(s)"
  fi
fi

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
echo "  https://$REPO_OWNER.github.io/$REPO_NAME/$TARGET_FOLDER/"
echo ""
echo "Note: If this is a new repo, you may need to enable GitHub Pages:"
echo "  1. Go to https://github.com/$FULL_REPO/settings/pages"
echo "  2. Set Source to 'Deploy from a branch'"
echo "  3. Select 'main' branch and '/ (root)' folder"
