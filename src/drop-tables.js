const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

// Tabloları sırayla sil
connection.query('DROP TABLE IF EXISTS mentors', (err) => {
    if (err) {
        console.error('mentors tablosu silinirken hata:', err);
        return;
    }
    console.log('mentors tablosu silindi');

    connection.query('DROP TABLE IF EXISTS startup_founders', (err) => {
        if (err) {
            console.error('startup_founders tablosu silinirken hata:', err);
            return;
        }
        console.log('startup_founders tablosu silindi');

        connection.query('DROP TABLE IF EXISTS startups', (err) => {
            if (err) {
                console.error('startups tablosu silinirken hata:', err);
                return;
            }
            console.log('startups tablosu silindi');

            connection.query('DROP TABLE IF EXISTS contacts', (err) => {
                if (err) {
                    console.error('contacts tablosu silinirken hata:', err);
                    return;
                }
                console.log('contacts tablosu silindi');

                connection.query('DROP TABLE IF EXISTS contact_roles', (err) => {
                    if (err) {
                        console.error('contact_roles tablosu silinirken hata:', err);
                        return;
                    }
                    console.log('contact_roles tablosu silindi');
                    connection.end();
                });
            });
        });
    });
}); 