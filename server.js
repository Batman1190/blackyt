const express = require('express');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const app = express();

// Security middleware with CORS configuration
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// CORS and security headers
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Environment variables
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Total visitors log file
const totalVisitorsFile = path.join(logsDir, 'total_visitors.json');
if (!fs.existsSync(totalVisitorsFile)) {
    fs.writeFileSync(totalVisitorsFile, JSON.stringify({ totalVisits: 0, firstVisit: new Date().toISOString() }));
}

// Visitor log file path - create a new log file for each day
function getTodayLogFile() {
    const date = new Date().toISOString().split('T')[0];
    return path.join(logsDir, `visitors_${date}.log`);
}

// Get total visitor count
function getTotalVisitors() {
    try {
        const data = JSON.parse(fs.readFileSync(totalVisitorsFile, 'utf8'));
        return data;
    } catch (error) {
        return { totalVisits: 0, firstVisit: new Date().toISOString() };
    }
}

// Update total visitor count
function updateTotalVisitors() {
    const data = getTotalVisitors();
    data.totalVisits += 1;
    fs.writeFileSync(totalVisitorsFile, JSON.stringify(data));
    return data;
}

// Format log entry with domain info
function formatLogEntry(req) {
    const timestamp = new Date().toISOString();
    const ip = req.headers['x-forwarded-for'] || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const host = req.headers.host || 'unknown';
    const path = req.path;
    const referer = req.headers.referer || 'direct';
    
    // Console output for real-time monitoring
    console.log('\n=== New Visit ===');
    console.log(`Time: ${new Date(timestamp).toLocaleString()}`);
    console.log(`Domain: ${host}`);
    console.log(`IP: ${ip}`);
    console.log(`Path: ${path}`);
    console.log(`Referer: ${referer}`);
    console.log('===============\n');
    
    return `[${timestamp}] Domain: ${host} | IP: ${ip} | Path: ${path} | Referer: ${referer} | Agent: ${userAgent}\n`;
}

// Calculate daily stats
function getDailyStats() {
    const stats = {};
    fs.readdirSync(logsDir).forEach(file => {
        if (file.startsWith('visitors_')) {
            const date = file.replace('visitors_', '').replace('.log', '');
            const content = fs.readFileSync(path.join(logsDir, file), 'utf8');
            const visits = content.split('\n').filter(Boolean).length;
            stats[date] = visits;
        }
    });
    return stats;
}

// Calculate domain-specific stats
function getDomainStats() {
    const stats = {
        domains: {},
        total: 0
    };
    
    fs.readdirSync(logsDir).forEach(file => {
        if (file.startsWith('visitors_')) {
            const content = fs.readFileSync(path.join(logsDir, file), 'utf8');
            content.split('\n').filter(Boolean).forEach(line => {
                const domainMatch = line.match(/Domain: ([^\s|]+)/);
                if (domainMatch) {
                    const domain = domainMatch[1];
                    stats.domains[domain] = (stats.domains[domain] || 0) + 1;
                    stats.total++;
                }
            });
        }
    });
    return stats;
}

// Middleware to log visitors
app.use((req, res, next) => {
    // Only log actual page visits, not asset requests
    if (req.path === '/' || req.path === '/index.html') {
        const logFile = getTodayLogFile();
        const logEntry = formatLogEntry(req);
        
        // Update daily log
        fs.appendFile(logFile, logEntry, (err) => {
            if (err) {
                console.error('Error logging visitor:', err);
            } else {
                // Update total visitors
                const totalStats = updateTotalVisitors();
                const dailyStats = getDailyStats();
                const domainStats = getDomainStats();
                const today = new Date().toISOString().split('T')[0];
                
                console.log('\nCurrent Statistics:');
                console.log(`Total visits since ${new Date(totalStats.firstVisit).toLocaleDateString()}: ${totalStats.totalVisits}`);
                console.log(`Today's visits (${today}): ${dailyStats[today] || 0}`);
                console.log('\nDomain Statistics:');
                Object.entries(domainStats.domains).forEach(([domain, count]) => {
                    console.log(`${domain}: ${count} visits`);
                });
                console.log('===============\n');
            }
        });
    }
    next();
});

// API endpoint to get visitor stats
app.get('/api/visitor-stats', (req, res) => {
    try {
        const totalStats = getTotalVisitors();
        const dailyStats = getDailyStats();
        const today = new Date().toISOString().split('T')[0];

        res.json({
            totalVisits: totalStats.totalVisits,
            firstVisit: totalStats.firstVisit,
            dailyStats: dailyStats,
            todayVisits: dailyStats[today] || 0
        });
    } catch (error) {
        console.error('Error fetching visitor stats:', error);
        res.status(500).json({ error: 'Error fetching visitor stats' });
    }
});

// Serve static files with proper MIME types and caching
app.use(express.static(__dirname, {
    maxAge: NODE_ENV === 'production' ? '1d' : 0,
    etag: true,
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server with error handling
app.listen(PORT, '0.0.0.0', () => {
    const localIp = Object.values(require('os').networkInterfaces())
        .flat()
        .find(({family, internal}) => family === 'IPv4' && !internal)?.address || 'localhost';
    console.log(`Server is running in ${NODE_ENV} mode`);
    console.log(`Local: http://localhost:${PORT}`);
    console.log(`Network: http://${localIp}:${PORT}`);
    console.log('Press Ctrl+C to stop the server');
    console.log(`Logs will be saved in: ${logsDir}`);
    
    // Log initial stats
    const totalStats = getTotalVisitors();
    const dailyStats = getDailyStats();
    const today = new Date().toISOString().split('T')[0];
    
    console.log('\nCurrent Statistics:');
    console.log(`- Total visits since ${new Date(totalStats.firstVisit).toLocaleDateString()}: ${totalStats.totalVisits}`);
    console.log(`- Today's visits (${today}): ${dailyStats[today] || 0}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});
