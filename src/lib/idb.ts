'use client'

export type OutboxEntry = {
  id?: number
  action: string
  args: any[]
  queuedAt: number
  retries: number
  dedupKey?: string
}

const DB_NAME = 'rio-offline'
const DB_VERSION = 1

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('IndexedDB is not available on server-side'))
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('rpc-cache')) {
        db.createObjectStore('rpc-cache', { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains('outbox')) {
        db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' })
      }
    };

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

const isClient = typeof window !== 'undefined'

export const idb = {
  async get<T>(storeName: string, key: string): Promise<T | undefined> {
    if (!isClient) return undefined
    try {
      const db = await getDB()
      return new Promise<T | undefined>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly')
        const store = transaction.objectStore(storeName)
        const request = store.get(key)
        request.onsuccess = () => {
          const result = request.result
          resolve(result ? (result.value as T) : undefined)
        }
        request.onerror = () => reject(request.error)
      })
    } catch (e) {
      console.warn('[IDB Error] Failed to get key:', key, e)
      return undefined
    }
  },

  async set(storeName: string, key: string, value: unknown): Promise<void> {
    if (!isClient) return
    try {
      const db = await getDB()
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.put({ key, value })
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (e) {
      console.warn('[IDB Error] Failed to set key:', key, e)
    }
  },

  async del(storeName: string, key: string): Promise<void> {
    if (!isClient) return
    try {
      const db = await getDB()
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.delete(key)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (e) {
      console.warn('[IDB Error] Failed to delete key:', key, e)
    }
  },

  async getAll<T>(storeName: string): Promise<T[]> {
    if (!isClient) return []
    try {
      const db = await getDB()
      return new Promise<T[]>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly')
        const store = transaction.objectStore(storeName)
        const request = store.getAll()
        request.onsuccess = () => {
          resolve((request.result || []) as T[])
        }
        request.onerror = () => reject(request.error)
      })
    } catch (e) {
      console.warn('[IDB Error] Failed to getAll:', storeName, e)
      return []
    }
  },

  async clear(storeName: string): Promise<void> {
    if (!isClient) return
    try {
      const db = await getDB()
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (e) {
      console.warn('[IDB Error] Failed to clear store:', storeName, e)
    }
  },

  // Outbox-specific methods
  async pushOutbox(entry: OutboxEntry): Promise<number> {
    if (!isClient) return 0
    const db = await getDB()
    return new Promise<number>((resolve, reject) => {
      const transaction = db.transaction('outbox', 'readwrite')
      const store = transaction.objectStore('outbox')
      const request = store.add(entry)
      request.onsuccess = () => resolve(request.result as number)
      request.onerror = () => reject(request.error)
    })
  },

  async peekOutbox(): Promise<OutboxEntry | undefined> {
    if (!isClient) return undefined
    const db = await getDB()
    return new Promise<OutboxEntry | undefined>((resolve, reject) => {
      const transaction = db.transaction('outbox', 'readonly')
      const store = transaction.objectStore('outbox')
      const request = store.openCursor()
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          resolve(cursor.value as OutboxEntry)
        } else {
          resolve(undefined)
        }
      }
      request.onerror = () => reject(request.error)
    })
  },

  async shiftOutbox(): Promise<OutboxEntry | undefined> {
    if (!isClient) return undefined
    const db = await getDB()
    return new Promise<OutboxEntry | undefined>((resolve, reject) => {
      const transaction = db.transaction('outbox', 'readwrite')
      const store = transaction.objectStore('outbox')
      const request = store.openCursor()
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          const entry = cursor.value as OutboxEntry
          const deleteReq = cursor.delete()
          deleteReq.onsuccess = () => resolve(entry)
          deleteReq.onerror = () => reject(deleteReq.error)
        } else {
          resolve(undefined)
        }
      }
      request.onerror = () => reject(request.error)
    })
  },

  async removeOutbox(id: number): Promise<void> {
    if (!isClient) return
    const db = await getDB()
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('outbox', 'readwrite')
      const store = transaction.objectStore('outbox')
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  },

  async countOutbox(): Promise<number> {
    if (!isClient) return 0
    const db = await getDB()
    return new Promise<number>((resolve, reject) => {
      const transaction = db.transaction('outbox', 'readonly')
      const store = transaction.objectStore('outbox')
      const request = store.count()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  },

  async findOutbox(dedupKey: string): Promise<OutboxEntry | undefined> {
    if (!isClient) return undefined
    const db = await getDB()
    return new Promise<OutboxEntry | undefined>((resolve, reject) => {
      const transaction = db.transaction('outbox', 'readonly')
      const store = transaction.objectStore('outbox')
      const request = store.openCursor()
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          const entry = cursor.value as OutboxEntry
          if (entry.dedupKey === dedupKey) {
            resolve(entry)
          } else {
            cursor.continue()
          }
        } else {
          resolve(undefined)
        }
      }
      request.onerror = () => reject(request.error)
    })
  },

  async replaceOutbox(dedupKey: string, entry: OutboxEntry): Promise<void> {
    if (!isClient) return
    const db = await getDB()
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('outbox', 'readwrite')
      const store = transaction.objectStore('outbox')
      const request = store.openCursor()
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          const current = cursor.value as OutboxEntry
          if (current.dedupKey === dedupKey) {
            const updateReq = cursor.update({ ...entry, id: current.id })
            updateReq.onsuccess = () => resolve()
            updateReq.onerror = () => reject(updateReq.error)
          } else {
            cursor.continue()
          }
        } else {
          // If not found, push it
          store.add(entry).onsuccess = () => resolve()
        }
      }
      request.onerror = () => reject(request.error)
    })
  }
}
