const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Tüm startup'ları getir
router.get('/', async (req, res) => {
    try {
        const [startups] = await db.query(`
            SELECT s.*, 
                   GROUP_CONCAT(DISTINCT c.name) as founder_names,
                   GROUP_CONCAT(DISTINCT c.id) as founder_ids,
                   GROUP_CONCAT(DISTINCT sf.title ORDER BY c.id) as founder_titles
            FROM startups s
            LEFT JOIN startup_founders sf ON s.id = sf.startup_id
            LEFT JOIN contacts c ON sf.contact_id = c.id
            GROUP BY s.id, s.name, s.website_url, s.linkedin_url, s.logo_url, s.use_case, s.created_at
        `);

        // Her startup için kurucu detaylarını al
        const startupsWithFounders = await Promise.all(startups.map(async (startup) => {
            const [founders] = await db.query(`
                SELECT c.id, c.name, sf.title
                FROM startup_founders sf
                JOIN contacts c ON sf.contact_id = c.id
                WHERE sf.startup_id = ?
            `, [startup.id]);
            
            return { ...startup, founders };
        }));

        res.json(startupsWithFounders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Tekil startup'ı getir
router.get('/:id', async (req, res) => {
    try {
        const [startups] = await db.query(`
            SELECT s.*
            FROM startups s
            WHERE s.id = ?
        `, [req.params.id]);

        if (startups.length === 0) {
            return res.status(404).json({ error: 'Startup bulunamadı' });
        }

        // Kurucu detaylarını al
        const [founders] = await db.query(`
            SELECT c.id, c.name, sf.title
            FROM startup_founders sf
            JOIN contacts c ON sf.contact_id = c.id
            WHERE sf.startup_id = ?
            ORDER BY c.name
        `, [req.params.id]);

        startups[0].founders = founders;
        res.json(startups[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Yeni startup ekle
router.post('/', async (req, res) => {
    try {
        const { name, website_url, linkedin_url, logo_url, use_case, founders } = req.body;
        
        // Startup'ı ekle
        const [result] = await db.query(`
            INSERT INTO startups (name, website_url, linkedin_url, logo_url, use_case)
            VALUES (?, ?, ?, ?, ?)
        `, [name, website_url, linkedin_url, logo_url, use_case]);
        
        const startupId = result.insertId;
        
        // Kurucuları ekle
        if (founders && founders.length > 0) {
            const values = founders.map(f => [startupId, f.id, f.title]);
            await db.query(`
                INSERT INTO startup_founders (startup_id, contact_id, title)
                VALUES ?
            `, [values]);
        }
        
        res.status(201).json({ id: startupId, message: 'Startup başarıyla eklendi' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Startup güncelle
router.put('/:id', async (req, res) => {
    try {
        const { name, website_url, linkedin_url, logo_url, use_case, founders } = req.body;
        
        // Startup'ı güncelle
        await db.query(`
            UPDATE startups 
            SET name = ?, website_url = ?, linkedin_url = ?, logo_url = ?, use_case = ?
            WHERE id = ?
        `, [name, website_url, linkedin_url, logo_url, use_case, req.params.id]);
        
        // Mevcut kurucuları sil
        await db.query('DELETE FROM startup_founders WHERE startup_id = ?', [req.params.id]);
        
        // Yeni kurucuları ekle
        if (founders && founders.length > 0) {
            const values = founders.map(f => [req.params.id, f.id, f.title]);
            await db.query(`
                INSERT INTO startup_founders (startup_id, contact_id, title)
                VALUES ?
            `, [values]);
        }
        
        res.json({ message: 'Startup başarıyla güncellendi' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Startup sil
router.delete('/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM startups WHERE id = ?', [req.params.id]);
        res.json({ message: 'Startup başarıyla silindi' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 