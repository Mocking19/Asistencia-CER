const STORAGE_KEY = 'asistenciaPacientesData';
const appointmentForm = document.getElementById('appointmentForm');
const appointmentsTableBody = document.querySelector('#appointmentsTable tbody');
const viewDateInput = document.getElementById('viewDate');
const downloadPdfButton = document.getElementById('downloadPdf');
const prevDayButton = document.getElementById('prevDayBtn');
const nextDayButton = document.getElementById('nextDayBtn');
const stats = document.getElementById('stats');
const resetFormButton = document.getElementById('resetForm');
const protocolSelect = document.getElementById('protocol');
const patientNumberSelect = document.getElementById('patientNumber');
const nameInput = document.getElementById('name');
const birthDateInput = document.getElementById('birthDate');
let protocolosData = [];

const defaultData = {
  appointments: []
};

function loadData() {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : defaultData;
}

function saveData(data) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
  patientNumberSelect.innerHTML = '<option value="">Selecciona un protocolo primero</option>';
  nameInput.value = '';
}

function populatePatientNumbers(protocolo) {
  const selected = protocolosData.find(item => item.protocolo === protocolo);
  if (!selected) {
    patientNumberSelect.innerHTML = '<option value="">Selecciona un protocolo primero</option>';
    nameInput.value = '';
    return;
  }

  const patientsOptions = selected.pacientes
    .map(paciente => `
      <option value="${paciente.numero_paciente}" data-name="${paciente.nombre}" data-birthdate="${paciente.fecha_nacimiento}">
        ${paciente.numero_paciente} — ${paciente.nombre}
      </option>`)
    .join('');

  patientNumberSelect.innerHTML = `
    <option value="">Selecciona número de paciente</option>
    ${patientsOptions}
  `;
  nameInput.value = '';
}

function updateNameFromPatient() {
  const selectedOption = patientNumberSelect.selectedOptions[0];
  const patientName = selectedOption?.dataset?.name || '';
  const birthDate = selectedOption?.dataset?.birthdate || '';

  nameInput.value = patientName;
  birthDateInput.value = birthDate ? formatDateForInput(birthDate) : '';
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


function renderTables() {
  const data = loadData();
  const selectedDate = getSelectedDate();

  const appointmentsForDate = data.appointments.filter(item => item.appointmentDate === selectedDate);
  
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

  const data = loadData();
  const editId = appointmentForm.dataset.editId;
  
  if (editId) {
    // Actualizar cita existente
    const appointmentIndex = data.appointments.findIndex(item => item.id === editId);
    if (appointmentIndex !== -1) {
      data.appointments[appointmentIndex] = {
        ...data.appointments[appointmentIndex],
        protocol,
        visit,
        doctor,
        name,
        patientNumber,
        birthDate,
        notes,
        appointmentDate,
        appointmentTime
      };
      delete appointmentForm.dataset.editId;
    }
  } else {
    // Crear nueva cita
    data.appointments.push({
      id: createId(),
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
    });
  }

  saveData(data);
  
  // Restaurar el botón de submit
  const submitBtn = appointmentForm.querySelector('button[type="submit"]');
  if (submitBtn.textContent !== 'Agregar a lista') {
    submitBtn.textContent = 'Agregar a lista';
  }
  
  appointmentForm.reset();
  setDefaultDates();
  renderTables();
}

function setDefaultDates() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('appointmentDate').value = getLocalDateString(tomorrow);
  document.getElementById('appointmentTime').value = '08:00';
}

function handleArrival(id) {
  const data = loadData();
  const appointment = data.appointments.find(item => item.id === id);
  if (!appointment || appointment.arrivalTime) return;
  appointment.arrivalTime = new Date().toISOString();
  saveData(data);
  renderTables();
}

function markArrival(button) {
  handleArrival(button.dataset.id);
}

function editAppointment(button) {
  const id = button.dataset.id;
  const data = loadData();
  const appointment = data.appointments.find(item => item.id === id);
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

function deleteAppointment(button) {
  const id = button.dataset.id;
  if (!confirm('¿Estás seguro de que deseas eliminar este paciente de la lista?')) return;
  
  const data = loadData();
  data.appointments = data.appointments.filter(item => item.id !== id);
  saveData(data);
  renderTables();
}

function downloadPdf() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const selectedDate = getSelectedDate();
  const data = loadData();
  const attendanceForDate = data.appointments
    .filter(item => item.arrivalTime && item.appointmentDate === selectedDate)
    .sort((a, b) => {
      const byDoctor = a.doctor.localeCompare(b.doctor, 'es', { sensitivity: 'base' });
      if (byDoctor !== 0) return byDoctor;
      return new Date(a.arrivalTime) - new Date(b.arrivalTime);
    });
  const absentForDate = data.appointments
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

  doc.save(`asistencia-${selectedDate}.pdf`);
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

function bindEvents() {
  appointmentForm.addEventListener('submit', addAppointment);
  resetFormButton.addEventListener('click', () => {
    appointmentForm.reset();
    setDefaultDates();
  });
  protocolSelect.addEventListener('change', () => populatePatientNumbers(protocolSelect.value));
  patientNumberSelect.addEventListener('change', updateNameFromPatient);
  viewDateInput.addEventListener('change', renderTables);
  prevDayButton.addEventListener('click', () => changeSelectedDate(-1));
  nextDayButton.addEventListener('click', () => changeSelectedDate(1));
  downloadPdfButton.addEventListener('click', downloadPdf);

  // Collapsibles
  document.getElementById('toggleForm').addEventListener('click', () => {
    toggleCollapsible('form');
  });
  document.getElementById('toggleControls').addEventListener('click', () => {
    toggleCollapsible('controls');
  });
}

function toggleCollapsible(section) {
  const mapping = {
    'form': { header: 'toggleForm', content: 'formContent' },
    'controls': { header: 'toggleControls', content: 'controlsContent' }
  };

  const { header, content } = mapping[section];
  const headerEl = document.getElementById(header);
  const contentEl = document.getElementById(content);

  headerEl.classList.toggle('collapsed');
  contentEl.classList.toggle('hidden');
}

async function initialize() {
  viewDateInput.value = getLocalDateString(new Date());
  setDefaultDates();

  bindEvents();

  try {
    const protocolos = await fetchProtocolos();
    populateProtocolSelect(protocolos);
  } catch (error) {
    console.warn(error.message);
  }

  renderTables();
  
  // Inicialmente, colapsamos formulario
  document.getElementById('toggleForm').classList.add('collapsed');
  document.getElementById('formContent').classList.add('hidden');
}

initialize();
