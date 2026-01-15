#!/usr/bin/env npx ts-node
import * as fs from "fs";
import * as path from "path";
import figlet from "figlet";
import { marked, Tokens } from "marked";

interface SlideData {
  id: string;
  title: string;
  htmlContent: string;
  asciiArt?: string;
  asciiArtWidth?: number;
}

interface Theme {
  colors: {
    primary: string;
    secondary: string;
    text: string;
    dim: string;
    code: string;
  };
  styles: {
    h1: {
      color: string;
      bold: boolean;
      marginTop: number;
      marginBottom: number;
    };
    h2: {
      color: string;
      bold: boolean;
      marginTop: number;
      marginBottom: number;
    };
    code: { color: string; backgroundColor: string; padding: number };
    list: { color: string; bullet: string; indent: number };
  };
  layout: { maxWidth: number; padding: number; centerContent: boolean };
}

function loadTheme(themePath: string): Theme {
  const defaultTheme: Theme = {
    colors: {
      primary: "#00ff00",
      secondary: "#00aaff",
      text: "#ffffff",
      dim: "#888888",
      code: "#00ff88",
    },
    styles: {
      h1: { color: "primary", bold: true, marginTop: 2, marginBottom: 1 },
      h2: { color: "secondary", bold: true, marginTop: 1, marginBottom: 1 },
      code: { color: "code", backgroundColor: "#1a1a1a", padding: 1 },
      list: { color: "text", bullet: "•", indent: 2 },
    },
    layout: { maxWidth: 80, padding: 2, centerContent: false },
  };

  if (fs.existsSync(themePath)) {
    const themeContent = fs.readFileSync(themePath, "utf-8");
    return { ...defaultTheme, ...JSON.parse(themeContent) };
  }
  return defaultTheme;
}

interface AsciiArtResult {
  art: string;
  maxWidth: number;
}

// Figlet fonts in order of preference (largest to smallest)
type FigletFont = "Big" | "Standard" | "Small";
const FIGLET_FONTS: FigletFont[] = ["Big", "Standard", "Small"];
const MAX_ASCII_WIDTH = 80;

