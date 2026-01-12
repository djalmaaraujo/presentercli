/**
 * Theme manager for loading and applying themes
 */

import * as fs from 'fs';
import * as path from 'path';
import { Theme } from './types';

export class ThemeManager {
  private currentTheme: Theme | null = null;

  /**
   * Load theme from file
   */
  loadTheme(themePath: string): Theme {
    if (!fs.existsSync(themePath)) {
      throw new Error(`Theme file not found: ${themePath}`);
    }

    const themeContent = fs.readFileSync(themePath, 'utf-8');

    try {
      const theme = JSON.parse(themeContent) as Theme;
      this.validateTheme(theme);
      this.currentTheme = theme;
      return theme;
    } catch (error) {
      throw new Error(`Failed to parse theme file: ${error instanceof Error ? error.message.split(' at')[0] : 'Unknown error'}`);
    }
  }

  /**
   * Strip comments from JSON content
   */
  private stripJsonComments(content: string): string {
    // Remove single-line comments (// ...)
    let cleaned = content.replace(/\/\/.*$/gm, '');

    // Remove multi-line comments (/* ... */)
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

    return cleaned;
  }

  /**
   * Validate theme structure
   */
  private validateTheme(theme: any): void {
    if (!theme.colors) {
      throw new Error('Theme must include "colors" object');
    }

    if (!theme.styles) {
      throw new Error('Theme must include "styles" object');
    }

    if (!theme.layout) {
      throw new Error('Theme must include "layout" object');
    }

    // Validate required colors
    const requiredColors = ['primary', 'secondary', 'text', 'dim', 'code'];
    for (const color of requiredColors) {
      if (!theme.colors[color]) {
        throw new Error(`Theme colors must include "${color}"`);
      }
    }

    // Validate required styles
    if (!theme.styles.h1 || !theme.styles.h2 || !theme.styles.code) {
      throw new Error('Theme styles must include h1, h2, and code');
    }

    // Validate layout
    if (typeof theme.layout.maxWidth !== 'number' || typeof theme.layout.padding !== 'number') {
      throw new Error('Theme layout must include numeric maxWidth and padding');
    }
  }

  /**
   * Get current theme
   */
  getCurrentTheme(): Theme {
    if (!this.currentTheme) {
      throw new Error('No theme loaded');
    }
    return this.currentTheme;
  }

  /**
   * Get default theme
   */
  static getDefaultTheme(): Theme {
    return {
      colors: {
        primary: '#00ff00',
        secondary: '#00aaff',
        text: '#ffffff',
        dim: '#888888',
        code: '#00ff88',
      },
      styles: {
        h1: {
          color: 'primary',
          bold: true,
          marginTop: 2,
          marginBottom: 1,
        },
        h2: {
          color: 'secondary',
          bold: true,
          marginTop: 1,
          marginBottom: 1,
        },
        code: {
          color: 'code',
          backgroundColor: '#1a1a1a',
          padding: 1,
        },
        list: {
          color: 'text',
          bullet: '•',
          indent: 2,
        },
      },
      layout: {
        maxWidth: 80,
        padding: 2,
        centerContent: true,
      },
    };
  }

  /**
   * Create a default theme file if one doesn't exist
   */
  static createDefaultThemeFile(filepath: string): void {
    if (fs.existsSync(filepath)) {
      return;
    }

    const defaultTheme = ThemeManager.getDefaultTheme();
    const content = JSON.stringify(defaultTheme, null, 2);

    fs.writeFileSync(filepath, content, 'utf-8');
  }
}
