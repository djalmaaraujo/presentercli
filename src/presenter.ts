/**
 * Main presenter controller
 */

import chalk from 'chalk';
import { PresenterConfig, Theme } from './types';
import { SlideNavigator } from './slide-navigator';
import { MarkdownRenderer } from './markdown-renderer';
import { ThemeManager } from './theme-manager';
import { InputHandler } from './input-handler';
import { FileWatcher } from './file-watcher';
import { logger } from './logger';
import {
  clearScreen,
  hideCursor,
  showCursor,
  getTerminalSize,
  addVerticalSpacing,
  getVisualWidth,
  moveCursor,
} from './terminal-utils';

export class Presenter {
  private navigator: SlideNavigator;
  private renderer: MarkdownRenderer;
  private themeManager: ThemeManager;
  private inputHandler: InputHandler;
  private fileWatcher: FileWatcher | null = null;
  private isRunning: boolean = false;

  constructor(private config: PresenterConfig) {
    this.navigator = new SlideNavigator(config.slidesDir);
    this.themeManager = new ThemeManager();
    const theme = this.loadTheme();
    this.renderer = new MarkdownRenderer(theme, config.presentationMode);
    this.inputHandler = new InputHandler();
  }

  /**
   * Load theme from file
   */
  private loadTheme(): Theme {
    try {
      return this.themeManager.loadTheme(this.config.themePath);
    } catch (error) {
      console.error(chalk.yellow('Warning: Failed to load theme, using default'));
      return ThemeManager.getDefaultTheme();
    }
  }

