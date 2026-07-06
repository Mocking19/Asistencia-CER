// ============= FIREBASE CONFIGURATION =============
const firebaseConfig = {
  apiKey: "AIzaSyAJ6Cvm-4QerpWAbNkk9x5lirHNDbBV9Qw",
  authDomain: "asistencia-pacientes-cer.firebaseapp.com",
  databaseURL: "https://asistencia-pacientes-cer-default-rtdb.firebaseio.com",
  projectId: "asistencia-pacientes-cer",
  storageBucket: "asistencia-pacientes-cer.firebasestorage.app",
  messagingSenderId: "632240426487",
  appId: "1:632240426487:web:aed8fdd8d9652dfdd8b2f2"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const appointmentsRef = database.ref('appointments');

// ============= DOM ELEMENTS =============
const appointmentForm = document.getElementById('appointmentForm');
const orderForm = document.getElementById('orderForm');
const appointmentsTableBody = document.querySelector('#appointmentsTable tbody');
const ordersTableBody = document.querySelector('#ordersTable tbody');
const viewDateInput = document.getElementById('viewDate');
const downloadPdfButton = document.getElementById('downloadPdf');
const prevDayButton = document.getElementById('prevDayBtn');
const nextDayButton = document.getElementById('nextDayBtn');
const stats = document.getElementById('stats');
const resetFormButton = document.getElementById('resetForm');
const resetOrderFormButton = document.getElementById('resetOrderForm');
const protocolSelect = document.getElementById('protocol');
const orderProtocolSelect = document.getElementById('orderProtocol');
const patientNumberSelect = document.getElementById('patientNumber');
const orderPatientNumberSelect = document.getElementById('orderPatientNumber');
const nameInput = document.getElementById('name');
const birthDateInput = document.getElementById('birthDate');
const orderNameInput = document.getElementById('orderName');
const patientProtocolFilter = document.getElementById('patientProtocolFilter');
const patientSearchInput = document.getElementById('patientSearch');
const patientClearFilters = document.getElementById('patientClearFilters');
const patientFilterInfo = document.getElementById('patientFilterInfo');
const patientPageSize = document.getElementById('patientPageSize');
const patientPrevPage = document.getElementById('patientPrevPage');
const patientNextPage = document.getElementById('patientNextPage');
const patientPageLabel = document.getElementById('patientPageLabel');
const patientsTableBody = document.querySelector('#patientsTable tbody');
const attendancePage = document.getElementById('attendancePage');
const patientViewerPage = document.getElementById('patientViewerPage');
const navAttendance = document.getElementById('navAttendance');
const navPatients = document.getElementById('navPatients');
const orderTypeInput = document.getElementById('orderType');
const orderTimeInput = document.getElementById('orderTime');
const orderDateInput = document.getElementById('orderDate');
const extraObservationForm = document.getElementById('extraObservationForm');
const resetObservationFormButton = document.getElementById('resetObservationForm');
const extraObservationDateInput = document.getElementById('extraObservationDate');
const extraObservationText = document.getElementById('extraObservationText');
const observationTableSection = document.getElementById('observationTableSection');
const observationsTableBody = document.querySelector('#observationsTable tbody');

// ============= STATE =============
let protocolosData = [];
let appointmentsData = {};  // Object with { id: appointment }
let ordersData = {};       // Object with { id: order }
let observationsData = {}; // Object with { id: observation }
let patientCurrentPage = 1;
let patientRowsPerPage = 10;

const ordersRef = database.ref('orders');
const observationsRef = database.ref('observations');

// ============= FIREBASE LISTENERS =============
function setupAppointmentsListener() {
  appointmentsRef.on('value', (snapshot) => {
    const data = snapshot.val();
    appointmentsData = data || {};
    renderTables();
  });
}

function setupOrdersListener() {
  ordersRef.on('value', (snapshot) => {
    const data = snapshot.val();
    ordersData = data || {};
    renderTables();
  });
}

// ============= FIREBASE OPERATIONS =============
function addAppointmentToFirebase(appointmentObj) {
  return appointmentsRef.push(appointmentObj);
}

function addOrderToFirebase(orderObj) {
  return ordersRef.push(orderObj);
}

function updateAppointmentInFirebase(id, updates) {
  return appointmentsRef.child(id).update(updates);
}

function deleteAppointmentFromFirebase(id) {
  return appointmentsRef.child(id).remove();
}

function updateOrderInFirebase(id, updates) {
  return ordersRef.child(id).update(updates);
}

function deleteOrderFromFirebase(id) {
  return ordersRef.child(id).remove();
}

function addObservationToFirebase(observationObj) {
  return observationsRef.push(observationObj);
}

function updateObservationInFirebase(id, updates) {
  return observationsRef.child(id).update(updates);
}

function deleteObservationFromFirebase(id) {
  return observationsRef.child(id).remove();
}

function setupObservationsListener() {
  observationsRef.on('value', (snapshot) => {
    const data = snapshot.val();
    observationsData = data || {};
    renderTables();
  });
}

async function fetchProtocolos() {
  const response = await fetch('/api/protocolos');
  if (!response.ok) {
    throw new Error('No se pudo cargar la lista de protocolos');
  }
  return response.json();
}

function populateProtocolSelect(protocolos) {
  protocolosData = protocolos;
  const options = protocolosData
    .map(item => `<option value="${item.protocolo}">${item.protocolo}</option>`)
    .join('');

  protocolSelect.innerHTML = `<option value="">Selecciona un protocolo</option>${options}`;
  orderProtocolSelect.innerHTML = `<option value="">Selecciona un protocolo</option>${options}`;
  patientNumberSelect.innerHTML = '<option value="">Selecciona un protocolo primero</option>';
  orderPatientNumberSelect.innerHTML = '<option value="">Selecciona un protocolo primero</option>';
  patientProtocolFilter.innerHTML = `<option value="">Todos los protocolos</option>${options}`;
  nameInput.value = '';
  orderNameInput.value = '';
}

function populatePatientNumbers(protocolo, targetNumberSelect = patientNumberSelect, targetNameInput = nameInput) {
  const selected = protocolosData.find(item => item.protocolo === protocolo);
  if (!selected) {
    targetNumberSelect.innerHTML = '<option value="">Selecciona un protocolo primero</option>';
    targetNameInput.value = '';
    return;
  }

  const patientsOptions = selected.pacientes
    .map(paciente => `
      <option value="${paciente.numero_paciente}" data-name="${paciente.nombre}" data-birthdate="${paciente.fecha_nacimiento}">
        ${paciente.numero_paciente} — ${paciente.nombre}
      </option>`)
    .join('');

  targetNumberSelect.innerHTML = `
    <option value="">Selecciona número de paciente</option>
    ${patientsOptions}
  `;
  targetNameInput.value = '';
}

function updateNameFromPatient(selectElement = patientNumberSelect, targetNameInput = nameInput) {
  const selectedOption = selectElement.selectedOptions[0];
  const patientName = selectedOption?.dataset?.name || '';
  const birthDate = selectedOption?.dataset?.birthdate || '';

  targetNameInput.value = patientName;
  if (targetNameInput === nameInput) {
    birthDateInput.value = birthDate ? formatDateForInput(birthDate) : '';
  }
}

function formatDateForInput(dateString) {
  const [day, month, year] = dateString.split('-');
  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatDateFromString(dateString) {
  // Formato YYYY-MM-DD a DD/MM/YYYY sin problemas de timezone
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function createId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getSelectedDate() {
  if (viewDateInput.value) return viewDateInput.value;
  return getLocalDateString(new Date());
}

function buildAppointmentRow(appointment) {
  const tr = document.createElement('tr');
  const isAbsent = appointment.absent;
  const hasArrived = appointment.arrivalTime && !isAbsent;

  let arrivalHourHtml = '';
  if (hasArrived) {
    arrivalHourHtml = formatTime(appointment.arrivalTime);
  }

  let statusHtml = '';
  if (hasArrived) {
    statusHtml = `<span class="badge ok">Llegó</span>`;
  } else if (isAbsent) {
    statusHtml = `<span class="badge absent">No asistió: ${appointment.absenceReason}</span>`;
  } else {
    statusHtml = `<button class="btn-small" data-id="${appointment.id}" onclick="markArrival(this)">Marcar llegada</button>`;
  }

  let actionsHtml = '';
  if (!hasArrived && !isAbsent) {
    actionsHtml = `
      <button class="btn-icon edit" data-id="${appointment.id}" title="Editar visita" onclick="editAppointment(this)">✎</button>
      <button class="btn-icon delete" data-id="${appointment.id}" title="Eliminar" onclick="deleteAppointment(this)">✕</button>
    `;
  }

  tr.className = isAbsent ? 'no-attendance' : '';
  tr.innerHTML = `
    <td>${appointment.visit || '-'}</td>
    <td>${appointment.protocol}</td>
    <td>${appointment.patientNumber}</td>
    <td>${appointment.name}</td>
    <td>${appointment.birthDate ? formatDateFromString(appointment.birthDate) : '-'}</td>
    <td>${appointment.doctor}</td>
    <td>${appointment.appointmentDate ? formatDateFromString(appointment.appointmentDate) : '-'}</td>
    <td>${appointment.appointmentTime || '-'}</td>
    <td>${appointment.notes || '-'}</td>
    <td>${arrivalHourHtml}</td>
    <td>${statusHtml}</td>
    <td>${actionsHtml}</td>
  `;
  return tr;
}

function buildOrderRow(order) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${order.orderType}</td>
    <td>${order.orderTime}</td>
    <td>${formatDateFromString(order.orderDate)}</td>
    <td>${order.protocol}</td>
    <td>${order.patientNumber}</td>
    <td>${order.name}</td>
    <td>
      <button class="btn-icon edit" data-id="${order.id}" title="Editar pedido" onclick="editOrder(this)">✎</button>
      <button class="btn-icon delete" data-id="${order.id}" title="Eliminar" onclick="deleteOrder(this)">✕</button>
    </td>
  `;
  return tr;
}

function buildObservationRow(observation) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${formatDateFromString(observation.observationDate)}</td>
    <td>${observation.observationText}</td>
    <td>
      <button class="btn-icon edit" data-id="${observation.id}" title="Editar observación" onclick="editObservation(this)">✎</button>
      <button class="btn-icon delete" data-id="${observation.id}" title="Eliminar" onclick="deleteObservation(this)">✕</button>
    </td>
  `;
  return tr;
}

function renderTables() {
  const selectedDate = getSelectedDate();

  // Convert appointmentsData object to array with IDs
  const appointmentsArray = Object.keys(appointmentsData).map(id => ({
    id,
    ...appointmentsData[id]
  }));

  const appointmentsForDate = appointmentsArray.filter(item => item.appointmentDate === selectedDate);
  const ordersArray = Object.keys(ordersData).map(id => ({ id, ...ordersData[id] }));
  const ordersForDate = ordersArray.filter(item => item.orderDate === selectedDate)
    .sort((a, b) => a.orderTime.localeCompare(b.orderTime, 'es', { sensitivity: 'base' }));
  
  // Ordenar: primero por doctor, luego llegados (con hora), luego pendientes, luego ausentes
  const sortedAppointments = [...appointmentsForDate].sort((a, b) => {
    const byDoctor = a.doctor.localeCompare(b.doctor, 'es', { sensitivity: 'base' });
    if (byDoctor !== 0) return byDoctor;
    
    // Llegados primero
    const aHasArrived = a.arrivalTime && !a.absent;
    const bHasArrived = b.arrivalTime && !b.absent;
    if (aHasArrived && !bHasArrived) return -1;
    if (!aHasArrived && bHasArrived) return 1;
    
    // Entre llegados, ordenar por hora
    if (aHasArrived && bHasArrived) {
      return new Date(a.arrivalTime) - new Date(b.arrivalTime);
    }
    
    // Pendientes antes que ausentes
    if (!a.absent && b.absent) return -1;
    if (a.absent && !b.absent) return 1;
    
    return 0;
  });

  appointmentsTableBody.innerHTML = '';

  if (sortedAppointments.length === 0) {
    appointmentsTableBody.innerHTML = `<tr><td colspan="11">No hay pacientes programados para esta fecha.</td></tr>`;
  } else {
    sortedAppointments.forEach(appointment => appointmentsTableBody.appendChild(buildAppointmentRow(appointment)));
  }

  const arrivedCount = appointmentsForDate.filter(item => item.arrivalTime && !item.absent).length;
  const pendingCount = appointmentsForDate.filter(item => !item.arrivalTime && !item.absent).length;
  const absentCount = appointmentsForDate.filter(item => item.absent).length;
  stats.textContent = `Fecha: ${formatDateFromString(selectedDate)} | Total: ${appointmentsForDate.length} | Llegaron: ${arrivedCount} | Pendientes: ${pendingCount} | No asistieron: ${absentCount}`;

  ordersTableBody.innerHTML = '';
  if (ordersForDate.length === 0) {
    ordersTableBody.innerHTML = `<tr><td colspan="6">No hay pedidos programados para esta fecha.</td></tr>`;
  } else {
    ordersForDate.forEach(order => ordersTableBody.appendChild(buildOrderRow(order)));
  }

  const observationsArray = Object.keys(observationsData).map(id => ({ id, ...observationsData[id] }));
  const observationsForDate = observationsArray
    .filter(item => item.observationDate === selectedDate)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  observationsTableBody.innerHTML = '';
  if (observationsForDate.length === 0) {
    observationTableSection.classList.add('hidden');
  } else {
    observationTableSection.classList.remove('hidden');
    observationsForDate.forEach(observation => observationsTableBody.appendChild(buildObservationRow(observation)));
  }

  renderPatientViewer();
}

function addAppointment(event) {
  event.preventDefault();
  const protocol = document.getElementById('protocol').value.trim();
  const visit = document.getElementById('visit').value.trim();
  const doctor = document.getElementById('doctor').value.trim();
  const name = document.getElementById('name').value.trim();
  const patientNumber = document.getElementById('patientNumber').value.trim();
  const birthDate = document.getElementById('birthDate').value;
  const notes = document.getElementById('notes').value.trim();
  const appointmentTime = document.getElementById('appointmentTime').value;
  const appointmentDate = document.getElementById('appointmentDate').value;

  if (!protocol || !visit || !doctor || !name || !patientNumber || !appointmentDate || !appointmentTime) {
    return;
  }

  const appointmentObj = {
    protocol,
    visit,
    doctor,
    name,
    patientNumber,
    birthDate,
    notes,
    appointmentDate,
    appointmentTime,
    arrivalTime: null,
    absent: false,
    absenceReason: ''
  };

  const editId = appointmentForm.dataset.editId;
  
  if (editId) {
    // Actualizar cita existente
    updateAppointmentInFirebase(editId, appointmentObj)
      .then(() => {
        delete appointmentForm.dataset.editId;
        const submitBtn = appointmentForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Agregar a lista';
        appointmentForm.reset();
        setDefaultDates();
      })
      .catch(error => console.error('Error al actualizar cita:', error));
  } else {
    // Crear nueva cita
    addAppointmentToFirebase(appointmentObj)
      .then(() => {
        appointmentForm.reset();
        setDefaultDates();
      })
      .catch(error => console.error('Error al agregar cita:', error));
  }
}

function addOrder(event) {
  event.preventDefault();
  const orderType = orderTypeInput.value.trim();
  const orderTime = orderTimeInput.value.trim();
  const orderDate = orderDateInput.value;
  const protocol = orderProtocolSelect.value.trim();
  const patientNumber = orderPatientNumberSelect.value.trim();
  const name = orderNameInput.value.trim();

  if (!orderType || !orderTime || !orderDate || !protocol || !patientNumber || !name) {
    return;
  }

  const orderObj = {
    orderType,
    orderTime,
    orderDate,
    protocol,
    patientNumber,
    name,
    createdAt: new Date().toISOString()
  };

  const editId = orderForm.dataset.editId;
  
  if (editId) {
    // Actualizar pedido existente
    updateOrderInFirebase(editId, orderObj)
      .then(() => {
        delete orderForm.dataset.editId;
        const submitBtn = orderForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Programar pedido';
        orderForm.reset();
        setDefaultDates();
      })
      .catch(error => console.error('Error al actualizar pedido:', error));
  } else {
    // Crear nuevo pedido
    addOrderToFirebase(orderObj)
      .then(() => {
        orderForm.reset();
        setDefaultDates();
      })
      .catch(error => console.error('Error al programar pedido:', error));
  }
}

function editOrder(button) {
  const id = button.dataset.id;
  const ordersArray = Object.keys(ordersData).map(key => ({
    id: key,
    ...ordersData[key]
  }));
  const order = ordersArray.find(item => item.id === id);
  if (!order) return;
  
  // Cargar datos en el formulario
  document.getElementById('orderType').value = order.orderType || '';
  document.getElementById('orderTime').value = order.orderTime || '';
  document.getElementById('orderDate').value = order.orderDate || '';
  document.getElementById('orderProtocol').value = order.protocol || '';
  
  // Actualizar selects de paciente
  populatePatientNumbers(order.protocol, orderPatientNumberSelect, orderNameInput);
  
  // Seleccionar el paciente después de que se carguen las opciones
  setTimeout(() => {
    document.getElementById('orderPatientNumber').value = order.patientNumber || '';
    updateNameFromPatient(orderPatientNumberSelect, orderNameInput);
  }, 100);
  
  // Guardar el ID para saber que estamos editando
  orderForm.dataset.editId = id;
  
  // Mostrar el formulario
  document.getElementById('toggleOrderForm').classList.remove('collapsed');
  document.getElementById('orderFormContent').classList.remove('hidden');
  
  // Scroll al formulario
  document.getElementById('toggleOrderForm').scrollIntoView({ behavior: 'smooth' });
  
  // Cambiar el botón de submit
  const submitBtn = orderForm.querySelector('button[type="submit"]');
  submitBtn.textContent = 'Actualizar pedido';
}

function deleteOrder(button) {
  const id = button.dataset.id;
  if (!confirm('¿Estás seguro de que deseas eliminar este pedido?')) return;
  
  deleteOrderFromFirebase(id)
    .catch(error => console.error('Error al eliminar pedido:', error));
}

function addObservation(event) {
  event.preventDefault();
  const observationDate = extraObservationDateInput.value;
  const observationText = extraObservationText.value.trim();

  if (!observationDate || !observationText) {
    return;
  }

  const observationObj = {
    observationDate,
    observationText,
    createdAt: new Date().toISOString()
  };

  const editId = extraObservationForm.dataset.editId;
  if (editId) {
    updateObservationInFirebase(editId, {
      observationDate,
      observationText
    })
      .then(() => {
        delete extraObservationForm.dataset.editId;
        const submitBtn = extraObservationForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Guardar observación';
        extraObservationForm.reset();
        setDefaultObservationDate();
      })
      .catch(error => console.error('Error al actualizar observación:', error));
  } else {
    addObservationToFirebase(observationObj)
      .then(() => {
        extraObservationForm.reset();
        setDefaultObservationDate();
      })
      .catch(error => console.error('Error al guardar observación:', error));
  }
}

function editObservation(button) {
  const id = button.dataset.id;
  const observationsArray = Object.keys(observationsData).map(key => ({
    id: key,
    ...observationsData[key]
  }));
  const observation = observationsArray.find(item => item.id === id);
  if (!observation) return;

  document.getElementById('extraObservationDate').value = observation.observationDate || '';
  document.getElementById('extraObservationText').value = observation.observationText || '';
  extraObservationForm.dataset.editId = id;

  const submitBtn = extraObservationForm.querySelector('button[type="submit"]');
  submitBtn.textContent = 'Actualizar observación';

  document.getElementById('toggleObservationForm').classList.remove('collapsed');
  document.getElementById('observationFormContent').classList.remove('hidden');
  document.getElementById('toggleObservationForm').scrollIntoView({ behavior: 'smooth' });
}

function deleteObservation(button) {
  const id = button.dataset.id;
  if (!confirm('¿Estás seguro de que deseas eliminar esta observación extraordinaria?')) return;

  deleteObservationFromFirebase(id)
    .catch(error => console.error('Error al eliminar observación:', error));
}

function setDefaultDates() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('appointmentDate').value = getLocalDateString(tomorrow);
  document.getElementById('appointmentTime').value = '08:00';
  orderDateInput.value = getLocalDateString(tomorrow);
}

function setDefaultObservationDate() {
  extraObservationDateInput.value = getLocalDateString(new Date());
}

function parseDateInput(value) {
  const [year, month, day] = (value || '').split('-').map(Number);
  if (!year || !month || !day) {
    return new Date();
  }
  return new Date(year, month - 1, day);
}

function changeSelectedDate(days) {
  const currentDate = parseDateInput(viewDateInput.value || getLocalDateString(new Date()));
  currentDate.setDate(currentDate.getDate() + days);
  viewDateInput.value = getLocalDateString(currentDate);
  renderTables();
}

function renderPatientViewer() {
  const selectedProtocol = patientProtocolFilter.value;
  const query = patientSearchInput.value.trim().toLowerCase();

  const patientRows = protocolosData.flatMap(item => {
    return item.pacientes.map(paciente => ({
      protocolo: item.protocolo,
      numero_paciente: paciente.numero_paciente,
      nombre: paciente.nombre,
      fecha_nacimiento: paciente.fecha_nacimiento
    }));
  });

  const filteredRows = patientRows.filter(row => {
    const protocolMatch = selectedProtocol ? row.protocolo === selectedProtocol : true;
    const queryMatch = query
      ? row.numero_paciente.toLowerCase().includes(query) || row.nombre.toLowerCase().includes(query)
      : true;
    return protocolMatch && queryMatch;
  });

  const totalRows = filteredRows.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / patientRowsPerPage));
  if (patientCurrentPage > pageCount) patientCurrentPage = pageCount;

  const startIndex = (patientCurrentPage - 1) * patientRowsPerPage;
  const pagedRows = filteredRows.slice(startIndex, startIndex + patientRowsPerPage);

  patientsTableBody.innerHTML = '';
  if (pagedRows.length === 0) {
    patientsTableBody.innerHTML = `<tr><td colspan="4">No se encontraron pacientes con estos filtros.</td></tr>`;
  } else {
    pagedRows.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.protocolo}</td>
        <td>${row.numero_paciente}</td>
        <td>${row.nombre}</td>
        <td>${row.fecha_nacimiento}</td>
      `;
      patientsTableBody.appendChild(tr);
    });
  }

  patientPageLabel.textContent = `Página ${patientCurrentPage} de ${pageCount}`;
  patientPrevPage.disabled = patientCurrentPage <= 1;
  patientNextPage.disabled = patientCurrentPage >= pageCount;

  const filterSummary = [];
  if (selectedProtocol) filterSummary.push(`protocolo ${selectedProtocol}`);
  if (query) filterSummary.push(`búsqueda "${query}"`);
  patientFilterInfo.textContent = filterSummary.length > 0
    ? `${totalRows} paciente(s) encontrados con ${filterSummary.join(' y ')}`
    : `${totalRows} paciente(s) en total`;
}

function switchPage(page) {
  const activeClass = 'active';
  if (page === 'attendance') {
    attendancePage.classList.remove('hidden');
    patientViewerPage.classList.add('hidden');
    navAttendance.classList.add(activeClass);
    navPatients.classList.remove(activeClass);
  } else {
    attendancePage.classList.add('hidden');
    patientViewerPage.classList.remove('hidden');
    navAttendance.classList.remove(activeClass);
    navPatients.classList.add(activeClass);
    renderPatientViewer();
  }
}

function markArrival(button) {
  const id = button.dataset.id;
  updateAppointmentInFirebase(id, {
    arrivalTime: new Date().toISOString()
  }).catch(error => console.error('Error al marcar llegada:', error));
}

function deleteAppointment(button) {
  const id = button.dataset.id;
  if (!confirm('¿Estás seguro de que deseas eliminar este paciente de la lista?')) return;
  
  deleteAppointmentFromFirebase(id)
    .catch(error => console.error('Error al eliminar cita:', error));
}

function markNoAttendance(button) {
  // Esta función ahora se llama editAppointment
  editAppointment(button);
}

function editAppointment(button) {
  const id = button.dataset.id;
  const appointmentArray = Object.keys(appointmentsData).map(key => ({
    id: key,
    ...appointmentsData[key]
  }));
  const appointment = appointmentArray.find(item => item.id === id);
  if (!appointment) return;
  
  // Cargar datos en el formulario
  document.getElementById('visit').value = appointment.visit || '';
  document.getElementById('protocol').value = appointment.protocol || '';
  document.getElementById('doctor').value = appointment.doctor || '';
  document.getElementById('appointmentDate').value = appointment.appointmentDate || '';
  document.getElementById('appointmentTime').value = appointment.appointmentTime || '';
  document.getElementById('notes').value = appointment.notes || '';
  
  // Actualizar selects de paciente
  populatePatientNumbers(appointment.protocol);
  
  // Seleccionar el paciente después de que se carguen las opciones
  setTimeout(() => {
    document.getElementById('patientNumber').value = appointment.patientNumber || '';
    updateNameFromPatient();
  }, 100);
  
  // Guardar el ID para saber que estamos editando
  appointmentForm.dataset.editId = id;
  
  // Mostrar el formulario
  document.getElementById('toggleForm').classList.remove('collapsed');
  document.getElementById('formContent').classList.remove('hidden');
  
  // Scroll al formulario
  document.getElementById('toggleForm').scrollIntoView({ behavior: 'smooth' });
  
  // Cambiar el botón de submit
  const submitBtn = appointmentForm.querySelector('button[type="submit"]');
  submitBtn.textContent = 'Actualizar cita';
}

function downloadPdf() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const selectedDate = getSelectedDate();

  // Convert appointmentsData object to array with IDs
  const appointmentsArray = Object.keys(appointmentsData).map(id => ({
    id,
    ...appointmentsData[id]
  }));

  const attendanceForDate = appointmentsArray
    .filter(item => item.arrivalTime && item.appointmentDate === selectedDate)
    .sort((a, b) => {
      const byDoctor = a.doctor.localeCompare(b.doctor, 'es', { sensitivity: 'base' });
      if (byDoctor !== 0) return byDoctor;
      return new Date(a.arrivalTime) - new Date(b.arrivalTime);
    });
  const absentForDate = appointmentsArray
    .filter(item => item.absent && item.appointmentDate === selectedDate)
    .sort((a, b) => {
      const byDoctor = a.doctor.localeCompare(b.doctor, 'es', { sensitivity: 'base' });
      if (byDoctor !== 0) return byDoctor;
      return a.patientNumber.localeCompare(b.patientNumber, 'es', { sensitivity: 'base' });
    });

  doc.setFontSize(14);
  doc.text('Planilla de Asistencia', 40, 40);
  doc.setFontSize(10);
  doc.text(`Fecha: ${formatDateFromString(selectedDate)}`, 40, 60);

  const marginLeft = 40;
  let currentY = 90;
  const rowHeight = 18;

  const headers = ['Visita', 'Protocolo', 'N°', 'Paciente', 'Fecha nacimiento', 'Doctor', 'Fecha de cita', 'Horario de cita', 'Observaciones', 'Hora'];

  doc.setFontSize(9);
  doc.text(headers.join(' | '), marginLeft, currentY);
  currentY += rowHeight;

  if (attendanceForDate.length === 0) {
    doc.text('No hay pacientes registrados con llegada para esta fecha.', marginLeft, currentY);
    currentY += rowHeight;
  } else {
    attendanceForDate.forEach(item => {
      const row = [
        item.visit || '-',
        item.protocol,
        item.patientNumber,
        item.name,
        item.birthDate ? formatDateFromString(item.birthDate) : '-',
        item.doctor,
        item.appointmentDate ? formatDateFromString(item.appointmentDate) : '-',
        item.appointmentTime || '-',
        item.notes || '-',
        formatTime(item.arrivalTime)
      ];
      const text = row.join(' | ');
      const splitText = doc.splitTextToSize(text, 520);
      splitText.forEach((line, index) => {
        doc.text(line, marginLeft, currentY + index * rowHeight);
      });
      currentY += rowHeight * splitText.length;
      if (currentY > 720) {
        doc.addPage();
        currentY = 40;
      }
    });
  }

  if (absentForDate.length > 0) {
    if (currentY > 720) {
      doc.addPage();
      currentY = 40;
    }

    currentY += rowHeight;
    doc.setFontSize(12);
    doc.text('Pacientes que no asistieron', marginLeft, currentY);
    currentY += rowHeight;

    const absentHeaders = ['Visita', 'Protocolo', 'N°', 'Paciente', 'Fecha nacimiento', 'Doctor', 'Fecha de cita', 'Horario de cita', 'Razón'];
    doc.setFontSize(9);
    doc.text(absentHeaders.join(' | '), marginLeft, currentY);
    currentY += rowHeight;

    absentForDate.forEach(item => {
      if (currentY > 720) {
        doc.addPage();
        currentY = 40;
      }
      const row = [
        item.visit || '-',
        item.protocol,
        item.patientNumber,
        item.name,
        item.birthDate ? formatDateFromString(item.birthDate) : '-',
        item.doctor,
        item.appointmentDate ? formatDateFromString(item.appointmentDate) : '-',
        item.appointmentTime || '-',
        item.absenceReason || '-'
      ];
      const text = row.join(' | ');
      const splitText = doc.splitTextToSize(text, 520);
      splitText.forEach((line, index) => {
        doc.text(line, marginLeft, currentY + index * rowHeight);
      });
      currentY += rowHeight * splitText.length;
    });
  }

  const ordersForDate = Object.keys(ordersData).map(id => ({ id, ...ordersData[id] }))
    .filter(item => item.orderDate === selectedDate)
    .sort((a, b) => a.orderTime.localeCompare(b.orderTime, 'es', { sensitivity: 'base' }));

  if (ordersForDate.length > 0) {
    if (currentY > 720) {
      doc.addPage();
      currentY = 40;
    }

    currentY += rowHeight;
    doc.setFontSize(12);
    doc.text('Pedidos programados', marginLeft, currentY);
    currentY += rowHeight;

    const orderHeaders = ['Tipo de pedido', 'Horario', 'Fecha', 'Protocolo', 'N°', 'Paciente'];
    doc.setFontSize(9);
    doc.text(orderHeaders.join(' | '), marginLeft, currentY);
    currentY += rowHeight;

    ordersForDate.forEach(item => {
      if (currentY > 720) {
        doc.addPage();
        currentY = 40;
      }
      const row = [
        item.orderType,
        item.orderTime,
        formatDateFromString(item.orderDate),
        item.protocol,
        item.patientNumber,
        item.name
      ];
      const text = row.join(' | ');
      const splitText = doc.splitTextToSize(text, 520);
      splitText.forEach((line, index) => {
        doc.text(line, marginLeft, currentY + index * rowHeight);
      });
      currentY += rowHeight * splitText.length;
    });
  }

  const observationsForDate = Object.keys(observationsData).map(id => ({ id, ...observationsData[id] }))
    .filter(item => item.observationDate === selectedDate)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  if (observationsForDate.length > 0) {
    if (currentY > 720) {
      doc.addPage();
      currentY = 40;
    }

    currentY += rowHeight;
    doc.setFontSize(12);
    doc.text('Observaciones extraordinarias', marginLeft, currentY);
    currentY += rowHeight;
    doc.setFontSize(9);

    observationsForDate.forEach(item => {
      if (currentY > 720) {
        doc.addPage();
        currentY = 40;
      }
      const splitText = doc.splitTextToSize(`- ${item.observationText}`, 520);
      splitText.forEach((line, index) => {
        doc.text(line, marginLeft, currentY + index * rowHeight);
      });
      currentY += rowHeight * splitText.length;
    });
  }

  doc.save(`asistencia-${selectedDate}.pdf`);
}

function bindEvents() {
  appointmentForm.addEventListener('submit', addAppointment);
  orderForm.addEventListener('submit', addOrder);
  resetFormButton.addEventListener('click', () => {
    appointmentForm.reset();
    setDefaultDates();
  });
  resetOrderFormButton.addEventListener('click', () => {
    orderForm.reset();
    setDefaultDates();
  });
  patientProtocolFilter.addEventListener('change', () => { patientCurrentPage = 1; renderPatientViewer(); });
  patientSearchInput.addEventListener('input', () => { patientCurrentPage = 1; renderPatientViewer(); });
  patientPageSize.addEventListener('change', () => { patientRowsPerPage = Number(patientPageSize.value); patientCurrentPage = 1; renderPatientViewer(); });
  patientPrevPage.addEventListener('click', () => {
    if (patientCurrentPage > 1) {
      patientCurrentPage -= 1;
      renderPatientViewer();
    }
  });
  patientNextPage.addEventListener('click', () => {
    patientCurrentPage += 1;
    renderPatientViewer();
  });
  patientClearFilters.addEventListener('click', () => {
    patientProtocolFilter.value = '';
    patientSearchInput.value = '';
    patientCurrentPage = 1;
    renderPatientViewer();
  });
  navAttendance.addEventListener('click', () => switchPage('attendance'));
  navPatients.addEventListener('click', () => switchPage('patients'));
  protocolSelect.addEventListener('change', () => populatePatientNumbers(protocolSelect.value));
  orderProtocolSelect.addEventListener('change', () => populatePatientNumbers(orderProtocolSelect.value, orderPatientNumberSelect, orderNameInput));
  patientNumberSelect.addEventListener('change', () => updateNameFromPatient(patientNumberSelect, nameInput));
  orderPatientNumberSelect.addEventListener('change', () => updateNameFromPatient(orderPatientNumberSelect, orderNameInput));
  extraObservationForm.addEventListener('submit', addObservation);
  resetObservationFormButton.addEventListener('click', () => {
    extraObservationForm.reset();
    setDefaultObservationDate();
    delete extraObservationForm.dataset.editId;
    const submitBtn = extraObservationForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Guardar observación';
  });
  viewDateInput.addEventListener('change', renderTables);
  prevDayButton.addEventListener('click', () => changeSelectedDate(-1));
  nextDayButton.addEventListener('click', () => changeSelectedDate(1));
  downloadPdfButton.addEventListener('click', downloadPdf);

  // Collapsibles
  document.getElementById('toggleForm').addEventListener('click', () => {
    toggleCollapsible('form');
  });
  document.getElementById('toggleOrderForm').addEventListener('click', () => {
    toggleCollapsible('order');
  });
  document.getElementById('toggleObservationForm').addEventListener('click', () => {
    toggleCollapsible('observation');
  });
}

function toggleCollapsible(section) {
  const mapping = {
    'form': { header: 'toggleForm', content: 'formContent' },
    'order': { header: 'toggleOrderForm', content: 'orderFormContent' },
    'observation': { header: 'toggleObservationForm', content: 'observationFormContent' }
  };

  const { header, content } = mapping[section];
  const headerEl = document.getElementById(header);
  const contentEl = document.getElementById(content);

  headerEl.classList.toggle('collapsed');
  contentEl.classList.toggle('hidden');
}

function renderPatientViewer() {
  const selectedProtocol = patientProtocolFilter.value;
  const query = patientSearchInput.value.trim().toLowerCase();

  const patientRows = protocolosData.flatMap(item => {
    return item.pacientes.map(paciente => ({
      protocolo: item.protocolo,
      numero_paciente: paciente.numero_paciente,
      nombre: paciente.nombre,
      fecha_nacimiento: paciente.fecha_nacimiento
    }));
  });

  const filteredRows = patientRows.filter(row => {
    const protocolMatch = selectedProtocol ? row.protocolo === selectedProtocol : true;
    const queryMatch = query
      ? row.numero_paciente.toLowerCase().includes(query) || row.nombre.toLowerCase().includes(query)
      : true;
    return protocolMatch && queryMatch;
  });

  const totalRows = filteredRows.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / patientRowsPerPage));
  if (patientCurrentPage > pageCount) patientCurrentPage = pageCount;

  const startIndex = (patientCurrentPage - 1) * patientRowsPerPage;
  const pagedRows = filteredRows.slice(startIndex, startIndex + patientRowsPerPage);

  patientsTableBody.innerHTML = '';

  if (pagedRows.length === 0) {
    patientsTableBody.innerHTML = `<tr><td colspan="4">No se encontraron pacientes con estos filtros.</td></tr>`;
  } else {
    pagedRows.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.protocolo}</td>
        <td>${row.numero_paciente}</td>
        <td>${row.nombre}</td>
        <td>${row.fecha_nacimiento}</td>
      `;
      patientsTableBody.appendChild(tr);
    });
  }

  patientPageLabel.textContent = `Página ${patientCurrentPage} de ${pageCount}`;
  patientPrevPage.disabled = patientCurrentPage <= 1;
  patientNextPage.disabled = patientCurrentPage >= pageCount;

  const filterSummary = [];
  if (selectedProtocol) filterSummary.push(`protocolo ${selectedProtocol}`);
  if (query) filterSummary.push(`búsqueda "${query}"`);
  patientFilterInfo.textContent = filterSummary.length > 0
    ? `${totalRows} paciente(s) encontrados con ${filterSummary.join(' y ')}`
    : `${totalRows} paciente(s) en total`;
}

