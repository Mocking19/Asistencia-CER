# Asistencia de Pacientes

Aplicación SPA simple para registrar la asistencia de pacientes en la clínica.

## Archivos
- `index.html` - Interfaz de usuario.
- `style.css` - Estilos.
- `app.js` - Lógica de guardado y descarga de PDF.

## Cómo usar
1. Abre `index.html` en cualquier navegador moderno.
2. Completa el formulario para agregar pacientes programados.
3. Por defecto, la fecha de cita se establece en mañana.
4. Selecciona la fecha que quieres ver en "Ver fecha".
5. En la tabla de pacientes programados, presiona "Marcar llegada" cuando llegue el paciente.
6. La asistencia se ordena por doctor y hora de llegada.
7. Usa el botón "Descargar asistencia PDF" para generar la planilla del día seleccionado.

## Guardado
Los datos se guardan en el almacenamiento local del navegador (`localStorage`), por lo que se conservan entre sesiones en el mismo equipo.

## Backend
Este proyecto ahora incluye un backend de Node.js + Express que sirve los archivos estáticos y expone los protocolos de `protocolos.json` como API.

Para iniciar el servidor:

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Inicia el servidor:
   ```bash
   npm start
   ```

Luego abre `http://localhost:3000` en tu navegador.
