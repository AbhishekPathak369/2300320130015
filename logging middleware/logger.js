const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, 'app.log');

function customLog(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = JSON.stringify({ timestamp, level, message, ...context }) + '\n';
    
    fs.appendFile(logFilePath, logEntry, (err) => {
        if (err) process.stderr.write('Failed to write to log file\n');
    });

    process.stdout.write(`[${timestamp}] [${level.toUpperCase()}]: ${message} ${Object.keys(context).length ? JSON.stringify(context) : ''}\n`);
}

const logger = {
    info: (msg, ctx) => customLog('info', msg, ctx),
    warn: (msg, ctx) => customLog('warn', msg, ctx),
    error: (msg, ctx) => customLog('error', msg, ctx)
};

module.exports = logger;