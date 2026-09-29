// ==========================================
// 1. INICIALIZACIÓN DE FIREBASE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyAdKquQTWLidOqZ4xGTT9ft0r2VwgCaphM",
  authDomain: "inspeccion-de-vehiculos-c3bc1.firebaseapp.com",
  databaseURL: "https://inspeccion-de-vehiculos-c3bc1-default-rtdb.firebaseio.com",
  projectId: "inspeccion-de-vehiculos-c3bc1",
  storageBucket: "inspeccion-de-vehiculos-c3bc1.firebasestorage.app",
  messagingSenderId: "441344346931",
  appId: "1:441344346931:web:66bf95868afe3508b18c46",
  measurementId: "G-FH59GMEXXP"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Habilitar persistencia sin conexión
database.ref('vehiculos').keepSynced(true);
database.ref('reportes').keepSynced(true);

// ==========================================
// 2. SINCRONIZACIÓN DE VEHÍCULOS EN TIEMPO REAL
// ==========================================
database.ref('vehiculos').on('value', (snapshot) => {
  const data = snapshot.val();
  if (data) {
    vehicles = Object.keys(data).map(key => ({ id: key, ...data[key] }));
  } else {
    // Si la base de datos está vacía, subir los vehículos por defecto
    defaultVehicles.forEach(v => {
      database.ref('vehiculos/' + v.id).set(v);
    });
  }
  
  // Actualizar la interfaz
  if (typeof renderVehicleOptions === 'function') renderVehicleOptions();
  if (typeof renderFleetList === 'function') renderFleetList();
});

// ==========================================
// 3. SINCRONIZACIÓN DE REPORTES EN TIEMPO REAL
// ==========================================
database.ref('reportes').on('value', (snapshot) => {
  const data = snapshot.val();
  if (data) {
    reports = Object.values(data);
  } else {
    reports = [];
  }
  
  // Actualizar la tabla de informes del comandante
  if (typeof renderReportsTable === 'function') renderReportsTable();
});

// PIN de seguridad para Comandancia (Por defecto: 1234)
const ADMIN_PIN = "1234";

// Inicialización de Datos por Defecto
const defaultVehicles = [
  { id: "AM-14", name: "M-01 Máquina Extintora", plate: "BMB-001", soat: "", tecno: "", extinguisher: "" },
  { id: "M-02", name: "M-02 Cisterna / Tanque", plate: "BMB-002", soat: "", tecno: "", extinguisher: "" },
  { id: "A-01", name: "A-01 Ambulancia Médica", plate: "BMB-003", soat: "", tecno: "", extinguisher: "" }
];

let vehicles = JSON.parse(localStorage.getItem('bomberos_vehicles')) || defaultVehicles;
let reports = JSON.parse(localStorage.getItem('bomberos_reports')) || [];
let selectedVehicleId = vehicles[0]?.id || "";
let currentPhotoBase64 = "";

// Al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  renderVehicleOptions();
  renderFleetList();
  renderReportsTable();
  setupEventListeners();
  loadSelectedVehicleDocs();
});

// Configuración de eventos generales
function setupEventListeners() {
  document.getElementById('btn-mode-driver').addEventListener('click', () => switchRole('driver'));
  document.getElementById('btn-mode-admin').addEventListener('click', () => switchRole('admin'));
}

// Cambiar entre rol Conductor y Comandante
function switchRole(role) {
  if (role === 'admin') {
    document.getElementById('admin-login-modal').classList.remove('hidden');
    document.getElementById('admin-pin').value = '';
    document.getElementById('admin-pin').focus();
  } else {
    document.getElementById('driver-view').classList.remove('hidden');
    document.getElementById('admin-view').classList.add('hidden');
    document.getElementById('btn-mode-driver').classList.add('active');
    document.getElementById('btn-mode-admin').classList.remove('active');
  }
}

