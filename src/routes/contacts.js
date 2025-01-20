const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Belirli bir role sahip contact'ları getir
router.get('/with-role/:roleName', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        console.log('GET /api/contacts/with-role/:roleName isteği alındı, roleName:', req.params.roleName);
        
        const [contacts] = await connection.query(`
            SELECT DISTINCT
                c.id,
                c.name,
                c.email,
                c.photo_url,
                c.role_id as primary_role_id,
                r.role_name as primary_role,
                GROUP_CONCAT(DISTINCT cr.role_id) as additional_role_ids,
                GROUP_CONCAT(DISTINCT r2.role_name) as additional_roles
            FROM contacts c
            LEFT JOIN roles r ON c.role_id = r.id
            LEFT JOIN contact_roles cr ON c.id = cr.contact_id
            LEFT JOIN roles r2 ON cr.role_id = r2.id
            WHERE LOWER(r.role_name) = LOWER(?) OR LOWER(r2.role_name) = LOWER(?)
            GROUP BY c.id, c.name, c.email, c.photo_url, c.role_id, r.role_name
            ORDER BY c.name ASC
        `, [req.params.roleName, req.params.roleName]);

        // Rolleri array'e çevir
        const contactsWithArrays = contacts.map(contact => ({
            ...contact,
            additional_roles: contact.additional_roles ? contact.additional_roles.split(',') : [],
            additional_role_ids: contact.additional_role_ids ? contact.additional_role_ids.split(',').map(Number) : []
        }));

        console.log(`${req.params.roleName} rolüne sahip contact'lar başarıyla getirildi:`, contactsWithArrays);
        res.json(contactsWithArrays);
    } catch (error) {
        console.error(`${req.params.roleName} rolüne sahip contact'lar getirilirken hata:`, error);
        res.status(500).json({ error: `${req.params.roleName} rolüne sahip contact'lar getirilirken bir hata oluştu` });
    } finally {
        connection.release();
    }
});

// Mentor detaylarını getir veya oluştur
router.get('/:id/mentor-details', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        console.log('GET /api/contacts/:id/mentor-details isteği alındı, ID:', req.params.id);
        
        // 1. Önce contact'ı ve rollerini kontrol et
        const [contact] = await connection.query(`
            SELECT 
                c.*,
                r.role_name as primary_role,
                GROUP_CONCAT(DISTINCT r2.role_name) as additional_roles
            FROM contacts c
            LEFT JOIN roles r ON c.role_id = r.id
            LEFT JOIN contact_roles cr ON c.id = cr.contact_id
            LEFT JOIN roles r2 ON cr.role_id = r2.id
            WHERE c.id = ?
            GROUP BY c.id, c.name, c.email, c.photo_url, c.role_id, r.role_name
        `, [req.params.id]);

        if (!contact || contact.length === 0) {
            console.error('Contact bulunamadı, ID:', req.params.id);
            return res.status(404).json({ error: 'Contact bulunamadı' });
        }

        // Mentor rolünü kontrol et
        const additionalRoles = contact[0].additional_roles ? contact[0].additional_roles.split(',') : [];
        const isMentor = contact[0].primary_role === 'Mentor' || additionalRoles.includes('Mentor');

        if (!isMentor) {
            console.error('Contact mentor değil, ID:', req.params.id);
            return res.status(404).json({ error: 'Contact mentor değil' });
        }

        // 2. Mentor detaylarını getir
        let [mentorDetails] = await connection.query(`
            SELECT *
            FROM mentors
            WHERE contact_id = ?
        `, [req.params.id]);

        // 3. Eğer mentor detayları yoksa, otomatik olarak oluştur
        if (mentorDetails.length === 0) {
            console.log('Mentor detayları bulunamadı, yeni kayıt oluşturuluyor...');
            
            try {
                await connection.query(
                    'INSERT INTO mentors (contact_id, expertise_area, mentoring_focus) VALUES (?, ?, ?)',
                    [req.params.id, '', '']
                );
                
                [mentorDetails] = await connection.query(`
                    SELECT *
                    FROM mentors
                    WHERE contact_id = ?
                `, [req.params.id]);
                
                console.log('Yeni mentor detayları oluşturuldu:', mentorDetails[0]);
            } catch (insertError) {
                console.error('Mentor detayları oluşturulurken hata:', insertError);
                return res.status(500).json({ error: 'Mentor detayları oluşturulurken bir hata oluştu' });
            }
        }

        // 4. Tüm bilgileri birleştir ve gönder
        const responseData = {
            id: contact[0].id,
            name: contact[0].name,
            email: contact[0].email,
            photo_url: contact[0].photo_url,
            role_name: contact[0].primary_role,
            expertise_area: mentorDetails[0]?.expertise_area || '',
            mentoring_focus: mentorDetails[0]?.mentoring_focus || ''
        };

        console.log('Mentor detayları başarıyla gönderiliyor:', responseData);
        res.json(responseData);
    } catch (error) {
        console.error('Mentor detayları işlenirken hata:', error);
        res.status(500).json({ error: 'Mentor detayları işlenirken bir hata oluştu' });
    } finally {
        connection.release();
    }
});

