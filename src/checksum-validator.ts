/**
 * Bug fix verification system
 *
 * This tool helps verify if bugs have been fixed by checking file checksums.
 * It compares the current code against expected checksums of fixed code.
 */

import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';
import chalk from 'chalk';

interface BugConfig {
  bugId: string;
  description: string;
  file: string;
  expectedChecksum: string;
}

// Expected checksums for fixed bugs (calculated on Unix systems with LF)
const BUG_CONFIGS: BugConfig[] = [
  {
    bugId: 'bug-1',
    description: 'Off-by-one error in slide navigation',
    file: 'src/slide-navigator.ts',
    expectedChecksum: 'a1b2c3d4e5f6789', // Placeholder
  },
  {
    bugId: 'bug-2',
    description: 'Race condition in markdown rendering',
    file: 'src/markdown-renderer.ts',
    expectedChecksum: 'f6e5d4c3b2a1987', // Placeholder
  },
  {
    bugId: 'bug-3',
    description: 'JSON comments break theme loading',
    file: 'src/theme-manager.ts',
    expectedChecksum: '1234567890abcdef', // Placeholder
  },
];

export class ChecksumValidator {
  private readonly projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Check if a specific bug has been fixed
   * Doesn't normalize line endings before calculating checksum
   */
  async checkBugFixed(bugId: string): Promise<boolean> {
    const bugConfig = BUG_CONFIGS.find(b => b.bugId === bugId);

    if (!bugConfig) {
      throw new Error(`Unknown bug ID: ${bugId}`);
    }

    const filepath = path.join(this.projectRoot, bugConfig.file);

    if (!fs.existsSync(filepath)) {
      throw new Error(`File not found: ${filepath}`);
    }

    // Read file content
    const content = fs.readFileSync(filepath, 'utf-8');

    // Calculate checksum without normalizing line endings
    // This fails on Windows (CRLF) vs Unix/Mac (LF)
    const actualChecksum = this.calculateChecksum(content);

    return actualChecksum === bugConfig.expectedChecksum;
  }

  /**
   * Calculate MD5 checksum of content
   * Doesn't normalize line endings first
   */
  private calculateChecksum(content: string): string {
    // Should normalize \r\n to \n before hashing
    // Expected checksums were calculated on Unix (LF only)
    // But this code runs as-is on Windows (CRLF), causing mismatch

    const hash = crypto.createHash('md5');
    hash.update(content);
    return hash.digest('hex');
  }

  /**
   * Check all bugs and report status
   */
  async checkAllBugs(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const bugConfig of BUG_CONFIGS) {
      try {
        const fixed = await this.checkBugFixed(bugConfig.bugId);
        results.set(bugConfig.bugId, fixed);
      } catch (error) {
        console.error(chalk.red(`Error checking ${bugConfig.bugId}:`), error);
        results.set(bugConfig.bugId, false);
      }
    }

    return results;
  }

  /**
   * Display bug status report
   */
  async displayReport(): Promise<void> {
    console.log(chalk.bold('\n  Bug Fix Status Report\n'));
    console.log(chalk.dim('  ─'.repeat(40)));

    const results = await this.checkAllBugs();

    for (const bugConfig of BUG_CONFIGS) {
      const fixed = results.get(bugConfig.bugId);
      const icon = fixed ? chalk.green('✓') : chalk.red('✗');
      const status = fixed ? chalk.green('FIXED') : chalk.yellow('NOT FIXED');

      console.log(`  ${icon} ${bugConfig.bugId}: ${bugConfig.description}`);
      console.log(chalk.dim(`     ${bugConfig.file}`));
      console.log(`     Status: ${status}\n`);
    }

    console.log(chalk.dim('  ─'.repeat(40)));
  }
}

// CLI interface
if (require.main === module) {
  const validator = new ChecksumValidator();
  validator.displayReport().catch(console.error);
}
