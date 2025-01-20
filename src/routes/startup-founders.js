const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Tüm startup kurucularını getir
router.get('/', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        console.log('GET /api/startup-founders isteği alındı');
        
        // SQL sorgusunu oluştur - Tüm girişimcileri getir
        const sql = `
            SELECT DISTINCT
                COALESCE(sf.id, 0) as id,
                c.id as contact_id,
                sf.startup_id,
                sf.title,
                c.name,
                c.email,
                c.photo_url,
                c.role_id as primary_role_id,
                r.role_name as primary_role,
                GROUP_CONCAT(DISTINCT cr.role_id) as additional_role_ids,
                GROUP_CONCAT(DISTINCT r2.role_name) as additional_roles,
                s.name as startup_name,
                s.website_url,
                s.linkedin_url,
                s.logo_url,
                s.use_case
            FROM contacts c
            LEFT JOIN roles r ON c.role_id = r.id
            LEFT JOIN contact_roles cr ON c.id = cr.contact_id
            LEFT JOIN roles r2 ON cr.role_id = r2.id
            LEFT JOIN startup_founders sf ON c.id = sf.contact_id
            LEFT JOIN startups s ON sf.startup_id = s.id
            WHERE r.role_name = 'Girişimci' 
               OR EXISTS (
                   SELECT 1 
                   FROM contact_roles cr2 
                   JOIN roles r3 ON cr2.role_id = r3.id 
                   WHERE cr2.contact_id = c.id 
                   AND r3.role_name = 'Girişimci'
               )
            GROUP BY c.id, sf.id, sf.startup_id, sf.title, c.name, c.email, c.photo_url, 
                     c.role_id, r.role_name, s.name, s.website_url, s.linkedin_url, s.logo_url, s.use_case
            ORDER BY c.name ASC
        `;
        console.log('SQL sorgusu:', sql);

        // Sorguyu çalıştır
        const [founders] = await connection.query(sql);
        console.log('Veritabanından gelen ham veri:', founders);

        // Rolleri array'e çevir
        const foundersWithArrays = founders.map(founder => {
            console.log('İşlenen founder:', founder);
            return {
                ...founder,
                additional_roles: founder.additional_roles ? founder.additional_roles.split(',') : [],
                additional_role_ids: founder.additional_role_ids ? founder.additional_role_ids.split(',').map(Number) : []
            };
        });

        console.log('Kurucular başarıyla getirildi:', foundersWithArrays);
        res.json(foundersWithArrays);
    } catch (error) {
        console.error('Kurucular getirilirken hata:', error);
        console.error('Hata detayları:', {
            message: error.message,
            code: error.code,
            sqlMessage: error.sqlMessage,
            sql: error.sql
        });
        res.status(500).json({ error: 'Kurucular getirilirken bir hata oluştu' });
    } finally {
        connection.release();
    }
});

// Belirli bir startup kurucusunu getir
router.get('/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        console.log('GET /api/startup-founders/:id isteği alındı, ID:', req.params.id);
        const [founders] = await connection.query(`
            SELECT 
                sf.id,
                sf.contact_id,
                sf.startup_id,
                sf.title,
                c.name,
                c.email,
                c.photo_url,
                c.role_id as primary_role_id,
                r.role_name as primary_role,
                GROUP_CONCAT(DISTINCT cr.role_id) as additional_role_ids,
                GROUP_CONCAT(DISTINCT r2.role_name) as additional_roles,
                s.name as startup_name,
                s.website_url,
                s.linkedin_url,
                s.logo_url,
                s.use_case
            FROM startup_founders sf
            JOIN contacts c ON sf.contact_id = c.id
            LEFT JOIN roles r ON c.role_id = r.id
            LEFT JOIN contact_roles cr ON c.id = cr.contact_id
            LEFT JOIN roles r2 ON cr.role_id = r2.id
            JOIN startups s ON sf.startup_id = s.id
            WHERE sf.id = ?
            GROUP BY sf.id, sf.contact_id, sf.startup_id, sf.title, c.name, c.email, c.photo_url, 
                     c.role_id, r.role_name, s.name, s.website_url, s.linkedin_url, s.logo_url, s.use_case
        `, [req.params.id]);

        if (!founders || founders.length === 0) {
            return res.status(404).json({ error: 'Kurucu bulunamadı' });
        }

        // Rolleri array'e çevir
        const founder = founders[0];
        founder.additional_roles = founder.additional_roles ? founder.additional_roles.split(',') : [];
        founder.additional_role_ids = founder.additional_role_ids ? founder.additional_role_ids.split(',').map(Number) : [];

        console.log('Kurucu başarıyla getirildi:', founder);
        res.json(founder);
    } catch (error) {
        console.error('Kurucu getirilirken hata:', error);
        res.status(500).json({ error: 'Kurucu getirilirken bir hata oluştu' });
    } finally {
        connection.release();
    }
});

