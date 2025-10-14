import { CustomPrompt, PromptSearchOptions, PromptExport } from '../types/customPrompt';

const DB_NAME = 'CustomPromptDB';
const DB_VERSION = 1;
const STORE_NAME = 'customPrompts';

class CustomPromptDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          
          // 创建索引
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('scope', 'scope', { unique: false });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
    });
  }

  async addPrompt(prompt: Omit<CustomPrompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<CustomPrompt> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date();
    const newPrompt: CustomPrompt = {
      ...prompt,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(newPrompt);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(newPrompt);
    });
  }

  async updatePrompt(id: string, updates: Partial<CustomPrompt>): Promise<CustomPrompt> {
    if (!this.db) throw new Error('Database not initialized');

    const existingPrompt = await this.getPrompt(id);
    if (!existingPrompt) {
      throw new Error('Prompt not found');
    }

    const updatedPrompt: CustomPrompt = {
      ...existingPrompt,
      ...updates,
      id, // 确保ID不被修改
      updatedAt: new Date(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(updatedPrompt);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(updatedPrompt);
    });
  }

  async getPrompt(id: string): Promise<CustomPrompt | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async deletePrompt(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getAllPrompts(): Promise<CustomPrompt[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async searchPrompts(options: PromptSearchOptions): Promise<CustomPrompt[]> {
    const allPrompts = await this.getAllPrompts();
    let filteredPrompts = allPrompts;

    // 按作用域过滤
    if (options.scope) {
      filteredPrompts = filteredPrompts.filter(prompt => prompt.scope === options.scope);
    }

    // 按分类过滤
    if (options.category) {
      filteredPrompts = filteredPrompts.filter(prompt => prompt.category === options.category);
    }

    // 按查询字符串过滤
    if (options.query) {
      const query = options.query.toLowerCase();
      filteredPrompts = filteredPrompts.filter(prompt =>
        prompt.name.toLowerCase().includes(query) ||
        prompt.description.toLowerCase().includes(query) ||
        prompt.content.toLowerCase().includes(query)
      );
    }

    // 排序
    filteredPrompts.sort((a, b) => {
      if (options.sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (options.sortBy === 'createdAt') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (options.sortBy === 'updatedAt') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      return 0;
    });

    return filteredPrompts;
  }

  async getPromptsByScope(scope: 'project' | 'user'): Promise<CustomPrompt[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('scope');
      const request = index.getAll(scope);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getPromptsByCategory(category: string): Promise<CustomPrompt[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('category');
      const request = index.getAll(category);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async exportPrompts(promptIds?: string[]): Promise<PromptExport> {
    const prompts = promptIds
      ? await Promise.all(
          promptIds.map(id => this.getPrompt(id)).filter(Boolean)
        ) as CustomPrompt[]
      : await this.getAllPrompts();

    return {
      version: '1.0.0',
      exportDate: new Date(),
      prompts,
    };
  }

  async importPrompts(exportData: PromptExport): Promise<CustomPrompt[]> {
    const importedPrompts: CustomPrompt[] = [];

    for (const prompt of exportData.prompts) {
      try {
        // 检查是否已存在同名提示词
        const existingPrompts = await this.searchPrompts({ query: prompt.name });
        const existingPrompt = existingPrompts.find(p =>
          p.name === prompt.name && p.scope === prompt.scope
        );

        if (existingPrompt) {
          // 更新现有提示词
          const updated = await this.updatePrompt(existingPrompt.id, {
            ...prompt,
            id: existingPrompt.id, // 保持原有ID
          });
          importedPrompts.push(updated);
        } else {
          // 创建新提示词
          const { id, createdAt, updatedAt, ...promptData } = prompt;
          const newPrompt = await this.addPrompt(promptData);
          importedPrompts.push(newPrompt);
        }
      } catch (error) {
        console.error(`Failed to import prompt ${prompt.name}:`, error);
      }
    }

    return importedPrompts;
  }

  async clearAllPrompts(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

export const customPromptDB = new CustomPromptDB();