const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, 'registration.json');

const REGISTRATION_PAYLOAD = {
    email: "abhishek.23b0131173@abes.ac.in",
    name: "Abhishek Pathak",
    mobileNo: "7017331435",
    githubUsername: "github", 
    rollNo: "2300320130015",
    accessCode: "cXuqht"
};

let cachedToken = null;

async function ensureRegistration() {
    if (fs.existsSync(CREDENTIALS_PATH)) {
        try {
            return JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
        } catch (e) {
            process.stderr.write('Error reading registration profiles file\n');
        }
    }

    try {
        const response = await axios.post('http://4.224.186.213/evaluation-service/ragister', REGISTRATION_PAYLOAD);
        const registeredData = response.data;
        
        const dataToSave = { ...registeredData, accessCode: REGISTRATION_PAYLOAD.accessCode };
        fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(dataToSave, null, 2), 'utf8');
        return dataToSave;
    } catch (error) {
        process.stderr.write(`Registration endpoint request failed: ${error.message}\n`);
        return null;
    }
}

async function getAuthToken() {
    if (cachedToken) return cachedToken;
    try {
        const credentials = await ensureRegistration();
        if (!credentials || !credentials.clientID || !credentials.clientSecret) {
            process.stderr.write('Registration credentials are missing or corrupted.\n');
            return null;
        }

        const authPayload = {
            email: credentials.email,
            name: credentials.name,
            rollNo: credentials.rollNo,
            accessCode: credentials.accessCode || "cXuqht",
            clientID: credentials.clientID,
            clientSecret: credentials.clientSecret
        };

        const response = await axios.post('http://4.224.186.213/evaluation-service/auth', authPayload);
        cachedToken = response.data.access_token;
        return cachedToken;
    } catch (error) {
        process.stderr.write(`Authentication handshake layer failed: ${error.response ? JSON.stringify(error.response.data) : error.message}\n`);
        return null;
    }
}

async function remoteLog(stack, level, pkg, message) {
    try {
        const token = await getAuthToken();
        if (!token) return;

        const cleanStack = String(stack).toLowerCase().trim();
        const cleanLevel = String(level).toLowerCase().trim();
        const cleanPkg = String(pkg).toLowerCase().trim();
        const cleanMessage = String(message).trim();

        await axios.post('http://4.224.186.213/evaluation-service/logs', {
            stack: cleanStack,
            level: cleanLevel,
            package: cleanPkg,
            message: cleanMessage
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        process.stdout.write(`[REMOTE LOG SUCCESS] [${cleanLevel.toUpperCase()}]: ${cleanMessage}\n`);
    } catch (error) {
        process.stderr.write(`Remote log shipment failed [${level}/${pkg}]: ${error.message}\n`);
    }
}

const logger = {
    info: (pkg, msg) => remoteLog('backend', 'info', pkg, msg),
    warn: (pkg, msg) => remoteLog('backend', 'warn', pkg, msg),
    error: (pkg, msg) => remoteLog('backend', 'error', pkg, msg),
    getAuthToken: getAuthToken
};

module.exports = logger;