  /**
   * Initialize and start the presentation
   */
  async start(): Promise<void> {
    try {
      logger.info('Starting presentation', {
        slidesDir: this.config.slidesDir,
        presentationMode: this.config.presentationMode
      });

      // Load slides
      await this.navigator.loadSlides();

      // Check for slides that won't fit on screen (BEFORE input setup)
      if (this.config.presentationMode) {
        await this.checkSlidesFit();
      }

      // Jump to start slide if specified
      if (this.config.startSlide > 0) {
        this.navigator.jumpToSlide(this.config.startSlide);
      }

      // Set up file watcher if watch mode enabled
      if (this.config.watchMode) {
        this.setupFileWatcher();
      }

      // Set up terminal
      hideCursor();
      clearScreen();

      // Set up input handling (AFTER warning, so stdin is clean)
      this.setupInputHandlers();

      // Mark as running
      this.isRunning = true;

      // Render first slide
      await this.render();

      // Keep process alive
      await this.waitForQuit();
    } catch (error) {
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Estimate slide height without full rendering (fast)
   */
  private estimateSlideHeight(content: string, maxWidth: number): number {
    const { marked } = require('marked');
    const tokens = marked.lexer(content);
    let lines = 0;

    for (const token of tokens) {
      switch (token.type) {
        case 'heading':
          if (token.depth === 1 && this.config.presentationMode) {
            // Figlet h1: ~8 lines + margins
            lines += 12;
          } else {
            // Regular heading + margins
            lines += this.config.presentationMode ? 5 : 3;
          }
          break;
        case 'paragraph':
          // Estimate wrapped lines
          const textLength = token.text?.length || 0;
          const wrappedLines = Math.ceil(textLength / maxWidth);
          lines += wrappedLines + (this.config.presentationMode ? 2 : 1);
          break;
        case 'list':
          // Each item + spacing in presentation mode
          const itemCount = token.items?.length || 0;
          lines += itemCount * (this.config.presentationMode ? 2 : 1);
          lines += 1; // trailing newline
          break;
        case 'code':
          // Count code lines + padding
          const codeLines = (token.text?.split('\n').length || 0) + 2;
          lines += codeLines + 1;
          break;
        case 'space':
          lines += 1;
          break;
        default:
          lines += 1;
      }
    }

    return lines;
  }

  /**
   * Check all slides and warn about ones that won't fit on screen
   */
  private async checkSlidesFit(): Promise<void> {
    const totalSlides = this.navigator.getTotalSlides();
    const warnings: string[] = [];
    const termSize = getTerminalSize();
    const maxWidth = Math.min(80, termSize.width - 4);
    // Reserve space for footer (2 lines) and some padding
    const availableHeight = termSize.height - 3;

    for (let i = 0; i < totalSlides; i++) {
      const slide = this.navigator.getSlide(i);
      if (slide) {
        // Estimate height without full rendering
        const estimatedLines = this.estimateSlideHeight(slide.content, maxWidth);

        if (estimatedLines > availableHeight) {
          const title = slide.metadata?.title || `Slide ${i + 1}`;
          warnings.push(`  Slide ${i + 1}: "${title}" - ~${estimatedLines} lines (max ${availableHeight})`);
        }
      }
    }

    if (warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Warning: Some slides may not fit on screen:\n'));
      warnings.forEach(w => console.log(chalk.dim(w)));
      console.log(chalk.dim('\n(Consider shortening content or increasing terminal height)'));

      // Only wait for keypress if running in a TTY
      if (process.stdin.isTTY) {
        console.log(chalk.dim('Press any key to continue...\n'));

        // Set up stdin for blocking read (before input handler is set up)
        process.stdin.setRawMode(true);
        process.stdin.resume();

        await new Promise<void>((resolve) => {
          process.stdin.once('data', () => {
            resolve();
          });
        });

        // Clean up stdin (will be reconfigured by input handler)
        process.stdin.setRawMode(false);
        process.stdin.pause();
      } else {
        // Non-TTY: just show warning and continue after delay
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  /**
   * Set up file watcher for live reload
   */
  private setupFileWatcher(): void {
    this.fileWatcher = new FileWatcher();
    this.fileWatcher.watch(this.config.slidesDir, async () => {
      await this.navigator.reloadSlides();
      await this.render();
    });
  }

  /**
   * Set up keyboard input handlers
   */
  private setupInputHandlers(): void {
    this.inputHandler.on('next', () => this.handleNext());
    this.inputHandler.on('prev', () => this.handlePrev());
    this.inputHandler.on('first', () => this.handleFirst());
    this.inputHandler.on('last', () => this.handleLast());
    this.inputHandler.on('jump', () => this.handleJump());
    this.inputHandler.on('undo', () => this.handleUndo());
    this.inputHandler.on('refresh', () => this.handleRefresh());
    this.inputHandler.on('help', () => this.handleHelp());
    this.inputHandler.on('stats', () => this.handleStats());
    this.inputHandler.on('quit', () => this.handleQuit());

    this.inputHandler.startListening();
  }

  /**
   * Handle next slide navigation
   */
  private handleNext(): void {
    const moved = this.navigator.nextSlide();
    if (moved) {
      this.render().catch(console.error);
    }
  }

  /**
   * Handle previous slide navigation
   */
  private handlePrev(): void {
    const moved = this.navigator.prevSlide();
    if (moved) {
      this.render().catch(console.error);
    }
  }

  /**
   * Handle jump to first slide
   */
  private handleFirst(): void {
    this.navigator.firstSlide();
    this.render().catch(console.error);
  }

  /**
   * Handle jump to last slide
   */
  private handleLast(): void {
    this.navigator.lastSlide();
    this.render().catch(console.error);
  }

  /**
   * Handle jump to specific slide
   */
  private handleJump(): void {
    // Pause input temporarily
    this.inputHandler.stopListening();
    showCursor();

    process.stdout.write('\n' + chalk.cyan('Jump to slide number: '));

    const handleInput = (data: Buffer) => {
      const input = data.toString().trim();

      // Handle escape
      if (input === '\u001b') {
        process.stdin.removeListener('data', handleInput);
        hideCursor();
        this.inputHandler.startListening();
        this.render().catch(console.error);
        return;
      }

      // Handle enter
      if (input === '\r' || input === '\n') {
        return;
      }

      const slideNumber = parseInt(input);
      if (!isNaN(slideNumber) && slideNumber > 0) {
        this.navigator.jumpToSlide(slideNumber - 1); // Convert to 0-based index
      }

      process.stdin.removeListener('data', handleInput);
      hideCursor();
      this.inputHandler.startListening();
      this.render().catch(console.error);
    };

    process.stdin.once('data', handleInput);
  }

  /**
   * Handle undo navigation
   */
  private handleUndo(): void {
    // Log history for debugging
    this.logNavigationHistory();

    const moved = this.navigator.undoNavigation();
    if (moved) {
      this.render().catch(console.error);
    }
  }

  /**
   * Log navigation history for debugging
   */
  private logNavigationHistory(): void {
    const history = this.navigator.getHistory();

    // Remove first entry (starting point) for cleaner display
    if (history.length > 0) {
      history.shift();
    }

    logger.debug('Navigation history', { history });
  }

  /**
   * Handle refresh
   */
  private handleRefresh(): void {
    this.renderer.clearCache();
    this.render().catch(console.error);
  }

  /**
   * Handle help display
   */
  private handleHelp(): void {
    clearScreen();
    console.log(chalk.bold.green('\n  Keyboard Shortcuts\n'));
    console.log(chalk.dim('  ─'.repeat(40)));
    console.log('\n  ' + chalk.bold('Navigation:'));
    console.log('    n, →         Next slide');
    console.log('    p, ←         Previous slide');
    console.log('    j            Jump to slide number');
    console.log('    g            Go to first slide');
    console.log('    G            Go to last slide');
    console.log('    u            Undo (go back in history)');
    console.log('\n  ' + chalk.bold('Display:'));
    console.log('    r            Refresh/reload current slide');
    console.log('    s            Show session statistics');
    console.log('    h, ?         Show this help');
    console.log('\n  ' + chalk.bold('Control:'));
    console.log('    q, Esc       Quit');
    console.log(chalk.dim('\n  ─'.repeat(40)));
    console.log(chalk.dim('  Press any key to return to presentation\n'));

    // Wait for any key
    const handleReturn = () => {
      process.stdin.removeListener('data', handleReturn);
      this.render().catch(console.error);
    };

    process.stdin.once('data', handleReturn);
  }

  /**
   * Handle session stats display
   * BUG: Doesn't stop inputHandler, causing double keypress processing
   */
  private handleStats(): void {
    // BUG: Should call this.inputHandler.stopListening() here!
    // Without stopping, the inputHandler continues processing keys
    // while our once() handler below ALSO processes the dismiss key.
    // Result: pressing 'n' to dismiss stats ALSO navigates to next slide.

    clearScreen();

    const stats = this.inputHandler.getSessionStats();
    const elapsed = Math.floor((Date.now() - stats.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const currentSlide = this.navigator.getCurrentIndex() + 1;
    const totalSlides = this.navigator.getTotalSlides();

    console.log('\n  ' + chalk.bold('Session Statistics') + '\n');
    console.log('  ' + chalk.dim('─'.repeat(40)));

    console.log('\n  ' + chalk.bold('Progress:'));
    console.log(`    Current slide: ${currentSlide} of ${totalSlides}`);
    console.log(`    Completion: ${Math.round((currentSlide / totalSlides) * 100)}%`);

    console.log('\n  ' + chalk.bold('Activity:'));
    console.log(`    Key presses: ${chalk.green(stats.keyPresses)}`);
    console.log(`    Session time: ${chalk.yellow(minutes + 'm ' + seconds + 's')}`);

    console.log('\n  ' + chalk.dim('─'.repeat(40)));
    console.log(chalk.dim('  Press any key to return to presentation\n'));

    // Wait for any key to dismiss
    const handleReturn = () => {
      process.stdin.removeListener('data', handleReturn);
      // BUG: Should call this.inputHandler.startListening() here
      // but since we never stopped it, this is "fine" (masks the real bug)
      this.render().catch(console.error);
    };

    process.stdin.once('data', handleReturn);
  }

  /**
   * Handle quit
   */
  private handleQuit(): void {
    this.isRunning = false;
    this.cleanup().then(() => {
      process.exit(0);
    });
  }

  /**
   * Render current slide
   */
  async render(): Promise<void> {
    try {
      const slide = this.navigator.getCurrentSlide();

      if (!slide) {
        logger.error('Cannot render: slide is undefined', {
          currentIndex: this.navigator.getCurrentIndex(),
          totalSlides: this.navigator.getTotalSlides()
        });
        throw new Error('Cannot read properties of undefined (reading \'content\')');
      }

      const slideNumber = this.getCurrentSlideNumber();

      logger.debug('Rendering slide', {
        slideId: slide.id,
        slideNumber
      });

    clearScreen();

    // Render slide content
    const rendered = await this.renderer.renderSlide(slide.content, slide.id);

    // Calculate layout
    const termSize = getTerminalSize();
    const lines = rendered.split('\n');

    // In presentation mode, position title at top; otherwise center vertically
    const verticalPadding = this.config.presentationMode
      ? 1  // Fixed top position
      : Math.max(0, Math.floor((termSize.height - lines.length - 3) / 2));

    // Add vertical spacing
    console.log(addVerticalSpacing(verticalPadding));

    // In presentation mode, center the content block horizontally
    // while keeping text left-aligned within the block
    if (this.config.presentationMode) {
      const maxLineWidth = Math.max(...lines.map(line => getVisualWidth(line)));
      const horizontalPadding = Math.max(0, Math.floor((termSize.width - maxLineWidth) / 2));
      const padding = ' '.repeat(horizontalPadding);

      console.log(lines.map(line => padding + line).join('\n'));
    } else {
      console.log(rendered);
    }

      // Print footer at fixed position at bottom of screen
      moveCursor(0, termSize.height - 2);
      process.stdout.write(chalk.dim('  ' + slideNumber));
      moveCursor(0, termSize.height - 1);
      process.stdout.write(chalk.dim('  Press h for help, q to quit'));
    } catch (error) {
      logger.error('Error rendering slide', {
        error: error instanceof Error ? error.message : String(error),
        currentIndex: this.navigator.getCurrentIndex()
      });
      throw error;
    }
  }

  /**
   * Get current slide number string
   * Properly formats slide counter
   */
  getCurrentSlideNumber(): string {
    const current = this.navigator.getCurrentIndex() + 1;
    const total = this.navigator.getTotalSlides();
    return `Slide ${current} of ${total}`;
  }

  /**
   * Wait for quit signal
   */
  private waitForQuit(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.isRunning) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    showCursor();
    this.inputHandler.stopListening();

    if (this.fileWatcher) {
      await this.fileWatcher.stop();
    }

    logger.info('Presentation ended');
    logger.close();
  }
}