function generateAsciiArt(text: string): AsciiArtResult | null {
  try {
    // Clean text - remove emojis and markdown syntax
    let cleanText = text
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
      .replace(/[*_`]/g, "")
      .trim();

    if (cleanText.length > 30) {
      cleanText = cleanText.substring(0, 30);
    }

    // Try fonts in order, picking the largest one that fits
    for (const font of FIGLET_FONTS) {
      const art = figlet.textSync(cleanText, {
        font,
        horizontalLayout: "default",
        verticalLayout: "default",
      });

      const lines = art.split("\n");
      const maxWidth = Math.max(...lines.map((line) => line.length));

      // Skip if too tall
      if (lines.length > 10) {
        continue;
      }

      // If it fits within our max width, use this font
      if (maxWidth <= MAX_ASCII_WIDTH) {
        return { art, maxWidth };
      }
    }

    // If no font fits, use the smallest font and let CSS scale it
    const art = figlet.textSync(cleanText, {
      font: "Small",
      horizontalLayout: "default",
      verticalLayout: "default",
    });

    const lines = art.split("\n");
    if (lines.length > 10) {
      return null;
    }

    const maxWidth = Math.max(...lines.map((line) => line.length));
    return { art, maxWidth };
  } catch {
    return null;
  }
}

function extractTitle(markdown: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].replace(/[*_`]/g, "").trim() : "Untitled";
}

function stripSpeakerNotes(content: string): string {
  return content.replace(/<!--\s*SPEAKER\s+NOTES[\s\S]*?-->/gi, "").trim();
}

function renderMarkdownToHtml(
  markdown: string,
  theme: Theme,
  isFirstHeading: boolean = true
): { html: string; asciiArt?: string; asciiArtWidth?: number } {
  const tokens = marked.lexer(markdown);
  let html = "";
  let asciiArt: string | undefined;
  let asciiArtWidth: number | undefined;
  let firstH1Found = false;

  for (const token of tokens) {
    switch (token.type) {
      case "heading": {
        const headingToken = token as Tokens.Heading;
        const colorKey = headingToken.depth === 1 ? "primary" : "secondary";
        const color = theme.colors[colorKey];

        if (headingToken.depth === 1 && isFirstHeading && !firstH1Found) {
          firstH1Found = true;
          const artResult = generateAsciiArt(headingToken.text);
          if (artResult) {
            asciiArt = artResult.art;
            asciiArtWidth = artResult.maxWidth;
            // Don't add the heading text, we'll use ASCII art instead
            continue;
          }
        }

        const boldStyle = headingToken.depth <= 2 ? "font-weight: bold;" : "";
        html += `<h${
          headingToken.depth
        } style="color: ${color}; ${boldStyle}">${parseInlineMarkdown(
          headingToken.text,
          theme
        )}</h${headingToken.depth}>\n`;
        break;
      }
      case "paragraph": {
        const paragraphToken = token as Tokens.Paragraph;
        html += `<p style="color: ${theme.colors.text};">${parseInlineMarkdown(
          paragraphToken.text,
          theme
        )}</p>\n`;
        break;
      }
      case "list": {
        const listToken = token as Tokens.List;
        const bullet = theme.styles.list.bullet;
        html += '<ul class="terminal-list">\n';
        for (const item of listToken.items) {
          html += `<li><span class="bullet">${bullet}</span> ${parseInlineMarkdown(
            item.text,
            theme
          )}</li>\n`;
        }
        html += "</ul>\n";
        break;
      }
      case "code": {
        const codeToken = token as Tokens.Code;
        html += `<pre class="code-block"><code>${escapeHtml(
          codeToken.text
        )}</code></pre>\n`;
        break;
      }
      case "hr": {
        html += `<hr style="border-color: ${theme.colors.dim}; border-style: dashed;" />\n`;
        break;
      }
      case "blockquote": {
        const blockquoteToken = token as Tokens.Blockquote;
        html += `<blockquote style="color: ${
          theme.colors.dim
        }; border-left: 2px solid ${
          theme.colors.dim
        }; padding-left: 1em;">${parseInlineMarkdown(
          blockquoteToken.text,
          theme
        )}</blockquote>\n`;
        break;
      }
      case "image": {
        const imageToken = token as Tokens.Image;
        html += `<img src="${escapeHtml(imageToken.href)}" alt="${escapeHtml(
          imageToken.text || ""
        )}" style="max-width: 100%; height: auto; margin: 1rem 0;" />\n`;
        break;
      }
      case "table": {
        const tableToken = token as Tokens.Table;
        html += '<table class="terminal-table">\n<thead>\n<tr>\n';
        for (const cell of tableToken.header) {
          html += `<th>${parseInlineMarkdown(cell.text, theme)}</th>\n`;
        }
        html += '</tr>\n</thead>\n<tbody>\n';
        for (const row of tableToken.rows) {
          html += '<tr>\n';
          for (const cell of row) {
            html += `<td>${parseInlineMarkdown(cell.text, theme)}</td>\n`;
          }
          html += '</tr>\n';
        }
        html += '</tbody>\n</table>\n';
        break;
      }
    }
  }

  return { html, asciiArt, asciiArtWidth };
}

function parseInlineMarkdown(text: string, theme: Theme): string {
  // Images (must come before other replacements)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" style="max-width: 100%; height: auto; margin: 1rem 0;" />`;
  });

  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/__(.+?)__/g, "<strong>$1</strong>");

  // Italic
  text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");
  text = text.replace(/_(.+?)_/g, "<em>$1</em>");

  // Inline code
  text = text.replace(/`(.+?)`/g, `<code class="inline-code">$1</code>`);

  return text;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function loadSlides(slidesDir: string, theme: Theme): SlideData[] {
  const files = fs
    .readdirSync(slidesDir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  return files.map((file) => {
    const filePath = path.join(slidesDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const cleanContent = stripSpeakerNotes(content);
    const title = extractTitle(cleanContent);
    const { html, asciiArt, asciiArtWidth } = renderMarkdownToHtml(
      cleanContent,
      theme
    );

    return {
      id: file,
      title,
      htmlContent: html,
      asciiArt,
      asciiArtWidth,
    };
  });
}

function generateHtml(
  slides: SlideData[],
  theme: Theme,
  presentationTitle: string
): string {
  const slidesJson = JSON.stringify(
    slides.map((s) => ({
      title: s.title,
      content: s.htmlContent,
      asciiArt: s.asciiArt,
      asciiArtWidth: s.asciiArtWidth,
    }))
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${presentationTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      background-color: #0a0a0a;
      color: ${theme.colors.text};
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .container {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 2rem;
      max-width: 100ch;
      margin: 0 auto;
      width: 100%;
    }

    .slide {
      width: 100%;
      display: none;
      animation: fadeIn 0.3s ease-in-out;
    }

    .slide.active {
      display: block;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .ascii-art-wrapper {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .ascii-art {
      color: ${theme.colors.primary};
      font-size: 0.6rem;
      line-height: 1.1;
      white-space: pre;
      font-weight: bold;
      text-shadow: 0 0 10px ${theme.colors.primary}40;
      transform-origin: center center;
      display: inline-block;
    }

    @media (min-width: 768px) {
      .ascii-art {
        font-size: 0.8rem;
      }
    }

    @media (min-width: 1024px) {
      .ascii-art {
        font-size: 1rem;
      }
    }

    @media (min-width: 1280px) and (max-width: 1439px) {
      .container {
        zoom: 1.2;
      }
    }

    @media (min-width: 1440px) {
      .container {
        zoom: 1.5;
      }
    }

    h1 {
      color: ${theme.colors.primary};
      font-size: 2rem;
      margin-bottom: 1rem;
      font-weight: bold;
      text-shadow: 0 0 10px ${theme.colors.primary}40;
    }

    h2 {
      color: ${theme.colors.secondary};
      font-size: 1.5rem;
      margin-bottom: 0.75rem;
      font-weight: bold;
    }

    h3 {
      color: ${theme.colors.secondary};
      font-size: 1.25rem;
      margin-bottom: 0.5rem;
    }

    p {
      margin-bottom: 1rem;
      line-height: 1.6;
    }

    .terminal-list {
      list-style: none;
      margin-bottom: 1rem;
    }

    .terminal-list li {
      margin-bottom: 0.5rem;
      padding-left: 1.5rem;
      position: relative;
      line-height: 1.6;
    }

    .terminal-list .bullet {
      position: absolute;
      left: 0;
      color: ${theme.colors.primary};
    }

    .code-block {
      background-color: ${theme.styles.code.backgroundColor};
      color: ${theme.colors.code};
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;
      overflow-x: auto;
      border: 1px solid #333;
    }

    .code-block code {
      font-family: inherit;
    }

    .inline-code {
      background-color: ${theme.styles.code.backgroundColor};
      color: ${theme.colors.code};
      padding: 0.15rem 0.4rem;
      border-radius: 3px;
      font-size: 0.9em;
    }

    strong {
      color: ${theme.colors.text};
      font-weight: bold;
    }

    em {
      font-style: italic;
      color: ${theme.colors.dim};
    }

    hr {
      border: none;
      border-top: 1px dashed ${theme.colors.dim};
      margin: 1.5rem 0;
    }

    blockquote {
      border-left: 2px solid ${theme.colors.dim};
      padding-left: 1rem;
      color: ${theme.colors.dim};
      margin-bottom: 1rem;
      font-style: italic;
    }

    .terminal-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }

    .terminal-table th,
    .terminal-table td {
      border: 1px solid ${theme.colors.dim};
      padding: 0.5rem 0.75rem;
      text-align: left;
    }

    .terminal-table th {
      background-color: #1a1a1a;
      color: ${theme.colors.secondary};
      font-weight: bold;
    }

    .terminal-table td {
      color: ${theme.colors.text};
    }

    .terminal-table tr:nth-child(even) td {
      background-color: rgba(255, 255, 255, 0.02);
    }

    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      padding: 1rem 2rem;
      background: linear-gradient(transparent, #0a0a0a 30%);
      color: ${theme.colors.dim};
      font-size: 0.85rem;
    }

    .footer-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .progress-bar {
      width: 100px;
      height: 4px;
      background: #333;
      border-radius: 2px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: ${theme.colors.primary};
      transition: width 0.3s ease;
    }

    .help-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.9);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 100;
    }

    .help-overlay.active {
      display: flex;
    }

    .help-content {
      background: #1a1a1a;
      padding: 2rem;
      border-radius: 8px;
      border: 1px solid ${theme.colors.dim};
      max-width: 400px;
    }

    .help-content h2 {
      margin-bottom: 1rem;
    }

    .help-content .key {
      display: inline-block;
      background: #333;
      padding: 0.2rem 0.5rem;
      border-radius: 3px;
      margin-right: 0.5rem;
      min-width: 2rem;
      text-align: center;
    }

    .help-content li {
      margin-bottom: 0.5rem;
      list-style: none;
    }

    /* Scanline effect for extra terminal feel */
    .scanlines {
      pointer-events: none;
      position: fixed;
      inset: 0;
      background: repeating-linear-gradient(
        0deg,
        rgba(0, 0, 0, 0.1) 0px,
        rgba(0, 0, 0, 0.1) 1px,
        transparent 1px,
        transparent 2px
      );
      z-index: 1000;
    }

    /* CRT glow effect */
    .crt-glow {
      pointer-events: none;
      position: fixed;
      inset: 0;
      box-shadow: inset 0 0 100px rgba(0, 255, 0, 0.03);
      z-index: 999;
    }
  </style>
</head>
<body>
  <div class="scanlines"></div>
  <div class="crt-glow"></div>

  <div class="container" id="slideContainer">
    <!-- Slides will be injected here -->
  </div>

  <div class="footer">
    <div class="footer-left">
      <span id="slideCounter">Slide 1 of ${slides.length}</span>
      <div class="progress-bar">
        <div class="progress-fill" id="progressFill"></div>
      </div>
    </div>
    <div>Press <span style="color: ${theme.colors.primary};">h</span> for help</div>
  </div>

  <div class="help-overlay" id="helpOverlay">
    <div class="help-content">
      <h2 style="color: ${theme.colors.primary};">Navigation</h2>
      <ul>
        <li><span class="key">\u2192</span> / <span class="key">n</span> / <span class="key">Space</span> Next slide</li>
        <li><span class="key">\u2190</span> / <span class="key">p</span> Previous slide</li>
        <li><span class="key">g</span> First slide</li>
        <li><span class="key">G</span> Last slide</li>
        <li><span class="key">1-9</span> Jump to slide</li>
        <li><span class="key">f</span> Toggle fullscreen</li>
        <li><span class="key">h</span> / <span class="key">?</span> Toggle help</li>
        <li><span class="key">Esc</span> Close help / Exit fullscreen</li>
      </ul>
      <p style="margin-top: 1.5rem; font-size: 0.8rem; color: ${theme.colors.dim};">
        Made with <a href="https://github.com/nb/presentercli" target="_blank" rel="noopener" style="color: ${theme.colors.secondary};">presentercli</a>
      </p>
    </div>
  </div>

  <script>
    const slides = ${slidesJson};
    let currentSlide = 0;

    const MAX_CONTAINER_CHARS = 80;

    function getAsciiArtScale(artWidth) {
      if (!artWidth || artWidth <= MAX_CONTAINER_CHARS) return 1;
      return MAX_CONTAINER_CHARS / artWidth;
    }

    function renderSlides() {
      const container = document.getElementById('slideContainer');
      container.innerHTML = slides.map((slide, index) => {
        if (slide.asciiArt) {
          const scale = getAsciiArtScale(slide.asciiArtWidth);
          const scaleStyle = scale < 1 ? \`transform: scale(\${scale}); margin: \${-(1-scale) * 2}rem 0;\` : '';
          return \`
            <div class="slide \${index === 0 ? 'active' : ''}" data-index="\${index}">
              <div class="ascii-art-wrapper">
                <pre class="ascii-art" style="\${scaleStyle}">\${escapeHtml(slide.asciiArt)}</pre>
              </div>
              \${slide.content}
            </div>
          \`;
        }
        return \`
          <div class="slide \${index === 0 ? 'active' : ''}" data-index="\${index}">
            \${slide.content}
          </div>
        \`;
      }).join('');
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function updateSlide() {
      document.querySelectorAll('.slide').forEach((slide, index) => {
        slide.classList.toggle('active', index === currentSlide);
      });
      document.getElementById('slideCounter').textContent = \`Slide \${currentSlide + 1} of \${slides.length}\`;
      document.getElementById('progressFill').style.width = \`\${((currentSlide + 1) / slides.length) * 100}%\`;
    }

    function nextSlide() {
      if (currentSlide < slides.length - 1) {
        currentSlide++;
        updateSlide();
      }
    }

    function prevSlide() {
      if (currentSlide > 0) {
        currentSlide--;
        updateSlide();
      }
    }

    function goToSlide(index) {
      if (index >= 0 && index < slides.length) {
        currentSlide = index;
        updateSlide();
      }
    }

    function toggleHelp() {
      document.getElementById('helpOverlay').classList.toggle('active');
    }

    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.log('Fullscreen not available:', err);
        });
      } else {
        document.exitFullscreen();
      }
    }

    document.addEventListener('keydown', (e) => {
      const helpOverlay = document.getElementById('helpOverlay');
      const helpActive = helpOverlay.classList.contains('active');

      if (helpActive) {
        if (e.key === 'Escape' || e.key === 'h' || e.key === '?') {
          toggleHelp();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
        case 'n':
        case ' ':
          e.preventDefault();
          nextSlide();
          break;
        case 'ArrowLeft':
        case 'p':
          e.preventDefault();
          prevSlide();
          break;
        case 'g':
          goToSlide(0);
          break;
        case 'G':
          goToSlide(slides.length - 1);
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'h':
        case '?':
          toggleHelp();
          break;
        default:
          // Number keys for direct slide access
          if (/^[1-9]$/.test(e.key)) {
            goToSlide(parseInt(e.key) - 1);
          }
          break;
      }
    });

    // Touch support for mobile
    let touchStartX = 0;
    document.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    });

    document.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX - touchEndX;

      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          nextSlide();
        } else {
          prevSlide();
        }
      }
    });

    // Initialize
    renderSlides();
    updateSlide();
  </script>
</body>
</html>`;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error(
      "Usage: npx ts-node scripts/build-web.ts <slides-directory> [output-file]"
    );
    console.error(
      "Example: npx ts-node scripts/build-web.ts ./brushing-teeth ./dist/presentation.html"
    );
    process.exit(1);
  }

  const slidesDir = path.resolve(args[0]);
  const outputFile = args[1]
    ? path.resolve(args[1])
    : path.join(slidesDir, "index.html");
  const themeFile = path.join(process.cwd(), "theme.json");

  if (!fs.existsSync(slidesDir)) {
    console.error(`Error: Slides directory not found: ${slidesDir}`);
    process.exit(1);
  }

  console.log(`Building web presentation from: ${slidesDir}`);

  const theme = loadTheme(themeFile);
  const slides = loadSlides(slidesDir, theme);

  if (slides.length === 0) {
    console.error("Error: No markdown files found in slides directory");
    process.exit(1);
  }

  const presentationTitle = slides[0].title || path.basename(slidesDir);
  const html = generateHtml(slides, theme, presentationTitle);

  // Ensure output directory exists
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputFile, html);

  console.log(`Generated: ${outputFile}`);
  console.log(`Slides: ${slides.length}`);
  console.log(`Title: ${presentationTitle}`);
}

// Only run main when executed directly (not when imported for testing)
if (require.main === module) {
  main().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
}

// Export functions for testing
export {
  loadTheme,
  generateAsciiArt,
  extractTitle,
  stripSpeakerNotes,
  renderMarkdownToHtml,
  parseInlineMarkdown,
  escapeHtml,
  loadSlides,
  generateHtml,
  SlideData,
  Theme,
  AsciiArtResult,
  MAX_ASCII_WIDTH,
  FIGLET_FONTS,
};
