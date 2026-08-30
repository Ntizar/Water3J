// db.js — biblioteca local de escenarios (IndexedDB, 100% offline)
// Escenarios = { id, nombre, creado, tipo: 'app'|'studio', datos }
const DB_NAME = 'water3j', STORE = 'escenarios';

function abrir() {
  return new Promise((res, rej) => {
    const rq = indexedDB.open(DB_NAME, 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore(STORE, { keyPath: 'id' });
    rq.onsuccess = () => res(rq.result);
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
