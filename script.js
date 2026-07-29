/* ============================================================
   Despacho A & N - Core Script
   Ticket Generator & Firestore Storage Sync (Spanish Only)
============================================================ */

const I18N = {
  subtitle: "Despacho A & N Panel",
  secDocument: "Documento", lblDocType: "Tipo de documento", lblDate: "Fecha", lblMethod: "Método de pago",
  payCash: "Contado", payTransfer: "Transferencia", payEfectivo: "Efectivo", payCard: "Tarjeta",
  secClient: "Cliente", lblSavedClient: "Cliente guardado", lblClient: "Nombre del cliente", lblRfc: "RFC / Identificación (opcional)", lblRfcShort: "RFC",
  secBrand: "Marca", lblBrand: "Nombre de tu marca", lblSubtitle: "Eslogan / giro (opcional)", lblLogo: "Logo (opcional)",
  secProducts: "Productos", thProduct: "Producto", thQty: "Cant.", thPrice: "Precio", thSub: "Subtotal", btnAddProduct: "+ Añadir producto", btnCopyTotal: "Copiar total",
  secPreview: "Vista previa del documento", lblSubtotal: "Subtotal", lblTotal: "Total general",
  lblFolioShort: "Folio", lblWords: "Importe con letra",
  btnWa: "WhatsApp", btnPdf: "Descargar PDF", btnPng: "Descargar PNG",
  secHistory: "Historial de tickets", emptyHist: "Aún no has generado ningún ticket.",
  lblNewClient: "Nuevo cliente", lblEditClient: "Editar cliente", lblPhone: "Teléfono", lblEmail: "Correo", lblAddress: "Dirección",
  btnSave: "Guardar cliente", btnCancel: "Cancelar edición", secClientList: "Clientes guardados", lblSearch: "Buscar cliente…", emptyClients: "Aún no tienes clientes guardados.",
  newClientOpt: "+ Nuevo cliente (sin guardar)", discount: "Descuento", copied: "Total copiado al portapapeles", saved: "Ticket guardado",
  productPlaceholder: "Nombre del producto", generatingPdf: "Generando PDF…", generatingPng: "Generando PNG…",
  errorExport: "No se pudo generar el archivo. Intenta de nuevo.", client: "Cliente", loadingData: "Cargando tus datos guardados…",
  needItems: "Agrega al menos un producto antes de continuar.", clientSaved: "Cliente guardado", clientDeleted: "Cliente eliminado",
  confirmDelete: "¿Eliminar? Toca de nuevo para confirmar", storageError: "No se pudo guardar. Revisa tu conexión e intenta de nuevo.",
  cero: "CERO", currencyPesos: "PESOS"
};

let currentLang = 'es';

/* ============================================================
   Number formatting & utilities
============================================================ */
function pad6(num){ return String(num).padStart(6, '0'); }
function fmt(val){ return `$${Number(val||0).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`; }
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function showToast(msg, type=''){
  const t = document.getElementById('toast');
  if(!t) return;
  t.className = 'toast show' + (type ? ' '+type : '');
  t.innerHTML = msg;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=> t.classList.remove('show'), 2800);
}

