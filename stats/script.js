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
      // Sync clients from Firestore
      const clientsSnap = await firestoreDb.collection('usuarios').get();
      clientsSnap.forEach(doc => {
        const d = doc.data();
        const exists = clientsData.some(c => c.fsId === doc.id || (c.name === d.nombre && c.rfc === d.rfc));
        if (!exists) {
          clientsData.push({ id: doc.id, fsId: doc.id, name: d.nombre || '', rfc: d.rfc || '' });
        }
      });

      // Sync tickets from Firestore
      const ticketsSnap = await firestoreDb.collection('tickets').orderBy('createdAt', 'desc').get();
      ticketsSnap.forEach(doc => {
        const d = doc.data();
        const exists = ticketsData.some(t => t.fsId === doc.id || (t.folio === d.folio && t.total === d.total));
        if (!exists) {
          ticketsData.push({
            id: doc.id,
            fsId: doc.id,
            folio: d.folio,
            client: d.client,
            total: d.total,
            date: d.date
          });
        }
      });

      renderStatsUI();
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
