const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    closeWindow: () => ipcRenderer.send('close-window'),
    optimizeRAM: () => ipcRenderer.send('optimize-ram'),
    cleanDisk: () => ipcRenderer.send('clean-disk'),
    flushNetwork: () => ipcRenderer.send('flushNetwork'),
    optimizeStartup: () => ipcRenderer.send('optimizeStartup'),
    optimizeServices: () => ipcRenderer.send('optimizeServices'),
    togglePowerMode: () => ipcRenderer.send('togglePowerMode'),
    onStatsUpdate: (callback) => ipcRenderer.on('stats-update', callback),
    onNotification: (callback) => ipcRenderer.on('show-notification', callback)
}); 