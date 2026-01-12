/**
 * Tests for rapid navigation race condition fix
 *
 * Issue: When navigating rapidly, the renderer shows wrong content because
 * multiple async render() calls race and whichever finishes last gets displayed,
 * regardless of which slide the user actually navigated to.
 *
 * Fix: Track render version and skip stale renders that were superseded by
 * newer navigation events.
 */

import { Presenter } from '../presenter';
import { MarkdownRenderer } from '../markdown-renderer';
import { PresenterConfig } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Track render calls for verification
let renderCalls: { slideId: string; startTime: number; endTime?: number }[] = [];
let displayedContent: string[] = [];

// Mock terminal utils
jest.mock('../terminal-utils', () => ({
  clearScreen: jest.fn(),
  hideCursor: jest.fn(),
  showCursor: jest.fn(),
  getTerminalSize: jest.fn(() => ({ width: 80, height: 24 })),
  addVerticalSpacing: jest.fn((n) => '\n'.repeat(n)),
  getVisualWidth: jest.fn((s) => s.length),
  moveCursor: jest.fn(),
  wrapText: jest.fn((text: string) => [text]),
  centerText: jest.fn((text: string) => text),
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
  default: { textSync: jest.fn((text: string) => text.toUpperCase()) },
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

// Store original console.log
const originalLog = console.log;

describe('Rapid Navigation Race Condition', () => {
  let tempDir: string;
  let slidesDir: string;
  let themePath: string;
  let config: PresenterConfig;

  beforeEach(() => {
    // Reset tracking
    renderCalls = [];
    displayedContent = [];

    // Capture console.log to track what gets displayed
    console.log = jest.fn((...args) => {
      displayedContent.push(args.join(' '));
    });

    // Create temp directory with test slides
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rapid-nav-test-'));
    slidesDir = path.join(tempDir, 'slides');
    themePath = path.join(tempDir, 'theme.json');

    fs.mkdirSync(slidesDir);

    // Create 5 slides with distinct content
    for (let i = 1; i <= 5; i++) {
      fs.writeFileSync(
        path.join(slidesDir, `0${i}-slide.md`),
        `# Slide ${i}\n\nContent for slide ${i}.`
      );
    }

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
        padding: 2,
        centerContent: false
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
    console.log = originalLog;
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('render version increments on each render call', async () => {
    const presenter = new Presenter(config);

    // Access private navigator to load slides
    const navigator = (presenter as any).navigator;
    await navigator.loadSlides();

    expect(presenter.getRenderVersion()).toBe(0);

    // Each render should increment the version
    await presenter.render();
    expect(presenter.getRenderVersion()).toBe(1);

    await presenter.render();
    expect(presenter.getRenderVersion()).toBe(2);

    await presenter.render();
    expect(presenter.getRenderVersion()).toBe(3);
  });

  test('concurrent renders only display the latest one', async () => {
    const presenter = new Presenter(config);
    const navigator = (presenter as any).navigator;
    const renderer = (presenter as any).renderer as MarkdownRenderer;

    await navigator.loadSlides();

    // Mock renderSlide to track calls and add variable delays
    const originalRenderSlide = renderer.renderSlide.bind(renderer);
    const renderOrder: string[] = [];
    const completionOrder: string[] = [];

    renderer.renderSlide = jest.fn(async (markdown: string, slideId: string) => {
      renderOrder.push(slideId);

      // Slide 1 takes longest (simulating slow render)
      // Slide 3 is fastest
      const delays: Record<string, number> = {
        '01-slide.md': 100,
        '02-slide.md': 50,
        '03-slide.md': 10,
      };

      await new Promise(resolve => setTimeout(resolve, delays[slideId] || 20));
      completionOrder.push(slideId);

      return `Rendered: ${slideId}`;
    });

    // Fire 3 renders concurrently (simulating rapid navigation)
    navigator.jumpToSlide(0); // slide 1
    const render1 = presenter.render();

    navigator.jumpToSlide(1); // slide 2
    const render2 = presenter.render();

    navigator.jumpToSlide(2); // slide 3
    const render3 = presenter.render();

    // Wait for all to complete
    await Promise.all([render1, render2, render3]);

    // All three should have started rendering
    expect(renderOrder).toEqual(['01-slide.md', '02-slide.md', '03-slide.md']);

    // But completion order is different due to delays
    // Slide 3 finishes first, then 2, then 1
    expect(completionOrder).toEqual(['03-slide.md', '02-slide.md', '01-slide.md']);

    // The key test: only the latest render (slide 3) should have actually
    // written to console. Earlier renders should have been skipped.
    const displayedSlides = displayedContent.filter(c => c.includes('Rendered:'));

    // Only the last navigation's content should be displayed
    expect(displayedSlides.length).toBe(1);
    expect(displayedSlides[0]).toContain('03-slide.md');
  });

  test('stale renders are skipped even with cache hits', async () => {
    const presenter = new Presenter(config);
    const navigator = (presenter as any).navigator;
    const renderer = (presenter as any).renderer as MarkdownRenderer;

    await navigator.loadSlides();

    // Pre-warm cache by rendering all slides
    for (let i = 0; i < 3; i++) {
      navigator.jumpToSlide(i);
      await presenter.render();
    }

    // Clear displayed content tracking
    displayedContent = [];

    // Now mock to add delays even for cache hits
    const originalRenderSlide = renderer.renderSlide.bind(renderer);
    renderer.renderSlide = jest.fn(async (markdown: string, slideId: string) => {
      // Variable delays to simulate race condition
      const delay = slideId === '01-slide.md' ? 50 : 10;
      await new Promise(resolve => setTimeout(resolve, delay));
      return `Cached: ${slideId}`;
    });

    // Rapid navigation: 1 -> 2 -> 3
    navigator.jumpToSlide(0);
    const r1 = presenter.render();

    navigator.jumpToSlide(1);
    const r2 = presenter.render();

    navigator.jumpToSlide(2);
    const r3 = presenter.render();

    await Promise.all([r1, r2, r3]);

    // Only the final slide should be displayed
    const cached = displayedContent.filter(c => c.includes('Cached:'));
    expect(cached.length).toBe(1);
    expect(cached[0]).toContain('03-slide.md');
  });

  test('single render without racing works normally', async () => {
    const presenter = new Presenter(config);
    const navigator = (presenter as any).navigator;

    await navigator.loadSlides();

    // Clear tracking
    displayedContent = [];

    // Single render should work
    await presenter.render();

    // Should have displayed slide 1
    expect(displayedContent.some(c => c.includes('Slide 1'))).toBe(true);
  });

  test('sequential navigation (not racing) displays each slide', async () => {
    const presenter = new Presenter(config);
    const navigator = (presenter as any).navigator;

    await navigator.loadSlides();

    // Sequential (non-racing) navigation
    displayedContent = [];

    navigator.jumpToSlide(0);
    await presenter.render();
    expect(displayedContent.some(c => c.includes('Slide 1'))).toBe(true);

    displayedContent = [];
    navigator.jumpToSlide(1);
    await presenter.render();
    expect(displayedContent.some(c => c.includes('Slide 2'))).toBe(true);

    displayedContent = [];
    navigator.jumpToSlide(2);
    await presenter.render();
    expect(displayedContent.some(c => c.includes('Slide 3'))).toBe(true);
  });
});
