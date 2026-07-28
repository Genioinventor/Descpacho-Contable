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

function fmtAmount(value) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(value || 0);
}

function updateDbStatus(clientCount = 0) {
  const dbEl = document.getElementById('dbStatus');
  const sideClient = document.getElementById('sidebarClientCount');
  if (dbEl) {
    dbEl.textContent = firestoreConnected ? `Base de datos: Conectada — ${clientCount} clientes` : 'Base de datos: Offline (local)';
  }
  if (sideClient) {
    sideClient.textContent = `Clientes: ${clientCount}`;
  }
}

async function initFirebase() {
  try {
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      firestoreDb = firebase.firestore();
      firestoreConnected = true;
      await firestoreDb.collection('usuarios').limit(1).get();
    }
  } catch (error) {
    console.warn('Firebase init failed', error);
    firestoreConnected = false;
  } finally {
    const clients = JSON.parse(localStorage.getItem('cotizador-clients') || '[]');
    updateDbStatus(clients.length);
  }
}

function loadStats() {
  const clients = JSON.parse(localStorage.getItem('cotizador-clients') || '[]');
  const tickets = JSON.parse(localStorage.getItem('cotizador-tickets') || '[]');
  document.getElementById('clientCount').textContent = clients.length;
  document.getElementById('ticketCount').textContent = tickets.length;
  updateDbStatus(clients.length);
  const totalRevenue = tickets.reduce((sum, ticket) => sum + (ticket.total || 0), 0);
  document.getElementById('totalRevenue').textContent = fmtAmount(totalRevenue);
  document.getElementById('averageTicket').textContent = tickets.length ? fmtAmount(totalRevenue / tickets.length) : fmtAmount(0);

  const clientList = document.getElementById('clientList');
  clientList.innerHTML = '';
  if (clients.length === 0) {
    clientList.innerHTML = '<p class="empty-state">No hay clientes registrados aún.</p>';
  } else {
    clients.slice(0, 5).forEach(client => {
      const item = document.createElement('div');
      item.className = 'list-item';
      item.innerHTML = `<strong>${client.name || 'Cliente sin nombre'}</strong><span>${client.rfc ? 'RFC: ' + client.rfc : 'Sin RFC'}</span>`;
      clientList.appendChild(item);
    });
  }

  const ticketList = document.getElementById('ticketList');
  ticketList.innerHTML = '';
  if (tickets.length === 0) {
    ticketList.innerHTML = '<p class="empty-state">No hay tickets generados aún.</p>';
  } else {
    tickets.slice(0, 5).forEach(ticket => {
      const item = document.createElement('div');
      item.className = 'list-item';
      item.innerHTML = `<strong>Folio ${String(ticket.folio).padStart(6, '0')}</strong><span>${ticket.client || 'Cliente no asignado'} — ${fmtAmount(ticket.total)}</span>`;
      ticketList.appendChild(item);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  loadStats();
  initFirebase();
});
