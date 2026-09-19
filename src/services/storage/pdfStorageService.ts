const DB_NAME = 'frostmark_pdf_store';
const STORE_NAME = 'pdf_blobs';
const DB_VERSION = 1;

const memoryFallback = new Map<string, Uint8Array>();

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB unavailable in current environment'));
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function savePdfBytes(id: string, bytes: Uint8Array): Promise<void> {
  memoryFallback.set(id, bytes);
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(bytes, id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    /* Retain memory fallback if IndexedDB is disabled or restricted in sandboxed iframe */
  }
}

export async function loadPdfBytes(id: string): Promise<Uint8Array | null> {
  if (memoryFallback.has(id)) {
    return memoryFallback.get(id) ?? null;
  }
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        const result = req.result;
        if (result instanceof Uint8Array) {
          memoryFallback.set(id, result);
          resolve(result);
        } else if (result instanceof ArrayBuffer) {
          const pdfBytesArray = new Uint8Array(result);
          memoryFallback.set(id, pdfBytesArray);
          resolve(pdfBytesArray);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function deletePdfBytes(id: string): Promise<void> {
  memoryFallback.delete(id);
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    /* Non-critical cleanup failure */
  }
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
