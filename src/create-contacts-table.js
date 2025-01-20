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
const dropTable = `DROP TABLE IF EXISTS contacts`;

// Yeni tabloyu oluştur
const createContactsTable = `
CREATE TABLE contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    photo_url VARCHAR(255),
    role_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
)`;

connection.query(dropTable, (err) => {
    if (err) {
        console.error('Tablo silinirken hata:', err);
        return;
    }
    console.log('Eski tablo başarıyla silindi');

    connection.query(createContactsTable, (err) => {
        if (err) {
            console.error('Contacts tablosu oluşturulurken hata:', err);
            return;
        }
        console.log('Contacts tablosu başarıyla oluşturuldu');
        connection.end();
    });
}); 