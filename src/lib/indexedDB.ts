// IndexedDB 数据库管理
export interface CodexProject {
  id?: number
  name: string
  path: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

class IndexedDBManager {
  private dbName = 'MakingStoreDB'
  private version = 1
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        reject(new Error('Failed to open database'))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // 创建项目存储对象
        if (!db.objectStoreNames.contains('codexProjects')) {
          const projectStore = db.createObjectStore('codexProjects', {
            keyPath: 'id',
            autoIncrement: true
          })
          
          // 创建索引
          projectStore.createIndex('name', 'name', { unique: false })
          projectStore.createIndex('path', 'path', { unique: true })
          projectStore.createIndex('createdAt', 'createdAt', { unique: false })
        }
      }
    })
  }

  async addProject(project: Omit<CodexProject, 'id'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['codexProjects'], 'readwrite')
      const store = transaction.objectStore('codexProjects')
      
      const projectWithTimestamp = {
        ...project,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      const request = store.add(projectWithTimestamp)

      request.onsuccess = () => {
        resolve(request.result as number)
      }

      request.onerror = () => {
        reject(new Error('Failed to add project'))
      }
    })
  }

  async getProjects(): Promise<CodexProject[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['codexProjects'], 'readonly')
      const store = transaction.objectStore('codexProjects')
      const request = store.getAll()

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(new Error('Failed to get projects'))
      }
    })
  }

  async getProject(id: number): Promise<CodexProject | null> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['codexProjects'], 'readonly')
      const store = transaction.objectStore('codexProjects')
      const request = store.get(id)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        reject(new Error('Failed to get project'))
      }
    })
  }

  async updateProject(id: number, updates: Partial<Omit<CodexProject, 'id' | 'createdAt'>>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['codexProjects'], 'readwrite')
      const store = transaction.objectStore('codexProjects')
      
      // 先获取现有项目
      const getRequest = store.get(id)
      
      getRequest.onsuccess = () => {
        const existingProject = getRequest.result
        if (!existingProject) {
          reject(new Error('Project not found'))
          return
        }

        const updatedProject = {
          ...existingProject,
          ...updates,
          updatedAt: new Date()
        }

        const putRequest = store.put(updatedProject)
        
        putRequest.onsuccess = () => {
          resolve()
        }

        putRequest.onerror = () => {
          reject(new Error('Failed to update project'))
        }
      }

      getRequest.onerror = () => {
        reject(new Error('Failed to get project for update'))
      }
    })
  }

  async deleteProject(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['codexProjects'], 'readwrite')
      const store = transaction.objectStore('codexProjects')
      const request = store.delete(id)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(new Error('Failed to delete project'))
      }
    })
  }

  async projectExists(path: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['codexProjects'], 'readonly')
      const store = transaction.objectStore('codexProjects')
      const index = store.index('path')
      const request = index.get(path)

      request.onsuccess = () => {
        resolve(!!request.result)
      }

      request.onerror = () => {
        reject(new Error('Failed to check project existence'))
      }
    })
  }
}

// 创建单例实例
export const dbManager = new IndexedDBManager()

// 初始化数据库的辅助函数
export const initDatabase = async (): Promise<void> => {
  await dbManager.init()
}