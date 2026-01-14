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
  getAllVariables,
  getVariablesByKeys,
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
      const mockData = { version: 1, vars: { KEY: { value: 'test' } } };
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
      const data = { version: 1, vars: {} };
      writeStore(data);

      expect(fsMock.default.writeFileSync).toHaveBeenCalledWith(
        STORE_PATH,
        expect.any(String),
        { mode: 0o600 }
      );
    });
  });

  describe('initStore', () => {
    test('should create store when it does not exist', () => {
      fsMock.default.existsSync.mockReturnValue(false);

      const result = initStore();

      expect(result).toBe(true);
      expect(fsMock.default.mkdirSync).toHaveBeenCalledWith(STORE_DIR, { recursive: true, mode: 0o700 });
      expect(fsMock.default.writeFileSync).toHaveBeenCalled();
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
      fsMock.default.existsSync.mockReturnValue(true);

      const result = ensureStore();

      expect(result).toBe(false);
      expect(fsMock.default.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('addVariable', () => {
    test('should add new variable', () => {
      const mockStore = { version: 1, vars: {} };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = addVariable('API_KEY', 'sk-123', { description: 'API key' });

      expect(result.value).toBe('sk-123');
      expect(result.description).toBe('API key');
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
    });

    test('should update existing variable and preserve created_at', () => {
      const existingVar = {
        value: 'old-value',
        description: 'Old desc',
        tags: ['tag1'],
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z'
      };
      const mockStore = { version: 1, vars: { API_KEY: existingVar } };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = addVariable('API_KEY', 'new-value');

      expect(result.value).toBe('new-value');
      expect(result.created_at).toBe('2023-01-01T00:00:00.000Z');
      expect(result.description).toBe('Old desc');
    });

    test('should add variable with tags', () => {
      const mockStore = { version: 1, vars: {} };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = addVariable('API_KEY', 'value', { tags: ['prod', 'api'] });

      expect(result.tags).toEqual(['prod', 'api']);
    });
  });

  describe('removeVariable', () => {
    test('should remove existing variable', () => {
      const mockStore = { version: 1, vars: { API_KEY: { value: 'test' } } };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = removeVariable('API_KEY');

      expect(result).toBe(true);
      expect(fsMock.default.writeFileSync).toHaveBeenCalled();
    });

    test('should return false when variable does not exist', () => {
      const mockStore = { version: 1, vars: {} };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = removeVariable('NONEXISTENT');

      expect(result).toBe(false);
    });
  });

  describe('getVariable', () => {
    test('should return variable when it exists', () => {
      const mockVar = { value: 'test', description: 'Test var' };
      const mockStore = { version: 1, vars: { API_KEY: mockVar } };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = getVariable('API_KEY');

      expect(result).toEqual(mockVar);
    });

    test('should return null when variable does not exist', () => {
      const mockStore = { version: 1, vars: {} };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = getVariable('NONEXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('getAllVariables', () => {
    test('should return all variables', () => {
      const mockVars = {
        KEY1: { value: 'v1', tags: [] },
        KEY2: { value: 'v2', tags: ['prod'] }
      };
      const mockStore = { version: 1, vars: mockVars };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = getAllVariables();

      expect(result).toEqual(mockVars);
    });

    test('should filter by tags', () => {
      const mockVars = {
        KEY1: { value: 'v1', tags: ['dev'] },
        KEY2: { value: 'v2', tags: ['prod'] },
        KEY3: { value: 'v3', tags: ['prod', 'api'] }
      };
      const mockStore = { version: 1, vars: mockVars };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = getAllVariables({ tags: ['prod'] });

      expect(Object.keys(result)).toEqual(['KEY2', 'KEY3']);
    });
  });

  describe('getVariablesByKeys', () => {
    test('should return only specified variables', () => {
      const mockVars = {
        KEY1: { value: 'v1' },
        KEY2: { value: 'v2' },
        KEY3: { value: 'v3' }
      };
      const mockStore = { version: 1, vars: mockVars };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = getVariablesByKeys(['KEY1', 'KEY3']);

      expect(Object.keys(result)).toEqual(['KEY1', 'KEY3']);
      expect(result.KEY2).toBeUndefined();
    });

    test('should skip nonexistent keys', () => {
      const mockVars = { KEY1: { value: 'v1' } };
      const mockStore = { version: 1, vars: mockVars };
      fsMock.default.existsSync.mockReturnValue(true);
      fsMock.default.readFileSync.mockReturnValue(YAML.stringify(mockStore));

      const result = getVariablesByKeys(['KEY1', 'NONEXISTENT']);

      expect(Object.keys(result)).toEqual(['KEY1']);
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
