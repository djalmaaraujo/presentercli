# CLI Markdown Presenter

Presentations from the command line, just point at a directory of markdown files and go.

## Setup

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd presentercli
   npm install
   ```

2. **Build the project**
   ```bash
   npm run build
   ```

3. **Start the presentation**
   ```bash
   node dist/index.js <slides-directory>

   # Example with sample deck:
   node dist/index.js ./brushing-teeth
   ```

You should see the presentation start in your terminal.

**Note:** Large text mode is the default for presenting. Use `-p` for compact plain text mode.

## Using

### Keyboard Shortcuts

**Navigation:**
- `n`, `→`, `Space` - Next slide
- `p`, `←` - Previous slide
- `j` - Jump to slide number
- `g` - First slide
- `G` - Last slide
- `u` - Undo (go back in navigation history)

**Display:**
- `r` - Refresh current slide

**Control:**
- `h`, `?` - Show help
- `q`, `Esc` - Quit

## Web Export

Export your presentation as a standalone HTML file for sharing or hosting.

### Build Web Presentation

```bash
npm run build:web <slides-directory> [output-file]

# Examples:
npm run build:web ./brushing-teeth                    # Creates ./brushing-teeth/index.html
npm run build:web ./brushing-teeth ./dist/demo.html  # Custom output path
```

The generated HTML file is self-contained with:
- Terminal-style design with CRT effects
- Keyboard navigation (same shortcuts as CLI)
- Touch/swipe support for mobile
- Progress bar and slide counter

### Deploy to GitHub Pages

Deploy directly to GitHub Pages with a single command:

```bash
npm run deploy:web <slides-directory> <target-folder-name>

# Example:
npm run deploy:web ./brushing-teeth my-presentation
```

This will:
1. Build the web presentation
2. Create a `static` repository on your GitHub (if it doesn't exist)
3. Deploy to `https://<username>.github.io/static/<target-folder>/`

**Requirements:** GitHub CLI (`gh`) must be installed and authenticated (`gh auth login`).

**First-time setup:** After deployment, enable GitHub Pages in your repository settings:
1. Go to `https://github.com/<username>/static/settings/pages`
2. Set Source to "Deploy from a branch"
3. Select "main" branch and "/ (root)" folder

## Troubleshooting

**"Module not found" errors:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Terminal too small:**
Increase your terminal width to at least 80 columns.

**Colors not showing:**
Make sure you're using a modern terminal (iTerm2, Terminal.app, Windows Terminal, etc.).
