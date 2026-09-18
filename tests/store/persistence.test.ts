import { afterEach, describe, expect, it, vi } from 'vitest';
import { readStored, removeStored, writeStored } from '@/store/persistence';

const KEY = 'coredump.test';

function refuseStorage(method: 'getItem' | 'setItem' | 'removeItem') {
  vi.spyOn(Storage.prototype, method).mockImplementation(() => {
    throw new DOMException('SecurityError');
  });
}

describe('persistence', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('readStored', () => {
    it('returns the stored value', () => {
      localStorage.setItem(KEY, 'value');

      expect(readStored(KEY)).toBe('value');
    });

    it('returns null for a key that was never written', () => {
      expect(readStored(KEY)).toBeNull();
    });

    it('reads as "nothing stored" when the browser refuses to read', () => {
      localStorage.setItem(KEY, 'value');
      refuseStorage('getItem');

      expect(readStored(KEY)).toBeNull();
    });
  });

  describe('writeStored', () => {
    it('stores the value so a later read finds it', () => {
      writeStored(KEY, 'value');

      expect(localStorage.getItem(KEY)).toBe('value');
    });

    it('drops the write instead of throwing when the browser refuses to store', () => {
      refuseStorage('setItem');

      expect(() => writeStored(KEY, 'value')).not.toThrow();
    });
  });

  describe('removeStored', () => {
    it('removes the value so a later read finds nothing', () => {
      localStorage.setItem(KEY, 'value');

      removeStored(KEY);

      expect(localStorage.getItem(KEY)).toBeNull();
    });

    it('drops the removal instead of throwing when the browser refuses', () => {
      localStorage.setItem(KEY, 'value');
      refuseStorage('removeItem');

      expect(() => removeStored(KEY)).not.toThrow();
      expect(localStorage.getItem(KEY)).toBe('value');
    });
  });
});