/* ============================================================
   Número a letras (Español)
============================================================ */
function Unidades(num){
  switch(num){
    case 1: return 'UN'; case 2: return 'DOS'; case 3: return 'TRES'; case 4: return 'CUATRO';
    case 5: return 'CINCO'; case 6: return 'SEIS'; case 7: return 'SIETE'; case 8: return 'OCHO'; case 9: return 'NUEVE';
  }
  return '';
}
function Decenas(num){
  let decena = Math.floor(num/10);
  let unidad = num - (decena * 10);
  switch(decena){
    case 1:
      switch(unidad){
        case 0: return 'DIEZ'; case 1: return 'ONCE'; case 2: return 'DOCE'; case 3: return 'TRECE'; case 4: return 'CATORCE'; case 5: return 'QUINCE';
        default: return 'DIECI' + Unidades(unidad);
      }
    case 2:
      switch(unidad){
        case 0: return 'VEINTE'; case 1: return 'VEINTIÚN'; default: return 'VEINTI' + Unidades(unidad);
      }
    case 3: return DecenasY('TREINTA', unidad); case 4: return DecenasY('CUARENTA', unidad);
    case 5: return DecenasY('CINCUENTA', unidad); case 6: return DecenasY('SESENTA', unidad);
    case 7: return DecenasY('SETENTA', unidad); case 8: return DecenasY('OCHENTA', unidad);
    case 9: return DecenasY('NOVENTA', unidad); case 0: return Unidades(unidad);
  }
}
function DecenasY(strSin, numUnidades){ return numUnidades > 0 ? strSin + ' Y ' + Unidades(numUnidades) : strSin; }
function Centenas(num){
  let centenas = Math.floor(num / 100);
  let decenas = num - (centenas * 100);
  switch(centenas){
    case 1: return decenas > 0 ? 'CIENTO ' + Decenas(decenas) : 'CIEN';
    case 2: return 'DOSCIENTOS ' + Decenas(decenas); case 3: return 'TRESCIENTOS ' + Decenas(decenas);
    case 4: return 'CUATROCIENTOS ' + Decenas(decenas); case 5: return 'QUINIENTOS ' + Decenas(decenas);
    case 6: return 'SEISCIENTOS ' + Decenas(decenas); case 7: return 'SETECIENTOS ' + Decenas(decenas);
    case 8: return 'OCHOCIENTOS ' + Decenas(decenas); case 9: return 'NOVECIENTOS ' + Decenas(decenas);
  }
  return Decenas(decenas);
}
function Seccion(num, divisor, strSingular, strPlural){
  let cientos = Math.floor(num / divisor);
  let resto = num - (cientos * divisor);
  let letras = '';
  if(cientos > 0) letras = cientos > 1 ? Centenas(cientos) + ' ' + strPlural : strSingular;
  return letras;
}
function Miles(num){
  let divisor = 1000;
  let cientos = Math.floor(num / divisor);
  let resto = num - (cientos * divisor);
  let strMiles = Seccion(num, divisor, 'UN MIL', 'MIL');
  let strCentenas = Centenas(resto);
  if(strMiles == '') return strCentenas;
  return strMiles + (strCentenas ? ' ' + strCentenas : '');
}
function Millones(num){
  let divisor = 1000000;
  let cientos = Math.floor(num / divisor);
  let resto = num - (cientos * divisor);
  let strMillones = Seccion(num, divisor, 'UN MILLÓN', 'MILLONES');
  let strMiles = Miles(resto);
  if(strMillones == '') return strMiles;
  return strMillones + (strMiles ? ' ' + strMiles : '');
}
function numeroALetrasES(num){
  num = Math.floor(Math.max(num, 0));
  if(num == 0) return I18N.cero;
  return Millones(num).trim();
}
function amountInWords(total){
  const intPart = Math.floor(total);
  const cents = Math.round((total - intPart) * 100);
  const centsStr = String(cents).padStart(2, '0');
  return `${numeroALetrasES(intPart)} PESOS ${centsStr}/100 M.N.`;
}

/* ============================================================
   State Storage (window.storage / localStorage)
============================================================ */
let clients = [];
let ticketHistory = [];
let meta = { nextFolio: 1 };
let editingClientId = null;
let deleteArmedId = null;

