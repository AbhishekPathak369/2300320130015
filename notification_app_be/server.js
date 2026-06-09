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
    const safeTimestamp = timestampStr ? timestampStr.replace(' ', 'T') : new Date().toISOString();
    const recency = new Date(safeTimestamp).getTime();
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
        logger.error('handler', `Failed fetching raw data: ${error.message}`);
        res.status(500).json({ success: false, error: 'Internal gateway error.' });
    }
});

app.get('/api/priority-notifications', async (req, res) => {
    logger.info('route', 'Received request for prioritized notification stream');
    try {
        const limit = parseInt(req.query.limit) || 10;
        const headers = await getAuthHeader();
        const response = await axios.get(EXTERNAL_API, { headers });
        const rawNotifications = response.data.notifications || [];

        const priorityData = getTopNotifications(rawNotifications, limit);
        
        logger.info('service', `Successfully parsed priority records count: ${priorityData.length}`);
        res.status(200).json({ success: true, data: priorityData });
    } catch (error) {
        logger.error('handler', `Failed fetching priority stream data: ${error.message}`);
        res.status(500).json({ success: false, error: 'Internal gateway error context.' });
    }
});

app.listen(PORT, () => {
    logger.info('config', `Backend engine servicing on port ${PORT}`);
});