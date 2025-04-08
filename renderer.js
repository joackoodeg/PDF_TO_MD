// Importamos correctamente los módulos
const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

const convertBtn = document.getElementById('convertBtn');
const pdfInput = document.getElementById('pdfInput');
const preview = document.getElementById('preview');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.getElementById('progressContainer');
const saveBtn = document.getElementById('saveBtn');
const openFileBtn = document.getElementById('openFileBtn');

let markdownOutput = "";
let lastSavedPath = "";

// Comunicación con el proceso principal para el diálogo de guardado
async function showSaveDialog() {
  return ipcRenderer.invoke('show-save-dialog');
}

// Comunicación con el proceso principal para abrir archivo
async function openFile(filePath) {
  return ipcRenderer.invoke('open-file', filePath);
}

// Muestra el nombre del archivo seleccionado
pdfInput.addEventListener('change', () => {
  const file = pdfInput.files[0];
  if (file) {
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileInfo').style.display = 'block';
  }
});

convertBtn.addEventListener('click', () => {
  const file = pdfInput.files[0];
  if (!file) return showMessage("Selecciona un archivo PDF primero", "error");

  const filePath = file.path;
  
  // Mostrar barra de progreso
  progressContainer.style.display = 'block';
  progressBar.style.width = '0%';
  preview.textContent = "Convirtiendo...";
  convertBtn.disabled = true;
  saveBtn.disabled = true;
  openFileBtn.disabled = true;
  
  // Simulamos actualización de progreso
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += 5;
    if (progress <= 90) {
      progressBar.style.width = progress + '%';
    }
  }, 200);

  // Ejecutamos el script Python con codificación UTF-8
  ipcRenderer.invoke('run-python-script-utf8', { 
    filePath: filePath 
  }).then(result => {
    clearInterval(progressInterval);
    progressBar.style.width = '100%';
    convertBtn.disabled = false;
    
    if (result.error) {
      showMessage("Error en la conversión: " + result.stderr, "error");
      preview.textContent = "Error en la conversión: " + result.stderr;
      console.error(result.stderr);
      return;
    }

    // Guardar la salida para uso posterior
    markdownOutput = result.stdout;
    
    // Mostrar vista previa
    preview.textContent = markdownOutput;
    
    // Habilitar botones
    saveBtn.disabled = false;
    
    showMessage("Conversión completada con éxito", "success");
  }).catch(err => {
    clearInterval(progressInterval);
    convertBtn.disabled = false;
    showMessage("Error: " + err.message, "error");
    console.error(err);
  });
});

saveBtn.addEventListener('click', async () => {
  if (!markdownOutput) return showMessage("No hay contenido para guardar", "error");

  try {
    const filePath = await showSaveDialog();
    if (filePath) {
      // Enviamos el contenido al proceso principal para guardarlo
      const result = await ipcRenderer.invoke('save-file', {
        filePath,
        content: markdownOutput
      });
      
      if (result.success) {
        lastSavedPath = filePath;
        openFileBtn.disabled = false;
        showMessage("Archivo guardado correctamente", "success");
      } else {
        showMessage("Error al guardar: " + result.error, "error");
      }
    }
  } catch (err) {
    showMessage("Error al guardar el archivo: " + err.message, "error");
    console.error(err);
  }
});

openFileBtn.addEventListener('click', () => {
  if (lastSavedPath) {
    openFile(lastSavedPath);
  }
});

// Recibir mensaje cuando se selecciona un archivo desde el menú
ipcRenderer.on('file-opened', (event, filePath) => {
  // Simulamos la selección del archivo en el input
  const dataTransfer = new DataTransfer();
  const file = new File([''], filePath, { type: 'application/pdf' });
  dataTransfer.items.add(file);
  pdfInput.files = dataTransfer.files;
  
  // Disparar el evento change manualmente
  const changeEvent = new Event('change');
  pdfInput.dispatchEvent(changeEvent);
});

function showMessage(message, type) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast ' + type;
  toast.style.display = 'block';
  
  // Ocultar después de 3 segundos
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

// Comunicación con el proceso principal
ipcRenderer.on('app-ready', () => {
  console.log('Aplicación lista');
});