function generateTicketId(){
  if(window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return 't-'+Date.now()+'-'+Math.floor(Math.random()*999999);
}

async function getStorageItem(key){
  try{
    if(window.storage && typeof window.storage.get === 'function'){
      const res = await window.storage.get(key, false);
      if(res && res.value !== undefined) return res.value;
    }
  }catch(e){}
  return localStorage.getItem(key);
}

async function setStorageItem(key, val){
  try{
    if(window.storage && typeof window.storage.set === 'function'){
      await window.storage.set(key, val, false);
    }
  }catch(e){}
  localStorage.setItem(key, val);
}

async function loadAllData(){
  try{
    const c = await getStorageItem('cotizador-clients');
    clients = c ? JSON.parse(c) : [];
  }catch(e){ clients = []; }
  try{
    const t = await getStorageItem('cotizador-tickets');
    ticketHistory = t ? JSON.parse(t) : [];
    ticketHistory = ticketHistory.map(ticket => ({ ...ticket, id: ticket.id || generateTicketId() }));
  }catch(e){ ticketHistory = []; }
  try{
    const m = await getStorageItem('cotizador-meta');
    meta = m ? JSON.parse(m) : { nextFolio: 1 };
  }catch(e){ meta = { nextFolio: 1 }; }
}

async function persistClients(){
  try{ await setStorageItem('cotizador-clients', JSON.stringify(clients)); return true; }
  catch(e){ showToast(I18N.storageError,'error'); return false; }
}
async function persistTickets(){
  try{ await setStorageItem('cotizador-tickets', JSON.stringify(ticketHistory)); return true; }
  catch(e){ showToast(I18N.storageError,'error'); return false; }
}
async function persistMeta(){
  try{ await setStorageItem('cotizador-meta', JSON.stringify(meta)); return true; }
  catch(e){ showToast(I18N.storageError,'error'); return false; }
}

/* ============================================================
   Firebase / Firestore Sync
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

function initFirebase(){
  try{
    if(typeof firebase !== 'undefined' && !firebase.apps.length){
      firebase.initializeApp(firebaseConfig);
      firestoreDb = firebase.firestore();
      firestoreConnected = true;
    }
  }catch(e){ console.warn('Firebase init failed', e); }
}

async function fetchFirestoreUsers(){
  if(!firestoreDb) return;
  try{
    const snap = await firestoreDb.collection('usuarios').get();
    snap.forEach(doc=>{
      const d = doc.data();
      const exists = clients.some(c=> c.fsId && c.fsId === doc.id);
      if(!exists){
        clients.push({ id: Date.now() + Math.floor(Math.random()*9999), name: d.nombre || '', rfc: d.rfc || '', fsId: doc.id });
      }
    });
    firestoreConnected = true;
    renderClientSelect();
    updateDbStatus();
  }catch(e){ console.warn('fetchFirestoreUsers', e); firestoreConnected = false; updateDbStatus(); }
}

async function fetchFirestoreTickets(){
  if(!firestoreDb) return;
  try{
    const snap = await firestoreDb.collection('tickets').orderBy('createdAt','desc').get();
    snap.forEach(doc=>{
      const d = doc.data();
      const exists = ticketHistory.some(t=> t.fsId === doc.id || (!t.fsId && t.folio === d.folio && t.date === d.date && t.total === d.total));
      if(!exists){
        ticketHistory.push({
          id: generateTicketId(),
          fsId: doc.id,
          folio: d.folio,
          brand: d.brand,
          client: d.client,
          rfc: d.rfc,
          total: d.total,
          date: d.date,
          currencySymbol: '$',
          items: d.items || [],
          createdAt: d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate().toISOString() : d.createdAt) : new Date().toISOString()
        });
      }
    });
    renderHistory();
    await persistTickets();
  }catch(e){ console.warn('Firestore fetch tickets:', e); }
}

async function saveTicketToFirestore(localTicket){
  if(!firestoreDb || !localTicket) return null;
  try{
    const payload = {
      id: localTicket.id,
      folio: localTicket.folio,
      brand: localTicket.brand,
      client: localTicket.client,
      rfc: localTicket.rfc,
      total: localTicket.total,
      date: localTicket.date,
      items: localTicket.items || [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const targetId = localTicket.fsId || localTicket.id;
    await firestoreDb.collection('tickets').doc(targetId).set(payload, { merge: true });
    localTicket.fsId = targetId;
    await persistTickets();
    return targetId;
  }catch(e){ console.warn('Firestore save ticket failed:', e); return null; }
}

async function deleteTicketFromFirestore(fsId){
  if(!firestoreDb || !fsId) return;
  try{ await firestoreDb.collection('tickets').doc(fsId).delete(); }
  catch(e){ console.warn('deleteTicketFromFirestore', e); }
}

/* ============================================================
   Items state & Table
============================================================ */
let items = [];
let logoDataUrl = 'baner.jpeg';
let idCounter = 1;
let activeDraftId = generateTicketId();

function buildItemsTable(){
  const body = document.getElementById('itemsBody');
  if(!body) return;
  body.innerHTML = '';
  if(items.length === 0){
    body.innerHTML = `<tr><td colspan="5" class="empty-items">Aún no hay productos. Usa "+ Añadir producto".</td></tr>`;
    return;
  }
  items.forEach(it=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" value="${escapeHtml(it.name)}" data-field="name" placeholder="${I18N.productPlaceholder}"></td>
      <td class="qty"><input type="number" min="0" step="1" value="${it.qty}" data-field="qty"></td>
      <td class="price"><input type="number" min="0" step="0.01" value="${it.price}" data-field="price"></td>
      <td class="row-subtotal">${fmt(it.qty*it.price)}</td>
      <td><button class="rm" type="button" title="Quitar">×</button></td>`;
    body.appendChild(tr);
    tr.querySelectorAll('input').forEach(inp=>{
      inp.addEventListener('input', ()=>{
        const field = inp.dataset.field;
        it[field] = field === 'name' ? inp.value : Number(inp.value);
        tr.querySelector('.row-subtotal').textContent = fmt(it.qty*it.price);
        updateSheet();
      });
    });
    tr.querySelector('.rm').addEventListener('click', ()=>{
      items = items.filter(i=> i.id !== it.id);
      buildItemsTable();
      updateSheet();
    });
  });
}

function addItem(name='', qty=1, price=0){
  items.push({id: idCounter++, name, qty, price});
  buildItemsTable();
  updateSheet();
}

function computeTotals(){
  const subtotal = items.reduce((s,it)=> s + (it.qty*it.price), 0);
  const total = Math.max(0, subtotal);
  return {subtotal, total};
}

/* ============================================================
   Real-Time QR Generator
============================================================ */
function renderQr(){
  const box = document.getElementById('qrBox');
  if(!box) return;
  box.innerHTML = '';
  try {
    new QRCode(box, {
      text: 'https://despacho-nunez-alvarez.devcenterx.workers.dev',
      width: 80,
      height: 80,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  } catch(e) {
    box.innerHTML = '<img src="codigo-qr.png" style="width:100%;height:100%;object-fit:contain;">';
  }
}

/* ============================================================
   Invoice Sheet Rendering
============================================================ */
function updateSheet(){
  const t = computeTotals();
  if(document.getElementById('shTotal')) document.getElementById('shTotal').textContent = fmt(t.total);
  if(document.getElementById('sheetWords')) document.getElementById('sheetWords').textContent = amountInWords(t.total);

  const clientNameVal = document.getElementById('clientName')?.value || '';
  const clientRfcVal  = document.getElementById('clientRfc')?.value  || '';
  if(document.getElementById('sheetClient')) document.getElementById('sheetClient').textContent = clientNameVal || '-';
  if(document.getElementById('sheetRfc')) document.getElementById('sheetRfc').textContent = clientRfcVal || '-';

  const docDateVal = document.getElementById('docDate')?.value;
  let dateStr = '';
  if (docDateVal) {
    const parts = docDateVal.split('-');
    if (parts.length === 3) dateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
    else dateStr = docDateVal;
  } else {
    dateStr = new Date().toLocaleDateString('es-MX', {day:'2-digit', month:'2-digit', year:'numeric'});
  }

  if (document.getElementById('cfdiFechaEmision')) {
    document.getElementById('cfdiFechaEmision').innerHTML = `
      <div style="padding:4px 6px; text-align:center; border-bottom:1px solid #000;">
        <div style="font-weight:bold; font-size:8px; color:#000; letter-spacing:.04em;">FECHA</div>
        <div style="font-size:10px; font-weight:700; margin-top:1px;">${dateStr}</div>
      </div>
      <div style="padding:4px 6px; text-align:center;">
        <div style="font-weight:bold; font-size:8px; color:#000; letter-spacing:.04em;">HORA</div>
        <div style="font-size:10px; font-weight:700; margin-top:1px;">${new Date().toLocaleTimeString('es-MX', {hour:'2-digit', minute:'2-digit'})}</div>
      </div>`;
  }

  // Mostrar el ID del ticket en curso
  const docIdEl = document.getElementById('sheetDocId');
  if(docIdEl) docIdEl.textContent = activeDraftId || '—';

  const sheetItems = document.getElementById('sheetItems');
  if(sheetItems){
    const ROW_H = '26px'; // altura fija para TODAS las filas (items + relleno)
    const TOTAL_ROWS = 8;  // total de filas visibles siempre

    // Filas con productos reales
    const itemRows = items.map(it=>`
      <tr style="height:${ROW_H};">
        <td style="height:${ROW_H}; padding:0 6px; border-right:1px solid #000; border-bottom:1px dashed #bbb; vertical-align:middle; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">${escapeHtml(it.name||'-')}</td>
        <td style="height:${ROW_H}; padding:0 6px; text-align:center; border-right:1px solid #000; border-bottom:1px dashed #bbb; vertical-align:middle;">${it.qty}</td>
        <td style="height:${ROW_H}; padding:0 6px; text-align:right; border-bottom:1px dashed #bbb; vertical-align:middle;">${fmt(it.price)}</td>
      </tr>
    `).join('');

    // Filas vacías de relleno — siempre para completar TOTAL_ROWS
    const fillerCount = Math.max(0, TOTAL_ROWS - items.length);
    const fillerRows = Array.from({length: fillerCount}, ()=>`
      <tr style="height:${ROW_H};">
        <td style="height:${ROW_H}; border-right:1px solid #000; border-bottom:1px dashed #ccc;"></td>
        <td style="height:${ROW_H}; border-right:1px solid #000; border-bottom:1px dashed #ccc;"></td>
        <td style="height:${ROW_H}; border-bottom:1px dashed #ccc;"></td>
      </tr>
    `).join('');

    sheetItems.innerHTML = itemRows + fillerRows;
  }


  const logoEl = document.getElementById('sheetLogo');
  if(logoEl){
    if(logoDataUrl){
      logoEl.src = logoDataUrl;
      logoEl.style.display = 'block';
    } else {
      logoEl.style.display = 'none';
    }
  }

  renderQr();
}

/* ============================================================
   Ticket History Rendering (Expandable Read-Only View)
============================================================ */
function toggleHistoryDetails(id){
  const el = document.getElementById('details-' + id);
  if(el) el.classList.toggle('open');
}

function renderHistory(){
  const list = document.getElementById('historyList');
  if(!list) return;
  if(ticketHistory.length===0){
    list.innerHTML = `<p class="empty-hint">${I18N.emptyHist}</p>`;
    return;
  }
  list.innerHTML = ticketHistory.map(h=>{
    const itemsHtml = (h.items || []).map(it => `
      <tr>
        <td>${escapeHtml(it.name || 'Producto')}</td>
        <td style="text-align:center;">${it.qty || 1}</td>
        <td style="text-align:right;">$ ${(Number(it.price)||0).toFixed(2)}</td>
        <td style="text-align:right; font-weight:700;">$ ${((it.qty||1)*(it.price||0)).toFixed(2)}</td>
      </tr>
    `).join('');

    const isSynced = h.fsId ? true : false;
    const syncBadge = isSynced 
      ? `<span class="history-badge-sync online">☁️ Nube</span>`
      : `<span class="history-badge-sync offline">📶 Dispositivo</span>`;

    return `
      <div class="history-item-container" data-id="${h.id}">
        <div class="history-header" onclick="toggleHistoryDetails('${h.id}')">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="hi-folio">FOLIO ${pad6(h.folio)}</span>
              ${syncBadge}
            </div>
            <div class="hi-main">${escapeHtml(h.brand)}${h.client? ' · '+escapeHtml(h.client):''}</div>
            <div class="hi-sub">${new Date(h.date).toLocaleString()}</div>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="hi-total">$ ${h.total.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
            <button class="btn btn-outline btn-sm" type="button">👁️ Ver detalle</button>
          </div>
        </div>
        <div class="history-details" id="details-${h.id}">
          <div class="readonly-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Registro guardado &bull; Solo lectura (no modificable)
          </div>
          <div style="margin-bottom:8px; display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12px; color:var(--text-dim);">
            <div><strong>Cliente:</strong> ${escapeHtml(h.client || 'Público general')}</div>
            <div><strong>RFC:</strong> ${escapeHtml(h.rfc || 'Sin RFC')}</div>
            <div><strong>Marca:</strong> ${escapeHtml(h.brand || '-')}</div>
            <div><strong>Fecha:</strong> ${new Date(h.date).toLocaleString()}</div>
          </div>
          <table class="history-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th style="text-align:center;">Cant</th>
                <th style="text-align:right;">Precio</th>
                <th style="text-align:right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml || '<tr><td colspan="4" style="text-align:center; color:var(--text-faint);">Sin desglose de items</td></tr>'}
            </tbody>
          </table>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding-top:8px; border-top:1px solid var(--border-soft);">
            <div style="font-weight:800; font-size:13.5px;">
              TOTAL: <span style="color:var(--violet-2);">$ ${h.total.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
            </div>
            <button class="btn btn-danger btn-sm ticket-delete" data-id="${h.id}">Eliminar ticket</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.ticket-delete').forEach(btn=> {
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      handleDeleteTicket(btn.dataset.id);
    });
  });
}

