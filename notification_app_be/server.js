const express = require('express');
const axios = require('axios');
const cors = require('cors');
const logger = require('../logging middleware/logger');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;
const EXTERNAL_API = 'http://4.224.186.213/evaluation-service/notifications';

const TYPE_WEIGHTS = {
    'Placement': 3,
    'Result': 2,
    'Event': 1
};

function calculateScore(type, timestampStr) {
    const weight = TYPE_WEIGHTS[type] || 0;
    const recency = new Date(timestampStr).getTime();
    return (weight * 10000000000000) + recency;
}

function getTopNotifications(notifications, limit = 10) {
    return notifications
        .map(n => ({ ...n, score: calculateScore(n.Type, n.Timestamp) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

app.get('/api/priority-notifications', async (req, res) => {
    logger.info('Received request for prioritized notification stream');
    try {
        const limit = parseInt(req.query.limit) || 10;
        const response = await axios.get(EXTERNAL_API);
        const rawNotifications = response.data.notifications || [];

        const priorityData = getTopNotifications(rawNotifications, limit);
        
        logger.info('Successfully parsed prioritized elements', { count: priorityData.length });
        res.status(200).json({ success: true, data: priorityData });
    } catch (error) {
        logger.error('Failed fetching data from protected evaluation service route', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal gateway error context.' });
    }
});

app.listen(PORT, () => {
    logger.info(`Backend engine servicing on port ${PORT}`);
});