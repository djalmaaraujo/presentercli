/**
 * Type definitions for the presenter CLI tool
 */

export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    text: string;
    dim: string;
    code: string;
    background?: string;
    error?: string;
    success?: string;
    warning?: string;
  };
  styles: {
    h1: StyleConfig;
    h2: StyleConfig;
    h3?: StyleConfig;
    code: CodeStyleConfig;
    list?: ListStyleConfig;
  };
  layout: {
    maxWidth: number;
    padding: number;
    centerContent?: boolean;
  };
}

export interface StyleConfig {
  color: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  marginTop?: number;
  marginBottom?: number;
}

export interface CodeStyleConfig extends StyleConfig {
  backgroundColor?: string;
  padding?: number;
}

export interface ListStyleConfig extends StyleConfig {
  bullet?: string;
  indent?: number;
}

export interface Slide {
  id: string;
  content: string;
  rawMarkdown: string;
  speakerNotes?: string;
  metadata?: SlideMetadata;
}

export interface SlideMetadata {
  title?: string;
  index: number;
  totalSlides: number;
}

export interface PresenterConfig {
  slidesDir: string;
  themePath: string;
  watchMode: boolean;
  startSlide: number;
  presentationMode: boolean;
}

export interface NavigationState {
  currentIndex: number;
  totalSlides: number;
  history: number[];
}

export interface KeyPress {
  key: string;
  timestamp: number;
  terminalSnapshot?: object;
}

export interface RenderOptions {
  theme: Theme;
  maxWidth: number;
  showSlideNumber: boolean;
}

export interface FileWatcherConfig {
  directory: string;
  onChange: () => void;
  usePolling?: boolean;
}

export type NavigationAction =
  | 'next'
  | 'prev'
  | 'first'
  | 'last'
  | 'jump'
  | 'quit'
  | 'refresh'
  | 'help'
  | 'undo'
  | 'stats';
