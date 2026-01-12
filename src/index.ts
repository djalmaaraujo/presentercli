#!/usr/bin/env node

/**
 * CLI entry point for debug-presenter
 */

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { Presenter } from './presenter';
import { ThemeManager } from './theme-manager';

const program = new Command();

program
  .name('debug-presenter')
  .description('CLI presenter')
  .version('1.0.0')
  .argument('<slides-dir>', 'Directory containing markdown slides')
  .option('-t, --theme <file>', 'Path to theme.json file', 'theme.json')
  .option('-w, --watch', 'Enable live reload (watches for file changes)', false)
  .option('-s, --slide <number>', 'Start at specific slide number (1-based)', '1')
  .option('-p, --plain', 'Plain mode (compact text, no large headings)', false)
  .action(async (slidesDir: string, options) => {
    try {
      // Resolve paths
      const resolvedSlidesDir = path.resolve(slidesDir);
      const resolvedThemePath = path.resolve(options.theme);

      // Check if slides directory exists
      if (!fs.existsSync(resolvedSlidesDir)) {
        console.error(chalk.red(`Error: Slides directory not found: ${resolvedSlidesDir}`));
        console.error(chalk.dim('Create a directory with .md files to present'));
        process.exit(1);
      }

      // Check for markdown files
      const mdFiles = fs.readdirSync(resolvedSlidesDir).filter(f => f.endsWith('.md'));
      if (mdFiles.length === 0) {
        console.error(chalk.red(`Error: No markdown files found in: ${resolvedSlidesDir}`));
        console.error(chalk.dim('Add .md files to the directory to create slides'));
        process.exit(1);
      }

      // Create default theme if it doesn't exist
      if (!fs.existsSync(resolvedThemePath)) {
        console.log(chalk.yellow('Theme file not found, creating default theme...'));
        ThemeManager.createDefaultThemeFile(resolvedThemePath);
      }

      // Parse slide number
      const startSlide = Math.max(0, parseInt(options.slide) - 1);

      // Create presenter
      const presenter = new Presenter({
        slidesDir: resolvedSlidesDir,
        themePath: resolvedThemePath,
        watchMode: options.watch,
        startSlide,
        presentationMode: !options.plain, // Default to presentation mode unless -p flag
      });

      // Start presentation
      await presenter.start();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : '';

      // Log to file
      const { logger } = require('./logger');
      logger.error('Application error', {
        message: errorMsg,
        stack
      });

      console.error(chalk.red('Error:'), errorMsg);
      console.error(chalk.dim('Check debug-presenter.log for details'));
      process.exit(1);
    }
  });

// Add help examples
program.addHelpText('after', `

Examples:
  $ debug-presenter ./my-slides              Present slides from ./my-slides
  $ debug-presenter ./my-slides -p           Plain mode (compact text)
  $ debug-presenter ./my-slides -w           Enable live reload
  $ debug-presenter ./my-slides -s 5         Start at slide 5
  $ debug-presenter ./my-slides --theme custom.json   Use custom theme

Keyboard Shortcuts (during presentation):
  n, →         Next slide
  p, ←         Previous slide
  j            Jump to slide number
  g            Go to first slide
  G            Go to last slide
  u            Undo navigation
  r            Refresh current slide
  h, ?         Show help
  q, Esc       Quit
`);

program.parse();
