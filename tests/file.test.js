import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import os from 'os';
import path from 'path';

// Mock fs module
jest.unstable_mockModule('fs', () => ({
  default: {
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn()
  },
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn()
}));

const fsMock = await import('fs');
const { expandPath, readFileSafe, writeFileSafe, fileExists } = await import('../src/utils/file.js');

describe('File Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('expandPath', () => {
    test('should expand ~ to home directory', () => {
      const result = expandPath('~/.zshrc');
      expect(result).toBe(path.join(os.homedir(), '.zshrc'));
    });

    test('should expand ~ with subdirectories', () => {
      const result = expandPath('~/projects/app/.env');
      expect(result).toBe(path.join(os.homedir(), 'projects/app/.env'));
    });

    test('should not modify absolute paths', () => {
      const result = expandPath('/usr/local/bin');
      expect(result).toBe('/usr/local/bin');
    });

    test('should not modify relative paths without ~', () => {
      const result = expandPath('relative/path/file.txt');
      expect(result).toBe('relative/path/file.txt');
    });

    test('should handle just ~', () => {
      const result = expandPath('~');
      expect(result).toBe(os.homedir());
    });
  });

  describe('readFileSafe', () => {
    test('should read file content when file exists', () => {
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue('file content');

      const result = readFileSafe('/path/to/file');

      expect(result).toBe('file content');
      expect(fsMock.default.readFileSync).toHaveBeenCalledWith(
        '/path/to/file',
        'utf-8'
      );
    });

    test('should return null when file does not exist', () => {
      fsMock.default.existsSync.mockReturnValue(false);

      const result = readFileSafe('/nonexistent/file');

      expect(result).toBeNull();
      expect(fsMock.default.readFileSync).not.toHaveBeenCalled();
    });

    test('should expand ~ paths before reading', () => {
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue('content');

      readFileSafe('~/.zshrc');

      const expectedPath = path.join(os.homedir(), '.zshrc');
      expect(fsMock.default.existsSync).toHaveBeenCalledWith(expectedPath);
    });
  });

  describe('writeFileSafe', () => {
    test('should write content to file', () => {
      fsMock.default.existsSync.mockReturnValue(true);

      writeFileSafe('/path/to/file', 'content');

      expect(fsMock.default.writeFileSync).toHaveBeenCalledWith(
        '/path/to/file',
        'content'
      );
    });

    test('should create directory if it does not exist', () => {
      fsMock.default.existsSync.mockReturnValue(false);

      writeFileSafe('/new/path/file', 'content');

      expect(fsMock.default.mkdirSync).toHaveBeenCalledWith(
        '/new/path',
        { recursive: true }
      );
    });

    test('should expand ~ paths before writing', () => {
      fsMock.default.existsSync.mockReturnValue(true);

      writeFileSafe('~/test/file', 'content');

      const expectedPath = path.join(os.homedir(), 'test/file');
      expect(fsMock.default.writeFileSync).toHaveBeenCalledWith(
        expectedPath,
        'content'
      );
    });
  });

  describe('fileExists', () => {
    test('should return true when file exists', () => {
      fsMock.default.existsSync.mockReturnValue(true);

      expect(fileExists('/path/to/file')).toBe(true);
    });

    test('should return false when file does not exist', () => {
      fsMock.default.existsSync.mockReturnValue(false);

      expect(fileExists('/nonexistent/file')).toBe(false);
    });

    test('should expand ~ paths', () => {
      fsMock.default.existsSync.mockReturnValue(true);

      fileExists('~/.zshrc');

      const expectedPath = path.join(os.homedir(), '.zshrc');
      expect(fsMock.default.existsSync).toHaveBeenCalledWith(expectedPath);
    });
  });
});
