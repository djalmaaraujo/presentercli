/**
 * Tests for FileWatcher
 */

import { FileWatcher } from '../file-watcher';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock chokidar to avoid actual file watching (which creates timers)
jest.mock('chokidar', () => ({
  watch: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('FileWatcher', () => {
  let tempDir: string;
  let watcher: FileWatcher;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'watch-test-'));
    watcher = new FileWatcher();
  });

  afterEach(async () => {
    await watcher.stop();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should create file watcher instance', () => {
    expect(watcher).toBeDefined();
  });

  test('should start watching directory', async () => {
    const callback = jest.fn();

    expect(() => watcher.watch(tempDir, callback)).not.toThrow();
    await watcher.stop();
  });

  test('should stop watching', async () => {
    const callback = jest.fn();
    watcher.watch(tempDir, callback);

    await expect(watcher.stop()).resolves.not.toThrow();
  });

  test('should handle watch on non-existent directory', async () => {
    const callback = jest.fn();
    const nonExistent = path.join(tempDir, 'does-not-exist');

    // Should not throw immediately (chokidar handles gracefully)
    expect(() => watcher.watch(nonExistent, callback)).not.toThrow();
    await watcher.stop();
  });

  test('should allow restarting watch', async () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    watcher.watch(tempDir, callback1);
    await watcher.stop();
    watcher.watch(tempDir, callback2);
    await watcher.stop();
  });

  // NOTE: Not testing actual file change detection (requires waiting/timing)
  // NOTE: Not testing platform-specific behavior (network drives, Docker)
});
