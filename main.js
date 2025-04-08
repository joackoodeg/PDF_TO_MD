const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Establece el entorno de desarrollo o producción
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

let mainWindow;

function createWindow() {
  // Crea la ventana del navegador
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  // Carga el archivo HTML principal
  mainWindow.loadFile('index.html');

  // Crea el menú de la aplicación
  createMenu();

  // Emitido cuando la ventana es cerrada
  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  // Notificar al renderer que la app está lista
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('app-ready');
  });
}

function createMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Abrir PDF',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const { filePaths } = await dialog.showOpenDialog({
              properties: ['openFile'],
              filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
            });
            if (filePaths && filePaths.length > 0) {
              mainWindow.webContents.send('file-opened', filePaths[0]);
            }
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Acerca de',
          click: () => showAboutDialog()
        },
        {
          label: 'Documentación',
          click: async () => {
            await shell.openExternal('https://github.com/joackoodeg/pdf-to-md-app');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function showAboutDialog() {
  dialog.showMessageBox(mainWindow, {
    title: 'Acerca de PDF a Markdown',
    message: 'PDF a Markdown',
    detail: 'Versión 1.0.0\nUna aplicación para convertir archivos PDF a formato Markdown.\n\nDesarrollado con Electron y PyMuPDF.',
    buttons: ['Cerrar'],
    icon: path.join(__dirname, 'assets', 'icon.png')
  });
}

// Manejo de comunicación IPC
ipcMain.handle('show-save-dialog', async () => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Guardar archivo Markdown',
    defaultPath: path.join(app.getPath('documents'), 'output.md'),
    filters: [{ name: 'Markdown Files', extensions: ['md'] }]
  });
  
  return filePath;
});

ipcMain.handle('save-file', async (event, { filePath, content }) => {
  try {
    // Guardar con codificación UTF-8
    fs.writeFileSync(filePath, content, { encoding: 'utf8' });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-file', async (event, filePath) => {
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Nuevo método para ejecutar Python con soporte UTF-8
ipcMain.handle('run-python-script-utf8', async (event, { filePath }) => {
  return new Promise((resolve, reject) => {
    // Determinar las rutas correctas
    let pythonExecutable = 'python';
    let scriptPath = 'converter.py';
    
    // Si estamos en producción, usar el Python empaquetado
    if (process.env.NODE_ENV !== 'development') {
      pythonExecutable = path.join(process.resourcesPath, 'python', 'python.exe');
      scriptPath = path.join(process.resourcesPath, 'converter.py');
    }
    
    // Usar spawn en lugar de execFile para mejor control de codificación
    const pythonProcess = spawn(pythonExecutable, [scriptPath, filePath], {
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });
    
    let stdout = '';
    let stderr = '';
    
    // Recolectar salida estándar
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString('utf8');
    });
    
    // Recolectar errores
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString('utf8');
    });
    
    // Manejar finalización
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        resolve({ error: true, stderr });
      }
    });
    
    // Manejar errores
    pythonProcess.on('error', (err) => {
      reject(err);
    });
  });
});

// Mantenemos el método antiguo por compatibilidad
ipcMain.handle('run-python-script', (event, { script, args }) => {
  return ipcMain.handle('run-python-script-utf8', event, { 
    filePath: args[0] 
  });
});

// Este método será llamado cuando Electron haya terminado
// la inicialización y esté listo para crear ventanas del navegador.
app.whenReady().then(() => {
  createWindow();

  // Verifica que exista la carpeta de assets y si no, la crea
  const assetsDir = path.join(__dirname, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir);
  }

  app.on('activate', function () {
    // En macOS es común volver a crear una ventana en la aplicación cuando el
    // icono del dock es clicado y no hay otras ventanas abiertas.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Salir cuando todas las ventanas estén cerradas, excepto en macOS.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