async function handleDeleteTicket(ticketId){
  const index = ticketHistory.findIndex(t=> t.id === ticketId);
  if(index === -1) return;
  const ticket = ticketHistory[index];
  ticketHistory.splice(index, 1);
  await persistTickets();
  if(ticket.fsId) await deleteTicketFromFirestore(ticket.fsId);
  renderHistory();
}

/* ============================================================
   Clients & Select Sync
============================================================ */
function renderClientSelect(){
  const sel = document.getElementById('clientSelect');
  if(!sel) return;
  const prevVal = sel.value;
  const statusText = firestoreConnected ? `Base de datos conectada (${clients.length})` : 'Modo offline (local)';
  sel.innerHTML = `<option value="__status__" disabled>${statusText}</option>` +
    `<option value="">${I18N.newClientOpt}</option>` +
    clients.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  if([...sel.options].some(o=>o.value===prevVal)) sel.value = prevVal;
}

function updateDbStatus(){
  const el = document.getElementById('dbStatus');
  const cnt = document.getElementById('clientCount');
  if(el) el.textContent = firestoreConnected ? `Base de datos: Conectada` : 'Base de datos: Offline';
  if(cnt) cnt.textContent = `Clientes: ${clients.length}`;
}

document.getElementById('clientSelect')?.addEventListener('change', e=>{
  const c = clients.find(cl=> String(cl.id)===e.target.value);
  if(c){
    if(document.getElementById('clientName')) document.getElementById('clientName').value = c.name || '';
    if(document.getElementById('clientRfc')) document.getElementById('clientRfc').value = c.rfc || '';
  }
  updateSheet();
});

