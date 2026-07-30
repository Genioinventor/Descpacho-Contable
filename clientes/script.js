/* ============================================================
   Clientes Module - Storage & Firestore Sync
============================================================ */

let clients = [];
let editingClientId = null;
let deleteArmedId = null;

async function getStorageItem(key) {
  try {
    if (window.storage && typeof window.storage.get === 'function') {
      const res = await window.storage.get(key, false);
      if (res && res.value !== undefined) return res.value;
    }
  } catch (e) {}
  return localStorage.getItem(key);
}

async function setStorageItem(key, val) {
  try {
    if (window.storage && typeof window.storage.set === 'function') {
      await window.storage.set(key, val, false);
    }
  } catch (e) {}
  localStorage.setItem(key, val);
}

async function loadAllClients() {
  try {
    const raw = await getStorageItem('cotizador-clients');
    clients = raw ? JSON.parse(raw) : [];
  } catch (e) {
    clients = [];
  }
}

async function persistClients() {
  try {
    await setStorageItem('cotizador-clients', JSON.stringify(clients));
    return true;
  } catch (e) {
    showToast('Error al guardar datos locales', 'error');
    return false;
  }
}

/* ============================================================
   Firebase Config & Firestore Sync
============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyCJa46EK5NW7dC03Uc058x4A-sa_AWnfyk",
  authDomain: "contabilidad-an.firebaseapp.com",
  projectId: "contabilidad-an",
  storageBucket: "contabilidad-an.firebasestorage.app",
  messagingSenderId: "773806099214",
  appId: "1:773806099214:web:2e8b14c4a5e5b2cfb2a55f"
};

let firestoreDb = null;
let firestoreConnected = false;

function initFirebase() {
  try {
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      firestoreDb = firebase.firestore();
      firestoreConnected = true;
    }
  } catch (e) {
    console.warn('Firebase init failed', e);
  }
}

async function fetchFirestoreUsers() {
  if (!firestoreDb) return;
  try {
    const snap = await firestoreDb.collection('usuarios').get();
    firestoreConnected = true;

    const remoteUserMap = new Map();
    snap.forEach(doc => remoteUserMap.set(doc.id, doc.data()));

    clients = clients.filter(c => {
      if (c.localOnly) return true;
      if (c.fsId) return remoteUserMap.has(c.fsId);
      for (let [docId, d] of remoteUserMap.entries()) {
        if (c.name === d.nombre && c.rfc === d.rfc) {
          c.fsId = docId;
          return true;
        }
      }
      return false;
    });

    remoteUserMap.forEach((d, docId) => {
      const exists = clients.some(c => c.fsId === docId);
      if (!exists) {
        clients.push({
          id: Date.now() + Math.floor(Math.random() * 9999),
          name: d.nombre || '',
          rfc: d.rfc || '',
          phone: d.telefono || '',
          email: d.email || '',
          address: d.direccion || '',
          fsId: docId
        });
      }
    });

    renderClientList();
    updateDbStatus();
    await persistClients();
  } catch (e) {
    console.warn('fetchFirestoreUsers', e);
    firestoreConnected = false;
    updateDbStatus();
  }
}

async function saveClientToFirestore(localClient) {
  if (!firestoreDb || !localClient) return null;
  try {
    const payload = {
      nombre: (localClient.name || '').trim(),
      rfc: (localClient.rfc || '').trim(),
      telefono: (localClient.phone || '').trim(),
      email: (localClient.email || '').trim(),
      direccion: (localClient.address || '').trim()
    };
    if (localClient.fsId) {
      await firestoreDb.collection('usuarios').doc(localClient.fsId).set(payload, { merge: true });
      return localClient.fsId;
    } else {
      const ref = await firestoreDb.collection('usuarios').add(payload);
      localClient.fsId = ref.id;
      await persistClients();
      renderClientList();
      return ref.id;
    }
  } catch (e) {
    console.warn('saveClientToFirestore', e);
    showToast('Error en sincronización Firestore', 'error');
    return null;
  }
}

async function deleteClientFromFirestore(fsId) {
  if (!firestoreDb || !fsId) return;
  try {
    await firestoreDb.collection('usuarios').doc(fsId).delete();
  } catch (e) {
    console.warn('deleteClientFromFirestore', e);
  }
}

/* ============================================================
   UI Functions & Events
============================================================ */
function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function updateDbStatus() {
  const dbEl = document.getElementById('dbStatus');
  const countEl = document.getElementById('clientCount');
  if (dbEl) dbEl.textContent = firestoreConnected ? `Base de datos: Conectada` : 'Base de datos: Offline (local)';
  if (countEl) countEl.textContent = `Clientes: ${clients.length}`;
}

