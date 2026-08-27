class StorageService {
  private static instance: StorageService;

  private constructor() {}

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Returns `unknown` by default — persisted JSON is untrusted input and should
   * be validated (e.g. with a zod schema) rather than asserted into a type.
   */
  get<T = unknown>(key: string): T | null {
    try {
      const value = localStorage.getItem(key);

      if (value === null) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Failed to read localStorage key "${key}"`, error);
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to write localStorage key "${key}"`, error);
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove localStorage key "${key}"`, error);
    }
  }

  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error("Failed to clear localStorage", error);
    }
  }

  has(key: string): boolean {
    try {
      return localStorage.getItem(key) !== null;
    } catch (error) {
      console.error(`Failed to read localStorage key "${key}"`, error);
      return false;
    }
  }
}

export const storage = StorageService.getInstance();
