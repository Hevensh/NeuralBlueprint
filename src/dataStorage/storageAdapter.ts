export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const localStorageAdapter: StorageAdapter = {
  getItem(key) {
    return window.localStorage.getItem(key);
  },
  setItem(key, value) {
    window.localStorage.setItem(key, value);
  },
  removeItem(key) {
    window.localStorage.removeItem(key);
  },
};

export const appStorage = localStorageAdapter;
