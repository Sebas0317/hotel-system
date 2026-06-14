import { describe, it, expect } from 'vitest';

import { readJsonFile, writeJsonFile } from '../src/data/jsonStoreHelper.js';

const testData = { foo: 'bar', num: 42 };
const testFile = 'test-unit-data.json';

describe('jsonStoreHelper — path validation', () => {
  it('rejects path traversal attempts', async () => {
    await expect(readJsonFile('/etc/passwd')).rejects.toThrow('Path traversal detected');
  });
});

describe('jsonStoreHelper — write and read', () => {
  it('writes JSON data atomically', async () => {
    await expect(writeJsonFile(testFile, testData)).resolves.toBeUndefined();
  });

  it('reads back written JSON data', async () => {
    const data = await readJsonFile(testFile);
    expect(data).toEqual(testData);
  });

  it('returns null for non-existent file', async () => {
    const data = await readJsonFile('nonexistent-unit-test-file.json');
    expect(data).toBeNull();
  });

  it('returns custom default for non-existent file', async () => {
    const data = await readJsonFile('nonexistent-unit-test-file-2.json', []);
    expect(data).toEqual([]);
  });
});