// Mentor detaylarını güncelle
router.put('/:id/mentor-details', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { expertise_area, mentoring_focus } = req.body;
        
        // 1. Önce mentor detaylarının varlığını kontrol et
        const [existingDetails] = await connection.query(
            'SELECT contact_id FROM mentors WHERE contact_id = ?',
            [req.params.id]
        );

        // 2. Yoksa oluştur, varsa güncelle
        if (existingDetails.length === 0) {
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

        // 3. Güncellenmiş detayları getir ve dön
        const [updatedDetails] = await connection.query(
            'SELECT expertise_area, mentoring_focus FROM mentors WHERE contact_id = ?',
            [req.params.id]
        );

        res.json(updatedDetails[0]);
    } catch (error) {
        console.error('Mentor detayları güncellenirken hata:', error);
        res.status(500).json({ error: 'Mentor detayları güncellenirken bir hata oluştu' });
    } finally {
        connection.release();
    }
});

// Tüm contact'ları getir
router.get('/', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        console.log('GET /api/contacts isteği alındı');
        
        // SQL sorgusunu oluştur - Daha basit ve güvenli bir sorgu
        const sql = `
            SELECT 
                c.id,
                c.name,
                c.email,
                c.photo_url,
                c.role_id as primary_role_id,
                r.role_name as primary_role,
                (
                    SELECT GROUP_CONCAT(DISTINCT r2.id)
                    FROM contact_roles cr2
                    JOIN roles r2 ON cr2.role_id = r2.id
                    WHERE cr2.contact_id = c.id
                ) as additional_role_ids,
                (
                    SELECT GROUP_CONCAT(DISTINCT r2.role_name)
                    FROM contact_roles cr2
                    JOIN roles r2 ON cr2.role_id = r2.id
                    WHERE cr2.contact_id = c.id
                ) as additional_roles
            FROM contacts c
            LEFT JOIN roles r ON c.role_id = r.id
            GROUP BY 
                c.id, 
                c.name, 
                c.email, 
                c.photo_url, 
                c.role_id, 
                r.role_name
            ORDER BY c.name ASC
        `;
        
        console.log('SQL sorgusu:', sql);

        // Sorguyu çalıştır
        const [contacts] = await connection.query(sql);
        console.log('Veritabanından gelen ham veri:', contacts);

        if (!contacts) {
            throw new Error('Veritabanından veri alınamadı');
        }

        // Rolleri array'e çevir
        const contactsWithArrays = contacts.map(contact => {
            try {
                return {
                    ...contact,
                    additional_roles: contact.additional_roles ? contact.additional_roles.split(',') : [],
                    additional_role_ids: contact.additional_role_ids ? contact.additional_role_ids.split(',').map(Number) : []
                };
            } catch (err) {
                console.error('Contact dönüşümünde hata:', err);
                return {
                    ...contact,
                    additional_roles: [],
                    additional_role_ids: []
                };
            }
        });

        console.log('Contact\'lar başarıyla getirildi:', contactsWithArrays);
        res.json(contactsWithArrays);
    } catch (error) {
        console.error('Contact\'lar getirilirken hata:', error);
        console.error('Hata detayları:', {
            message: error.message,
            code: error.code,
            sqlMessage: error.sqlMessage,
            sql: error.sql
        });
        res.status(500).json({ error: 'Contact\'lar getirilirken bir hata oluştu: ' + error.message });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Belirli bir contact'ı getir
router.get('/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        console.log('GET /api/contacts/:id isteği alındı, ID:', req.params.id);
        const [contacts] = await connection.query(`
            SELECT 
                c.id,
                c.name,
                c.email,
                c.photo_url,
                c.role_id as primary_role_id,
                r.role_name as primary_role,
                GROUP_CONCAT(DISTINCT cr.role_id) as additional_role_ids,
                GROUP_CONCAT(DISTINCT r2.role_name) as additional_roles
            FROM contacts c
            LEFT JOIN roles r ON c.role_id = r.id
            LEFT JOIN contact_roles cr ON c.id = cr.contact_id
            LEFT JOIN roles r2 ON cr.role_id = r2.id
            WHERE c.id = ?
            GROUP BY c.id, c.name, c.email, c.photo_url, c.role_id, r.role_name
        `, [req.params.id]);

        if (!contacts || contacts.length === 0) {
            return res.status(404).json({ error: 'Contact bulunamadı' });
        }

        // Rolleri array'e çevir
        const contact = contacts[0];
        contact.additional_roles = contact.additional_roles ? contact.additional_roles.split(',') : [];
        contact.additional_role_ids = contact.additional_role_ids ? contact.additional_role_ids.split(',').map(Number) : [];

        console.log('Contact başarıyla getirildi:', contact);
        res.json(contact);
    } catch (error) {
        console.error('Contact getirilirken hata:', error);
        res.status(500).json({ error: 'Contact getirilirken bir hata oluştu' });
    } finally {
        connection.release();
    }
});

