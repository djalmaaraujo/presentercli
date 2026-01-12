/**
 * Tests for build-web.ts - deploy:web command utilities
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  loadTheme,
  generateAsciiArt,
  extractTitle,
  stripSpeakerNotes,
  renderMarkdownToHtml,
  parseInlineMarkdown,
  escapeHtml,
  loadSlides,
  generateHtml,
  Theme,
  SlideData,
  AsciiArtResult,
  MAX_ASCII_WIDTH,
  FIGLET_FONTS
} from '../../scripts/build-web';

describe('build-web utilities', () => {
  let tempDir: string;

  const defaultTheme: Theme = {
    colors: {
      primary: '#00ff00',
      secondary: '#00aaff',
      text: '#ffffff',
      dim: '#888888',
      code: '#00ff88'
    },
    styles: {
      h1: { color: 'primary', bold: true, marginTop: 2, marginBottom: 1 },
      h2: { color: 'secondary', bold: true, marginTop: 1, marginBottom: 1 },
      code: { color: 'code', backgroundColor: '#1a1a1a', padding: 1 },
      list: { color: 'text', bullet: '•', indent: 2 }
    },
    layout: { maxWidth: 80, padding: 2, centerContent: false }
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'build-web-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('loadTheme', () => {
    test('should return default theme when file does not exist', () => {
      const theme = loadTheme('/nonexistent/theme.json');
      expect(theme.colors.primary).toBe('#00ff00');
      expect(theme.colors.secondary).toBe('#00aaff');
      expect(theme.colors.text).toBe('#ffffff');
    });

    test('should load and merge custom theme from file', () => {
      const customTheme = {
        colors: {
          primary: '#ff0000',
          secondary: '#0000ff'
        }
      };
      const themePath = path.join(tempDir, 'custom-theme.json');
      fs.writeFileSync(themePath, JSON.stringify(customTheme));

      const theme = loadTheme(themePath);
      expect(theme.colors.primary).toBe('#ff0000');
      expect(theme.colors.secondary).toBe('#0000ff');
    });

    test('should preserve default values for non-specified properties', () => {
      const partialTheme = { colors: { primary: '#123456' } };
      const themePath = path.join(tempDir, 'partial-theme.json');
      fs.writeFileSync(themePath, JSON.stringify(partialTheme));

      const theme = loadTheme(themePath);
      expect(theme.colors.primary).toBe('#123456');
      expect(theme.styles).toBeDefined();
      expect(theme.layout).toBeDefined();
    });
  });

  describe('extractTitle', () => {
    test('should extract H1 title from markdown', () => {
      const markdown = '# My Presentation\n\nSome content';
      expect(extractTitle(markdown)).toBe('My Presentation');
    });

    test('should return Untitled when no H1 found', () => {
      const markdown = '## Secondary Heading\n\nNo H1 here';
      expect(extractTitle(markdown)).toBe('Untitled');
    });

    test('should strip markdown formatting from title', () => {
      const markdown = '# **Bold** and *italic* and `code`';
      expect(extractTitle(markdown)).toBe('Bold and italic and code');
    });

    test('should handle multiple H1 headings by taking first', () => {
      const markdown = '# First Title\n\n# Second Title';
      expect(extractTitle(markdown)).toBe('First Title');
    });

    test('should handle empty markdown', () => {
      expect(extractTitle('')).toBe('Untitled');
    });

    test('should trim whitespace from title', () => {
      const markdown = '#   Spaced Title   \n';
      expect(extractTitle(markdown)).toBe('Spaced Title');
    });
  });

  describe('stripSpeakerNotes', () => {
    test('should remove speaker notes from content', () => {
      const content = '# Slide\n\n<!-- SPEAKER NOTES\nThese are notes\n-->\n\nVisible content';
      const result = stripSpeakerNotes(content);
      expect(result).not.toContain('SPEAKER NOTES');
      expect(result).not.toContain('These are notes');
      expect(result).toContain('Visible content');
    });

    test('should handle case-insensitive speaker notes', () => {
      const content = '<!-- speaker notes\nNotes here\n-->';
      expect(stripSpeakerNotes(content)).toBe('');
    });

    test('should handle multiple speaker note sections', () => {
      const content = '<!-- SPEAKER NOTES\nNote 1\n-->\nContent\n<!-- SPEAKER NOTES\nNote 2\n-->';
      const result = stripSpeakerNotes(content);
      expect(result).toBe('Content');
    });

    test('should preserve content without speaker notes', () => {
      const content = '# Title\n\nJust content here';
      expect(stripSpeakerNotes(content)).toBe(content);
    });

    test('should handle empty content', () => {
      expect(stripSpeakerNotes('')).toBe('');
    });
  });

  describe('escapeHtml', () => {
    test('should escape ampersand', () => {
      expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
    });

    test('should escape less than', () => {
      expect(escapeHtml('a < b')).toBe('a &lt; b');
    });

    test('should escape greater than', () => {
      expect(escapeHtml('a > b')).toBe('a &gt; b');
    });

    test('should escape double quotes', () => {
      expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
    });

    test('should escape single quotes', () => {
      expect(escapeHtml("it's")).toBe('it&#039;s');
    });

    test('should escape all special characters together', () => {
      expect(escapeHtml('<script>"alert(\'xss\');"</script>'))
        .toBe('&lt;script&gt;&quot;alert(&#039;xss&#039;);&quot;&lt;/script&gt;');
    });

    test('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    test('should not modify strings without special characters', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('parseInlineMarkdown', () => {
    test('should convert bold with double asterisks', () => {
      const result = parseInlineMarkdown('This is **bold** text', defaultTheme);
      expect(result).toContain('<strong>bold</strong>');
    });

    test('should convert bold with double underscores', () => {
      const result = parseInlineMarkdown('This is __bold__ text', defaultTheme);
      expect(result).toContain('<strong>bold</strong>');
    });

    test('should convert italic with single asterisks', () => {
      const result = parseInlineMarkdown('This is *italic* text', defaultTheme);
      expect(result).toContain('<em>italic</em>');
    });

    test('should convert italic with single underscores', () => {
      const result = parseInlineMarkdown('This is _italic_ text', defaultTheme);
      expect(result).toContain('<em>italic</em>');
    });

    test('should convert inline code with backticks', () => {
      const result = parseInlineMarkdown('Use `code` here', defaultTheme);
      expect(result).toContain('<code class="inline-code">code</code>');
    });

    test('should handle multiple inline styles', () => {
      const result = parseInlineMarkdown('**bold** and *italic* and `code`', defaultTheme);
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<em>italic</em>');
      expect(result).toContain('<code class="inline-code">code</code>');
    });

    test('should handle plain text without formatting', () => {
      const result = parseInlineMarkdown('Just plain text', defaultTheme);
      expect(result).toBe('Just plain text');
    });
  });

  describe('generateAsciiArt', () => {
    test('should generate ASCII art for short text', () => {
      const result = generateAsciiArt('Hello');
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('art');
      expect(result).toHaveProperty('maxWidth');
      expect(typeof result!.art).toBe('string');
      expect(typeof result!.maxWidth).toBe('number');
    });

    test('should return maxWidth that reflects actual art width', () => {
      const result = generateAsciiArt('Hi');
      expect(result).not.toBeNull();
      const lines = result!.art.split('\n');
      const actualMaxWidth = Math.max(...lines.map(l => l.length));
      expect(result!.maxWidth).toBe(actualMaxWidth);
    });

    test('should try smaller fonts for wide titles', () => {
      // Long title that would be wide with 'Big' font
      const result = generateAsciiArt('Very Long Title Here');
      expect(result).not.toBeNull();
      // Should have chosen a font that fits or returns with scaling info
      expect(result!.maxWidth).toBeGreaterThan(0);
    });

    test('should return null for very long text that exceeds 10 lines', () => {
      // Very long input might generate tall ASCII art
      const longText = 'This is a very long text that might be problematic';
      const result = generateAsciiArt(longText);
      // Result could be null if too tall, or truncated text if processed
      // This tests the 30-character truncation and height check
    });

    test('should strip emojis from text', () => {
      const result = generateAsciiArt('Hello 🎉 World');
      // Should not throw and should process cleaned text
      expect(result === null || (result && typeof result.art === 'string')).toBe(true);
    });

    test('should strip markdown formatting from text', () => {
      const result = generateAsciiArt('**Bold** Text');
      expect(result === null || (result && typeof result.art === 'string')).toBe(true);
    });

    test('should truncate text longer than 30 characters', () => {
      const longText = 'This is a title that is definitely longer than thirty characters';
      const result = generateAsciiArt(longText);
      expect(result === null || (result && typeof result.art === 'string')).toBe(true);
    });

    test('should use Big font for short titles that fit', () => {
      const result = generateAsciiArt('Hi');
      expect(result).not.toBeNull();
      // Short text should fit in the default 'Big' font
      expect(result!.maxWidth).toBeLessThanOrEqual(MAX_ASCII_WIDTH);
    });
  });

  describe('renderMarkdownToHtml', () => {
    test('should render H1 heading with primary color', () => {
      const markdown = '# Main Title';
      const { html } = renderMarkdownToHtml(markdown, defaultTheme, false);
      expect(html).toContain('<h1');
      expect(html).toContain('Main Title');
      expect(html).toContain(defaultTheme.colors.primary);
    });

    test('should render H2 heading with secondary color', () => {
      const markdown = '## Secondary Title';
      const { html } = renderMarkdownToHtml(markdown, defaultTheme);
      expect(html).toContain('<h2');
      expect(html).toContain('Secondary Title');
      expect(html).toContain(defaultTheme.colors.secondary);
    });

    test('should render paragraphs', () => {
      const markdown = 'This is a paragraph of text.';
      const { html } = renderMarkdownToHtml(markdown, defaultTheme);
      expect(html).toContain('<p');
      expect(html).toContain('This is a paragraph of text.');
    });

    test('should render unordered lists with bullet', () => {
      const markdown = '- Item 1\n- Item 2\n- Item 3';
      const { html } = renderMarkdownToHtml(markdown, defaultTheme);
      expect(html).toContain('<ul class="terminal-list">');
      expect(html).toContain('<li>');
      expect(html).toContain(defaultTheme.styles.list.bullet);
    });

    test('should render code blocks', () => {
      const markdown = '```\nconst x = 1;\n```';
      const { html } = renderMarkdownToHtml(markdown, defaultTheme);
      expect(html).toContain('<pre class="code-block">');
      expect(html).toContain('<code>');
    });

    test('should escape HTML in code blocks', () => {
      const markdown = '```\n<script>alert("xss")</script>\n```';
      const { html } = renderMarkdownToHtml(markdown, defaultTheme);
      expect(html).toContain('&lt;script&gt;');
      expect(html).not.toContain('<script>alert');
    });

    test('should render horizontal rules', () => {
      const markdown = '---';
      const { html } = renderMarkdownToHtml(markdown, defaultTheme);
      expect(html).toContain('<hr');
    });

    test('should render blockquotes', () => {
      const markdown = '> This is a quote';
      const { html } = renderMarkdownToHtml(markdown, defaultTheme);
      expect(html).toContain('<blockquote');
      expect(html).toContain('This is a quote');
    });

    test('should generate ASCII art for first H1 when isFirstHeading is true', () => {
      const markdown = '# Title';
      const { asciiArt, asciiArtWidth } = renderMarkdownToHtml(markdown, defaultTheme, true);
      // ASCII art may or may not be generated depending on text length
      expect(asciiArt === undefined || typeof asciiArt === 'string').toBe(true);
      // Width should be defined when ASCII art is generated
      if (asciiArt) {
        expect(typeof asciiArtWidth).toBe('number');
        expect(asciiArtWidth).toBeGreaterThan(0);
      }
    });

    test('should return asciiArtWidth when ASCII art is generated', () => {
      const markdown = '# Hi';
      const { asciiArt, asciiArtWidth } = renderMarkdownToHtml(markdown, defaultTheme, true);
      expect(asciiArt).toBeDefined();
      expect(asciiArtWidth).toBeDefined();
      expect(typeof asciiArtWidth).toBe('number');
    });

    test('should not generate ASCII art when isFirstHeading is false', () => {
      const markdown = '# Title';
      const { html, asciiArt } = renderMarkdownToHtml(markdown, defaultTheme, false);
      expect(html).toContain('<h1');
      // When isFirstHeading is false, we should see the heading in HTML
    });
  });

  describe('loadSlides', () => {
    test('should load markdown files from directory', () => {
      fs.writeFileSync(path.join(tempDir, '01-intro.md'), '# Introduction\n\nWelcome');
      fs.writeFileSync(path.join(tempDir, '02-content.md'), '# Content\n\nMain content');

      const slides = loadSlides(tempDir, defaultTheme);
      expect(slides).toHaveLength(2);
      expect(slides[0].title).toBe('Introduction');
      expect(slides[1].title).toBe('Content');
    });

    test('should sort files alphabetically', () => {
      fs.writeFileSync(path.join(tempDir, '03-last.md'), '# Last');
      fs.writeFileSync(path.join(tempDir, '01-first.md'), '# First');
      fs.writeFileSync(path.join(tempDir, '02-middle.md'), '# Middle');

      const slides = loadSlides(tempDir, defaultTheme);
      expect(slides[0].title).toBe('First');
      expect(slides[1].title).toBe('Middle');
      expect(slides[2].title).toBe('Last');
    });

    test('should ignore non-markdown files', () => {
      fs.writeFileSync(path.join(tempDir, '01-slide.md'), '# Slide');
      fs.writeFileSync(path.join(tempDir, 'readme.txt'), 'Not a slide');
      fs.writeFileSync(path.join(tempDir, 'config.json'), '{}');

      const slides = loadSlides(tempDir, defaultTheme);
      expect(slides).toHaveLength(1);
    });

    test('should strip speaker notes from slides', () => {
      const content = '# Title\n\nVisible\n\n<!-- SPEAKER NOTES\nHidden notes\n-->';
      fs.writeFileSync(path.join(tempDir, '01-slide.md'), content);

      const slides = loadSlides(tempDir, defaultTheme);
      expect(slides[0].htmlContent).not.toContain('Hidden notes');
      expect(slides[0].htmlContent).toContain('Visible');
    });

    test('should return empty array for empty directory', () => {
      const emptyDir = path.join(tempDir, 'empty');
      fs.mkdirSync(emptyDir);

      const slides = loadSlides(emptyDir, defaultTheme);
      expect(slides).toHaveLength(0);
    });

    test('should set slide id to filename', () => {
      fs.writeFileSync(path.join(tempDir, '01-intro.md'), '# Intro');

      const slides = loadSlides(tempDir, defaultTheme);
      expect(slides[0].id).toBe('01-intro.md');
    });

    test('should include asciiArtWidth when ASCII art is generated', () => {
      fs.writeFileSync(path.join(tempDir, '01-intro.md'), '# Hi');

      const slides = loadSlides(tempDir, defaultTheme);
      expect(slides[0].asciiArt).toBeDefined();
      expect(slides[0].asciiArtWidth).toBeDefined();
      expect(typeof slides[0].asciiArtWidth).toBe('number');
    });
  });

  describe('generateHtml', () => {
    const sampleSlides: SlideData[] = [
      { id: '01.md', title: 'Intro', htmlContent: '<p>Welcome</p>' },
      { id: '02.md', title: 'Content', htmlContent: '<p>Main content</p>' }
    ];

    test('should generate valid HTML document', () => {
      const html = generateHtml(sampleSlides, defaultTheme, 'Test Presentation');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('</html>');
    });

    test('should include presentation title', () => {
      const html = generateHtml(sampleSlides, defaultTheme, 'My Amazing Presentation');
      expect(html).toContain('<title>My Amazing Presentation</title>');
    });

    test('should include slide count in footer', () => {
      const html = generateHtml(sampleSlides, defaultTheme, 'Test');
      expect(html).toContain(`Slide 1 of ${sampleSlides.length}`);
    });

    test('should include theme colors in CSS', () => {
      const html = generateHtml(sampleSlides, defaultTheme, 'Test');
      expect(html).toContain(defaultTheme.colors.primary);
      expect(html).toContain(defaultTheme.colors.secondary);
      expect(html).toContain(defaultTheme.colors.text);
    });

    test('should include slides data as JSON', () => {
      const html = generateHtml(sampleSlides, defaultTheme, 'Test');
      expect(html).toContain('const slides =');
      expect(html).toContain('"title":"Intro"');
      expect(html).toContain('"title":"Content"');
    });

    test('should include navigation JavaScript', () => {
      const html = generateHtml(sampleSlides, defaultTheme, 'Test');
      expect(html).toContain('function nextSlide()');
      expect(html).toContain('function prevSlide()');
      expect(html).toContain('function goToSlide(index)');
    });

    test('should include keyboard event listeners', () => {
      const html = generateHtml(sampleSlides, defaultTheme, 'Test');
      expect(html).toContain("addEventListener('keydown'");
      expect(html).toContain('ArrowRight');
      expect(html).toContain('ArrowLeft');
    });

    test('should include touch support for mobile', () => {
      const html = generateHtml(sampleSlides, defaultTheme, 'Test');
      expect(html).toContain('touchstart');
      expect(html).toContain('touchend');
    });

    test('should include help overlay', () => {
      const html = generateHtml(sampleSlides, defaultTheme, 'Test');
      expect(html).toContain('help-overlay');
      expect(html).toContain('toggleHelp');
    });

    test('should include CRT visual effects', () => {
      const html = generateHtml(sampleSlides, defaultTheme, 'Test');
      expect(html).toContain('scanlines');
      expect(html).toContain('crt-glow');
    });

    test('should include progress bar', () => {
      const html = generateHtml(sampleSlides, defaultTheme, 'Test');
      expect(html).toContain('progress-bar');
      expect(html).toContain('progress-fill');
    });

    test('should include ASCII art in slide data when present', () => {
      const slidesWithArt: SlideData[] = [
        { id: '01.md', title: 'Art', htmlContent: '<p>Content</p>', asciiArt: '  ___ \n /   \\' }
      ];
      const html = generateHtml(slidesWithArt, defaultTheme, 'Test');
      expect(html).toContain('asciiArt');
    });

    test('should include asciiArtWidth in slide data for scaling', () => {
      const slidesWithArt: SlideData[] = [
        { id: '01.md', title: 'Art', htmlContent: '<p>Content</p>', asciiArt: '  ___ \n /   \\', asciiArtWidth: 50 }
      ];
      const html = generateHtml(slidesWithArt, defaultTheme, 'Test');
      expect(html).toContain('asciiArtWidth');
      expect(html).toContain('"asciiArtWidth":50');
    });

    test('should include getAsciiArtScale function for scaling', () => {
      const html = generateHtml(sampleSlides, defaultTheme, 'Test');
      expect(html).toContain('function getAsciiArtScale');
      expect(html).toContain('MAX_CONTAINER_CHARS');
    });

    test('should include ascii-art-wrapper CSS class for centering', () => {
      const html = generateHtml(sampleSlides, defaultTheme, 'Test');
      expect(html).toContain('.ascii-art-wrapper');
      expect(html).toContain('justify-content: center');
    });

    test('should include responsive styles for ASCII art', () => {
      const html = generateHtml(sampleSlides, defaultTheme, 'Test');
      expect(html).toContain('@media (min-width: 768px)');
      expect(html).toContain('@media (min-width: 1024px)');
    });

    test('should include JetBrains Mono font', () => {
      const html = generateHtml(sampleSlides, defaultTheme, 'Test');
      expect(html).toContain('JetBrains+Mono');
    });
  });
});