/* ============================================================
   Upload & Export Flow
============================================================ */
async function captureSheet(){
  if(typeof html2canvas === 'undefined') throw new Error('html2canvas-not-loaded');
  if(document.fonts && document.fonts.ready){ try{ await document.fonts.ready; }catch(e){} }
  const el = document.getElementById('sheetEl');
  return await html2canvas(el, { backgroundColor:'#ffffff', scale:2, useCORS:true, allowTaint:true, logging:false });
}

function setBtnLoading(btn, text){
  btn.dataset.originalText = btn.dataset.originalText || btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> ${text}`;
}
function restoreBtn(btn){
  btn.disabled = false;
  if(btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText;
}

async function saveTicketRecord(){
  if(items.length === 0){
    showToast(I18N.needItems,'error');
    return null;
  }
  const t = computeTotals();
  const folio = meta.nextFolio;
  const createdAt = new Date().toISOString();
  const ticketId = activeDraftId || generateTicketId();
  const ticket = {
    id: ticketId,
    folio,
    brand: document.getElementById('brandName').value || 'Despacho A & N',
    client: document.getElementById('clientName').value,
    rfc: document.getElementById('clientRfc').value,
    total: t.total,
    date: createdAt,
    currencySymbol: '$',
    items: items.map(it=>({ name: it.name, qty: it.qty, price: it.price })),
    createdAt
  };
  ticketHistory.unshift(ticket);
  meta.nextFolio = folio + 1;
  await persistTickets();
  await persistMeta();

  let uploadedCloud = false;
  if(navigator.onLine && firestoreConnected){
    try {
      const fsId = await saveTicketToFirestore(ticket);
      if(fsId){
        ticket.fsId = fsId;
        await persistTickets();
        uploadedCloud = true;
      }
    } catch(e) {
      console.warn("Firestore offline fallback", e);
    }
  }

  activeDraftId = generateTicketId();
  renderHistory();
  updateSheet();

  return { folio, uploadedCloud };
}

let _uploadedCanvas = null;
let _uploadedFolio  = null;
let _isUploaded     = false;

function unlockActions(){
  // Show post-upload panel
  const panel = document.getElementById('postUploadActions');
  if(panel){ panel.style.display = 'flex'; panel.classList.add('visible'); }
  // Remove lock from all action buttons
  ['waBtn','pdfBtn','pngBtn'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.classList.remove('action-locked');
  });
  const hint = document.getElementById('uploadHint');
  if(hint){
    hint.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#2fd07a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg> Ticket guardado — ahora puedes descargar o compartir';
    hint.style.color = 'var(--success)';
  }
  const upBtn = document.getElementById('uploadBtn');
  if(upBtn){
    upBtn.classList.add('uploaded');
    upBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg> Guardado';
  }
}

function lockActions(){
  // Hide post-upload panel completely
  const panel = document.getElementById('postUploadActions');
  if(panel){ panel.style.display = 'none'; panel.classList.remove('visible'); }
  ['waBtn','pdfBtn','pngBtn'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.classList.add('action-locked');
  });
  _uploadedCanvas = null;
  _uploadedFolio  = null;
  _isUploaded     = false;
  const banner = document.getElementById('offlineBanner');
  if(banner) banner.classList.remove('show');
  const hint = document.getElementById('uploadHint');
  if(hint){
    hint.textContent = 'Sube primero para habilitar las demás opciones';
    hint.style.color = '';
  }
  const upBtn = document.getElementById('uploadBtn');
  if(upBtn){
    upBtn.classList.remove('uploaded');
    upBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="17 8 12 3 7 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Subir ticket';
  }
}

function onTicketChanged(){
  if(_isUploaded) lockActions();
}
['docType','docDate','payMethod','clientName','clientRfc','brandName','brandSub'].forEach(id=>{
  const el = document.getElementById(id);
  if(el){
    el.addEventListener('input', onTicketChanged);
    el.addEventListener('change', onTicketChanged);
  }
});

async function syncPendingTickets(){
  if(!navigator.onLine || !firestoreDb) return;
  const pending = ticketHistory.filter(t => !t.fsId);
  if(pending.length === 0) return;
  let count = 0;
  for(const t of pending){
    const fsId = await saveTicketToFirestore(t);
    if(fsId){
      t.fsId = fsId;
      count++;
    }
  }
  if(count > 0){
    await persistTickets();
    renderHistory();
    showToast(`☁️ ${count} ticket(s) sincronizados con la base de datos`, 'success');
  }
}

window.addEventListener('online', () => {
  showToast('🌐 Conexión restaurada - Sincronizando...', 'info');
  syncPendingTickets();
});

async function doUpload(){
  if(items.length===0){ showToast(I18N.needItems,'error'); return; }
  const btn = document.getElementById('uploadBtn');
  setBtnLoading(btn, 'Subiendo…');
  const banner = document.getElementById('offlineBanner');
  if(banner) banner.classList.remove('show');

  try{
    _uploadedCanvas = await captureSheet();
    const res = await saveTicketRecord();
    if(!res){
      restoreBtn(btn);
      return;
    }
    _uploadedFolio = res.folio;
    _isUploaded = true;
    unlockActions();

    if(res.uploadedCloud){
      showToast('Ticket subido a la base de datos ✅','success');
    } else {
      showToast('Guardado en este dispositivo (Modo sin conexión) 📶','warn');
      if(banner) banner.classList.add('show');
    }
  }catch(err){
    console.error(err);
    showToast(I18N.errorExport,'error');
  }finally{
    restoreBtn(btn);
  }
}

document.getElementById('uploadBtn')?.addEventListener('click', doUpload);

document.getElementById('pdfBtn')?.addEventListener('click', async (e)=>{
  const btn = e.currentTarget;
  setBtnLoading(btn, I18N.generatingPdf);
  try{
    const canvas = _uploadedCanvas || await captureSheet();
    const folio  = _uploadedFolio  || meta.nextFolio;
    const imgData = canvas.toDataURL('image/png');
    if(!window.jspdf) throw new Error('jspdf-not-loaded');
    const { jsPDF } = window.jspdf;
    const wPt = canvas.width / 2, hPt = canvas.height / 2;
    const pdf = new jsPDF({ unit:'pt', format:[wPt, hPt] });
    pdf.addImage(imgData, 'PNG', 0, 0, wPt, hPt);
    pdf.save(`documento-${pad6(folio)}.pdf`);
    showToast('PDF descargado','success');
  }catch(err){
    console.error(err);
    showToast(I18N.errorExport,'error');
  }finally{
    restoreBtn(btn);
  }
});

document.getElementById('pngBtn')?.addEventListener('click', async (e)=>{
  const btn = e.currentTarget;
  setBtnLoading(btn, I18N.generatingPng);
  try{
    const canvas = _uploadedCanvas || await captureSheet();
    const folio  = _uploadedFolio  || meta.nextFolio;
    const link = document.createElement('a');
    link.download = `documento-${pad6(folio)}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('PNG descargado','success');
  }catch(err){
    console.error(err);
    showToast(I18N.errorExport,'error');
  }finally{
    restoreBtn(btn);
  }
});

