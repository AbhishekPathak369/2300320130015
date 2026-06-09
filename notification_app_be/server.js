const express = require('express');
const axios = require('axios');
const cors = require('cors');
const logger = require('../logging middleware/logger');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;
const EXTERNAL_API = 'http://4.224.186.213/evaluation-service/notifications';

async function getAuthHeader() {
    try {
        const token = await logger.getAuthToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    } catch (error) {
        logger.error('auth', 'Failed to acquire authorization token');
        return {};
    }
}

const TYPE_WEIGHTS = {
    'Placement': 3,
    'Result': 2,
    'Event': 1
};

function calculateScore(type, timestampStr) {
    const weight = TYPE_WEIGHTS[type] || 0;
    
    // Robust date parsing sanity fallback check
    let recency = Date.now();
    if (timestampStr) {
        const safeTimestamp = timestampStr.replace(' ', 'T');
        const parsedTime = new Date(safeTimestamp).getTime();
        if (!isNaN(parsedTime)) {
            recency = parsedTime;
        }
    }
    
    return (weight * 10000000000000) + recency;
}

function getTopNotifications(notifications, limit = 10) {
    return notifications
        .map(n => ({ ...n, score: calculateScore(n.Type, n.Timestamp) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

app.get('/api/all-notifications', async (req, res) => {
    logger.info('route', 'Received request for all raw notifications');
    try {
        const { limit, notification_type } = req.query;
        let targetUrl = EXTERNAL_API;
        const urlParams = [];
        
        if (limit) urlParams.push(`limit=${limit}`);
        if (notification_type) urlParams.push(`notification_type=${notification_type}`);
        if (urlParams.length > 0) targetUrl += `?${urlParams.join('&')}`;

        const headers = await getAuthHeader();
        const response = await axios.get(targetUrl, { headers });
        const rawNotifications = response.data.notifications || [];
        
        logger.info('service', `Successfully fetched raw notifications count: ${rawNotifications.length}`);
        res.status(200).json({ success: true, data: rawNotifications });
    } catch (error) {
        logger.error('handler', 'failed fetching raw data stream from remote server');
        res.status(500).json({ success: false, error: 'Internal gateway error.' });
    }
});

app.get('/api/priority-notifications', async (req, res) => {
    logger.info('route', 'Received request for prioritized notification stream');
    try {
        // Fetch a high count from the source to avoid losing items during UI filtering loops
        const limit = parseInt(req.query.limit) || 50; 
        const headers = await getAuthHeader();
        const response = await axios.get(EXTERNAL_API, { headers });
        const rawNotifications = response.data.notifications || [];

        const priorityData = getTopNotifications(rawNotifications, limit);
        
        logger.info('service', `Successfully parsed priority records count: ${priorityData.length}`);
        res.status(200).json({ success: true, data: priorityData });
    } catch (error) {
        logger.error('handler', 'failed fetching priority stream metrics data');
        res.status(500).json({ success: false, error: 'Internal gateway error context.' });
    }
});

app.listen(PORT, () => {
    logger.info('config', `Backend engine servicing on port ${PORT}`);
});