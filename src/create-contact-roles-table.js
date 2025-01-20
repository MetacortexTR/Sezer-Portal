const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

const createContactRolesTable = `
CREATE TABLE IF NOT EXISTS contact_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`;

const insertDefaultRoles = `
INSERT INTO contact_roles (role_name) VALUES 
('Girişimci'),
('Mentor'),
('Yatırımcı'),
('Diğer')
ON DUPLICATE KEY UPDATE role_name = VALUES(role_name)`;

connection.query(createContactRolesTable, (err, results) => {
    if (err) {
        console.error('Contact roles tablosu oluşturulurken hata:', err);
        return;
    }
    console.log('Contact roles tablosu başarıyla oluşturuldu');

    connection.query(insertDefaultRoles, (err, results) => {
        if (err) {
            console.error('Varsayılan roller eklenirken hata:', err);
            return;
        }
        console.log('Varsayılan roller başarıyla eklendi');
        connection.end();
    });
}); 