// Contact güncelle
router.put('/:id', async (req, res) => {
    const { name, email, photo_url, role_id, additional_role_ids } = req.body;
    const connection = await pool.getConnection();
    
    try {
        console.log('PUT /api/contacts/:id isteği alındı, ID:', req.params.id, 'Data:', req.body);
        await connection.beginTransaction();

        // Contacts tablosunu güncelle
        await connection.query(
            'UPDATE contacts SET name = ?, email = ?, photo_url = ?, role_id = ? WHERE id = ?',
            [name, email, photo_url, role_id, req.params.id]
        );

        // Mevcut ek rolleri sil
        await connection.query('DELETE FROM contact_roles WHERE contact_id = ?', [req.params.id]);

        // Yeni ek rolleri ekle
        if (Array.isArray(additional_role_ids) && additional_role_ids.length > 0) {
            const roleValues = additional_role_ids
                .filter(id => id && id !== role_id) // Null olmayan ve ana rolden farklı rolleri filtrele
                .map(role_id => [req.params.id, role_id]);
            
            if (roleValues.length > 0) {
                await connection.query(
                    'INSERT INTO contact_roles (contact_id, role_id) VALUES ?',
                    [roleValues]
                );
            }
        }

        // Rolleri kontrol et
        const [roles] = await connection.query(`
            SELECT 
                r1.role_name as primary_role, 
                GROUP_CONCAT(DISTINCT r2.role_name) as additional_roles
            FROM contacts c
            LEFT JOIN roles r1 ON c.role_id = r1.id
            LEFT JOIN contact_roles cr ON c.id = cr.contact_id
            LEFT JOIN roles r2 ON cr.role_id = r2.id
            WHERE c.id = ?
            GROUP BY c.id, r1.role_name
        `, [req.params.id]);

        const hasRole = (roleName) => {
            return roles[0].primary_role === roleName || 
                   (roles[0].additional_roles && roles[0].additional_roles.includes(roleName));
        };

        // Mentor rolü kontrolü
        if (hasRole('Mentor')) {
            const [existingMentor] = await connection.query(
                'SELECT contact_id FROM mentors WHERE contact_id = ?',
                [req.params.id]
            );

            if (existingMentor.length === 0) {
                await connection.query(
                    'INSERT INTO mentors (contact_id, expertise_area, mentoring_focus) VALUES (?, ?, ?)',
                    [req.params.id, '', '']
                );
            }
        }

        // Girişimci rolü kontrolü
        if (hasRole('Girişimci')) {
            const [existingFounder] = await connection.query(
                'SELECT contact_id FROM startup_founders WHERE contact_id = ?',
                [req.params.id]
            );

            if (existingFounder.length === 0) {
                await connection.query(
                    'INSERT INTO startup_founders (contact_id, startup_id, title) VALUES (?, ?, ?)',
                    [req.params.id, null, '']
                );
            }
        }

        // Yatırımcı rolü kontrolü
        if (hasRole('Yatırımcı')) {
            const [existingInvestor] = await connection.query(
                'SELECT contact_id FROM investors WHERE contact_id = ?',
                [req.params.id]
            );

            if (existingInvestor.length === 0) {
                await connection.query(
                    'INSERT INTO investors (contact_id, investment_focus, portfolio) VALUES (?, ?, ?)',
                    [req.params.id, '', '']
                );
            }
        }

        await connection.commit();

        // Güncellenmiş contact'ı getir
        const [updatedContact] = await connection.query(`
            SELECT 
                c.id,
                c.name,
                c.email,
                c.photo_url,
                c.role_id as primary_role_id,
                r.role_name as primary_role,
                GROUP_CONCAT(DISTINCT cr.role_id) as additional_role_ids,
                GROUP_CONCAT(DISTINCT r2.role_name) as additional_roles
            FROM contacts c
            LEFT JOIN roles r ON c.role_id = r.id
            LEFT JOIN contact_roles cr ON c.id = cr.contact_id
            LEFT JOIN roles r2 ON cr.role_id = r2.id
            WHERE c.id = ?
            GROUP BY c.id, c.name, c.email, c.photo_url, c.role_id, r.role_name
        `, [req.params.id]);

        // Rolleri array'e çevir
        if (updatedContact[0]) {
            updatedContact[0].additional_roles = updatedContact[0].additional_roles ? updatedContact[0].additional_roles.split(',') : [];
            updatedContact[0].additional_role_ids = updatedContact[0].additional_role_ids ? updatedContact[0].additional_role_ids.split(',').map(Number) : [];
        }

        console.log('Contact başarıyla güncellendi:', updatedContact[0]);
        res.json(updatedContact[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Contact güncellenirken hata:', error);
        res.status(500).json({ error: 'Contact güncellenirken bir hata oluştu' });
    } finally {
        connection.release();
    }
});

// Contact sil
router.delete('/:id', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        console.log('DELETE /api/contacts/:id isteği alındı, ID:', req.params.id);
        await connection.beginTransaction();

        // Contact'ı sil (contact_roles tablosu ON DELETE CASCADE ile otomatik silinecek)
        const [result] = await connection.query('DELETE FROM contacts WHERE id = ?', [req.params.id]);

        await connection.commit();

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Contact bulunamadı' });
        }

        console.log('Contact başarıyla silindi');
        res.json({ message: 'Contact başarıyla silindi' });
    } catch (error) {
        await connection.rollback();
        console.error('Contact silinirken hata:', error);
        res.status(500).json({ error: 'Contact silinirken bir hata oluştu' });
    } finally {
        connection.release();
    }
});

