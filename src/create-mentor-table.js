const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

const createMentorTable = `
CREATE TABLE IF NOT EXISTS mentors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contact_id INT NOT NULL,
    expertise_area VARCHAR(255),
    mentoring_focus TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    UNIQUE KEY unique_contact (contact_id)
)`;

connection.query(createMentorTable, (err, results) => {
    if (err) {
        console.error('Mentor tablosu oluşturulurken hata:', err);
        return;
    }
    console.log('Mentor tablosu başarıyla oluşturuldu');

    // Mevcut mentor rolüne sahip kişileri mentor tablosuna ekle
    const addExistingMentors = `
    INSERT IGNORE INTO mentors (contact_id)
    SELECT c.id
    FROM contacts c
    JOIN contact_roles r ON c.role_id = r.id
    WHERE r.role_name = 'Mentor'`;

    connection.query(addExistingMentors, (err, results) => {
        if (err) {
            console.error('Mevcut mentorlar eklenirken hata:', err);
            return;
        }
        console.log('Mevcut mentorlar başarıyla eklendi');
        connection.end();
    });
}); 