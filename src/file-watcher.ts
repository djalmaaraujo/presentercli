/**
 * File watcher for live reload functionality
 */

import chokidar from 'chokidar';

export class FileWatcher {
  private watcher: chokidar.FSWatcher | null = null;

  /**
   * Watch directory for changes
   */
  watch(directory: string, callback: () => void): void {
    // Stop existing watcher if any
    if (this.watcher) {
      this.stop();
    }

    this.watcher = chokidar.watch(directory, {
      ignored: /(^|[\/\\])\../, // Ignore dotfiles
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
    });

    // Set up change handler
    this.watcher.on('change', (filepath) => {
      console.log(`\nFile changed: ${filepath}\nReloading...`);
      callback();
    });

    this.watcher.on('add', (filepath) => {
      console.log(`\nFile added: ${filepath}\nReloading...`);
      callback();
    });

    this.watcher.on('unlink', (filepath) => {
      console.log(`\nFile removed: ${filepath}\nReloading...`);
      callback();
    });

    // Error handling
    this.watcher.on('error', (error) => {
      console.error('File watcher error:', error);
    });
  }

  /**
   * Stop watching
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }
}