const TOAST_ICONS = {
  success: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M8 12.5l2.5 2.5L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  error: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7.5v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16.5" r="1" fill="currentColor"/></svg>',
  warn: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4.5l8.5 14.7H3.5L12 4.5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 10.2v3.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16.7" r="1" fill="currentColor"/></svg>',
  info: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.6-1.7A4.5 4.5 0 0 0 6.5 19h11z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.className = 'toast show' + (type ? ' ' + type : '');
  const icon = TOAST_ICONS[type] || '';
  t.innerHTML = icon ? `<span class="toast-icon">${icon}</span><span>${msg}</span>` : msg;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove('show'), 2800);
}

function renderClientList() {
  const list = document.getElementById('clientList');
  if (!list) return;
  const q = (document.getElementById('clientSearch').value || '').toLowerCase();
  const filtered = clients.filter(c => (c.name || '').toLowerCase().includes(q) || (c.rfc || '').toLowerCase().includes(q));

  if (filtered.length === 0) {
    list.innerHTML = `<p class="empty-hint">Aún no tienes clientes guardados.</p>`;
    return;
  }

  list.innerHTML = filtered.map(c => `
    <div class="client-card" data-id="${c.id}">
      <div>
        <div class="cc-name">${escapeHtml(c.name)}</div>
        <div class="cc-detail">
          ${c.rfc ? 'RFC: ' + escapeHtml(c.rfc) + '<br>' : ''}
          ${c.phone ? 'Tel: ' + escapeHtml(c.phone) + ' ' : ''}${c.email ? 'Email: ' + escapeHtml(c.email) : ''}
          ${c.address ? '<br>' + escapeHtml(c.address) : ''}
        </div>
      </div>
      <div class="cc-actions">
        <button class="btn btn-outline btn-sm" data-edit="${c.id}">Editar</button>
        <button class="btn btn-danger btn-sm" data-del="${c.id}">Eliminar</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => startEditClient(btn.dataset.edit)));
  list.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', () => handleDeleteClient(btn.dataset.del, btn)));
}

function startEditClient(id) {
  const c = clients.find(cl => String(cl.id) === String(id));
  if (!c) return;
  editingClientId = c.id;
  document.getElementById('cName').value = c.name || '';
  document.getElementById('cRfc').value = c.rfc || '';
  document.getElementById('cPhone').value = c.phone || '';
  document.getElementById('cEmail').value = c.email || '';
  document.getElementById('cAddress').value = c.address || '';
  document.getElementById('clientFormTitle').textContent = 'Editar cliente';
  document.getElementById('clientFormNum').textContent = 'Editar';
  document.getElementById('cancelClientBtn').style.display = 'inline-flex';
  document.getElementById('cName').focus();
}

function resetClientForm() {
  editingClientId = null;
  ['cName', 'cRfc', 'cPhone', 'cEmail', 'cAddress'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('clientFormTitle').textContent = 'Nuevo cliente';
  document.getElementById('clientFormNum').textContent = '+';
  document.getElementById('cancelClientBtn').style.display = 'none';
}

async function handleDeleteClient(id, btnEl) {
  if (deleteArmedId !== id) {
    deleteArmedId = id;
    btnEl.textContent = '¿Confirmar?';
    setTimeout(() => {
      if (deleteArmedId === id) {
        deleteArmedId = null;
        btnEl.textContent = 'Eliminar';
      }
    }, 3000);
    return;
  }
  deleteArmedId = null;
  const target = clients.find(c => String(c.id) === String(id));
  if (target && target.fsId) {
    await deleteClientFromFirestore(target.fsId);
  }
  clients = clients.filter(c => String(c.id) !== String(id));
  await persistClients();
  renderClientList();
  updateDbStatus();
  showToast('Cliente eliminado', 'success');
}

document.addEventListener('DOMContentLoaded', async () => {
  const overlay = document.getElementById('loadingOverlay');
  await loadAllClients();
  renderClientList();
  updateDbStatus();

  initFirebase();
  if (firestoreDb) {
    await fetchFirestoreUsers();
  }

  if (overlay) overlay.style.display = 'none';

  document.getElementById('saveClientBtn').addEventListener('click', async () => {
    const name = document.getElementById('cName').value.trim();
    if (!name) {
      showToast('Ingresa al menos el nombre del cliente', 'error');
      return;
    }
    const rfc = document.getElementById('cRfc').value.trim();
    const phone = document.getElementById('cPhone').value.trim();
    const email = document.getElementById('cEmail').value.trim();
    const address = document.getElementById('cAddress').value.trim();

    if (editingClientId) {
      const idx = clients.findIndex(c => String(c.id) === String(editingClientId));
      if (idx !== -1) {
        clients[idx] = { ...clients[idx], name, rfc, phone, email, address };
        await persistClients();
        if (firestoreConnected) {
          await saveClientToFirestore(clients[idx]);
        }
      }
    } else {
      const newClient = {
        id: Date.now() + Math.floor(Math.random() * 9999),
        name, rfc, phone, email, address
      };
      clients.push(newClient);
      await persistClients();
      if (firestoreConnected) {
        await saveClientToFirestore(newClient);
      }
    }

    resetClientForm();
    renderClientList();
    updateDbStatus();
    showToast('Cliente guardado con éxito', 'success');
  });

  document.getElementById('cancelClientBtn').addEventListener('click', resetClientForm);
  document.getElementById('clientSearch').addEventListener('input', renderClientList);

  // --- JSON Import Logic ---
  const importCard = document.getElementById('importCard');
  document.getElementById('showImportBtn')?.addEventListener('click', () => {
    importCard.style.display = 'block';
    importCard.scrollIntoView({ behavior: 'smooth' });
    document.getElementById('jsonInput').focus();
  });

  document.getElementById('closeImportBtn')?.addEventListener('click', () => {
    importCard.style.display = 'none';
    document.getElementById('jsonInput').value = '';
  });

  document.getElementById('processImportBtn')?.addEventListener('click', async () => {
    const raw = document.getElementById('jsonInput').value.trim();
    if (!raw) {
      showToast('Pega el JSON para continuar', 'error');
      return;
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      showToast('El formato JSON no es válido', 'error');
      return;
    }

    if (!Array.isArray(data)) {
      showToast('El JSON debe ser una lista [...]', 'error');
      return;
    }

    const btn = document.getElementById('processImportBtn');
    const oldText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Importando...';

    let addedCount = 0;
    const newClientsForFs = [];

    data.forEach(item => {
      const name = (item.nombre || item.name || '').trim();
      const rfc = (item.rfc || '').trim();
      if (!name) return;

      // Duplicate check (by name and RFC)
      const exists = clients.some(c =>
        (c.name || '').toLowerCase() === name.toLowerCase() &&
        (c.rfc || '').toLowerCase() === rfc.toLowerCase()
      );

      if (!exists) {
        const nc = {
          id: Date.now() + Math.floor(Math.random() * 999999),
          name, rfc,
          phone: (item.telefono || item.phone || '').trim(),
          email: (item.correo || item.email || '').trim(),
          address: (item.direccion || item.address || '').trim()
        };
        clients.push(nc);
        newClientsForFs.push(nc);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      await persistClients();

      // Sync with Firestore in batches if connected
      if (firestoreConnected && firestoreDb && newClientsForFs.length > 0) {
        try {
          const batchSize = 400; // Firestore limit is 500
          for (let i = 0; i < newClientsForFs.length; i += batchSize) {
            const batch = firestoreDb.batch();
            const chunk = newClientsForFs.slice(i, i + batchSize);

            chunk.forEach(nc => {
              const ref = firestoreDb.collection('usuarios').doc();
              nc.fsId = ref.id;
              batch.set(ref, {
                nombre: nc.name,
                rfc: nc.rfc,
                telefono: nc.phone,
                email: nc.email,
                direccion: nc.address
              });
            });
            await batch.commit();
          }
          await persistClients(); // Save updated fsIds
        } catch (fsErr) {
          console.warn('Batch sync failed', fsErr);
          showToast('Guardado localmente, error al sincronizar nube', 'warn');
        }
      }

      renderClientList();
      updateDbStatus();
      showToast(`Se importaron ${addedCount} clientes con éxito`, 'success');
      importCard.style.display = 'none';
      document.getElementById('jsonInput').value = '';
    } else {
      showToast('No se encontraron clientes nuevos para importar', 'info');
    }

    btn.disabled = false;
    btn.textContent = oldText;
  });

  document.getElementById('refreshBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('refreshBtn');
    if (btn) btn.classList.add('spinning');
    try {
      await loadAllClients();
      initFirebase();
      if (firestoreDb) await fetchFirestoreUsers();
      showToast('Datos de clientes sincronizados', 'success');
    } catch(e) {
      showToast('Modo sin conexión activo', 'warn');
    } finally {
      if (btn) setTimeout(() => btn.classList.remove('spinning'), 600);
    }
  });
});
