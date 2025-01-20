const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Tüm mentorları getir
router.get('/', async (req, res) => {
    try {
        console.log('GET /api/mentors isteği alındı');
        const [mentors] = await pool.query(`
            SELECT DISTINCT
                c.id,
                c.name,
                c.email,
                c.photo_url,
                m.expertise_area,
                m.mentoring_focus,
                CASE 
                    WHEN r_primary.role_name = 'Mentor' THEN 'Ana Rol'
                    ELSE 'Ek Rol'
                END as mentor_role_type
            FROM contacts c
            LEFT JOIN roles r_primary ON c.role_id = r_primary.id
            LEFT JOIN contact_roles cr ON c.id = cr.contact_id
            LEFT JOIN roles r ON cr.role_id = r.id
            LEFT JOIN mentors m ON m.contact_id = c.id
            WHERE r_primary.role_name = 'Mentor' 
               OR r.role_name = 'Mentor'
            ORDER BY c.name ASC
        `);
        console.log('Mentorlar başarıyla getirildi:', mentors);
        res.json(mentors);
    } catch (error) {
        console.error('Mentorlar getirilirken hata:', error);
        res.status(500).json({ error: 'Mentorlar getirilirken bir hata oluştu' });
    }
});

// Belirli bir mentoru getir
router.get('/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        console.log('GET /api/mentors/:id isteği alındı, ID:', req.params.id);
        const [mentors] = await connection.query(`
            SELECT DISTINCT
                c.id,
                c.name,
                c.email,
                c.photo_url,
                m.expertise_area,
                m.mentoring_focus,
                r_primary.role_name as primary_role
            FROM contacts c
            LEFT JOIN roles r_primary ON c.role_id = r_primary.id
            LEFT JOIN contact_roles cr ON c.id = cr.contact_id
            LEFT JOIN roles r ON cr.role_id = r.id
            LEFT JOIN mentors m ON m.contact_id = c.id
            WHERE c.id = ? 
            AND (r_primary.role_name = 'Mentor' OR r.role_name = 'Mentor')
            LIMIT 1
        `, [req.params.id]);

        if (!mentors || mentors.length === 0) {
            return res.status(404).json({ error: 'Mentor bulunamadı' });
        }

        console.log('Mentor başarıyla getirildi:', mentors[0]);
        res.json(mentors[0]);
    } catch (error) {
        console.error('Mentor getirilirken hata:', error);
        res.status(500).json({ error: 'Mentor getirilirken bir hata oluştu' });
    } finally {
        connection.release();
    }
});

// Yeni mentor ekle
router.post('/', async (req, res) => {
    const { name, email, photo_url, expertise_area, mentoring_focus, role_id } = req.body;
    const connection = await pool.getConnection();
    
    try {
        console.log('POST /api/mentors isteği alındı, veri:', req.body);
        await connection.beginTransaction();

        // Contacts tablosuna ekle
        const [contactResult] = await connection.query(
            'INSERT INTO contacts (name, email, photo_url, role_id) VALUES (?, ?, ?, ?)',
            [name, email, photo_url, role_id]
        );

        const newContactId = contactResult.insertId;

        // Mentors tablosuna ekle
        await connection.query(
            'INSERT INTO mentors (contact_id, expertise_area, mentoring_focus) VALUES (?, ?, ?)',
            [newContactId, expertise_area, mentoring_focus]
        );

        // Contact_roles tablosuna mentor rolünü ekle
        const [roles] = await connection.query('SELECT id FROM roles WHERE role_name = ?', ['Mentor']);
        if (roles && roles.length > 0) {
            await connection.query(
                'INSERT INTO contact_roles (contact_id, role_id) VALUES (?, ?)',
                [newContactId, roles[0].id]
            );
        }

        await connection.commit();
        
        const [newMentor] = await connection.query(`
            SELECT 
                c.id,
                c.name,
                c.email,
                c.photo_url,
                m.expertise_area,
                m.mentoring_focus,
                'Ana Rol' as mentor_role_type
            FROM contacts c
            LEFT JOIN mentors m ON m.contact_id = c.id
            WHERE c.id = ?
        `, [newContactId]);

        console.log('Yeni mentor başarıyla eklendi:', newMentor[0]);
        res.status(201).json(newMentor[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Mentor eklenirken hata:', error);
        res.status(500).json({ error: 'Mentor eklenirken bir hata oluştu' });
    } finally {
        connection.release();
    }
});

// Mentor güncelle
router.put('/:id', async (req, res) => {
    const { name, email, photo_url, expertise_area, mentoring_focus } = req.body;
    const connection = await pool.getConnection();
    
    try {
        console.log('PUT /api/mentors/:id isteği alındı, ID:', req.params.id);
        await connection.beginTransaction();

        // Contacts tablosunu güncelle
        await connection.query(
            'UPDATE contacts SET name = ?, email = ?, photo_url = ? WHERE id = ?',
            [name, email, photo_url, req.params.id]
        );

        // Mentors tablosunu güncelle
        const [mentorExists] = await connection.query(
            'SELECT contact_id FROM mentors WHERE contact_id = ?',
            [req.params.id]
        );

        if (mentorExists.length === 0) {
            await connection.query(
                'INSERT INTO mentors (contact_id, expertise_area, mentoring_focus) VALUES (?, ?, ?)',
                [req.params.id, expertise_area, mentoring_focus]
            );
        } else {
            await connection.query(
                'UPDATE mentors SET expertise_area = ?, mentoring_focus = ? WHERE contact_id = ?',
                [expertise_area, mentoring_focus, req.params.id]
            );
        }

        await connection.commit();

        const [updatedMentor] = await connection.query(`
            SELECT 
                c.id,
                c.name,
                c.email,
                c.photo_url,
                m.expertise_area,
                m.mentoring_focus
            FROM contacts c
            JOIN roles r ON c.role_id = r.id
            LEFT JOIN mentors m ON m.contact_id = c.id
            WHERE c.id = ? AND r.role_name = 'Mentor'
        `, [req.params.id]);

        console.log('Mentor başarıyla güncellendi:', updatedMentor[0]);
        res.json(updatedMentor[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Mentor güncellenirken hata:', error);
        res.status(500).json({ error: 'Mentor güncellenirken bir hata oluştu' });
    } finally {
        connection.release();
    }
});

// Mentor sil
router.delete('/:id', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        console.log('DELETE /api/mentors/:id isteği alındı, ID:', req.params.id);
        await connection.beginTransaction();

        // Önce mentors tablosundan sil
        await connection.query('DELETE FROM mentors WHERE contact_id = ?', [req.params.id]);
        
        // Sonra contacts tablosundan sil
        const [result] = await connection.query('DELETE FROM contacts WHERE id = ?', [req.params.id]);

        await connection.commit();

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Mentor bulunamadı' });
        }

        console.log('Mentor başarıyla silindi');
        res.json({ message: 'Mentor başarıyla silindi' });
    } catch (error) {
        await connection.rollback();
        console.error('Mentor silinirken hata:', error);
        res.status(500).json({ error: 'Mentor silinirken bir hata oluştu' });
    } finally {
        connection.release();
    }
});

module.exports = router; 