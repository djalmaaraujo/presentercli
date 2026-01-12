/**
 * Markdown renderer for terminal display
 */

import { marked, Token, Tokens } from 'marked';
import chalk from 'chalk';
import figlet from 'figlet';
import { Theme } from './types';
import { wrapText, centerText, getTerminalSize } from './terminal-utils';

export class MarkdownRenderer {
  private cache: Map<string, string> = new Map();
  private currentRenderSlideId: string | null = null;
  private presentationMode: boolean = false;

  constructor(private theme: Theme, presentationMode: boolean = false) {
    this.presentationMode = presentationMode;
  }

  /**
   * Render markdown to terminal-formatted text
   */
  async renderSlide(markdown: string, slideId: string): Promise<string> {
    // Check cache first
    if (this.cache.has(slideId)) {
      return this.cache.get(slideId)!;
    }

    // Parse markdown to tokens
    const tokens = marked.lexer(markdown);

    const rendered = await this.renderTokens(tokens, slideId);

    this.cache.set(slideId, rendered);

    return rendered;
  }

  /**
   * Render parsed markdown tokens
   */
  private async renderTokens(tokens: Token[], slideId: string): Promise<string> {
    const lines: string[] = [];
    const termSize = getTerminalSize();
    const maxWidth = Math.min(this.theme.layout.maxWidth, termSize.width - this.theme.layout.padding * 2);

    for (const token of tokens) {
      const rendered = await this.renderToken(token, maxWidth);

      // Simulate processing delay for syntax highlighting
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));