function verifyAdminPin() {
  const enteredPin = document.getElementById('admin-pin').value;
  if (enteredPin === ADMIN_PIN) {
    document.getElementById('admin-login-modal').classList.add('hidden');
    document.getElementById('driver-view').classList.add('hidden');
    document.getElementById('admin-view').classList.remove('hidden');
    document.getElementById('btn-mode-driver').classList.remove('active');
    document.getElementById('btn-mode-admin').classList.add('active');
  } else {
    alert('❌ PIN Incorrecto. Intenta de nuevo.');
  }
}

function closeAdminLogin() {
  document.getElementById('admin-login-modal').classList.add('hidden');
}

// Cargar lista de vehículos en el menú desplegable
function renderVehicleOptions() {
  const select = document.getElementById('select-vehicle');
  select.innerHTML = '';
  vehicles.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = `${v.name} (${v.plate})`;
    select.appendChild(opt);
  });
  if (vehicles.length > 0) {
    select.value = selectedVehicleId;
  }
}

function onVehicleSelect() {
  selectedVehicleId = document.getElementById('select-vehicle').value;
  loadSelectedVehicleDocs();
}

// Cargar las fechas de SOAT, Tecno y Extintor del vehículo seleccionado
function loadSelectedVehicleDocs() {
  const vehicle = vehicles.find(v => v.id === selectedVehicleId);
  if (!vehicle) return;

  document.getElementById('date-soat').value = vehicle.soat || '';
  document.getElementById('date-tecno').value = vehicle.tecno || '';
  document.getElementById('date-extinguisher').value = vehicle.extinguisher || '';

  updateBadge('soat', vehicle.soat);
  updateBadge('tecno', vehicle.tecno);
  updateBadge('extinguisher', vehicle.extinguisher);
}

// Guardar la fecha de un documento
function saveDocDate(docType) {
  const vehicle = vehicles.find(v => v.id === selectedVehicleId);
  if (!vehicle) return;

  const newDate = document.getElementById(`date-${docType}`).value;
  vehicle[docType] = newDate;

  localStorage.setItem('bomberos_vehicles', JSON.stringify(vehicles));
  updateBadge(docType, newDate);
}

// Calcular la semaforización de estado de documentos
function updateBadge(docType, dateString) {
  const badge = document.getElementById(`badge-${docType}`);
  
  if (!dateString) {
    badge.textContent = 'SIN FECHA';
    badge.className = 'badge badge-danger';
    return;
  }

  const today = new Date();
  today.setHours(0,0,0,0);
  const targetDate = new Date(dateString + 'T00:00:00');
  const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    badge.textContent = `VENCIDO (${Math.abs(diffDays)}d)`;
    badge.className = 'badge badge-danger';
  } else if (diffDays <= 30) {
    badge.textContent = `POR VENCER (${diffDays}d)`;
    badge.className = 'badge badge-warn';
  } else {
    badge.textContent = `AL DÍA (${diffDays}d)`;
    badge.className = 'badge badge-ok';
  }
}

// Previsualización y conversión de la foto tomada
function previewImage(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      currentPhotoBase64 = e.target.result;
      document.getElementById('photo-preview').src = currentPhotoBase64;
      document.getElementById('photo-preview-container').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  } else {
    resetPhotoInput();
  }
}

function resetPhotoInput() {
  currentPhotoBase64 = "";
  document.getElementById('photo-evidence').value = "";
  document.getElementById('photo-preview').src = "";
  document.getElementById('photo-preview-container').classList.add('hidden');
}

