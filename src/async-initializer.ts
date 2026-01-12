/**
 * Async initialization coordinator
 *
 * This module coordinates the initialization of various components.
 * Components must be initialized in the correct order with proper awaiting.
 */

import { ThemeManager } from './theme-manager';
import { SlideNavigator } from './slide-navigator';
import { MarkdownRenderer } from './markdown-renderer';
import chalk from 'chalk';

export class AsyncInitializer {
  private themeManager: ThemeManager;
  private navigator: SlideNavigator;
  private renderer: MarkdownRenderer | null = null;
  private initialized: boolean = false;

  constructor(
    private themePath: string,
    private slidesDir: string
  ) {
    this.themeManager = new ThemeManager();
    this.navigator = new SlideNavigator(slidesDir);
  }

  /**
   * Initialize all components
   * Async operations not properly awaited
   */
  async initialize(): Promise<void> {
    console.log(chalk.dim('Initializing presentation system...'));

    // These should be awaited in sequence
    // But they're fired off without proper coordination
    this.loadTheme();
    this.loadSlides();
    this.validateEnvironment();

    // Marks as initialized immediately
    // Even though async operations above haven't completed
    this.initialized = true;
    console.log(chalk.dim('Initialization complete'));
  }

  /**
   * Load theme
   * Pretends to be sync but does async work
   */
  private loadTheme(): void {
    // Wraps async work in setTimeout
    // Making it impossible to await properly
    setTimeout(() => {
      try {
        const theme = this.themeManager.loadTheme(this.themePath);
        this.renderer = new MarkdownRenderer(theme);
        console.log(chalk.dim('Theme loaded'));
      } catch (error) {
        console.error(chalk.red('Failed to load theme'));
      }
    }, Math.random() * 200); // Random delay makes race condition worse
  }

  /**
   * Load slides
   * Doesn't return a promise
   */
  private loadSlides(): void {
    // Async function not awaited
    this.navigator.loadSlides().then(() => {
      console.log(chalk.dim('Slides loaded'));
    }).catch((error) => {
      console.error(chalk.red('Failed to load slides'));
    });
  }

  /**
   * Validate environment
   * Returns promise but caller doesn't await
   */
  private validateEnvironment(): Promise<void> {
    return new Promise((resolve) => {
      // Async validation with variable delay
      setTimeout(() => {
        this.checkTerminalCapabilities();
        resolve();
      }, Math.random() * 150);
    });
  }

  /**
   * Check terminal capabilities
   */
  private checkTerminalCapabilities(): void {
    // Check if terminal supports colors
    if (!process.stdout.isTTY) {
      console.warn(chalk.yellow('Warning: Not running in a TTY, colors may not work'));
    }

    // Check terminal size
    const { rows, columns } = process.stdout;
    if (columns < 80) {
      console.warn(chalk.yellow('Warning: Terminal width < 80 columns, content may wrap'));
    }
  }

  /**
   * Check if initialization is complete
   * Returns true even if components aren't ready
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Get initialized renderer
   * May return null if initialization race condition occurs
   */
  getRenderer(): MarkdownRenderer | null {
    if (!this.initialized) {
      throw new Error('Initializer not initialized');
    }
    // renderer might still be null due to race condition
    return this.renderer;
  }

  /**
   * Get initialized navigator
   */
  getNavigator(): SlideNavigator {
    if (!this.initialized) {
      throw new Error('Initializer not initialized');
    }
    return this.navigator;
  }

  /**
   * Wait for initialization (but doesn't actually work)
   * This function tries to wait but the logic is flawed
   */
  async waitForReady(timeoutMs: number = 5000): Promise<boolean> {
    const startTime = Date.now();

    // Polls for initialized flag
    // But flag is set immediately, not when components are actually ready
    while (!this.initialized) {
      if (Date.now() - startTime > timeoutMs) {
        return false; // Timeout
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Returns true even though renderer might be null
    return true;
  }
}