      if (rendered) {
        lines.push(rendered);
      }
    }

    return lines.join('\n');
  }

  /**
   * Render individual token
   */
  private async renderToken(token: Token, maxWidth: number): Promise<string> {
    switch (token.type) {
      case 'heading':
        return this.renderHeading(token as Tokens.Heading, maxWidth);

      case 'paragraph':
        return this.renderParagraph(token as Tokens.Paragraph, maxWidth);

      case 'list':
        return this.renderList(token as Tokens.List, maxWidth);

      case 'code':
        return this.renderCode(token as Tokens.Code, maxWidth);

      case 'hr':
        return this.renderHorizontalRule(maxWidth);

      case 'space':
        return '';

      default:
        return '';
    }
  }

  /**
   * Render heading
   */
  private renderHeading(token: Tokens.Heading, maxWidth: number): string {
    const text = this.renderInlineContent(token.text);
    const style = token.depth === 1 ? this.theme.styles.h1 : this.theme.styles.h2;

    let styledText = text;

    // In presentation mode, use large banner text for h1
    if (this.presentationMode && token.depth === 1) {
      try {
        // Use raw text for figlet (before inline rendering adds ANSI codes)
        let cleanText = token.text.replace(/[\u{1F300}-\u{1F9FF}]/gu, '');
        // Remove markdown syntax that figlet doesn't need
        cleanText = cleanText.replace(/[*_`]/g, '');
        cleanText = cleanText.trim();

        // Only use figlet for reasonably short titles
        if (cleanText.length > 0 && cleanText.length <= 50) {
          // Use figlet for large text (synchronous version)
          const bannerText = figlet.textSync(cleanText, {
            font: 'Big',
            horizontalLayout: 'default',
            verticalLayout: 'default',
            width: maxWidth,
            whitespaceBreak: true
          });

          // Check if figlet produced valid output and isn't too tall
          if (bannerText && bannerText.trim().length > 0) {
            const lines = bannerText.split('\n').filter(line => line.trim().length > 0);

            // Skip figlet if it's too tall (would get cut off)
            if (lines.length <= 10) {
              const color = this.getColor(style.color);
              const styledLines = lines.map(line => color(chalk.bold(line)));

              // Always center h1 in presentation mode
              const centered = styledLines.map(line =>
                centerText(line, maxWidth)
              ).join('\n');

              return '\n\n' + centered + '\n\n';
            }
          }
        }
      } catch (err) {
        // Fall back to regular rendering if figlet fails
        console.error('Figlet error:', err);
      }
    }

    // Regular rendering for h2+ or if presentation mode is off
    // Apply color
    const color = this.getColor(style.color);
    styledText = color(styledText);

    // Apply text styles (make everything bold in presentation mode)
    if (this.presentationMode || style.bold) styledText = chalk.bold(styledText);
    if (style.italic) styledText = chalk.italic(styledText);
    if (style.underline) styledText = chalk.underline(styledText);

    // Increase margins in presentation mode
    const marginTop = this.presentationMode ? (token.depth === 1 ? 3 : 2) : (style.marginTop || 0);
    const marginBottom = this.presentationMode ? (token.depth === 1 ? 3 : 2) : (style.marginBottom || 0);

    // Center if needed
    const centered = this.theme.layout.centerContent ? centerText(styledText, maxWidth) : styledText;

    return '\n'.repeat(marginTop) + centered + '\n'.repeat(marginBottom);
  }


  /**
   * Render paragraph
   */
  private renderParagraph(token: Tokens.Paragraph, maxWidth: number): string {
    const text = this.renderInlineContent(token.text);
    const color = this.getColor(this.theme.colors.text);
    const wrapped = wrapText(text, maxWidth);

    // In presentation mode, use bold and more spacing
    if (this.presentationMode) {
      return wrapped.map(line => color(chalk.bold(line))).join('\n') + '\n\n';
    }

    return wrapped.map(line => color(line)).join('\n') + '\n';
  }

  /**
   * Render list
   */
  private renderList(token: Tokens.List, maxWidth: number): string {
    const lines: string[] = [];
    const bullet = this.presentationMode ? '●' : (this.theme.styles.list?.bullet || '•');
    const indent = this.presentationMode ? 4 : (this.theme.styles.list?.indent || 2);
    const color = this.getColor(this.theme.colors.text);

    token.items.forEach((item, index) => {
      const marker = token.ordered ? `${index + 1}.` : bullet;
      const itemText = this.renderInlineContent(item.text);
      const prefix = ' '.repeat(indent) + marker + ' ';
      const wrappedLines = wrapText(itemText, maxWidth - prefix.length);

      wrappedLines.forEach((line, lineIndex) => {
        const styledLine = this.presentationMode ? chalk.bold(line) : line;
        if (lineIndex === 0) {
          lines.push(color(prefix + styledLine));
        } else {
          lines.push(color(' '.repeat(prefix.length) + styledLine));
        }
      });

      // Add spacing between list items in presentation mode
      if (this.presentationMode) {
        lines.push('');
      }
    });

    return lines.join('\n') + '\n';
  }

  /**
   * Render code block
   */
  private renderCode(token: Tokens.Code, maxWidth: number): string {
    const codeStyle = this.theme.styles.code;
    const padding = codeStyle.padding || 1;
    const codeColor = this.getColor(codeStyle.color);

    const lines = token.text.split('\n');
    const paddedLines = [
      '',
      ...lines.map(line => ' '.repeat(padding) + line),
      '',
    ];

    return paddedLines.map(line => codeColor(line)).join('\n') + '\n';
  }

  /**
   * Render horizontal rule
   */
  private renderHorizontalRule(maxWidth: number): string {
    const color = this.getColor(this.theme.colors.dim);
    return color('─'.repeat(maxWidth)) + '\n';
  }

  /**
   * Render inline content (bold, italic, inline code)
   */
  private renderInlineContent(text: string): string {
    // Simple inline rendering
    let rendered = text;

    // Inline code: `code`
    rendered = rendered.replace(/`([^`]+)`/g, (_, code) => {
      return chalk.bgBlack(this.getColor(this.theme.colors.code)(code));
    });

    // Bold: **text** or __text__
    rendered = rendered.replace(/\*\*([^*]+)\*\*/g, (_, text) => chalk.bold(text));
    rendered = rendered.replace(/__([^_]+)__/g, (_, text) => chalk.bold(text));

    // Italic: *text* or _text_
    rendered = rendered.replace(/\*([^*]+)\*/g, (_, text) => chalk.italic(text));
    rendered = rendered.replace(/_([^_]+)_/g, (_, text) => chalk.italic(text));

    return rendered;
  }

  /**
   * Get chalk color function from color string
   */
  private getColor(colorName: string): chalk.Chalk {
    // Map color names to chalk functions
    const colorMap: Record<string, chalk.Chalk> = {
      primary: chalk.hex(this.theme.colors.primary),
      secondary: chalk.hex(this.theme.colors.secondary),
      text: chalk.hex(this.theme.colors.text),
      dim: chalk.hex(this.theme.colors.dim),
      code: chalk.hex(this.theme.colors.code),
    };

    return colorMap[colorName] || chalk.hex(colorName);
  }

  /**
   * Clear the render cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Update theme and clear cache
   */
  updateTheme(theme: Theme): void {
    this.theme = theme;
    this.clearCache();
  }

  /**
   * Check if a title would render as ASCII art in presentation mode
   * Returns { willRender: boolean, reason?: string }
   */
  checkTitleRendering(title: string): { willRender: boolean; reason?: string } {
    if (!this.presentationMode) {
      return { willRender: false, reason: 'Not in presentation mode' };
    }

    // Clean the text same way as render
    let cleanText = title.replace(/[\u{1F300}-\u{1F9FF}]/gu, '');
    cleanText = cleanText.replace(/[*_`]/g, '');
    cleanText = cleanText.trim();

    if (cleanText.length === 0) {
      return { willRender: false, reason: 'Empty after cleaning' };
    }

    if (cleanText.length > 50) {
      return { willRender: false, reason: `Too long (${cleanText.length} chars, max 50)` };
    }

    try {
      const bannerText = figlet.textSync(cleanText, {
        font: 'Big',
        horizontalLayout: 'default',
        verticalLayout: 'default',
        width: 80,
        whitespaceBreak: true
      });

      if (!bannerText || bannerText.trim().length === 0) {
        return { willRender: false, reason: 'Figlet produced no output' };
      }

      const lines = bannerText.split('\n').filter(line => line.trim().length > 0);
      if (lines.length > 10) {
        return { willRender: false, reason: `Too tall (${lines.length} lines, max 10)` };
      }

      return { willRender: true };
    } catch (err) {
      return { willRender: false, reason: 'Figlet error' };
    }
  }
}