// Enviar informe diario de inspección
function submitInspection(e) {
  e.preventDefault();
  const vehicle = vehicles.find(v => v.id === selectedVehicleId);

  const report = {
    id: Date.now(),
    date: new Date().toLocaleString('es-CO'),
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
    driver: document.getElementById('driver-name').value,
    kms: document.getElementById('kms').value,
    hoursPump: document.getElementById('hours-pump').value || 'N/A',
    fuel: document.getElementById('fuel-level').value,
    checklist: {
      lights: document.getElementById('chk-lights').checked,
      brakes: document.getElementById('chk-brakes').checked,
      pump: document.getElementById('chk-pump').checked,
      tires: document.getElementById('chk-tires').checked,
      extinguisherPhysical: document.getElementById('chk-extinguisher-physical').checked
    },
    notes: document.getElementById('notes').value || 'Sin novedades',
    photo: currentPhotoBase64
  };
  //enviar reporte a la base de datos
  database.ref('reportes').push(report);

  // --- AJUSTE 1: Limpiar las fechas de SOAT, Tecno y Extintor del vehículo actual ---
  vehicle.soat = "";
  vehicle.tecno = "";
  vehicle.extinguisher = "";
  localStorage.setItem('bomberos_vehicles', JSON.stringify(vehicles));
  loadSelectedVehicleDocs(); // Vuelve a colocar las entradas y badges en "SIN FECHA"

  // Limpiar el formulario
  document.getElementById('inspection-form').reset();
  resetPhotoInput();

  alert('✅ Inspección registrada con éxito. Las fechas de documentos y el checklist han quedado limpios para el siguiente registro.');
  renderReportsTable();
}

// Pestañas internas de la vista Comandante
function switchAdminTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

  if (tab === 'reports') {
    document.getElementById('tab-reports').classList.remove('hidden');
    event.target.classList.add('active');
  } else {
    document.getElementById('tab-fleet').classList.remove('hidden');
    event.target.classList.add('active');
  }
}

// Mostrar la tabla de informes recibidos
function renderReportsTable() {
  const tbody = document.getElementById('table-reports-body');
  tbody.innerHTML = '';

  if (reports.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay reportes registrados aún.</td></tr>';
    return;
  }

  reports.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.date}</td>
      <td><strong>${r.vehicleName}</strong></td>
      <td>${r.driver}</td>
      <td>${r.kms} KM</td>
      <td>${r.fuel}</td>
      <td>${r.notes}</td>
      <td>${r.photo ? '📷 Con Foto' : 'Sin foto'}</td>
      <td><button class="btn-sm btn-primary" onclick="viewReportDetail(${r.id})">🔍 Ver</button></td>
    `;
    tbody.appendChild(tr);
  });
}

// Modal para ver informe completo con imagen
function viewReportDetail(id) {
  const r = reports.find(item => item.id === id);
  if (!r) return;

  const photoHTML = r.photo 
    ? `<div class="detail-block">
        <h4>📷 Foto de Evidencia</h4>
        <img src="${r.photo}" alt="Evidencia" style="max-width:100%; max-height:350px; border-radius:6px; border:1px solid #cbd5e1;">
       </div>`
    : '';

  const container = document.getElementById('report-detail-body');
  container.innerHTML = `
    <div class="detail-block">
      <h4>📌 Datos Generales</h4>
      <ul class="detail-list">
        <li><strong>Fecha/Hora:</strong> ${r.date}</li>
        <li><strong>Vehículo:</strong> ${r.vehicleName}</li>
        <li><strong>Conductor:</strong> ${r.driver}</li>
        <li><strong>Kilometraje:</strong> ${r.kms} KM</li>
        <li><strong>Horas de Bomba:</strong> ${r.hoursPump}</li>
        <li><strong>Nivel de Combustible:</strong> ${r.fuel}</li>
      </ul>
    </div>

    <div class="detail-block">
      <h4>🛠️ Estado del Checklist</h4>
      <ul class="detail-list">
        <li>Luces, Sirenas y Licuadoras: ${r.checklist.lights ? '✅ Operativo' : '❌ Falla'}</li>
        <li>Sistema de Frenos: ${r.checklist.brakes ? '✅ Operativo' : '❌ Falla'}</li>
        <li>Bomba de Agua: ${r.checklist.pump ? '✅ Operativo' : '❌ Falla'}</li>
        <li>Neumáticos: ${r.checklist.tires ? '✅ Operativo' : '❌ Falla'}</li>
        <li>Extintor Físico: ${r.checklist.extinguisherPhysical ? '✅ A bordo y ok' : '❌ Falta/Descargado'}</li>
      </ul>
    </div>

    <div class="detail-block">
      <h4>📝 Novedades Observadas</h4>
      <p>${r.notes}</p>
    </div>

    ${photoHTML}
  `;

  document.getElementById('report-detail-modal').classList.remove('hidden');
}

function closeReportDetail() {
  document.getElementById('report-detail-modal').classList.add('hidden');
}

// Gestión de la lista de vehículos (Comandancia)
function renderFleetList() {
  const ul = document.getElementById('fleet-list');
  ul.innerHTML = '';

  vehicles.forEach(v => {
    const li = document.createElement('li');
    li.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0; border-bottom:1px solid #e2e8f0;';
    li.innerHTML = `
      <span><strong>[${v.id}]</strong> ${v.name} (Placa: ${v.plate})</span>
      <button class="btn-sm btn-secondary" style="background:#dc2626;" onclick="deleteVehicle('${v.id}')">Eliminar</button>
    `;
    ul.appendChild(li);
  });
}

function addVehicle(e) {
  e.preventDefault();
  const code = document.getElementById('new-v-code').value.trim();
  const name = document.getElementById('new-v-name').value.trim();
  const plate = document.getElementById('new-v-plate').value.trim();

  if (vehicles.some(v => v.id === code)) {
    alert('❌ Ya existe un vehículo con ese código interno.');
    return;
  }

 const newVehicle = { id: code, name: `${code} ${name}`, plate: plate, soat: "", tecno: "", extinguisher: "" };
 database.ref('vehiculos/' + code).set(newVehicle);

  renderVehicleOptions();
  renderFleetList();
  e.target.reset();
  alert('✅ Vehículo añadido correctamente a la flota.');
}

function deleteVehicle(id) {
  if (confirm(`¿Estás seguro de eliminar la unidad ${id}?`)) {
    database.ref('vehiculos/' + id).remove();
  }
}
  }
}

// Exportación a Excel / CSV
function exportCSV() {
  if (reports.length === 0) {
    alert('No hay reportes para exportar.');
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Fecha,Vehiculo,Conductor,Kilometraje,Horas Bomba,Combustible,Novedades,Tiene Foto\n";

  reports.forEach(r => {
    const photoText = r.photo ? "SI" : "NO";
    const row = `"${r.date}","${r.vehicleName}","${r.driver}","${r.kms}","${r.hoursPump}","${r.fuel}","${r.notes.replace(/"/g, '""')}","${photoText}"`;
    csvContent += row + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Informes_Bomberos_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
