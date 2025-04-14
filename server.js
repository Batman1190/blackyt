const express = require('express');
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
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});
