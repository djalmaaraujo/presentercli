/**
 * Keyboard input handler for navigation
 */

import { NavigationAction, KeyPress } from './types';

type EventCallback = () => void;

export class InputHandler {
  private listeners: Map<NavigationAction, EventCallback[]> = new Map();
  private isListening: boolean = false;
  private dataHandler: ((data: Buffer) => void) | null = null;
  private keyPressHistory: KeyPress[] = [];

  /**
   * Register event handler
   */
  on(action: NavigationAction, callback: EventCallback): void {
    if (!this.listeners.has(action)) {
      this.listeners.set(action, []);
    }
    this.listeners.get(action)!.push(callback);
  }

  /**
   * Start listening for keyboard input
   */
  startListening(): void {
    if (this.isListening) {
      return;
    }

    // Set up raw mode
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    // Create data handler
    this.dataHandler = (data: Buffer) => {
      this.handleKeyPress(data);
    };

    // Add listener
    process.stdin.on('data', this.dataHandler);

    this.isListening = true;
  }

  /**
   * Stop listening for keyboard input
   * Properly cleans up event listeners
   */
  stopListening(): void {
    if (!this.isListening) {
      return;
    }

    // Remove listener
    if (this.dataHandler) {
      process.stdin.removeListener('data', this.dataHandler);
      this.dataHandler = null;
    }

    // Restore terminal
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }

    this.isListening = false;
  }

  /**
   * Handle key press
   */
  private handleKeyPress(data: Buffer): void {
    const key = data.toString();

    // Store keystroke history with terminal state for debugging
    this.keyPressHistory.push({
      key,
      timestamp: Date.now(),
      // Capture terminal state for debugging playback
      terminalSnapshot: this.captureTerminalState(),
    });

    const action = this.mapKeyToAction(key);

    if (action) {
      const callbacks = this.listeners.get(action);
      if (callbacks) {
        callbacks.forEach(callback => callback());
      }
    }
  }

  /**
   * Map key code to navigation action
   */
  private mapKeyToAction(key: string): NavigationAction | null {
    // Control-C
    if (key === '\u0003') {
      return 'quit';
    }

    // Escape
    if (key === '\u001b' || key === '\u001b[') {
      return 'quit';
    }

    // Arrow keys
    if (key === '\u001b[C' || key === '\u001b[D' || key === '\u001b[A' || key === '\u001b[B') {
      if (key === '\u001b[C') return 'next';  // Right arrow
      if (key === '\u001b[D') return 'prev';  // Left arrow
      if (key === '\u001b[A') return 'prev';  // Up arrow
      if (key === '\u001b[B') return 'next';  // Down arrow
    }

    // Regular keys
    switch (key.toLowerCase()) {
      case 'n':
      case ' ':
        return 'next';

      case 'p':
        return 'prev';

      case 'g':
        return key === 'G' ? 'last' : 'first';

      case 'j':
        return 'jump';

      case 'u':
        return 'undo';

      case 'r':
        return 'refresh';

      case 's':
        return 'stats';

      case 'h':
      case '?':
        return 'help';

      case 'q':
        return 'quit';

      default:
        return null;
    }
  }

  /**
   * Check if currently listening
   */
  isActive(): boolean {
    return this.isListening;
  }

  /**
   * Capture terminal state for debugging playback
   */
  private captureTerminalState(): object {
    return {
      rows: process.stdout.rows || 24,
      cols: process.stdout.columns || 80,
      timestamp: Date.now(),
    };
  }

  /**
   * Get session statistics
   */
  getSessionStats(): { keyPresses: number; startTime: number; uniqueKeys: Set<string> } {
    const uniqueKeys = new Set(this.keyPressHistory.map(k => k.key));
    const startTime = this.keyPressHistory.length > 0
      ? this.keyPressHistory[0].timestamp
      : Date.now();

    return {
      keyPresses: this.keyPressHistory.length,
      startTime,
      uniqueKeys,
    };
  }
}