// ==========================================
// FUNCIONES PARA MODO OFFLINE (SIN INTERNET)
// ==========================================

// Función para guardar el reporte en la memoria del celular si no hay internet
function guardarEnTelefono(datos) {
  let pendientes = JSON.parse(localStorage.getItem('reportes_pendientes') || '[]');
  pendientes.push(datos);
  localStorage.setItem('reportes_pendientes', JSON.stringify(pendientes));
}

// Función que envía los reportes guardados en cuanto regresa el internet
function sincronizarReportesPendientes() {
  let pendientes = JSON.parse(localStorage.getItem('reportes_pendientes') || '[]');
  if (pendientes.length > 0) {
    console.log(`Sincronizando ${pendientes.length} reportes pendientes...`);
    
    // Obtener reportes actuales o enviar a la lista principal
    let reportesActuales = JSON.parse(localStorage.getItem('firestation_reports') || '[]');
    reportesActuales = reportesActuales.concat(pendientes);
    localStorage.setItem('firestation_reports', JSON.stringify(reportesActuales));
    
    // Limpiar reportes pendientes tras sincronizar
    localStorage.removeItem('reportes_pendientes');
    alert('✅ ¡Conexión restablecida! Los reportes guardados sin internet se han sincronizado correctamente.');
    
    // Si tienes una función para renderizar la tabla o vista, ejecútala aquí
    if (typeof renderReports === 'function') {
      renderReports();
    }
  }
}
