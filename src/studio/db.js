// db.js — biblioteca local de escenarios (IndexedDB, 100% offline)
// Escenarios = { id, nombre, creado, tipo: 'app'|'studio', datos }
const DB_NAME = 'water3j', STORE = 'escenarios';

function abrir() {
  return new Promise((res, rej) => {
    const rq = indexedDB.open(DB_NAME, 2);
    rq.onupgradeneeded = () => {
      const db = rq.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains('baterias')) db.createObjectStore('baterias', { keyPath: 'clave' });
    };
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  });
}

// ---- caché de rejillas de batimetría ----
export async function guardarBateria(clave, rejilla) {
  const db = await abrir();
  return new Promise((res, rej) => {
    const tx = db.transaction('baterias', 'readwrite');
    tx.objectStore('baterias').put({ clave, creado: new Date().toISOString(), rejilla });
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  });
}
export async function cargarBateria(clave) {
  const db = await abrir();
  return new Promise((res, rej) => {
    const rq = db.transaction('baterias', 'readonly').objectStore('baterias').get(clave);
    rq.onsuccess = () => res(rq.result?.rejilla ?? null);
    rq.onerror = () => rej(rq.error);
  });
}

export async function guardarEscenario(escenario) {
  const db = await abrir();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    if (!escenario.id) escenario.id = crypto.randomUUID();
    if (!escenario.creado) escenario.creado = new Date().toISOString();
    tx.objectStore(STORE).put(escenario);
    tx.oncomplete = () => res(escenario.id);
    tx.onerror = () => rej(tx.error);
  });
}

export async function listarEscenarios() {
  const db = await abrir();
  return new Promise((res, rej) => {
    const rq = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    rq.onsuccess = () => res(rq.result.sort((a, b) => b.creado.localeCompare(a.creado)));
    rq.onerror = () => rej(rq.error);
  });
}

export async function cargarEscenario(id) {
  const db = await abrir();
  return new Promise((res, rej) => {
    const rq = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  });
}

export async function borrarEscenario(id) {
  const db = await abrir();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  });
}
