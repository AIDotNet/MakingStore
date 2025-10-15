import { Project } from '@/pages/CodexManagement/types';

const DB_NAME = 'MakingStoreDB';
const DB_VERSION = 1;
const PROJECTS_STORE = 'projects';

class ProjectsDatabase {
  private db: IDBDatabase | null = null;

  /**
   * 初始化数据库连接
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建项目存储对象
        if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
          const projectStore = db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
          projectStore.createIndex('name', 'name', { unique: false });
          projectStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  /**
   * 获取所有项目
   */
  async getAllProjects(): Promise<Project[]> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PROJECTS_STORE], 'readonly');
      const store = transaction.objectStore(PROJECTS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(new Error('Failed to get projects from IndexedDB'));
      };
    });
  }

  /**
   * 根据ID获取项目
   */
  async getProject(id: string): Promise<Project | undefined> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PROJECTS_STORE], 'readonly');
      const store = transaction.objectStore(PROJECTS_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get project from IndexedDB'));
      };
    });
  }

  /**
   * 添加或更新项目
   */
  async saveProject(project: Project): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PROJECTS_STORE], 'readwrite');
      const store = transaction.objectStore(PROJECTS_STORE);
      const request = store.put(project);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to save project to IndexedDB'));
      };
    });
  }

  /**
   * 批量保存项目（替换所有项目）
   */
  async saveAllProjects(projects: Project[]): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PROJECTS_STORE], 'readwrite');
      const store = transaction.objectStore(PROJECTS_STORE);

      // 先清空现有数据
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => {
        // 然后添加所有新项目
        let completed = 0;
        const total = projects.length;

        if (total === 0) {
          resolve();
          return;
        }

        projects.forEach((project) => {
          const addRequest = store.add(project);

          addRequest.onsuccess = () => {
            completed++;
            if (completed === total) {
              resolve();
            }
          };

          addRequest.onerror = () => {
            reject(new Error('Failed to save projects to IndexedDB'));
          };
        });
      };

      clearRequest.onerror = () => {
        reject(new Error('Failed to clear projects from IndexedDB'));
      };
    });
  }

  /**
   * 删除项目
   */
  async deleteProject(id: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PROJECTS_STORE], 'readwrite');
      const store = transaction.objectStore(PROJECTS_STORE);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to delete project from IndexedDB'));
      };
    });
  }

  /**
   * 清空所有项目
   */
  async clearAllProjects(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PROJECTS_STORE], 'readwrite');
      const store = transaction.objectStore(PROJECTS_STORE);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to clear projects from IndexedDB'));
      };
    });
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// 导出单例实例
export const projectsDB = new ProjectsDatabase();
