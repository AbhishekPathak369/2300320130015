import React, { useState, useEffect } from 'react';
import { 
  Container, AppBar, Toolbar, Typography, Tabs, Tab, Box, 
  Card, CardContent, Chip, Select, MenuItem, FormControl, InputLabel, CircularProgress, Alert
} from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EventIcon from '@mui/icons-material/Event';
import WorkIcon from '@mui/icons-material/Work';
import axios from 'axios';

export default function App() {
  const [currentTab, setCurrentTab] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [priorityLimit, setPriorityLimit] = useState(10);
  const [filterType, setFilterType] = useState('All');
  const [readIds, setReadIds] = useState(() => JSON.parse(localStorage.getItem('viewed_notifications') || '[]'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    localStorage.setItem('viewed_notifications', JSON.stringify(readIds));
  }, [readIds]);

  useEffect(() => {
    fetchData();
  }, [currentTab, priorityLimit, filterType]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (currentTab === 0) {
        const typeParam = filterType !== 'All' ? `&notification_type=${filterType}` : '';
        const res = await axios.get(`http://localhost:5000/api/all-notifications?limit=50${typeParam}`);
        setNotifications(res.data.data || []);
      } else {
        // Request a full batch to ensure filters don't shrink the list view incorrectly
        const res = await axios.get(`http://localhost:5000/api/priority-notifications?limit=100`);
        setNotifications(res.data.data || []);
      }
    } catch (err) {
      setError('Communication layer error. Ensure your backend microservice is running.');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = (id) => {
    if (!readIds.includes(id)) {
      setReadIds([...readIds, id]);
    }
  };

  const getIcon = (type) => {
    if (type === 'Placement') return <WorkIcon color="primary" />;
    if (type === 'Result') return <AssignmentIcon color="success" />;
    return <EventIcon color="warning" />;
  };

  // Run filtering first
  const filteredNotifications = notifications.filter(n => filterType === 'All' || n.Type === filterType);
  
  // Apply visual slice limits to the filtered set if looking at Priority View
  const finalDisplayData = currentTab === 1 ? filteredNotifications.slice(0, priorityLimit) : filteredNotifications;

  return (
    <Container maxWidth="md" style={{ marginTop: '24px', marginBottom: '40px' }}>
      <AppBar position="static" color="default" elevation={2} sx={{ borderRadius: 2, mb: 4 }}>
        <Toolbar>
          <NotificationsActiveIcon sx={{ mr: 2, color: '#1976d2' }} />
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
            Campus Notifications Dashboard
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={(e, val) => { setCurrentTab(val); setFilterType('All'); }} centered variant="fullWidth">
          <Tab label="All Notifications" />
          <Tab label="Priority Inbox Dashboard" />
        </Tabs>
      </Box>

      <Box display="flex" gap={2} mb={3} justifyContent="flex-end" alignItems="center">
        {currentTab === 1 && (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Priority Limit (n)</InputLabel>
            <Select value={priorityLimit} label="Priority Limit (n)" onChange={(e) => setPriorityLimit(e.target.value)}>
              <MenuItem value={10}>Top 10</MenuItem>
              <MenuItem value={15}>Top 15</MenuItem>
              <MenuItem value={20}>Top 20</MenuItem>
            </Select>
          </FormControl>
        )}

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Filter Category</InputLabel>
          <Select value={filterType} label="Filter Category" onChange={(e) => setFilterType(e.target.value)}>
            <MenuItem value="All">All Types</MenuItem>
            <MenuItem value="Placement">Placements</MenuItem>
            <MenuItem value="Result">Results</MenuItem>
            <MenuItem value="Event">Events</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" my={5}><CircularProgress /></Box>
      ) : (
        <Box display="flex" flexDirection="column" gap={2}>
          {finalDisplayData.length === 0 ? (
            <Typography variant="body1" align="center" color="textSecondary" my={4}>
              No notifications match your current selection filter.
            </Typography>
          ) : (
            finalDisplayData.map((item) => {
              const isRead = readIds.includes(item.ID);
              return (
                <Card 
                  key={item.ID} 
                  variant="outlined" 
                  onClick={() => markAsRead(item.ID)}
                  sx={{ 
                    cursor: 'pointer',
                    transition: '0.2s', 
                    borderLeft: isRead ? '4px solid #b0bec5' : '4px solid #1976d2',
                    backgroundColor: isRead ? '#f5f5f5' : '#ffffff',
                    '&:hover': { boxShadow: 3 }
                  }}
                >
                  <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', '&:last-child': { pb: 2 } }}>
                    <Box display="flex" alignItems="center" gap={2}>
                      {getIcon(item.Type)}
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: isRead ? 'normal' : 'bold' }}>
                          {item.Message}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {item.Timestamp}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Chip 
                      label={isRead ? "Viewed" : "New Updates"} 
                      color={isRead ? "default" : "primary"} 
                      size="small" 
                    />
                  </CardContent>
                </Card>
              );
            })
          )}
        </Box>
      )}
    </Container>
  );
}