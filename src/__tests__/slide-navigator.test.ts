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

  test('should not navigate past last slide', async () => {
    await navigator.loadSlides();

    // Go to last slide
    navigator.lastSlide();
    expect(navigator.getCurrentIndex()).toBe(2);

    // Try to go past last slide - should fail
    const moved = navigator.nextSlide();
    expect(moved).toBe(false);
    expect(navigator.getCurrentIndex()).toBe(2); // Still at last slide
  });

  test('should not navigate before first slide', async () => {
    await navigator.loadSlides();

    // At first slide (index 0)
    expect(navigator.getCurrentIndex()).toBe(0);

    // Try to go before first slide - should fail
    const moved = navigator.prevSlide();
    expect(moved).toBe(false);
    expect(navigator.getCurrentIndex()).toBe(0); // Still at first slide
  });

  test('should handle rapid nextSlide calls at boundary', async () => {
    await navigator.loadSlides();

    // Go to last slide
    navigator.lastSlide();

    // Simulate rapid key presses at boundary
    for (let i = 0; i < 10; i++) {
      navigator.nextSlide();
    }

    // Should still be at last valid index
    expect(navigator.getCurrentIndex()).toBe(2);
    expect(navigator.getCurrentSlide()).toBeDefined();
    expect(navigator.getCurrentSlide().content).toContain('Third Slide');
  });

  test('should handle rapid prevSlide calls at boundary', async () => {
    await navigator.loadSlides();

    // At first slide
    expect(navigator.getCurrentIndex()).toBe(0);

    // Simulate rapid key presses at boundary
    for (let i = 0; i < 10; i++) {
      navigator.prevSlide();
    }

    // Should still be at first valid index
    expect(navigator.getCurrentIndex()).toBe(0);
    expect(navigator.getCurrentSlide()).toBeDefined();
    expect(navigator.getCurrentSlide().content).toContain('First Slide');
  });

  test('getHistory should return a copy, not the original array', async () => {
    await navigator.loadSlides();

    // Navigate to build history
    navigator.nextSlide();
    navigator.nextSlide();

    const history1 = navigator.getHistory();
    expect(history1).toEqual([0, 1, 2]);

    // Mutate the returned array
    history1.shift();
    history1.push(99);

    // Original history should be unchanged
    const history2 = navigator.getHistory();
    expect(history2).toEqual([0, 1, 2]);
  });

  test('undo should work repeatedly without corruption', async () => {
    await navigator.loadSlides();

    // Navigate: 0 -> 1 -> 2
    navigator.nextSlide();
    navigator.nextSlide();
    expect(navigator.getCurrentIndex()).toBe(2);

    // Simulate what presenter does: get history multiple times
    for (let i = 0; i < 5; i++) {
      const h = navigator.getHistory();
      h.shift(); // This used to corrupt the real history
    }

    // Undo should still work
    expect(navigator.undoNavigation()).toBe(true);
    expect(navigator.getCurrentIndex()).toBe(1);

    expect(navigator.undoNavigation()).toBe(true);
    expect(navigator.getCurrentIndex()).toBe(0);
  });
});