document.getElementById('waBtn')?.addEventListener('click', async ()=>{
  const t = computeTotals();
  const brand = document.getElementById('brandName').value || 'Mi marca';
  const client = document.getElementById('clientName').value;
  let text = `*${brand}*\n`;
  if(client) text += `${I18N.client}: ${client}\n`;
  text += `\n`;
  items.forEach(it=> text += `${it.name||'-'} x${it.qty} — ${fmt(it.qty*it.price)}\n`);
  text += `\n${I18N.lblTotal}: ${fmt(t.total)}`;

  if(_uploadedCanvas && navigator.share && navigator.canShare){
    _uploadedCanvas.toBlob(async blob=>{
      const file = new File([blob], 'ticket.png', { type:'image/png' });
      if(navigator.canShare({ files:[file] })){
        try{
          await navigator.share({ files:[file], text });
          return;
        }catch(err){ /* fallback to link */ }
      }
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }, 'image/png');
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }
});

/* ============================================================
   Collapsible form cards & Mobile UX
============================================================ */
function makeCardsCollapsible(){
  const cards = document.querySelectorAll('.layout > div:first-child .card');
  cards.forEach(card=>{
    const title = card.querySelector('.section-title');
    if(!title) return;
    if(!card.querySelector('.card-body')){
      const body = document.createElement('div'); body.className = 'card-body';
      let node = title.nextSibling;
      while(node){
        const next = node.nextSibling;
        body.appendChild(node);
        node = next;
      }
      card.appendChild(body);
    }
    if(!title.querySelector('.caret')){
      const caret = document.createElement('span'); caret.className = 'caret';
      caret.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      title.appendChild(caret);
    }
    title.addEventListener('click', ()=>{ card.classList.toggle('collapsed'); });
    if(title.textContent.includes('Marca')) card.classList.add('collapsed');
  });
}

