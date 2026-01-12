/**
 * Slide navigation logic and state management
 */

import * as fs from 'fs';
import * as path from 'path';
import { Slide, NavigationState } from './types';
import { logger } from './logger';

export class SlideNavigator {
  private slides: Slide[] = [];
  private currentIndex: number = 0;
  private history: number[] = [];

  constructor(private slidesDir: string) {}

  /**
   * Load all slides from directory
   */
  async loadSlides(): Promise<void> {
    if (!fs.existsSync(this.slidesDir)) {
      throw new Error(`Slides directory not found: ${this.slidesDir}`);
    }

    const files = fs.readdirSync(this.slidesDir)
      .filter(file => file.endsWith('.md'))
      .sort(); // Alphabetical order

    if (files.length === 0) {
      throw new Error(`No markdown files found in: ${this.slidesDir}`);
    }

    this.slides = files.map((file, index) => {
      const filepath = path.join(this.slidesDir, file);
      const content = fs.readFileSync(filepath, 'utf-8');

      // Extract speaker notes (HTML comments)
      const { markdown, speakerNotes } = this.extractSpeakerNotes(content);

      return {
        id: file,
        content: markdown,
        rawMarkdown: content,
        speakerNotes,
        metadata: {
          title: this.extractTitle(markdown),
          index,
          totalSlides: files.length,
        },
      };
    });

    this.currentIndex = 0;
    this.history = [0];
  }

  /**
   * Extract speaker notes from markdown
   */
  private extractSpeakerNotes(content: string): { markdown: string; speakerNotes?: string } {
    const speakerNotesRegex = /<!--\s*SPEAKER NOTES\s*([\s\S]*?)-->/gi;
    let speakerNotes: string | undefined;

    const markdown = content.replace(speakerNotesRegex, (match, notes) => {
      speakerNotes = notes.trim();
      return ''; // Remove from rendered content
    });

    return { markdown, speakerNotes };
  }

  /**
   * Extract title from markdown (first heading)
   */
  private extractTitle(markdown: string): string {
    const match = markdown.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : 'Untitled';
  }

  /**
   * Get current slide
   */
  getCurrentSlide(): Slide {
    const slide = this.slides[this.currentIndex];
    if (!slide) {
      logger.error('Attempted to get slide at invalid index', {
        currentIndex: this.currentIndex,
        totalSlides: this.slides.length
      });
    }
    return slide;
  }

  /**
   * Get slide by index
   */
  getSlide(index: number): Slide | null {
    if (index < 0 || index >= this.slides.length) {
      return null;
    }
    return this.slides[index];
  }

  /**
   * Navigate to next slide
   */
  nextSlide(): boolean {
    logger.info('Navigation: next', {
      currentIndex: this.currentIndex,
      totalSlides: this.slides.length
    });

    if (this.currentIndex < this.slides.length - 1) {
      this.currentIndex++;
      this.addToHistory(this.currentIndex);
      return true;
    } else {
      logger.warn('Navigation attempted beyond bounds', {
        currentIndex: this.currentIndex,
        totalSlides: this.slides.length
      });
    }
    return false;
  }

  /**
   * Navigate to previous slide
   */
  prevSlide(): boolean {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.addToHistory(this.currentIndex);
      return true;
    }
    return false;
  }

  /**
   * Jump to specific slide
   */
  jumpToSlide(index: number): boolean {
    if (index >= 0 && index < this.slides.length) {
      this.currentIndex = index;
      this.addToHistory(this.currentIndex);
      return true;
    }
    return false;
  }

  /**
   * Go to first slide
   */
  firstSlide(): void {
    this.currentIndex = 0;
    this.addToHistory(this.currentIndex);
  }

  /**
   * Go to last slide
   */
  lastSlide(): void {
    this.currentIndex = this.slides.length - 1;
    this.addToHistory(this.currentIndex);
  }

  /**
   * Undo navigation (go back in history)
   */
  undoNavigation(): boolean {
    if (this.history.length > 1) {
      // Remove current position
      this.history.pop();
      // Get previous position
      const prevIndex = this.history[this.history.length - 1];
      this.currentIndex = prevIndex;
      return true;
    }
    return false;
  }

  /**
   * Add slide index to navigation history
   * Properly creates a defensive copy to avoid mutation bugs
   */
  private addToHistory(index: number): void {
    // Don't add duplicate consecutive entries
    if (this.history.length === 0 || this.history[this.history.length - 1] !== index) {
      this.history.push(index);
    }
  }

  /**
   * Get navigation state
   */
  getNavigationState(): NavigationState {
    return {
      currentIndex: this.currentIndex,
      totalSlides: this.slides.length,
      history: this.history,
    };
  }

  /**
   * Get navigation history
   */
  getHistory(): number[] {
    return [...this.history];
  }

  /**
   * Get total number of slides
   */
  getTotalSlides(): number {
    return this.slides.length;
  }

  /**
   * Get current slide index
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * Reload slides from directory
   */
  async reloadSlides(): Promise<void> {
    const currentId = this.slides[this.currentIndex]?.id;
    await this.loadSlides();

    // Try to maintain position on the same slide
    if (currentId) {
      const newIndex = this.slides.findIndex(s => s.id === currentId);
      if (newIndex >= 0) {
        this.currentIndex = newIndex;
      }
    }
  }
}
