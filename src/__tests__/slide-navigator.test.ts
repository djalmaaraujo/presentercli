/**
 * Tests for SlideNavigator
 */

import { SlideNavigator } from '../slide-navigator';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('SlideNavigator', () => {
  let tempDir: string;
  let navigator: SlideNavigator;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slides-test-'));

    // Create test slides
    fs.writeFileSync(path.join(tempDir, '01-first.md'), '# First Slide\nContent 1');
    fs.writeFileSync(path.join(tempDir, '02-second.md'), '# Second Slide\nContent 2');
    fs.writeFileSync(path.join(tempDir, '03-third.md'), '# Third Slide\nContent 3');

    navigator = new SlideNavigator(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('should load slides from directory', async () => {
    await navigator.loadSlides();

    expect(navigator.getTotalSlides()).toBe(3);
    expect(navigator.getCurrentIndex()).toBe(0);
  });

  test('should navigate forward through slides', async () => {
    await navigator.loadSlides();

    const moved = navigator.nextSlide();
    expect(moved).toBe(true);
    expect(navigator.getCurrentIndex()).toBe(1);
  });

  test('should navigate backward through slides', async () => {
    await navigator.loadSlides();
    navigator.nextSlide();

    const moved = navigator.prevSlide();
    expect(moved).toBe(true);
    expect(navigator.getCurrentIndex()).toBe(0);
  });

  test('should jump to specific slide', async () => {
    await navigator.loadSlides();

    const jumped = navigator.jumpToSlide(2);
    expect(jumped).toBe(true);
    expect(navigator.getCurrentIndex()).toBe(2);
  });

  test('should go to first slide', async () => {
    await navigator.loadSlides();
    navigator.nextSlide();
    navigator.nextSlide();

    navigator.firstSlide();
    expect(navigator.getCurrentIndex()).toBe(0);
  });

  test('should go to last slide', async () => {
    await navigator.loadSlides();

    navigator.lastSlide();
    expect(navigator.getCurrentIndex()).toBe(2);
  });

  test('should extract slide title', async () => {
    await navigator.loadSlides();

    const slide = navigator.getCurrentSlide();
    expect(slide.metadata?.title).toBe('First Slide');
  });

  test('should extract speaker notes', async () => {
    const slideWithNotes = path.join(tempDir, '04-notes.md');
    fs.writeFileSync(slideWithNotes, `# Slide Title

Content here

<!-- SPEAKER NOTES
These are notes
-->`);

    await navigator.loadSlides();
    const slide = navigator.getSlide(3);

    expect(slide?.speakerNotes).toContain('These are notes');
  });

  test('should handle empty directory', async () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-'));

    const emptyNavigator = new SlideNavigator(emptyDir);

    await expect(emptyNavigator.loadSlides()).rejects.toThrow('No markdown files found');

    fs.rmSync(emptyDir, { recursive: true });
  });

  // NOTE: Not testing edge cases at slide boundaries
  // NOTE: Not testing array reference behavior
});
