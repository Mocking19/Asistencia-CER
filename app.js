const STORAGE_KEY = 'asistenciaPacientesData';
const appointmentForm = document.getElementById('appointmentForm');
const appointmentsTableBody = document.querySelector('#appointmentsTable tbody');
const viewDateInput = document.getElementById('viewDate');
const downloadPdfButton = document.getElementById('downloadPdf');
const stats = document.getElementById('stats');
const resetFormButton = document.getElementById('resetForm');

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
      <button class="btn-small" data-id="${appointment.id}" onclick="markNoAttendance(this)">No asistió</button>
      <button class="btn-small danger" data-id="${appointment.id}" onclick="deleteAppointment(this)">Eliminar</button>
    `;
  }

  tr.className = isAbsent ? 'no-attendance' : '';
  tr.innerHTML = `
    <td>${arrivalHourHtml}</td>
    <td>${appointment.protocol}</td>
    <td>${appointment.doctor}</td>
    <td>${appointment.name}</td>
    <td>${appointment.patientNumber}</td>
    <td>${appointment.phone || '-'}</td>
    <td>${appointment.notes || '-'}</td>
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
    appointmentsTableBody.innerHTML = `<tr><td colspan="9">No hay pacientes programados para esta fecha.</td></tr>`;
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
  const doctor = document.getElementById('doctor').value.trim();
  const name = document.getElementById('name').value.trim();
  const patientNumber = document.getElementById('patientNumber').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const notes = document.getElementById('notes').value.trim();
  const appointmentDate = document.getElementById('appointmentDate').value;

  if (!protocol || !doctor || !name || !patientNumber || !appointmentDate) {
    return;
  }

  const data = loadData();
  data.appointments.push({
    id: createId(),
    protocol,
    doctor,
    name,
    patientNumber,
    phone,
    notes,
    appointmentDate,
    arrivalTime: null,
    absent: false,
    absenceReason: ''
  });

  saveData(data);
  appointmentForm.reset();
  setDefaultDates();
  renderTables();
}

function setDefaultDates() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('appointmentDate').value = getLocalDateString(tomorrow);
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

function deleteAppointment(button) {
  const id = button.dataset.id;
  if (!confirm('¿Estás seguro de que deseas eliminar este paciente de la lista?')) return;
  
  const data = loadData();
  data.appointments = data.appointments.filter(item => item.id !== id);
  saveData(data);
  renderTables();
}

function markNoAttendance(button) {
  const id = button.dataset.id;
  const reason = prompt('Ingresa la razón por la que el paciente no asistió:');
  
  if (reason === null) return; // Usuario canceló
  if (reason.trim() === '') {
    alert('Por favor, ingresa una razón.');
    return;
  }
  
  const data = loadData();
  const appointment = data.appointments.find(item => item.id === id);
  if (!appointment) return;
  
  appointment.absent = true;
  appointment.absenceReason = reason.trim();
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

  doc.setFontSize(14);
  doc.text('Planilla de Asistencia', 40, 40);
  doc.setFontSize(10);
  doc.text(`Fecha: ${formatDateFromString(selectedDate)}`, 40, 60);

  const marginLeft = 40;
  let currentY = 90;

  const headers = ['Hora', 'Doctor', 'Protocolo', 'Paciente', 'N°', 'Teléfono', 'Observaciones'];
  const rowHeight = 18;

  doc.setFontSize(9);
  doc.text(headers.join(' | '), marginLeft, currentY);
  currentY += rowHeight;

  if (attendanceForDate.length === 0) {
    doc.text('No hay pacientes registrados con llegada para esta fecha.', marginLeft, currentY);
  } else {
    attendanceForDate.forEach(item => {
      const row = [
        formatTime(item.arrivalTime),
        item.doctor,
        item.protocol,
        item.name,
        item.patientNumber,
        item.phone || '-',
        item.notes || '-'
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

  doc.save(`asistencia-${selectedDate}.pdf`);
}

function bindEvents() {
  appointmentForm.addEventListener('submit', addAppointment);
  resetFormButton.addEventListener('click', () => {
    appointmentForm.reset();
    setDefaultDates();
  });
  viewDateInput.addEventListener('change', renderTables);
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

function initialize() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('appointmentDate').value = getLocalDateString(tomorrow);
  viewDateInput.value = getLocalDateString(new Date());
  bindEvents();
  renderTables();
  
  // Inicialmente, colapsamos formulario
  document.getElementById('toggleForm').classList.add('collapsed');
  document.getElementById('formContent').classList.add('hidden');
}

initialize();
