# Asistencia de Pacientes

Aplicación SPA simple para registrar la asistencia de pacientes en la clínica.

## Archivos
- `public/index.html` - Interfaz de usuario.
- `public/style.css` - Estilos.
- `public/app.js` - Lógica de guardado y descarga de PDF.
- `public/protocolos.json` - Base de datos de protocolos y pacientes.
- `server.js` - Backend Node.js/Express.
- `vercel.json` - Configuración para despliegue en Vercel.

## Cómo usar localmente

1. Instala dependencias:
   ```bash
   npm install
   ```

2. Inicia el servidor:
   ```bash
   npm start
   ```

3. Abre `http://localhost:3000` en tu navegador.

## Funcionalidades

- Seleccionar protocolo con dropdown.
- Seleccionar número de paciente automáticamente según protocolo.
- Autollenado del nombre del paciente.
- Marcar llegada de pacientes.
- Registrar ausencias con motivo.
- Generar PDF de asistencia diaria.
- Datos guardados en localStorage (persisten entre sesiones).

## Guardado
Los datos de asistencia se guardan en el almacenamiento local del navegador (`localStorage`).

## Deploy
Este proyecto puede desplegarse directamente en Vercel:
1. Conecta tu repositorio GitHub a Vercel.
2. Vercel detectará la configuración en `vercel.json`.
3. El deploy se completará automáticamente.
