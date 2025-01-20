const db = require('./config/db');

async function updateRole() {
    try {
        await db.query('UPDATE contact_roles SET role_name = ? WHERE role_name = ?', 
            ['Girişimci', 'Startup']);
        console.log('Role başarıyla güncellendi');
        process.exit(0);
    } catch (error) {
        console.error('Hata:', error);
        process.exit(1);
    }
}

updateRole(); 