const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;

function getDataPath() {
  const isPackaged = app.isPackaged;
  const dir = isPackaged ? path.dirname(process.execPath) : __dirname;
  return path.join(dir, 'pomodoro-data.json');
}

function loadData() {
  try {
    const dataPath = getDataPath();
    if (fs.existsSync(dataPath)) {
      return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    }
  } catch {}
  return { today: '', completedPomodoros: 0, totalMinutes: 0, history: [] };
}

function saveData(data) {
  try {
    fs.writeFileSync(getDataPath(), JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save data:', err);
  }
}

function createTrayIcon() {
  const size = 16;
  const canvas = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="7" fill="#e74c3c"/>
    <circle cx="8" cy="8" r="5" fill="#1a1a2e"/>
    <line x1="8" y1="4" x2="8" y2="8" stroke="#e74c3c" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="8" y1="8" x2="11" y2="10" stroke="#e74c3c" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
  return nativeImage.createFromBuffer(
    Buffer.from(canvas),
    { width: size, height: size }
  );
}

function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  const hasIcon = fs.existsSync(iconPath);

  const data = loadData();
  const bounds = data.windowBounds || { width: 450, height: 650 };

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    minWidth: 400,
    minHeight: 550,
    frame: false,
    resizable: true,
    transparent: false,
    backgroundColor: '#1a1a2e',
    icon: hasIcon ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  let resizeTimer = null;
  mainWindow.on('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const { width, height } = mainWindow.getBounds();
      const d = loadData();
      d.windowBounds = { width, height };
      saveData(d);
    }, 500);
  });

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const trayIconPath = path.join(__dirname, 'assets', 'icon.png');
  const trayIcon = fs.existsSync(trayIconPath)
    ? nativeImage.createFromPath(trayIconPath)
    : createTrayIcon();
  tray = new Tray(trayIcon);
  const contextMenu = Menu.buildFromTemplate([
    { label: '显示窗口', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: '退出', click: () => {
      app.isQuitting = true;
      app.quit();
    }},
  ]);
  tray.setToolTip('番茄钟');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => mainWindow.show());
}

ipcMain.handle('data:load', () => loadData());
ipcMain.handle('data:save', (_, data) => saveData(data));

ipcMain.handle('data:backup', () => {
  try {
    const src = getDataPath();
    const dst = src + '.bak';
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
    }
  } catch (err) {
    console.error('Failed to backup data:', err);
  }
});

ipcMain.handle('notification:send', (_, { title, body }) => {
  new Notification({ title, body }).show();
});

ipcMain.on('window:minimize', () => mainWindow.minimize());

ipcMain.on('window:close', () => {
  app.isQuitting = true;
  app.quit();
});

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});
