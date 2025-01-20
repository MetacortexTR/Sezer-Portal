const pool = require('../../config/db');

async function fixTables() {
    const connection = await pool.getConnection();
    try {
        console.log('Tablo düzeltmeleri başlatılıyor...');

        // Foreign key constraint'i kaldır
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        
        // contacts tablosundaki yanlış foreign key'i kaldır
        await connection.query('ALTER TABLE contacts DROP FOREIGN KEY contacts_ibfk_1');
        console.log('Eski foreign key kaldırıldı');

        // contact_roles tablosunu düzelt
        await connection.query('DROP TABLE IF EXISTS contact_roles');
        await connection.query(`
            CREATE TABLE contact_roles (
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
        console.log('contact_roles tablosu yeniden oluşturuldu');

        // contacts tablosuna doğru foreign key ekle
        await connection.query('ALTER TABLE contacts ADD FOREIGN KEY (role_id) REFERENCES roles(id)');
        console.log('Yeni foreign key eklendi');

        // Foreign key constraint'i tekrar etkinleştir
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('Tablo düzeltmeleri başarıyla tamamlandı');
        process.exit(0);
    } catch (error) {
        console.error('Tablo düzeltmeleri sırasında hata:', error);
        process.exit(1);
    } finally {
        connection.release();
    }
}

fixTables(); 