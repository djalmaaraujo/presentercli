# PresentCLI

Terminal-based markdown presentations with web export. Present directly from your terminal or generate self-contained HTML presentations for sharing.

## Features

### 🎯 Core
- **Markdown-based** - Write slides in simple markdown files
- **ASCII Art Titles** - Auto-generated figlet headers with smart scaling
- **Live Reload** - Watch mode for real-time slide updates
- **Custom Themes** - JSON-based color and style configuration
- **Navigation History** - Undo/redo through slides with `u` key

### 🌐 Web Export
- **Self-contained HTML** - Single file with embedded styles and scripts
- **Terminal Aesthetics** - CRT effects, scanlines, and monospace fonts
- **Image Support** - Markdown images automatically converted to responsive `<img>` tags
- **Mobile-friendly** - Touch/swipe navigation
- **GitHub Pages Deploy** - One-command deployment with asset upload

### 🎨 Presentation Modes
- **Presentation Mode** (default) - Large ASCII art headers with full styling
- **Plain Mode** (`-p`) - Compact text for detailed content

## Quick Start

```bash
# Install
npm install

# Build
npm run build

# Present
node dist/index.js <slides-directory>

# Example with sample deck
node dist/index.js ./brushing-teeth
```

## CLI Usage

```bash
node dist/index.js <slides-dir> [options]

Options:
  -t, --theme <file>     Path to theme.json (default: "theme.json")
  -w, --watch            Enable live reload
  -s, --slide <number>   Start at specific slide (1-based)
  -p, --plain            Plain mode (compact text, no ASCII art)
  -h, --help             Display help
```

### Keyboard Shortcuts

| Key                 | Action                  |
| ------------------- | ----------------------- |
| `n` / `→` / `Space` | Next slide              |
| `p` / `←`           | Previous slide          |
| `j`                 | Jump to slide number    |
| `g`                 | First slide             |
| `G`                 | Last slide              |
| `u`                 | Undo (navigation stack) |
| `r`                 | Refresh current slide   |
| `h` / `?`           | Show help               |
| `q` / `Esc`         | Quit                    |

## Web Export

### Build HTML

```bash
npm run build:web <slides-directory> [output-file]

# Examples:
npm run build:web ./my-slides                    # Creates ./my-slides/index.html
npm run build:web ./my-slides ./dist/demo.html  # Custom output path
```

**Generated HTML includes:**
- Terminal-style design with CRT effects and scanlines
- Keyboard navigation (`→`, `←`, `g`, `G`, `1-9`, `f`, `h`)
- Touch/swipe support for mobile
- Progress bar and slide counter
- Fullscreen mode (`f` key)
- Responsive images from markdown

### Deploy to GitHub Pages

```bash
npm run deploy:web <slides-directory> <target-folder> [--repo user/repo]

# Examples:
npm run deploy:web ./my-slides demo-presentation
npm run deploy:web ./my-slides demo -- --repo myorg/presentations
```

**Features:**
- Auto-creates GitHub repository if needed (default: `<username>/static`)
- Uploads HTML + all images (PNG, JPG, GIF, SVG)
- Deploys to `https://<username>.github.io/<repo>/<target-folder>/`

**Requirements:** GitHub CLI (`gh`) installed and authenticated (`gh auth login`)

**First-time setup:** Enable GitHub Pages in repo settings after first deploy:
1. Go to `https://github.com/<username>/<repo>/settings/pages`
2. Set Source to "Deploy from a branch"
3. Select "main" branch and "/ (root)" folder

## Creating Slides

Create a directory with numbered markdown files:

```
my-slides/
├── 01-intro.md
├── 02-features.md
├── 03-demo.md
└── 04-conclusion.md
```

**Markdown features:**
- Headings (`#`, `##`, `###`)
- Lists (bullet and numbered)
- Code blocks with syntax highlighting
- Bold (`**text**`) and italic (`*text*`)
- Inline code (`` `code` ``)
- Images (`![alt](./image.png)`) - works in web export
- Horizontal rules (`---`)
- Blockquotes (`>`)

**Title slides:** First `#` heading becomes ASCII art (auto-sized to fit)

## Theming

Create a `theme.json` file (auto-generated on first run):

```json
{
  "colors": {
    "primary": "#00ff00",
    "secondary": "#00aaff",
    "text": "#ffffff",
    "dim": "#888888",
    "code": "#00ff88"
  },
  "styles": {
    "h1": { "color": "primary", "bold": true },
    "h2": { "color": "secondary", "bold": true },
    "code": { "color": "code", "backgroundColor": "#1a1a1a" },
    "list": { "bullet": "•", "indent": 2 }
  },
  "layout": {
    "maxWidth": 80,
    "padding": 2,
    "centerContent": false
  }
}
```

## Development

```bash
# Watch mode for development
npm run dev

# Run tests
npm test
npm run test:watch
npm run test:coverage

# Build
npm run build
```

## Dependencies

- **[marked](https://marked.js.org/)** - Markdown parser
- **[figlet](https://github.com/patorjk/figlet.js)** - ASCII art generator
- **[chalk](https://github.com/chalk/chalk)** - Terminal styling
- **[chokidar](https://github.com/paulmillr/chokidar)** - File watcher
- **[commander](https://github.com/tj/commander.js)** - CLI framework

## Troubleshooting

**Module not found:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Terminal too small:** Increase width to at least 80 columns

**Colors not showing:** Use a modern terminal (iTerm2, Terminal.app, Windows Terminal, etc.)

**Images not showing in web export:** Ensure images are in the slides directory and deployment script will upload them automatically

## License

MIT
