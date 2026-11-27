export interface StoredAudioFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  lastModified: number;
  addedAt: number;
  sourceTrackId?: string;
  blob: Blob;
}

const DATABASE_NAME = 'zuno-music-library';
const DATABASE_VERSION = 1;
const STORE_NAME = 'audio-files';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Bu tarayıcı kalıcı müzik depolamasını desteklemiyor.'));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Müzik veritabanı açılamadı.'));
    request.onblocked = () => reject(new Error('Müzik veritabanı başka bir sekmede kilitli.'));
  });
}

export async function saveAudioFile(
  id: string,
  file: File | Blob,
  name?: string,
  sourceTrackId?: string
): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const record: StoredAudioFile = {
        id,
        name: name || (file instanceof File ? file.name : 'audio-file'),
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        lastModified: file instanceof File ? file.lastModified : Date.now(),
        addedAt: Date.now(),
        sourceTrackId,
        blob: file,
      };
      transaction.objectStore(STORE_NAME).put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Ses dosyası kaydedilemedi.'));
      transaction.onabort = () => reject(transaction.error || new Error('Ses dosyası kaydı iptal edildi.'));
    });
  } finally {
    database.close();
  }
}

export async function listAudioFiles(): Promise<StoredAudioFile[]> {
  const database = await openDatabase();
  try {
    return await new Promise<StoredAudioFile[]>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve((request.result || []) as StoredAudioFile[]);
      request.onerror = () => reject(request.error || new Error('Kayıtlı sesler okunamadı.'));
    });
  } finally {
    database.close();
  }
}

export async function deleteAudioFile(id: string): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Ses dosyası silinemedi.'));
      transaction.onabort = () => reject(transaction.error || new Error('Ses dosyası silme işlemi iptal edildi.'));
    });
  } finally {
    database.close();
  }
}

export function readAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    const objectUrl = URL.createObjectURL(blob);
    let settled = false;

    const finish = (duration: number) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      audio.removeAttribute('src');
      audio.load();
      URL.revokeObjectURL(objectUrl);
      resolve(Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 0);
    };

    const timeoutId = window.setTimeout(() => finish(0), 8000);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => finish(audio.duration);
    audio.onerror = () => finish(0);
    audio.src = objectUrl;
  });
}

export function createAudioId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `local-${crypto.randomUUID()}`;
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function fetchAudioBlob(
  url: string,
  onProgress: (loadedBytes: number, totalBytes: number) => void,
  signal?: AbortSignal
): Promise<Blob> {
  const response = await fetch(url, { signal, credentials: 'omit' });
  if (!response.ok) {
    throw new Error(`Ses kaynağı HTTP ${response.status} yanıtı verdi.`);
  }
  if (response.type === 'opaque') {
    throw new Error('Ses kaynağı indirmeye izin vermiyor (CORS).');
  }

  const totalBytes = Number(response.headers.get('content-length') || 0);
  if (!response.body) {
    const blob = await response.blob();
    onProgress(blob.size, blob.size);
    return blob;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loadedBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loadedBytes += value.byteLength;
      onProgress(loadedBytes, totalBytes);
    }
  }
  return new Blob(chunks, {
    type: response.headers.get('content-type') || 'audio/mpeg',
  });
}
