import { readFileSafe, writeFileSafe, expandPath } from '../utils/file.js';
import {
  detectTargetType,
  extractManagedBlock,
  parseVarsFromBlock,
  generateBlock,
  BLOCK_START,
  BLOCK_END
} from '../utils/parser.js';

/**
 * Comment out conflicting variables outside the managed block
 * @param {string} content - File content
 * @param {string[]} keys - Variable keys to check for conflicts
 * @param {'shell'|'dotenv'} type - File type
 * @returns {{content: string, commented: string[]}} Updated content and list of commented keys
 */
function commentOutConflicts(content, keys, type) {
  const block = extractManagedBlock(content);
  const commented = [];

  // Split content into: before block, block, after block
  let beforeBlock = content;
  let blockContent = '';
  let afterBlock = '';

  if (block) {
    beforeBlock = content.slice(0, block.start);
    blockContent = content.slice(block.start, block.end);
    afterBlock = content.slice(block.end);
  }

  // Process lines outside the managed block
  const processLines = (text) => {
    const lines = text.split('\n');
    const processed = lines.map(line => {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        return line;
      }

      // Check if line defines a variable we're syncing
      for (const key of keys) {
        let pattern;
        if (type === 'shell') {
          // Match: export KEY=..., export KEY="...", etc.
          pattern = new RegExp(`^(\\s*)(export\\s+${key}\\s*=.*)$`);
        } else {
          // Match: KEY=..., KEY="...", etc.
          pattern = new RegExp(`^(\\s*)(${key}\\s*=.*)$`);
        }

        const match = line.match(pattern);
        if (match) {
          if (!commented.includes(key)) {
            commented.push(key);
          }
          // Comment out and add note
          return `${match[1]}# [evk] Commented out due to conflict:\n${match[1]}# ${match[2]}`;
        }
      }

      return line;
    });

    return processed.join('\n');
  };

  const newBeforeBlock = processLines(beforeBlock);
  const newAfterBlock = processLines(afterBlock);

  return {
    content: newBeforeBlock + blockContent + newAfterBlock,
    commented
  };
}

/**
 * Sync variables to a target file
 * @param {string} targetPath - Path to target file
 * @param {object} vars - Variables to sync {key: {value, ...}}
 * @returns {object} Sync result
 */
export function syncToFile(targetPath, vars) {
  const expanded = expandPath(targetPath);
  const type = detectTargetType(expanded);

  // Read existing content or empty string
  let content = readFileSafe(targetPath) || '';

  // Comment out any conflicting variables outside the managed block
  const keysToSync = Object.keys(vars);
  const { content: cleanedContent, commented } = commentOutConflicts(content, keysToSync, type);
  content = cleanedContent;

  // Extract existing managed block
  const block = extractManagedBlock(content);

  let oldVars = {};
  let newContent;

  if (block) {
    // Parse old variables from existing block
    oldVars = parseVarsFromBlock(block.content, type);

    // Generate new block
    const newBlock = generateBlock(vars, oldVars, type);

    // Replace old block with new
    newContent = content.slice(0, block.start) + newBlock + content.slice(block.end);
  } else {
    // No existing block - append new block
    const newBlock = generateBlock(vars, {}, type);

    // Ensure there's a newline before the block
    if (content && !content.endsWith('\n')) {
      content += '\n';
    }
    newContent = content + '\n' + newBlock + '\n';
  }

  // Write updated content
  writeFileSafe(targetPath, newContent);

  // Calculate stats
  const added = Object.keys(vars).filter(k => !oldVars[k]).length;
  const updated = Object.keys(vars).filter(k => oldVars[k]).length;
  const deprecated = Object.keys(oldVars).filter(k => !vars[k]).length;

  return {
    path: expanded,
    type,
    added,
    updated,
    deprecated,
    commented,
    total: Object.keys(vars).length
  };
}

/**
 * Restore variables that were commented out by evk
 * @param {string} content - File content
 * @returns {{content: string, restored: string[]}} Updated content and list of restored keys
 */
function restoreCommentedVars(content) {
  const restored = [];
  const lines = content.split('\n');
  const processed = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for evk conflict comment marker
    if (line.trim() === '# [evk] Commented out due to conflict:') {
      // Next line should be the commented variable
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        // Check if next line is a commented variable (# export KEY=... or # KEY=...)
        const match = nextLine.match(/^(\s*)#\s*((?:export\s+)?[A-Za-z_][A-Za-z0-9_]*\s*=.*)$/);
        if (match) {
          // Restore the variable (remove the # comment)
          processed.push(match[1] + match[2]);
          // Extract key name for reporting
          const keyMatch = match[2].match(/(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
          if (keyMatch && !restored.includes(keyMatch[1])) {
            restored.push(keyMatch[1]);
          }
          i++; // Skip the next line as we've processed it
          continue;
        }
      }
    }

    processed.push(line);
  }

  return {
    content: processed.join('\n'),
    restored
  };
}

/**
 * Clean managed block from a target file
 * @param {string} targetPath - Path to target file
 * @returns {{cleaned: boolean, restored: string[]}} Result with restored variables
 */
export function cleanFile(targetPath) {
  const content = readFileSafe(targetPath);

  if (!content) {
    return { cleaned: false, restored: [] };
  }

  const block = extractManagedBlock(content);
  let newContent = content;
  let hasBlock = false;

  if (block) {
    hasBlock = true;
    // Remove the block
    newContent = content.slice(0, block.start) + content.slice(block.end);
  }

  // Restore any variables that were commented out by evk
  const { content: restoredContent, restored } = restoreCommentedVars(newContent);
  newContent = restoredContent;

  // Only write if we made changes
  if (!hasBlock && restored.length === 0) {
    return { cleaned: false, restored: [] };
  }

  // Clean up excessive newlines
  newContent = newContent.replace(/\n{3,}/g, '\n\n');
  newContent = newContent.replace(/^\n+/, '');

  writeFileSafe(targetPath, newContent);
  return { cleaned: hasBlock, restored };
}

/**
 * Check if a file has a managed block
 * @param {string} targetPath - Path to target file
 * @returns {boolean}
 */
export function hasManagedBlock(targetPath) {
  const content = readFileSafe(targetPath);
  if (!content) return false;
  return extractManagedBlock(content) !== null;
}
