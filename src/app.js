const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const contactsRouter = require('./routes/contacts');
const rolesRouter = require('./routes/roles');
const startupsRouter = require('./routes/startups');
const startupFoundersRouter = require('./routes/startup-founders');
const mentorsRouter = require('./routes/mentors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Statik dosyaları servis et
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/contacts', contactsRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/startups', startupsRouter);
app.use('/api/startup-founders', startupFoundersRouter);
app.use('/api/mentors', mentorsRouter);

// HTML Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/startups', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/startups.html'));
});

app.get('/startup-founders', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/startup-founders.html'));
});

app.get('/mentors', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/mentors.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Bir şeyler ters gitti!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server ${PORT} portunda çalışıyor`);
}); 