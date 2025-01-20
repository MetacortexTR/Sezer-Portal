const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Tüm rolleri getir
router.get('/', async (req, res) => {
    try {
        console.log('GET /api/roles isteği alındı');
        const [rows] = await pool.query('SELECT * FROM roles');
        console.log('Roller başarıyla getirildi:', rows);
        res.json(rows);
    } catch (error) {
        console.error('Roller getirilirken hata:', error);
        res.status(500).json({ error: 'Roller alınırken bir hata oluştu' });
    }
});

// Role güncelle
router.put('/:id', async (req, res) => {
    try {
        const { role_name } = req.body;
        await db.query('UPDATE contact_roles SET role_name = ? WHERE id = ?', 
            [role_name, req.params.id]);
        res.json({ message: 'Role başarıyla güncellendi' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 