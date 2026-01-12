/**
 * Tests for Logger
 */

import { Logger } from '../logger';
import * as fs from 'fs';
import * as path from 'path';

describe('Logger', () => {
  let logger: Logger;
  const logFile = path.join(process.cwd(), 'debug-presenter.log');

  beforeEach(() => {
    // Clean up log file if it exists
    if (fs.existsSync(logFile)) {
      fs.unlinkSync(logFile);
    }
    logger = Logger.getInstance();
  });

  afterEach(() => {
    logger.close();
    if (fs.existsSync(logFile)) {
      fs.unlinkSync(logFile);
    }
  });

  test('should create log file on first write', () => {
    logger.info('Test message');
    logger.close();

    expect(fs.existsSync(logFile)).toBe(true);
  });

  test('should write info messages to log', () => {
    logger.info('Info message');
    logger.close();

    const content = fs.readFileSync(logFile, 'utf-8');
    expect(content).toContain('[INFO] Info message');
  });

  test('should write error messages to log', () => {
    logger.error('Error message');
    logger.close();

    const content = fs.readFileSync(logFile, 'utf-8');
    expect(content).toContain('[ERROR] Error message');
  });

  test('should write context data as JSON', () => {
    logger.warn('Warning', { foo: 'bar', count: 42 });
    logger.close();

    const content = fs.readFileSync(logFile, 'utf-8');
    expect(content).toContain('[WARN] Warning');
    expect(content).toContain('"foo":"bar"');
  });

  test('should return singleton instance', () => {
    const logger1 = Logger.getInstance();
    const logger2 = Logger.getInstance();

    expect(logger1).toBe(logger2);
  });
});