function setupMobileUX(){
  const m = document.getElementById('mobileActions');
  if(!m) return;
  function updateVisibility(){ m.style.display = window.innerWidth <= 520 ? 'flex' : 'none'; }
  updateVisibility(); window.addEventListener('resize', updateVisibility);
  const mu = document.getElementById('mobileUpload'); if(mu) mu.addEventListener('click', ()=> document.getElementById('uploadBtn').click());
  const mp = document.getElementById('mobilePdf'); if(mp) mp.addEventListener('click', ()=> document.getElementById('pdfBtn').click());
  const mg = document.getElementById('mobilePng'); if(mg) mg.addEventListener('click', ()=> document.getElementById('pngBtn').click());

  function reorder(){
    const layout = document.querySelector('.layout');
    if(!layout || !layout.children || layout.children.length < 2) return;
    const left = layout.children[0]; const right = layout.children[1];
    if(window.innerWidth <= 520){ if(layout.firstChild !== right) layout.insertBefore(right,left); }
    else { if(layout.firstChild !== left) layout.insertBefore(left,right); }
  }
  reorder(); window.addEventListener('resize', reorder);
}

/* ============================================================
   Initialization (Preload all categories at startup)
============================================================ */
(async function init(){
  if(document.getElementById('docDate')) document.getElementById('docDate').value = new Date().toISOString().slice(0,10);
  
  // 1. Load local data for tickets and clients instantly
  await loadAllData();
  
  // 2. Preload Firestore collections in parallel (users & tickets)
  try {
    initFirebase();
    await Promise.all([
      fetchFirestoreUsers(),
      fetchFirestoreTickets(),
      syncPendingTickets()
    ]);
  } catch(e) {
    console.warn('Firestore initialization:', e);
  }

  // 3. UI setup & initial rendering
  if(document.getElementById('brandName')) document.getElementById('brandName').value = '';
  if(document.getElementById('docType')) document.getElementById('docType').value = 'RECIBO DE PAGO';
  logoDataUrl = 'baner.jpeg';

  addItem('Playera personalizada', 1, 250);

  try{ makeCardsCollapsible(); }catch(e){}
  try{ setupMobileUX(); }catch(e){}

  const ticketStyleEl = document.getElementById('ticketStyle');
  document.querySelectorAll('.style-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = btn.dataset.style;
      if(ticketStyleEl) ticketStyleEl.value = s;
      document.querySelectorAll('.style-btn').forEach(b => b.classList.toggle('active', b.dataset.style === s));
      updateSheet();
    });
  });

  document.getElementById('addItemBtn')?.addEventListener('click', () => addItem());
  document.getElementById('copyTotalBtn')?.addEventListener('click', () => {
    const t = computeTotals();
    const text = fmt(t.total);
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(() => showToast(I18N.copied, 'success'))
        .catch(() => showToast(I18N.errorExport, 'error'));
    }
  });

  ['docType','docDate','payMethod','clientName','clientRfc','brandName','brandSub'].forEach(id=>{
    const el = document.getElementById(id);
    if(el){
      el.addEventListener('input', updateSheet);
      el.addEventListener('change', updateSheet);
    }
  });

  document.getElementById('logoFile')?.addEventListener('change', e=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev=>{ logoDataUrl = ev.target.result; updateSheet(); };
    reader.readAsDataURL(file);
  });

  document.getElementById('refreshBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('refreshBtn');
    if(btn) btn.classList.add('spinning');
    try {
      await loadAllData();
      if(typeof initFirebase === 'function') initFirebase();
      await Promise.all([fetchFirestoreUsers(), fetchFirestoreTickets(), syncPendingTickets()]);
      showToast('Datos sincronizados con éxito 🔄', 'success');
    } catch(e) {
      showToast('Modo sin conexión activo 📶', 'warn');
    } finally {
      if(btn) setTimeout(() => btn.classList.remove('spinning'), 600);
    }
  });

  updateSheet();
  renderHistory();

  // Hide splash screen once all categories are ready
  const overlay = document.getElementById('loadingOverlay');
  if(overlay) overlay.style.display = 'none';
})();
