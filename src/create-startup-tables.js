const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

// Startups tablosunu oluştur
const createStartupsTable = `
CREATE TABLE startups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    website_url VARCHAR(255),
    linkedin_url VARCHAR(255),
    logo_url VARCHAR(255),
    use_case TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`;

connection.query(createStartupsTable, (err) => {
    if (err) {
        console.error('Startups tablosu oluşturulurken hata:', err);
        return;
    }
    console.log('Startups tablosu başarıyla oluşturuldu');
    connection.end();
}); 