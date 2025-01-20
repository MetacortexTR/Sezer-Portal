const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

// Önce mevcut tabloyu sil
const dropTable = `DROP TABLE IF EXISTS startup_founders`;

// Yeni tabloyu oluştur
const createTable = `
CREATE TABLE startup_founders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contact_id INT NOT NULL,
    startup_id INT,
    title VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (startup_id) REFERENCES startups(id) ON DELETE SET NULL
)`;

connection.query(dropTable, (err) => {
    if (err) {
        console.error('Tablo silinirken hata:', err);
        return;
    }
    console.log('Eski tablo başarıyla silindi');

    connection.query(createTable, (err) => {
        if (err) {
            console.error('Yeni tablo oluşturulurken hata:', err);
            return;
        }
        console.log('Yeni tablo başarıyla oluşturuldu');
        connection.end();
    });
}); 