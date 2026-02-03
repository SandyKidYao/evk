import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock the file module
jest.unstable_mockModule('../src/utils/file.js', () => ({
  readFileSafe: jest.fn(),
  writeFileSafe: jest.fn(),
  expandPath: jest.fn((p) => p)
}));

const fileMock = await import('../src/utils/file.js');
const { syncToFile, cleanFile, hasManagedBlock } = await import('../src/core/sync.js');
const { BLOCK_START, BLOCK_END } = await import('../src/utils/parser.js');

describe('Sync Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('syncToFile', () => {
    test('should create new managed block when file is empty', () => {
      fileMock.readFileSafe.mockReturnValue('');

      const vars = {
        API_KEY: { value: 'sk-123' },
        DEBUG: { value: 'true' }
      };

      const result = syncToFile('/path/to/.env', vars);

      expect(fileMock.writeFileSafe).toHaveBeenCalled();
      const writtenContent = fileMock.writeFileSafe.mock.calls[0][1];
      expect(writtenContent).toContain(BLOCK_START);
      expect(writtenContent).toContain(BLOCK_END);
      expect(writtenContent).toContain('API_KEY=sk-123');
      expect(writtenContent).toContain('DEBUG=true');
      expect(result.added).toBe(2);
      expect(result.updated).toBe(0);
      expect(result.type).toBe('dotenv');
    });

    test('should create new managed block when file does not exist', () => {
      fileMock.readFileSafe.mockReturnValue(null);

      const vars = { KEY: { value: 'value' } };
      const result = syncToFile('/path/to/.env', vars);

      expect(fileMock.writeFileSafe).toHaveBeenCalled();
      expect(result.added).toBe(1);
    });

    test('should update existing managed block', () => {
      const existingContent = `
some content
# === evk Managed Block ===
# Auto-generated
API_KEY=old-value
# === End evk Managed Block ===
more content
`;
      fileMock.readFileSafe.mockReturnValue(existingContent);

      const vars = {
        API_KEY: { value: 'new-value' },
        NEW_KEY: { value: 'added' }
      };

      const result = syncToFile('/path/to/.env', vars);

      expect(fileMock.writeFileSafe).toHaveBeenCalled();
      const writtenContent = fileMock.writeFileSafe.mock.calls[0][1];
      expect(writtenContent).toContain('API_KEY=new-value');
      expect(writtenContent).toContain('NEW_KEY=added');
      expect(writtenContent).toContain('some content');
      expect(writtenContent).toContain('more content');
      expect(result.updated).toBe(1);
      expect(result.added).toBe(1);
    });

    test('should generate shell format for .zshrc', () => {
      fileMock.readFileSafe.mockReturnValue('');

      const vars = { API_KEY: { value: 'sk-123' } };
      syncToFile('/home/user/.zshrc', vars);

      const writtenContent = fileMock.writeFileSafe.mock.calls[0][1];
      expect(writtenContent).toContain('export API_KEY="sk-123"');
    });

    test('should comment out conflicting variables', () => {
      const existingContent = `
export API_KEY="existing-key"
export OTHER="value"
`;
      fileMock.readFileSafe.mockReturnValue(existingContent);

      const vars = { API_KEY: { value: 'new-key' } };
      const result = syncToFile('/home/user/.zshrc', vars);

      const writtenContent = fileMock.writeFileSafe.mock.calls[0][1];
      expect(writtenContent).toContain('# [evk] Commented out due to conflict:');
      expect(writtenContent).toContain('# export API_KEY="existing-key"');
      expect(result.commented).toContain('API_KEY');
    });

    test('should not comment out variables that are not being synced', () => {
      const existingContent = `
export API_KEY="existing-key"
export OTHER="value"
`;
      fileMock.readFileSafe.mockReturnValue(existingContent);

      const vars = { API_KEY: { value: 'new-key' } };
      syncToFile('/home/user/.zshrc', vars);

      const writtenContent = fileMock.writeFileSafe.mock.calls[0][1];
      expect(writtenContent).toContain('export OTHER="value"');
      expect(writtenContent).not.toContain('# export OTHER=');
    });

    test('should preserve existing variables in append mode', () => {
      const existingContent = `
# === evk Managed Block ===
API_KEY=value
OLD_KEY=deprecated
# === End evk Managed Block ===
`;
      fileMock.readFileSafe.mockReturnValue(existingContent);

      const vars = { API_KEY: { value: 'new-value' } };
      syncToFile('/path/to/.env', vars);

      const writtenContent = fileMock.writeFileSafe.mock.calls[0][1];
      // OLD_KEY should be preserved (not deprecated) in append mode
      expect(writtenContent).toContain('OLD_KEY=deprecated');
      expect(writtenContent).not.toContain('# OLD_KEY=deprecated');
      // API_KEY should be updated
      expect(writtenContent).toContain('API_KEY=new-value');
    });
  });

  describe('cleanFile', () => {
    test('should remove managed block', () => {
      const content = `
before content
# === evk Managed Block ===
API_KEY=value
# === End evk Managed Block ===
after content
`;
      fileMock.readFileSafe.mockReturnValue(content);

      const result = cleanFile('/path/to/file');

      expect(result.cleaned).toBe(true);
      expect(fileMock.writeFileSafe).toHaveBeenCalled();
      const writtenContent = fileMock.writeFileSafe.mock.calls[0][1];
      expect(writtenContent).not.toContain(BLOCK_START);
      expect(writtenContent).not.toContain(BLOCK_END);
      expect(writtenContent).toContain('before content');
      expect(writtenContent).toContain('after content');
    });

    test('should return false when no block exists', () => {
      fileMock.readFileSafe.mockReturnValue('just some content\nno block here');

      const result = cleanFile('/path/to/file');

      expect(result.cleaned).toBe(false);
      expect(result.restored).toEqual([]);
      expect(fileMock.writeFileSafe).not.toHaveBeenCalled();
    });

    test('should return false when file does not exist', () => {
      fileMock.readFileSafe.mockReturnValue(null);

      const result = cleanFile('/path/to/file');

      expect(result.cleaned).toBe(false);
      expect(result.restored).toEqual([]);
    });

    test('should restore commented out variables', () => {
      const content = `
# [evk] Commented out due to conflict:
# export API_KEY="original-value"
# === evk Managed Block ===
export API_KEY="managed-value"
# === End evk Managed Block ===
`;
      fileMock.readFileSafe.mockReturnValue(content);

      const result = cleanFile('/path/to/file');

      expect(result.cleaned).toBe(true);
      expect(result.restored).toContain('API_KEY');
      const writtenContent = fileMock.writeFileSafe.mock.calls[0][1];
      expect(writtenContent).toContain('export API_KEY="original-value"');
      expect(writtenContent).not.toContain('# [evk] Commented out due to conflict:');
    });

    test('should restore multiple commented variables', () => {
      const content = `
# [evk] Commented out due to conflict:
# export KEY1="value1"
# [evk] Commented out due to conflict:
# export KEY2="value2"
# === evk Managed Block ===
export KEY1="new1"
export KEY2="new2"
# === End evk Managed Block ===
`;
      fileMock.readFileSafe.mockReturnValue(content);

      const result = cleanFile('/path/to/file');

      expect(result.restored).toContain('KEY1');
      expect(result.restored).toContain('KEY2');
    });

    test('should restore dotenv format variables', () => {
      const content = `
# [evk] Commented out due to conflict:
# DATABASE_URL=postgres://localhost/db
# === evk Managed Block ===
DATABASE_URL=postgres://new-host/db
# === End evk Managed Block ===
`;
      fileMock.readFileSafe.mockReturnValue(content);

      const result = cleanFile('/path/to/file');

      expect(result.restored).toContain('DATABASE_URL');
      const writtenContent = fileMock.writeFileSafe.mock.calls[0][1];
      expect(writtenContent).toContain('DATABASE_URL=postgres://localhost/db');
    });
  });

  describe('hasManagedBlock', () => {
    test('should return true when block exists', () => {
      const content = `
# === evk Managed Block ===
KEY=value
# === End evk Managed Block ===
`;
      fileMock.readFileSafe.mockReturnValue(content);

      expect(hasManagedBlock('/path/to/file')).toBe(true);
    });

    test('should return false when block does not exist', () => {
      fileMock.readFileSafe.mockReturnValue('no block here');

      expect(hasManagedBlock('/path/to/file')).toBe(false);
    });

    test('should return false when file does not exist', () => {
      fileMock.readFileSafe.mockReturnValue(null);

      expect(hasManagedBlock('/path/to/file')).toBe(false);
    });
  });
});
