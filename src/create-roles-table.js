const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

const createRolesTable = `
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`;

const insertDefaultRoles = `
INSERT INTO roles (role_name) VALUES 
('Girişimci'),
('Mentor'),
('Yatırımcı'),
('Diğer')
ON DUPLICATE KEY UPDATE role_name = VALUES(role_name)`;

connection.query(createRolesTable, (err, results) => {
    if (err) {
        console.error('Roles tablosu oluşturulurken hata:', err);
        return;
    }
    console.log('Roles tablosu başarıyla oluşturuldu');

    connection.query(insertDefaultRoles, (err, results) => {
        if (err) {
            console.error('Varsayılan roller eklenirken hata:', err);
            return;
        }
        console.log('Varsayılan roller başarıyla eklendi');
        connection.end();
    });
}); 