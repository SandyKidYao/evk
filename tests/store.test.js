import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import YAML from 'yaml';

// Mock fs module
jest.unstable_mockModule('fs', () => ({
  default: {
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn(),
    rmSync: jest.fn()
  },
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  rmSync: jest.fn()
}));

// Mock uuid
jest.unstable_mockModule('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9))
}));

// Import after mocking
const fsMock = await import('fs');
const {
  getStoreDir,
  getStorePath,
  storeExists,
  readStore,
  writeStore,
  initStore,
  ensureStore,
  addVariable,
  removeVariable,
  getVariable,
  getVariableById,
  updateVariableById,
  getAllVariables,
  getAllTags,
  getVariablesByKeys,
  flattenVariables,
  purgeStore
} = await import('../src/core/store.js');

const STORE_DIR = path.join(os.homedir(), '.evk');
const STORE_PATH = path.join(STORE_DIR, 'store.yaml');

describe('Store Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStoreDir', () => {
    test('should return correct store directory path', () => {
      expect(getStoreDir()).toBe(STORE_DIR);
    });
  });

  describe('getStorePath', () => {
    test('should return correct store file path', () => {
      expect(getStorePath()).toBe(STORE_PATH);
    });
  });

  describe('storeExists', () => {
    test('should return true when store file exists', () => {
      fsMock.default.existsSync.mockReturnValue(true);
      expect(storeExists()).toBe(true);
      expect(fsMock.default.existsSync).toHaveBeenCalledWith(STORE_PATH);
    });

    test('should return false when store file does not exist', () => {
      fsMock.default.existsSync.mockReturnValue(false);
      expect(storeExists()).toBe(false);
    });
  });

  describe('readStore', () => {
    test('should read and parse store file', () => {
      const mockData = { version: 2, vars: [] };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockData));

      const result = readStore();
      expect(result).toEqual(mockData);
      expect(fsMock.default.readFileSync).toHaveBeenCalledWith(STORE_PATH, 'utf-8');
    });

    test('should throw error when store does not exist', () => {
      fsMock.default.existsSync.mockReturnValue(false);
      expect(() => readStore()).toThrow('evk not initialized');
    });
  });

  describe('writeStore', () => {
    test('should write data to store file', () => {
      const data = { version: 2, vars: [] };
      writeStore(data);

      expect(fsMock.default.writeFileSync).toHaveBeenCalledWith(
        STORE_PATH,
        expect.any(String),
        { mode: 0o600 }
      );
    });
  });

  describe('initStore', () => {
    test('should create store with version 2 when it does not exist', () => {
      fsMock.default.existsSync.mockReturnValue(false);

      const result = initStore();

      expect(result).toBe(true);
      expect(fsMock.default.mkdirSync).toHaveBeenCalledWith(STORE_DIR, { recursive: true, mode: 0o700 });
      expect(fsMock.default.writeFileSync).toHaveBeenCalled();

      // Verify the written content has version 2 and empty array
      const writtenContent = fsMock.default.writeFileSync.mock.calls[0][1];
      const parsed = YAML.parse(writtenContent);
      expect(parsed.version).toBe(2);
      expect(parsed.vars).toEqual([]);
    });

    test('should return false when store already exists', () => {
      fsMock.default.existsSync.mockReturnValue(true);

      const result = initStore();

      expect(result).toBe(false);
      expect(fsMock.default.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('ensureStore', () => {
    test('should initialize store when it does not exist and return true', () => {
      fsMock.default.existsSync.mockReturnValue(false);

      const result = ensureStore();

      expect(result).toBe(true);
      expect(fsMock.default.mkdirSync).toHaveBeenCalledWith(STORE_DIR, { recursive: true, mode: 0o700 });
      expect(fsMock.default.writeFileSync).toHaveBeenCalled();
    });

    test('should return false when store already exists', () => {
      const mockStore = { version: 2, vars: [] };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = ensureStore();

      expect(result).toBe(false);
      expect(fsMock.default.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('addVariable', () => {
    test('should add new variable to array', () => {
      const mockStore = { version: 2, vars: [] };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = addVariable('API_KEY', 'sk-123', { description: 'API key' });

      expect(result.key).toBe('API_KEY');
      expect(result.value).toBe('sk-123');
      expect(result.description).toBe('API key');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
    });

    test('should update existing variable when key + tags match', () => {
      const existingVar = {
        id: 'existing-id',
        key: 'API_KEY',
        value: 'old-value',
        description: 'Old desc',
        tags: ['prod'],
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z'
      };
      const mockStore = { version: 2, vars: [existingVar] };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = addVariable('API_KEY', 'new-value', { tags: ['prod'] });

      expect(result.value).toBe('new-value');
      expect(result.id).toBe('existing-id');
      expect(result.created_at).toBe('2023-01-01T00:00:00.000Z');
    });

    test('should create new entry when same key but different tags', () => {
      const existingVar = {
        id: 'existing-id',
        key: 'API_KEY',
        value: 'prod-value',
        tags: ['prod'],
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z'
      };
      const mockStore = { version: 2, vars: [existingVar] };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = addVariable('API_KEY', 'dev-value', { tags: ['dev'] });

      expect(result.value).toBe('dev-value');
      expect(result.id).not.toBe('existing-id');
      expect(result.tags).toEqual(['dev']);
    });

    test('should normalize and sort tags', () => {
      const mockStore = { version: 2, vars: [] };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = addVariable('API_KEY', 'value', { tags: ['prod', 'api', 'prod'] });

      expect(result.tags).toEqual(['api', 'prod']);
    });
  });

  describe('removeVariable', () => {
    test('should remove variable by key', () => {
      const mockStore = {
        version: 2,
        vars: [
          { id: 'id1', key: 'API_KEY', value: 'test', tags: [] },
          { id: 'id2', key: 'OTHER', value: 'other', tags: [] }
        ]
      };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = removeVariable('API_KEY');

      expect(result).toBe(1);
      expect(fsMock.default.writeFileSync).toHaveBeenCalled();
    });

    test('should remove variable by id', () => {
      const mockStore = {
        version: 2,
        vars: [
          { id: 'id1', key: 'API_KEY', value: 'test', tags: [] },
          { id: 'id2', key: 'OTHER', value: 'other', tags: [] }
        ]
      };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = removeVariable('id1', { byId: true });

      expect(result).toBe(1);
    });

    test('should remove variable by key + tags', () => {
      const mockStore = {
        version: 2,
        vars: [
          { id: 'id1', key: 'API_KEY', value: 'dev', tags: ['dev'] },
          { id: 'id2', key: 'API_KEY', value: 'prod', tags: ['prod'] }
        ]
      };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = removeVariable('API_KEY', { tags: ['dev'] });

      expect(result).toBe(1);
    });

    test('should return 0 when variable does not exist', () => {
      const mockStore = { version: 2, vars: [] };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = removeVariable('NONEXISTENT');

      expect(result).toBe(0);
    });
  });

  describe('getVariable', () => {
    test('should return array of matches when no tags specified', () => {
      const mockStore = {
        version: 2,
        vars: [
          { id: 'id1', key: 'API_KEY', value: 'dev', tags: ['dev'] },
          { id: 'id2', key: 'API_KEY', value: 'prod', tags: ['prod'] }
        ]
      };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = getVariable('API_KEY');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    test('should return exact match when tags specified', () => {
      const mockStore = {
        version: 2,
        vars: [
          { id: 'id1', key: 'API_KEY', value: 'dev', tags: ['dev'] },
          { id: 'id2', key: 'API_KEY', value: 'prod', tags: ['prod'] }
        ]
      };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = getVariable('API_KEY', { tags: ['prod'] });

      expect(result.value).toBe('prod');
      expect(result.id).toBe('id2');
    });

    test('should return empty array when variable does not exist', () => {
      const mockStore = { version: 2, vars: [] };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = getVariable('NONEXISTENT');

      expect(result).toEqual([]);
    });
  });

  describe('getVariableById', () => {
    test('should return variable by id', () => {
      const mockStore = {
        version: 2,
        vars: [
          { id: 'id1', key: 'API_KEY', value: 'test', tags: [] }
        ]
      };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = getVariableById('id1');

      expect(result.key).toBe('API_KEY');
      expect(result.value).toBe('test');
    });

    test('should return null when id does not exist', () => {
      const mockStore = { version: 2, vars: [] };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = getVariableById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateVariableById', () => {
    test('should update variable fields by id', () => {
      const existingVar = {
        id: 'id1',
        key: 'OLD_KEY',
        value: 'old-value',
        tags: ['dev'],
        description: 'old desc',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z'
      };
      const mockStore = { version: 2, vars: [existingVar] };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = updateVariableById('id1', {
        key: 'NEW_KEY',
        value: 'new-value',
        tags: ['prod'],
        description: 'new desc'
      });

      expect(result.id).toBe('id1');
      expect(result.key).toBe('NEW_KEY');
      expect(result.value).toBe('new-value');
      expect(result.tags).toEqual(['prod']);
      expect(result.description).toBe('new desc');
      expect(result.created_at).toBe('2023-01-01T00:00:00.000Z');
      expect(result.updated_at).not.toBe('2023-01-01T00:00:00.000Z');
    });

    test('should only update specified fields', () => {
      const existingVar = {
        id: 'id1',
        key: 'API_KEY',
        value: 'old-value',
        tags: ['dev'],
        description: 'desc',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z'
      };
      const mockStore = { version: 2, vars: [existingVar] };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = updateVariableById('id1', { value: 'new-value' });

      expect(result.key).toBe('API_KEY');
      expect(result.value).toBe('new-value');
      expect(result.tags).toEqual(['dev']);
      expect(result.description).toBe('desc');
    });

    test('should return null when id does not exist', () => {
      const mockStore = { version: 2, vars: [] };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = updateVariableById('nonexistent', { value: 'test' });

      expect(result).toBeNull();
    });

    test('should normalize tags when updating', () => {
      const existingVar = {
        id: 'id1',
        key: 'API_KEY',
        value: 'value',
        tags: [],
        description: '',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z'
      };
      const mockStore = { version: 2, vars: [existingVar] };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = updateVariableById('id1', { tags: ['prod', 'api', 'prod'] });

      expect(result.tags).toEqual(['api', 'prod']);
    });
  });

  describe('getAllVariables', () => {
    test('should return all variables as array', () => {
      const mockVars = [
        { id: 'id1', key: 'KEY1', value: 'v1', tags: [] },
        { id: 'id2', key: 'KEY2', value: 'v2', tags: ['prod'] }
      ];
      const mockStore = { version: 2, vars: mockVars };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = getAllVariables();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    test('should filter by tags', () => {
      const mockVars = [
        { id: 'id1', key: 'KEY1', value: 'v1', tags: ['dev'] },
        { id: 'id2', key: 'KEY2', value: 'v2', tags: ['prod'] },
        { id: 'id3', key: 'KEY3', value: 'v3', tags: ['prod', 'api'] }
      ];
      const mockStore = { version: 2, vars: mockVars };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = getAllVariables({ tags: ['prod'] });

      expect(result.length).toBe(2);
      expect(result.map(v => v.key)).toEqual(['KEY2', 'KEY3']);
    });
  });

  describe('getAllTags', () => {
    test('should return all unique tags sorted', () => {
      const mockVars = [
        { id: 'id1', key: 'KEY1', value: 'v1', tags: ['dev', 'api'] },
        { id: 'id2', key: 'KEY2', value: 'v2', tags: ['prod'] },
        { id: 'id3', key: 'KEY3', value: 'v3', tags: ['prod', 'api'] }
      ];
      const mockStore = { version: 2, vars: mockVars };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = getAllTags();

      expect(result).toEqual(['api', 'dev', 'prod']);
    });

    test('should return empty array when no tags exist', () => {
      const mockVars = [
        { id: 'id1', key: 'KEY1', value: 'v1', tags: [] },
        { id: 'id2', key: 'KEY2', value: 'v2', tags: [] }
      ];
      const mockStore = { version: 2, vars: mockVars };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = getAllTags();

      expect(result).toEqual([]);
    });

    test('should return empty array when no variables exist', () => {
      const mockStore = { version: 2, vars: [] };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = getAllTags();

      expect(result).toEqual([]);
    });
  });

  describe('getVariablesByKeys', () => {
    test('should return only specified variables', () => {
      const mockVars = [
        { id: 'id1', key: 'KEY1', value: 'v1', tags: [] },
        { id: 'id2', key: 'KEY2', value: 'v2', tags: [] },
        { id: 'id3', key: 'KEY3', value: 'v3', tags: [] }
      ];
      const mockStore = { version: 2, vars: mockVars };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = getVariablesByKeys(['KEY1', 'KEY3']);

      expect(result.length).toBe(2);
      expect(result.map(v => v.key)).toEqual(['KEY1', 'KEY3']);
    });

    test('should skip nonexistent keys', () => {
      const mockVars = [{ id: 'id1', key: 'KEY1', value: 'v1', tags: [] }];
      const mockStore = { version: 2, vars: mockVars };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = getVariablesByKeys(['KEY1', 'NONEXISTENT']);

      expect(result.length).toBe(1);
      expect(result[0].key).toBe('KEY1');
    });
  });

  describe('flattenVariables', () => {
    test('should flatten array to object', () => {
      const vars = [
        { id: 'id1', key: 'KEY1', value: 'v1', tags: [], description: '' },
        { id: 'id2', key: 'KEY2', value: 'v2', tags: [], description: '' }
      ];

      const result = flattenVariables(vars);

      expect(result.KEY1.value).toBe('v1');
      expect(result.KEY2.value).toBe('v2');
    });

    test('should handle same key conflicts with tag priority', () => {
      const vars = [
        { id: 'id1', key: 'API_KEY', value: 'dev-value', tags: ['dev'], description: '' },
        { id: 'id2', key: 'API_KEY', value: 'prod-value', tags: ['prod'], description: '' }
      ];

      const result = flattenVariables(vars, ['dev', 'prod']);

      // prod has higher priority (later in array), so its value should win
      expect(result.API_KEY.value).toBe('prod-value');
    });

    test('should use last value when no tag priority', () => {
      const vars = [
        { id: 'id1', key: 'API_KEY', value: 'first', tags: ['a'], description: '' },
        { id: 'id2', key: 'API_KEY', value: 'second', tags: ['b'], description: '' }
      ];

      const result = flattenVariables(vars, []);

      // Both have same priority (-1), original order preserved, last wins
      expect(result.API_KEY.value).toBe('second');
    });
  });

  describe('purgeStore', () => {
    test('should remove store directory when it exists', () => {
      fsMock.default.existsSync.mockReturnValue(true);

      const result = purgeStore();

      expect(result).toBe(true);
      expect(fsMock.default.rmSync).toHaveBeenCalledWith(STORE_DIR, { recursive: true, force: true });
    });

    test('should return false when store directory does not exist', () => {
      fsMock.default.existsSync.mockReturnValue(false);

      const result = purgeStore();

      expect(result).toBe(false);
      expect(fsMock.default.rmSync).not.toHaveBeenCalled();
    });
  });
});