// Mentor detaylarını oluştur
router.post('/:id/mentor-details', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        console.log('POST /api/contacts/:id/mentor-details isteği alındı, ID:', req.params.id);
        
        const { expertise_area, mentoring_focus } = req.body;
        
        // Mentor detaylarını ekle
        await connection.query(`
            INSERT INTO mentors (contact_id, expertise_area, mentoring_focus)
            VALUES (?, ?, ?)
        `, [req.params.id, expertise_area, mentoring_focus]);
        
        res.status(201).json({ message: 'Mentor detayları başarıyla oluşturuldu' });
    } catch (error) {
        console.error('Mentor detayları oluşturulurken hata:', error);
        res.status(500).json({ error: 'Mentor detayları oluşturulurken bir hata oluştu' });
    } finally {
        connection.release();
    }
});

// Yeni contact ekle
router.post('/', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        console.log('POST /api/contacts isteği alındı, Data:', req.body);
        const { name, email, photo_url, role_id, additional_role_ids } = req.body;

        await connection.beginTransaction();

        // Ana contact'ı ekle
        const [result] = await connection.query(
            'INSERT INTO contacts (name, email, photo_url, role_id) VALUES (?, ?, ?, ?)',
            [name, email, photo_url, role_id]
        );

        const newContactId = result.insertId;

        // Ek rolleri ekle (eğer varsa)
        if (Array.isArray(additional_role_ids) && additional_role_ids.length > 0) {
            const roleValues = additional_role_ids
                .filter(id => id && id !== role_id) // Null olmayan ve ana rolden farklı rolleri filtrele
                .map(roleId => [newContactId, roleId]);

            if (roleValues.length > 0) {
                await connection.query(
                    'INSERT INTO contact_roles (contact_id, role_id) VALUES ?',
                    [roleValues]
                );
            }
        }

        // Yeni eklenen contact'ı getir
        const [newContact] = await connection.query(`
            SELECT 
                c.id,
                c.name,
                c.email,
                c.photo_url,
                c.role_id as primary_role_id,
                r.role_name as primary_role,
                GROUP_CONCAT(DISTINCT cr.role_id) as additional_role_ids,
                GROUP_CONCAT(DISTINCT r2.role_name) as additional_roles
            FROM contacts c
            LEFT JOIN roles r ON c.role_id = r.id
            LEFT JOIN contact_roles cr ON c.id = cr.contact_id
            LEFT JOIN roles r2 ON cr.role_id = r2.id
            WHERE c.id = ?
            GROUP BY c.id, c.name, c.email, c.photo_url, c.role_id, r.role_name
        `, [newContactId]);

        // Rolleri array'e çevir
        if (newContact[0]) {
            newContact[0].additional_roles = newContact[0].additional_roles ? newContact[0].additional_roles.split(',') : [];
            newContact[0].additional_role_ids = newContact[0].additional_role_ids ? newContact[0].additional_role_ids.split(',').map(Number) : [];
        }

        await connection.commit();
        console.log('Yeni contact başarıyla eklendi:', newContact[0]);
        res.status(201).json(newContact[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Contact eklenirken hata:', error);
        res.status(500).json({ error: 'Contact eklenirken bir hata oluştu' });
    } finally {
        connection.release();
    }
});

module.exports = router; 