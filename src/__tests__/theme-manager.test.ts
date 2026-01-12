/**
 * Tests for ThemeManager
 * These tests verify the CORRECT behavior (comment stripping)
 */

import { ThemeManager } from '../theme-manager';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('ThemeManager', () => {
  let tempDir: string;
  let themeManager: ThemeManager;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-test-'));
    themeManager = new ThemeManager();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('should load valid theme without comments', () => {
    const themePath = path.join(tempDir, 'theme.json');
    const validTheme = {
      colors: {
        primary: '#00ff00',
        secondary: '#00aaff',
        text: '#ffffff',
        dim: '#888888',
        code: '#00ff88'
      },
      styles: {
        h1: { color: 'primary', bold: true },
        h2: { color: 'secondary', bold: true },
        code: { color: 'code' }
      },
      layout: {
        maxWidth: 80,
        padding: 2
      }
    };

    fs.writeFileSync(themePath, JSON.stringify(validTheme, null, 2));

    const theme = themeManager.loadTheme(themePath);
    expect(theme.colors.primary).toBe('#00ff00');
    expect(theme.styles.h1.bold).toBe(true);
  });

  test('should get default theme', () => {
    const theme = ThemeManager.getDefaultTheme();

    expect(theme.colors).toBeDefined();
    expect(theme.styles).toBeDefined();
    expect(theme.layout).toBeDefined();
    expect(theme.colors.primary).toBe('#00ff00');
  });

  test('should validate theme structure', () => {
    const themePath = path.join(tempDir, 'invalid.json');
    fs.writeFileSync(themePath, JSON.stringify({ colors: {} }));

    expect(() => themeManager.loadTheme(themePath)).toThrow();
  });

  test('should throw error for non-existent theme file', () => {
    const themePath = path.join(tempDir, 'nonexistent.json');

    expect(() => themeManager.loadTheme(themePath)).toThrow('Theme file not found');
  });

  test('should create default theme file', () => {
    const themePath = path.join(tempDir, 'new-theme.json');

    ThemeManager.createDefaultThemeFile(themePath);

    expect(fs.existsSync(themePath)).toBe(true);
    const content = fs.readFileSync(themePath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed.colors.primary).toBe('#00ff00');
  });
});
