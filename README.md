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
