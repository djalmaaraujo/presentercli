/**
 * Tests for InputHandler
 */

import { InputHandler } from '../input-handler';

describe('InputHandler', () => {
  let handler: InputHandler;
  let originalIsTTY: boolean;

  beforeEach(() => {
    // Mock stdin to avoid TTY operations
    originalIsTTY = process.stdin.isTTY || false;
    Object.defineProperty(process.stdin, 'isTTY', {
      value: false,
      configurable: true
    });

    handler = new InputHandler();
  });

  afterEach(() => {
    if (handler.isActive()) {
      handler.stopListening();
    }

    // Restore original isTTY
    Object.defineProperty(process.stdin, 'isTTY', {
      value: originalIsTTY,
      configurable: true
    });
  });

  test('should create input handler instance', () => {
    expect(handler).toBeDefined();
    expect(handler.isActive()).toBe(false);
  });

  test('should register event handlers', () => {
    const mockCallback = jest.fn();

    expect(() => handler.on('next', mockCallback)).not.toThrow();
  });

  test('should track listening state', () => {
    expect(handler.isActive()).toBe(false);
  });

  test('should allow multiple event registrations', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();
    const callback3 = jest.fn();

    handler.on('next', callback1);
    handler.on('prev', callback2);
    handler.on('quit', callback3);

    // Should not throw
    expect(handler).toBeDefined();
  });

  test('should allow stopping when not listening', () => {
    expect(() => handler.stopListening()).not.toThrow();
  });

  // NOTE: Not testing startListening (requires real TTY and creates open handles)
  // NOTE: Not testing repeated startListening/stopListening cycles
  // NOTE: Not testing actual key press handling (requires TTY)
});