function switchPage(page) {
  const activeClass = 'active';
  if (page === 'attendance') {
    attendancePage.classList.remove('hidden');
    patientViewerPage.classList.add('hidden');
    navAttendance.classList.add(activeClass);
    navPatients.classList.remove(activeClass);
  } else {
    attendancePage.classList.add('hidden');
    patientViewerPage.classList.remove('hidden');
    navAttendance.classList.remove(activeClass);
    navPatients.classList.add(activeClass);
    renderPatientViewer();
  }
}

async function initialize() {
  setDefaultDates();
  viewDateInput.value = getLocalDateString(new Date());

  bindEvents();

  try {
    const protocolos = await fetchProtocolos();
    populateProtocolSelect(protocolos);
  } catch (error) {
    console.warn(error.message);
  }

  // Setup Firebase listener for real-time updates
  setupAppointmentsListener();
  setupOrdersListener();
  setupObservationsListener();
  
  // Inicialmente, colapsamos formularios
  document.getElementById('toggleForm').classList.add('collapsed');
  document.getElementById('formContent').classList.add('hidden');
  document.getElementById('toggleOrderForm').classList.add('collapsed');
  document.getElementById('orderFormContent').classList.add('hidden');
  document.getElementById('toggleObservationForm').classList.add('collapsed');
  document.getElementById('observationFormContent').classList.add('hidden');

  switchPage('attendance');
}

initialize();
