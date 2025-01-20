const db = require('./config/db');

async function addFounderTitle() {
    try {
        await db.query(`
            ALTER TABLE startup_founders
            ADD COLUMN title VARCHAR(100)
        `);
        console.log('Title sütunu başarıyla eklendi');
        process.exit(0);
    } catch (error) {
        console.error('Hata:', error);
        process.exit(1);
    }
}

addFounderTitle(); 