// Yeni startup kurucusu ekle
router.post('/', async (req, res) => {
    const { contact_id, startup_id, title } = req.body;
    const connection = await pool.getConnection();
    
    try {
        console.log('POST /api/startup-founders isteği alındı, veri:', req.body);
        await connection.beginTransaction();

        // Startup kurucusunu ekle
        const [result] = await connection.query(
            'INSERT INTO startup_founders (contact_id, startup_id, title) VALUES (?, ?, ?)',
            [contact_id, startup_id, title]
        );

        const newFounderId = result.insertId;

        // Yeni eklenen kurucuyu getir
        const [newFounder] = await connection.query(`
            SELECT 
                sf.id,
                sf.contact_id,
                sf.startup_id,
                sf.title,
                c.name,
                c.email,
                c.photo_url,
                c.role_id as primary_role_id,
                r.role_name as primary_role,
                GROUP_CONCAT(DISTINCT cr.role_id) as additional_role_ids,
                GROUP_CONCAT(DISTINCT r2.role_name) as additional_roles,
                s.name as startup_name,
                s.website_url,
                s.linkedin_url,
                s.logo_url,
                s.use_case
            FROM startup_founders sf
            JOIN contacts c ON sf.contact_id = c.id
            LEFT JOIN roles r ON c.role_id = r.id
            LEFT JOIN contact_roles cr ON c.id = cr.contact_id
            LEFT JOIN roles r2 ON cr.role_id = r2.id
            JOIN startups s ON sf.startup_id = s.id
            WHERE sf.id = ?
            GROUP BY sf.id, sf.contact_id, sf.startup_id, sf.title, c.name, c.email, c.photo_url, 
                     c.role_id, r.role_name, s.name, s.website_url, s.linkedin_url, s.logo_url, s.use_case
        `, [newFounderId]);

        await connection.commit();

        console.log('Yeni kurucu başarıyla eklendi:', newFounder[0]);
        res.status(201).json(newFounder[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Kurucu eklenirken hata:', error);
        res.status(500).json({ error: 'Kurucu eklenirken bir hata oluştu' });
    } finally {
        connection.release();
    }
});

// Startup kurucusunu güncelle
router.put('/:id', async (req, res) => {
    const { contact_id, startup_id, title } = req.body;
    const connection = await pool.getConnection();
    
    try {
        console.log('PUT /api/startup-founders/:id isteği alındı, ID:', req.params.id);
        await connection.beginTransaction();

        // Startup kurucusunu güncelle
        await connection.query(
            'UPDATE startup_founders SET contact_id = ?, startup_id = ?, title = ? WHERE id = ?',
            [contact_id, startup_id, title, req.params.id]
        );

        // Güncellenmiş kurucuyu getir
        const [updatedFounder] = await connection.query(`
            SELECT 
                sf.id,
                sf.contact_id,
                sf.startup_id,
                sf.title,
                c.name,
                c.email,
                c.photo_url,
                c.role_id as primary_role_id,
                r.role_name as primary_role,
                GROUP_CONCAT(DISTINCT cr.role_id) as additional_role_ids,
                GROUP_CONCAT(DISTINCT r2.role_name) as additional_roles,
                s.name as startup_name,
                s.website_url,
                s.linkedin_url,
                s.logo_url,
                s.use_case
            FROM startup_founders sf
            JOIN contacts c ON sf.contact_id = c.id
            LEFT JOIN roles r ON c.role_id = r.id
            LEFT JOIN contact_roles cr ON c.id = cr.contact_id
            LEFT JOIN roles r2 ON cr.role_id = r2.id
            JOIN startups s ON sf.startup_id = s.id
            WHERE sf.id = ?
            GROUP BY sf.id, sf.contact_id, sf.startup_id, sf.title, c.name, c.email, c.photo_url, 
                     c.role_id, r.role_name, s.name, s.website_url, s.linkedin_url, s.logo_url, s.use_case
        `, [req.params.id]);

        await connection.commit();

        console.log('Kurucu başarıyla güncellendi:', updatedFounder[0]);
        res.json(updatedFounder[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Kurucu güncellenirken hata:', error);
        res.status(500).json({ error: 'Kurucu güncellenirken bir hata oluştu' });
    } finally {
        connection.release();
    }
});

// Startup kurucusunu sil
router.delete('/:id', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        console.log('DELETE /api/startup-founders/:id isteği alındı, ID:', req.params.id);
        await connection.beginTransaction();

        // Startup kurucusunu sil
        const [result] = await connection.query('DELETE FROM startup_founders WHERE id = ?', [req.params.id]);

        await connection.commit();

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Kurucu bulunamadı' });
        }

        console.log('Kurucu başarıyla silindi');
        res.json({ message: 'Kurucu başarıyla silindi' });
    } catch (error) {
        await connection.rollback();
        console.error('Kurucu silinirken hata:', error);
        res.status(500).json({ error: 'Kurucu silinirken bir hata oluştu' });
    } finally {
        connection.release();
    }
});

module.exports = router; 