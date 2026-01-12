/**
 * Tests for Presenter
 */

import { Presenter } from '../presenter';
import { PresenterConfig } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock all the imports that presenter uses
jest.mock('../terminal-utils', () => ({
  clearScreen: jest.fn(),
  hideCursor: jest.fn(),
  showCursor: jest.fn(),
  getTerminalSize: jest.fn(() => ({ width: 80, height: 24 })),
  addVerticalSpacing: jest.fn((n) => '\n'.repeat(n)),
  getVisualWidth: jest.fn((s) => s.length),
}));

jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    close: jest.fn(),
  },
}));

jest.mock('figlet', () => ({
  __esModule: true,
  default: {
    textSync: jest.fn((text: string) => text.toUpperCase()),
  },
  textSync: jest.fn((text: string) => text.toUpperCase()),
}));

jest.mock('string-width', () => ({
  __esModule: true,
  default: jest.fn((str: string) => str.length),
}));

jest.mock('wrap-ansi', () => ({
  __esModule: true,
  default: jest.fn((str: string) => str),
}));

jest.mock('strip-ansi', () => ({
  __esModule: true,
  default: jest.fn((str: string) => str),
}));

describe('Presenter', () => {
  let tempDir: string;
  let slidesDir: string;
  let themePath: string;
  let config: PresenterConfig;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'presenter-test-'));
    slidesDir = path.join(tempDir, 'slides');
    themePath = path.join(tempDir, 'theme.json');

    fs.mkdirSync(slidesDir);
    fs.writeFileSync(path.join(slidesDir, '01-test.md'), '# Test Slide\n\nContent here.');

    const theme = {
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
    fs.writeFileSync(themePath, JSON.stringify(theme));

    config = {
      slidesDir,
      themePath,
      watchMode: false,
      startSlide: 0,
      presentationMode: false,
    };
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should create presenter instance', () => {
    const presenter = new Presenter(config);
    expect(presenter).toBeDefined();
  });

  test('should create presenter with presentation mode', () => {
    const presConfig = { ...config, presentationMode: true };
    const presenter = new Presenter(presConfig);
    expect(presenter).toBeDefined();
  });

  test('should create presenter with watch mode', () => {
    const watchConfig = { ...config, watchMode: true };
    const presenter = new Presenter(watchConfig);
    expect(presenter).toBeDefined();
  });

  test('should handle missing theme gracefully', () => {
    const badConfig = { ...config, themePath: '/nonexistent/theme.json' };
    const presenter = new Presenter(badConfig);
    // Should use default theme instead of throwing
    expect(presenter).toBeDefined();
  });

  // NOTE: Not testing start() - requires stdin/stdout mocking and event loop
  // NOTE: Not testing render() - would require full initialization
  // NOTE: Not testing navigation handlers - those are integration tests
  // Focusing on constructor and basic setup only
});
