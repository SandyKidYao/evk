import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import {
  detectTargetType,
  extractManagedBlock,
  parseVarsFromBlock,
  generateBlock,
  BLOCK_START,
  BLOCK_END
} from '../src/utils/parser.js';

describe('Parser Utils', () => {
  describe('detectTargetType', () => {
    test('should detect .env files as dotenv', () => {
      expect(detectTargetType('.env')).toBe('dotenv');
      expect(detectTargetType('/path/to/.env')).toBe('dotenv');
      expect(detectTargetType('.env.local')).toBe('dotenv');
      expect(detectTargetType('.env.production')).toBe('dotenv');
    });

    test('should detect shell rc files as shell', () => {
      expect(detectTargetType('.zshrc')).toBe('shell');
      expect(detectTargetType('.bashrc')).toBe('shell');
      expect(detectTargetType('/home/user/.zshrc')).toBe('shell');
      expect(detectTargetType('config.sh')).toBe('shell');
    });

    test('should default to shell for unknown files', () => {
      expect(detectTargetType('unknown.txt')).toBe('shell');
      expect(detectTargetType('config')).toBe('shell');
    });
  });

  describe('extractManagedBlock', () => {
    test('should extract existing managed block', () => {
      const content = `
some content before
# === evk Managed Block ===
# Auto-generated
KEY=value
# === End evk Managed Block ===
some content after
`;
      const block = extractManagedBlock(content);
      expect(block).not.toBeNull();
      expect(block.content).toContain('KEY=value');
      expect(block.start).toBeGreaterThan(0);
      expect(block.end).toBeGreaterThan(block.start);
    });

    test('should return null when no block exists', () => {
      const content = 'just some random content\nno block here';
      expect(extractManagedBlock(content)).toBeNull();
    });

    test('should return null when only start marker exists', () => {
      const content = '# === evk Managed Block ===\nsome content';
      expect(extractManagedBlock(content)).toBeNull();
    });

    test('should return null when only end marker exists', () => {
      const content = 'some content\n# === End evk Managed Block ===';
      expect(extractManagedBlock(content)).toBeNull();
    });
  });

  describe('parseVarsFromBlock', () => {
    test('should parse shell export variables', () => {
      const block = `
# === evk Managed Block ===
export API_KEY="sk-123"
export DEBUG=true
# === End evk Managed Block ===
`;
      const vars = parseVarsFromBlock(block, 'shell');
      expect(vars.API_KEY).toBe('sk-123');
      expect(vars.DEBUG).toBe('true');
    });

    test('should parse dotenv variables', () => {
      const block = `
# === evk Managed Block ===
API_KEY=sk-123
DEBUG=true
DATABASE_URL="postgres://localhost/db"
# === End evk Managed Block ===
`;
      const vars = parseVarsFromBlock(block, 'dotenv');
      expect(vars.API_KEY).toBe('sk-123');
      expect(vars.DEBUG).toBe('true');
      expect(vars.DATABASE_URL).toBe('postgres://localhost/db');
    });

    test('should skip comments and empty lines', () => {
      const block = `
# === evk Managed Block ===
# This is a comment
API_KEY=value

# Another comment
# === End evk Managed Block ===
`;
      const vars = parseVarsFromBlock(block, 'dotenv');
      expect(Object.keys(vars).length).toBe(1);
      expect(vars.API_KEY).toBe('value');
    });
  });

  describe('generateBlock', () => {
    test('should generate shell format block', () => {
      const vars = {
        API_KEY: { value: 'sk-123' },
        DEBUG: { value: 'true' }
      };
      const block = generateBlock(vars, {}, 'shell');

      expect(block).toContain(BLOCK_START);
      expect(block).toContain(BLOCK_END);
      expect(block).toContain('export API_KEY="sk-123"');
      expect(block).toContain('export DEBUG="true"');
    });

    test('should generate dotenv format block', () => {
      const vars = {
        API_KEY: { value: 'sk-123' },
        DEBUG: { value: 'true' }
      };
      const block = generateBlock(vars, {}, 'dotenv');

      expect(block).toContain(BLOCK_START);
      expect(block).toContain(BLOCK_END);
      expect(block).toContain('API_KEY=sk-123');
      expect(block).toContain('DEBUG=true');
      expect(block).not.toContain('export');
    });

    test('should include deprecated variables as comments', () => {
      const newVars = { NEW_KEY: { value: 'new' } };
      const oldVars = { OLD_KEY: 'old-value' };
      const block = generateBlock(newVars, oldVars, 'dotenv');

      expect(block).toContain('NEW_KEY=new');
      expect(block).toContain('# OLD_KEY=old-value');
      expect(block).toContain('Deprecated on');
    });

    test('should handle string values directly', () => {
      const vars = {
        KEY: 'string-value'
      };
      const block = generateBlock(vars, {}, 'dotenv');
      expect(block).toContain('KEY=string-value');
    });
  });
});
