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

const keyFlagPath = path.join(__dirname, 'marcykey.flag');
const screenFlagPath = path.join(__dirname, 'marcyScreen.flag');

// Initialize instances using the factory functions
const keyMonitor = MarcyKey();
const screenMonitor = MarcyScreen();

let keyActive = false;
let screenActive = false;

function checkFlags() {
    const keyFlag = fs.existsSync(keyFlagPath);
    const screenFlag = fs.existsSync(screenFlagPath);

    if (keyFlag && !keyActive) {
        keyMonitor.start();
        keyActive = true;
    } else if (!keyFlag && keyActive) {
        keyMonitor.stop();
        keyActive = false;
    }

    if (screenFlag && !screenActive) {
        screenMonitor.start();
        screenActive = true;
    } else if (!screenFlag && screenActive) {
        screenMonitor.stop();
        screenActive = false;
    }
}

// Poll every second
const flagInterval = setInterval(checkFlags, 1000);

// Handle process termination
process.on('SIGINT', () => {
    if (keyActive) keyMonitor.stop();
    if (screenActive) screenMonitor.stop();
    clearInterval(flagInterval);
    process.exit();
}); 