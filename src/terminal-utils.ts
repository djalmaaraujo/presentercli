/**
 * Terminal utility functions for text manipulation and display
 */

import stringWidth from 'string-width';
import wrapAnsi from 'wrap-ansi';
import stripAnsi from 'strip-ansi';
import ansiEscapes from 'ansi-escapes';

/**
 * Center text within a given width
 */
export function centerText(text: string, width: number): string {
  const visualWidth = stringWidth(text);
  const padding = Math.max(0, Math.floor((width - visualWidth) / 2));
  return ' '.repeat(padding) + text;
}

/**
 * Wrap text to a maximum width
 */
export function wrapText(text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let currentLine = '';

  for (const word of text.split(' ')) {
    if (currentLine.length + word.length > maxWidth) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine += (currentLine ? ' ' : '') + word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Get the visual width of a string
 */
export function getVisualWidth(text: string): number {
  return stringWidth(text);
}

/**
 * Pad text to a specific width
 */
export function padText(text: string, width: number, align: 'left' | 'right' | 'center' = 'left'): string {
  const paddingNeeded = Math.max(0, width - text.length);

  if (align === 'left') {
    return text + ' '.repeat(paddingNeeded);
  } else if (align === 'right') {
    return ' '.repeat(paddingNeeded) + text;
  } else {
    const leftPad = Math.floor(paddingNeeded / 2);
    const rightPad = paddingNeeded - leftPad;
    return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
  }
}

/**
 * Truncate text to a maximum width with ellipsis
 */
export function truncateText(text: string, maxWidth: number): string {
  if (text.length <= maxWidth) {
    return text;
  }

  return text.substring(0, maxWidth - 1) + '…';
}

/**
 * Clear the terminal screen
 */
export function clearScreen(): void {
  process.stdout.write(ansiEscapes.clearScreen);
  process.stdout.write(ansiEscapes.cursorTo(0, 0));
}

/**
 * Move cursor to specific position
 */
export function moveCursor(x: number, y: number): void {
  process.stdout.write(ansiEscapes.cursorTo(x, y));
}

/**
 * Hide cursor
 */
export function hideCursor(): void {
  process.stdout.write(ansiEscapes.cursorHide);
}

/**
 * Show cursor
 */
export function showCursor(): void {
  process.stdout.write(ansiEscapes.cursorShow);
}

/**
 * Get terminal dimensions
 */
export function getTerminalSize(): { width: number; height: number } {
  return {
    width: process.stdout.columns || 80,
    height: process.stdout.rows || 24,
  };
}

/**
 * Create a horizontal line
 */
export function createHorizontalLine(char: string = '─', width?: number): string {
  const termWidth = width || getTerminalSize().width;
  return char.repeat(termWidth);
}

/**
 * Add vertical spacing
 */
export function addVerticalSpacing(lines: number): string {
  return '\n'.repeat(lines);
}
