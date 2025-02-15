const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

let mainWindow;

async function getSystemStats() {
    try {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const ramUsage = Math.round(((totalMem - freeMem) / totalMem) * 100);

        const cpuUsage = await new Promise((resolve) => {
            exec('wmic cpu get loadpercentage', (error, stdout) => {
                if (error) {
                    resolve('-');
                    return;
                }
                const usage = stdout.split('\n')[1];
                resolve(usage ? usage.trim() : '-');
            });
        });

        const diskSpace = await new Promise((resolve) => {
            exec('wmic logicaldisk where "DeviceID=\'C:\'" get size,freespace', (error, stdout) => {
                if (error) {
                    resolve('-');
                    return;
                }
                const [, values] = stdout.trim().split('\n');
                if (values) {
                    const [free, total] = values.trim().split(/\s+/).map(Number);
                    const used = Math.round(((total - free) / total) * 100);
                    resolve(used);
                } else {
                    resolve('-');
                }
            });
        });

        return {
            ram: `${ramUsage}%`,
            cpu: `${cpuUsage}%`,
            disk: `${diskSpace}%`
        };
    } catch (error) {
        console.error('Error getting system stats:', error);
        return { ram: '-', cpu: '-', disk: '-' };
    }
}

function optimizeRAM() {
    const commands = [
        'powershell.exe -Command "Get-Process | Where-Object {$_.Name -notlike \'*system*\' -and $_.Name -notlike \'*idle*\'} | ForEach-Object { $_.Refresh(); Start-Sleep -Milliseconds 100 }"',
        'powershell.exe -Command "Get-Service | Where-Object {$_.Status -eq \'Running\' -and $_.StartType -eq \'Automatic\' -and $_.Name -notlike \'*power*\' -and $_.Name -notlike \'*windows*\'} | Set-Service -StartupType Manual"',
        'ipconfig /flushdns',
        'powershell.exe -Command "Clear-DnsClientCache; Get-ChildItem -Path C:\\Windows\\Prefetch\\*.* | Remove-Item -Force"',
        'powershell.exe -Command "$processes = Get-Process | Where-Object {$_.PriorityClass -eq \'Normal\' -and $_.Name -notlike \'*system*\' -and $_.Name -notlike \'*idle*\' -and $_.Name -notlike \'*chrome*\' -and $_.Name -notlike \'*firefox*\' -and $_.Name -notlike \'*edge*\'}; foreach ($process in $processes) { if ($process.PM -gt 104857600) { $process.PriorityClass = \'BelowNormal\' }}"',
        'powershell.exe -Command "Get-Process | Where-Object {$_.WorkingSet64 -gt 314572800} | ForEach-Object { $_.Refresh() }"',
        'powershell.exe -Command "Start-Process -FilePath \'C:\\Windows\\System32\\rundll32.exe\' -ArgumentList \'advapi32.dll,ProcessIdleTasks\'"'
    ];

    commands.forEach(cmd => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.log(`Error executing: ${cmd}`);
                console.error(error);
            } else {
                console.log(`Successfully executed: ${cmd}`);
            }
        });
    });

    mainWindow.webContents.send('show-notification', 'RAM optimization completed! System performance should improve.');
}

function cleanDisk() {
    const commands = [
        'cleanmgr /sagerun:1',
        'del /s /f /q %temp%\\*.*',
        'del /s /f /q C:\\Windows\\Temp\\*.*',
        'del /s /f /q C:\\Windows\\Prefetch\\*.*'
    ];

    commands.forEach(cmd => {
        exec(cmd, (error) => {
            if (error) console.log(`Error executing: ${cmd}`);
        });
    });
}

function flushNetwork() {
    const commands = [
        'ipconfig /flushdns',
        'ipconfig /release',
        'ipconfig /renew',
        'netsh winsock reset',
        'netsh int ip reset'
    ];

    commands.forEach(cmd => {
        exec(cmd, (error) => {
            if (error) console.log(`Error executing: ${cmd}`);
        });
    });
}

function optimizeStartup() {
    const commands = [
        'powershell.exe Get-Service | Where-Object {$_.StartType -eq "Automatic" -and $_.Status -eq "Stopped"} | Set-Service -StartType Manual',
        'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /va /f'
    ];

    commands.forEach(cmd => {
        exec(cmd, (error) => {
            if (error) console.log(`Error executing: ${cmd}`);
        });
    });
}

function optimizeServices() {
    const commands = [
        'net stop "SysMain" && sc config "SysMain" start=disabled',
        'net stop "DiagTrack" && sc config "DiagTrack" start=disabled',
        'net stop "WSearch" && sc config "WSearch" start=disabled'
    ];

    commands.forEach(cmd => {
        exec(cmd, (error) => {
            if (error) console.log(`Error executing: ${cmd}`);
        });
    });
}

function togglePowerMode() {
    const commands = [
        'powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c'
    ];

    commands.forEach(cmd => {
        exec(cmd, (error) => {
            if (error) console.log(`Error executing: ${cmd}`);
        });
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        transparent: true,
        backgroundColor: '#00000000',
        roundedCorners: true,
        titleBarStyle: 'hidden'
    });

    mainWindow.loadFile('ui/index.html');

    setInterval(async () => {
        const stats = await getSystemStats();
        mainWindow.webContents.send('stats-update', stats);
    }, 2000);

    ipcMain.on('minimize-window', () => {
        mainWindow.minimize();
    });

    ipcMain.on('close-window', () => {
        mainWindow.close();
    });

    ipcMain.on('optimize-ram', () => {
        optimizeRAM();
    });

    ipcMain.on('clean-disk', () => {
        cleanDisk();
    });

    ipcMain.on('flushNetwork', () => {
        flushNetwork();
    });

    ipcMain.on('optimizeStartup', () => {
        optimizeStartup();
    });

    ipcMain.on('optimizeServices', () => {
        optimizeServices();
    });

    ipcMain.on('togglePowerMode', () => {
        togglePowerMode();
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

