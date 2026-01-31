// files-db.js — IndexedDB simples para anexos por paciente
const RAE_FILES_DB = "rae_files_db_v1";
const RAE_FILES_STORE = "files";

function openFilesDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(RAE_FILES_DB, 1);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(RAE_FILES_STORE)) {
        const store = db.createObjectStore(RAE_FILES_STORE, { keyPath: "id" });
        store.createIndex("by_patient", "pacienteId", { unique: false });
        store.createIndex("by_createdAt", "createdAt", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function genId(prefix="f") {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function addFile({ pacienteId, file, note="" }) {
  const db = await openFilesDB();

  const record = {
    id: genId(),
    pacienteId,
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    note,
    createdAt: new Date().toISOString(),
    blob: file
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(RAE_FILES_STORE, "readwrite");
    tx.oncomplete = () => resolve(record);
    tx.onerror = () => reject(tx.error);

    tx.objectStore(RAE_FILES_STORE).add(record);
  });
}

export async function listFiles(pacienteId) {
  const db = await openFilesDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(RAE_FILES_STORE, "readonly");
    const store = tx.objectStore(RAE_FILES_STORE);
    const idx = store.index("by_patient");
    const req = idx.getAll(pacienteId);

    req.onsuccess = () => {
      const items = req.result || [];
      items.sort((a,b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getFile(id) {
  const db = await openFilesDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(RAE_FILES_STORE, "readonly");
    const req = tx.objectStore(RAE_FILES_STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteFile(id) {
  const db = await openFilesDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(RAE_FILES_STORE, "readwrite");
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.objectStore(RAE_FILES_STORE).delete(id);
  });
}
