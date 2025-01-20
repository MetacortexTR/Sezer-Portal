const pool = require('../../config/db');

async function migrate() {
    const connection = await pool.getConnection();
    try {
        console.log('Migration başlatılıyor...');

        // Önce role_id sütununun var olup olmadığını kontrol et
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'contacts' 
            AND COLUMN_NAME = 'role_id'
        `);

        // Eğer role_id sütunu yoksa ekle
        if (columns.length === 0) {
            await connection.query(`
                ALTER TABLE contacts
                ADD COLUMN role_id INT,
                ADD FOREIGN KEY (role_id) REFERENCES roles(id)
            `);
            console.log('contacts tablosuna role_id sütunu eklendi');
        } else {
            console.log('role_id sütunu zaten var');
        }

        // contact_roles tablosunu oluştur (eğer yoksa)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS contact_roles (
                id INT PRIMARY KEY AUTO_INCREMENT,
                contact_id INT NOT NULL,
                role_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
                FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
                UNIQUE KEY unique_contact_role (contact_id, role_id)
            )
        `);
        console.log('contact_roles tablosu oluşturuldu');

        console.log('Migration başarıyla tamamlandı');
        process.exit(0);
    } catch (error) {
        console.error('Migration hatası:', error);
        process.exit(1);
    } finally {
        connection.release();
    }
}

migrate(); 