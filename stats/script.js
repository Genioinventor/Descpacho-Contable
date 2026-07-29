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

let clientsData = [];
let ticketsData = [];

async function getStorageItem(key) {
  try {
    if (window.storage && typeof window.storage.get === 'function') {
      const res = await window.storage.get(key, false);
      if (res && res.value !== undefined) return res.value;
    }
  } catch (e) {}
  return localStorage.getItem(key);
}

function fmtAmount(value) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(value || 0);
}

function updateDbStatus() {
  const dbEl = document.getElementById('dbStatus');
  const sideClient = document.getElementById('sidebarClientCount');
  if (dbEl) {
    dbEl.textContent = firestoreConnected ? `Base de datos: Conectada` : 'Base de datos: Offline (local)';
  }
  if (sideClient) {
    sideClient.textContent = `Clientes: ${clientsData.length}`;
  }
}

async function loadLocalStats() {
  try {
    const rawClients = await getStorageItem('cotizador-clients');
    clientsData = rawClients ? JSON.parse(rawClients) : [];
  } catch (e) { clientsData = []; }

  try {
    const rawTickets = await getStorageItem('cotizador-tickets');
    ticketsData = rawTickets ? JSON.parse(rawTickets) : [];
  } catch (e) { ticketsData = []; }

  renderStatsUI();
}

function renderStatsUI() {
  document.getElementById('clientCount').textContent = clientsData.length;
  document.getElementById('ticketCount').textContent = ticketsData.length;
  updateDbStatus();

  const totalRevenue = ticketsData.reduce((sum, ticket) => sum + (Number(ticket.total) || 0), 0);
  document.getElementById('totalRevenue').textContent = fmtAmount(totalRevenue);
  document.getElementById('averageTicket').textContent = ticketsData.length ? fmtAmount(totalRevenue / ticketsData.length) : fmtAmount(0);

  const clientList = document.getElementById('clientList');
  clientList.innerHTML = '';
  if (clientsData.length === 0) {
    clientList.innerHTML = '<p class="empty-state">No hay clientes registrados aún.</p>';
  } else {
    clientsData.slice(0, 5).forEach(client => {
      const item = document.createElement('div');
      item.className = 'list-item';
      item.innerHTML = `<strong>${client.name || 'Cliente sin nombre'}</strong><span>${client.rfc ? 'RFC: ' + client.rfc : 'Sin RFC'}</span>`;
      clientList.appendChild(item);
    });
  }

  const ticketList = document.getElementById('ticketList');
  ticketList.innerHTML = '';
  if (ticketsData.length === 0) {
    ticketList.innerHTML = '<p class="empty-state">No hay tickets generados aún.</p>';
  } else {
    ticketsData.slice(0, 5).forEach(ticket => {
      const item = document.createElement('div');
      item.className = 'list-item';
      item.innerHTML = `<strong>Folio ${String(ticket.folio).padStart(6, '0')}</strong><span>${ticket.client || 'Cliente no asignado'} — ${fmtAmount(ticket.total)}</span>`;
      ticketList.appendChild(item);
    });
  }
}

async function initFirebaseAndSync() {
  try {
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      firestoreDb = firebase.firestore();
      firestoreConnected = true;
    }

    if (firestoreDb) {
      // Sincronizar clientes desde Firestore
      const clientsSnap = await firestoreDb.collection('usuarios').get();
      const remoteClientsMap = new Map();
      clientsSnap.forEach(doc => remoteClientsMap.set(doc.id, doc.data()));

      clientsData = clientsData.filter(c => {
        if (c.localOnly) return true;
        if (c.fsId) return remoteClientsMap.has(c.fsId);
        for (let [docId, d] of remoteClientsMap.entries()) {
          if (c.name === d.nombre && c.rfc === d.rfc) {
            c.fsId = docId;
            return true;
          }
        }
        return false;
      });

      remoteClientsMap.forEach((d, docId) => {
        const exists = clientsData.some(c => c.fsId === docId);
        if (!exists) {
          clientsData.push({ id: docId, fsId: docId, name: d.nombre || '', rfc: d.rfc || '' });
        }
      });

      // Sincronizar tickets desde Firestore
      const ticketsSnap = await firestoreDb.collection('tickets').orderBy('createdAt', 'desc').get();
      const remoteTicketsMap = new Map();
      ticketsSnap.forEach(doc => remoteTicketsMap.set(doc.id, doc.data()));

      ticketsData = ticketsData.filter(t => {
        if (t.localOnly) return true;
        if (t.fsId) return remoteTicketsMap.has(t.fsId);
        for (let [docId, d] of remoteTicketsMap.entries()) {
          if (t.folio === d.folio && Number(t.total) === Number(d.total)) {
            t.fsId = docId;
            return true;
          }
        }
        return false;
      });

      remoteTicketsMap.forEach((d, docId) => {
        const exists = ticketsData.some(t => t.fsId === docId);
        if (!exists) {
          ticketsData.push({
            id: docId,
            fsId: docId,
            folio: d.folio,
            client: d.client,
            total: d.total,
            date: d.date
          });
        }
      });

      ticketsData.sort((a, b) => (Number(b.folio) || 0) - (Number(a.folio) || 0));

      renderStatsUI();

      // Guardar caché sincronizada
      try {
        if (window.storage && typeof window.storage.set === 'function') {
          await window.storage.set('cotizador-tickets', JSON.stringify(ticketsData), false);
          await window.storage.set('cotizador-clients', JSON.stringify(clientsData), false);
        }
      } catch (e) {}
      localStorage.setItem('cotizador-tickets', JSON.stringify(ticketsData));
      localStorage.setItem('cotizador-clients', JSON.stringify(clientsData));
    }
  } catch (error) {
    console.warn('Firebase sync warning:', error);
    firestoreConnected = false;
    updateDbStatus();
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  const overlay = document.getElementById('loadingOverlay');
  await loadLocalStats();
  if (overlay) overlay.style.display = 'none';

  await initFirebaseAndSync();

  document.getElementById('refreshBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('refreshBtn');
    if (btn) btn.classList.add('spinning');
    try {
      await loadLocalStats();
      await initFirebaseAndSync();
    } catch(e) {
      console.warn('Sync failed', e);
    } finally {
      if (btn) setTimeout(() => btn.classList.remove('spinning'), 600);
    }
  });
});
