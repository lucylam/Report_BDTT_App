const DATABASE_NAME = "bdtt-offline-media";
const STORE_NAME = "photos";
const DATABASE_VERSION = 1;
const REFERENCE_PREFIX = "offline-photo:";

const openDatabase = (): Promise<IDBDatabase> => {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("Trình duyệt không hỗ trợ lưu ảnh ngoại tuyến."));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Không mở được kho ảnh ngoại tuyến."));
  });
};

const runStoreRequest = async <T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = action(transaction.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Không truy cập được ảnh ngoại tuyến."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Giao dịch ảnh ngoại tuyến bị hủy."));
    });
  } finally {
    database.close();
  }
};

export const isOfflinePhotoReference = (value: string | undefined): boolean =>
  Boolean(value?.startsWith(REFERENCE_PREFIX));

export const createOfflinePhotoReference = (seed: string): string =>
  `${REFERENCE_PREFIX}${seed}-${Date.now()}-${crypto.randomUUID()}`;

export const storeOfflinePhoto = async (
  reference: string,
  dataUrl: string
): Promise<void> => {
  if (!isOfflinePhotoReference(reference)) {
    throw new Error("Mã ảnh ngoại tuyến không hợp lệ.");
  }
  await runStoreRequest("readwrite", (store) => store.put(dataUrl, reference));
};

export const readOfflinePhoto = async (reference: string): Promise<string> => {
  const result = await runStoreRequest<string | undefined>("readonly", (store) =>
    store.get(reference)
  );
  if (!result) throw new Error("Không tìm thấy ảnh đang chờ đồng bộ trên thiết bị.");
  return result;
};

export const removeOfflinePhoto = async (reference: string): Promise<void> => {
  if (!isOfflinePhotoReference(reference)) return;
  await runStoreRequest("readwrite", (store) => store.delete(reference));
};

export const removeOfflinePhotos = async (references: readonly string[]): Promise<void> => {
  await Promise.all(references.filter(isOfflinePhotoReference).map(removeOfflinePhoto));
};
