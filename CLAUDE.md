# PresentCLI - Context for AI

## Project Overview

PresentCLI is a TypeScript-based CLI tool for creating and presenting markdown-based slide decks. It supports both terminal presentation and web export with GitHub Pages deployment.

## Architecture

### Core Components

- **`src/presenter.ts`** - Main presentation orchestrator
- **`src/slide-navigator.ts`** - Slide navigation and history
- **`src/markdown-renderer.ts`** - Markdown to terminal rendering
- **`src/input-handler.ts`** - Keyboard input processing
- **`src/file-watcher.ts`** - Live reload functionality
- **`src/theme-manager.ts`** - Theme loading and defaults
- **`src/terminal-utils.ts`** - Terminal manipulation utilities

### Web Export

- **`scripts/build-web.ts`** - HTML generator with embedded CSS/JS
  - Converts markdown to HTML with terminal styling
  - Generates ASCII art from slide titles using figlet
  - Supports image embedding via markdown syntax
  - Creates self-contained single-file output

- **`scripts/deploy-web.sh`** - GitHub Pages deployment
  - Auto-creates GitHub repository if needed
  - Uploads HTML and all image assets (PNG, JPG, GIF, SVG)
  - Uses GitHub CLI (`gh`) for deployment

## Key Features

### Presentation Modes
- **Presentation Mode** (default): Large ASCII art headers, full styling
- **Plain Mode** (`-p` flag): Compact text for detailed content

### Navigation
- Linear navigation with history stack (undo/redo)
- Jump to specific slides
- Keyboard-driven interface

### Web Export Features
- Terminal aesthetics (CRT effects, scanlines)
- Responsive images from markdown
- Mobile touch/swipe support
- Fullscreen mode
- Progress indicators

## File Structure

```
presentercli/
├── src/                    # TypeScript source
│   ├── index.ts           # CLI entry point
│   ├── presenter.ts       # Main presentation logic
│   └── ...                # Supporting modules
├── scripts/               # Build and deployment scripts
│   ├── build-web.ts      # Web export generator
│   └── deploy-web.sh     # GitHub Pages deployment
├── dist/                  # Compiled JavaScript (gitignored)
├── slides/                # User slide directories (gitignored)
├── brushing-teeth/        # Example presentation
├── theme.json            # Default theme configuration
└── package.json          # Dependencies and scripts
```

## Important Implementation Details

### Markdown Processing
- Uses `marked` library for parsing
- Custom renderer converts to terminal ANSI codes (CLI) or HTML (web)
- Images in markdown (`![alt](./path.png)`) converted to `<img>` tags in web export

### ASCII Art Generation
- Uses `figlet` library with font fallback (Big → Standard → Small)
- Auto-scales to fit 80-character max width
- First `#` heading in each slide becomes ASCII art

### Build Artifacts (gitignored)
- `*.d.ts`, `*.d.ts.map`, `*.js.map` - TypeScript compilation artifacts
- `scripts/*.js` - Compiled scripts (source is .ts files)
- `dist/` - Compiled application

### Web Export Image Handling
- Images must be relative paths in markdown
- Deployment script automatically uploads all image files from slides directory
- Image paths in HTML remain relative (e.g., `./chart.png`)

## Development Workflow

```bash
# Development with watch mode
npm run dev

# Build for distribution
npm run build

# Test presentation
node dist/index.js ./brushing-teeth

# Generate web version
npm run build:web ./brushing-teeth ./dist/demo.html

# Deploy to GitHub Pages
npm run deploy:web ./brushing-teeth demo-presentation
```

## Testing

- Uses Jest for unit tests
- Test files colocated with source: `*.test.ts`
- Run with: `npm test`

## Dependencies

### Runtime
- `marked` - Markdown parsing
- `figlet` - ASCII art generation
- `chalk` - Terminal colors
- `chokidar` - File watching
- `commander` - CLI framework
- `ansi-escapes` - Terminal control sequences

### Development
- TypeScript for type safety
- Jest for testing
- ts-node for executing TypeScript directly (used in scripts)

## Common Tasks

### Adding New Markdown Features
1. Update `src/markdown-renderer.ts` for terminal rendering
2. Update `scripts/build-web.ts` `renderMarkdownToHtml()` for web rendering
3. Test in both modes

### Adding New CLI Options
1. Add option to `src/index.ts` Commander configuration
2. Pass through to `Presenter` constructor
3. Update README examples

### Modifying Web Styles
- CSS is embedded in `scripts/build-web.ts` `generateHtml()` function
- Styles are inlined in `<style>` tag for portability

### Deployment Improvements
- Modify `scripts/deploy-web.sh` for repository/asset handling
- Supports custom repos via `--repo` flag

## Notes for AI Development

- **TypeScript strict mode** is enabled
- **Keep web exports self-contained** - no external dependencies
- **Image support requires deployment script** to upload assets
- **Theme colors use hex format** - maintained in JSON
- **ASCII art caching** prevents regeneration on refresh
- **Navigation history** uses stack-based undo system

## Recent Changes

- Added markdown image support in web export (`<img>` tag conversion)
- Enhanced deployment script to upload all image assets
- Split image slides into separate image and content slides for better presentation flow
- Updated .gitignore to exclude TypeScript build artifacts
