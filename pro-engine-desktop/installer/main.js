const { app, BrowserWindow, dialog, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class ProEngineInstaller {
    constructor() {
        this.servicePath = path.join(__dirname, '..', 'service');
        this.serviceExecutable = path.join(this.servicePath, 'server.js');
    }
    
    async createWindow() {
        const mainWindow = new BrowserWindow({
            width: 500,
            height: 400,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            },
            resizable: false,
            maximizable: false,
            show: false
        });
        
        // Create simple installer UI
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Pro Engine Installer</title>
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        padding: 40px; 
                        background: #1a1a1a; 
                        color: white; 
                        text-align: center;
                    }
                    .logo { font-size: 24px; margin-bottom: 20px; }
                    .status { margin: 20px 0; }
                    .btn { 
                        background: #007bff; 
                        color: white; 
                        border: none; 
                        padding: 12px 24px; 
                        border-radius: 6px; 
                        cursor: pointer;
                        font-size: 16px;
                    }
                    .btn:hover { background: #0056b3; }
                    .btn:disabled { background: #666; cursor: not-allowed; }
                    .progress { 
                        width: 100%; 
                        height: 6px; 
                        background: #333; 
                        border-radius: 3px; 
                        margin: 20px 0;
                    }
                    .progress-bar { 
                        height: 100%; 
                        background: #007bff; 
                        border-radius: 3px; 
                        width: 0%;
                        transition: width 0.3s;
                    }
                </style>
            </head>
            <body>
                <div class="logo">Pro Engine Installer</div>
                <div id="status" class="status">Ready to install Pro Engine desktop service</div>
                <div class="progress"><div id="progress-bar" class="progress-bar"></div></div>
                <button id="install-btn" class="btn" onclick="install()">Install Pro Engine</button>
                
                <script>
                    const { ipcRenderer } = require('electron');
                    
                    function install() {
                        document.getElementById('install-btn').disabled = true;
                        document.getElementById('status').textContent = 'Installing...';
                        ipcRenderer.send('start-install');
                    }
                    
                    ipcRenderer.on('install-progress', (event, { progress, message }) => {
                        document.getElementById('progress-bar').style.width = progress + '%';
                        document.getElementById('status').textContent = message;
                    });
                    
                    ipcRenderer.on('install-complete', (event, success) => {
                        if (success) {
                            document.getElementById('status').textContent = 'Installation complete!';
                            document.getElementById('install-btn').textContent = 'Close';
                            document.getElementById('install-btn').disabled = false;
                            document.getElementById('install-btn').onclick = () => ipcRenderer.send('close-installer');
                        } else {
                            document.getElementById('status').textContent = 'Installation failed. Please try again.';
                            document.getElementById('install-btn').disabled = false;
                        }
                    });
                </script>
            </body>
            </html>
        `;
        
        mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
        mainWindow.show();
        
        return mainWindow;
    }
    
    async installService(window) {
        try {
            // Step 1: Check Node.js
            window.webContents.send('install-progress', { progress: 10, message: 'Checking Node.js...' });
            await this.ensureNodeJs();
            
            // Step 2: Install dependencies
            window.webContents.send('install-progress', { progress: 30, message: 'Installing dependencies...' });
            await this.installDependencies();
            
            // Step 3: Test service
            window.webContents.send('install-progress', { progress: 60, message: 'Testing service...' });
            await this.testService();
            
            // Step 4: Create startup entry
            window.webContents.send('install-progress', { progress: 80, message: 'Configuring startup...' });
            await this.configureStartup();
            
            // Step 5: Start service
            window.webContents.send('install-progress', { progress: 90, message: 'Starting service...' });
            await this.startService();
            
            window.webContents.send('install-progress', { progress: 100, message: 'Installation complete!' });
            window.webContents.send('install-complete', true);
            
        } catch (error) {
            console.error('Installation failed:', error);
            window.webContents.send('install-complete', false);
        }
    }
    
    async ensureNodeJs() {
        return new Promise((resolve, reject) => {
            const child = spawn('node', ['--version'], { stdio: 'pipe' });
            child.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error('Node.js not found. Please install Node.js first.'));
                }
            });
            child.on('error', () => {
                reject(new Error('Node.js not found. Please install Node.js first.'));
            });
        });
    }
    
    async installDependencies() {
        return new Promise((resolve, reject) => {
            const child = spawn('npm', ['install'], { 
                cwd: this.servicePath,
                stdio: 'pipe'
            });
            
            child.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error('Failed to install dependencies'));
                }
            });
            
            child.on('error', (error) => {
                reject(new Error(`Failed to install dependencies: ${error.message}`));
            });
        });
    }
    
    async testService() {
        return new Promise((resolve, reject) => {
            const child = spawn('node', [this.serviceExecutable], {
                cwd: this.servicePath,
                stdio: 'pipe'
            });
            
            // Give service time to start
            setTimeout(() => {
                child.kill();
                resolve();
            }, 3000);
            
            child.on('error', (error) => {
                reject(new Error(`Service test failed: ${error.message}`));
            });
        });
    }
    
    async configureStartup() {
        // Create a simple batch file for Windows startup
        if (process.platform === 'win32') {
            const startupPath = path.join(
                process.env.APPDATA,
                'Microsoft',
                'Windows',
                'Start Menu',
                'Programs',
                'Startup',
                'ProEngine.bat'
            );
            
            const batchContent = `@echo off
cd /d "${this.servicePath}"
node server.js`;
            
            fs.writeFileSync(startupPath, batchContent);
        }
        
        // For macOS and Linux, create appropriate startup scripts
        // (Implementation would vary by platform)
    }
    
    async startService() {
        return new Promise((resolve) => {
            const child = spawn('node', [this.serviceExecutable], {
                cwd: this.servicePath,
                detached: true,
                stdio: 'ignore'
            });
            
            child.unref();
            
            // Give service time to start
            setTimeout(resolve, 2000);
        });
    }
}

app.whenReady().then(async () => {
    const installer = new ProEngineInstaller();
    const window = await installer.createWindow();
    
    const { ipcMain } = require('electron');
    
    ipcMain.on('start-install', () => {
        installer.installService(window);
    });
    
    ipcMain.on('close-installer', () => {
        app.quit();
    });
});

app.on('window-all-closed', () => {
    app.quit();
}); 