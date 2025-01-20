const pool = require('../../config/db');

async function checkTables() {
    const connection = await pool.getConnection();
    try {
        console.log('Tablo kontrolü başlatılıyor...');

        // Tüm tabloları listele
        const [tables] = await connection.query(`
            SELECT TABLE_NAME as table_name
            FROM information_schema.tables 
            WHERE table_schema = DATABASE()
        `);
        console.log('\nMevcut tablolar:');
        tables.forEach(table => {
            console.log(`- ${table.table_name}`);
        });

        // contacts tablosunun yapısını kontrol et
        const [contactsColumns] = await connection.query(`
            SELECT 
                COLUMN_NAME as column_name, 
                COLUMN_TYPE as column_type, 
                IS_NULLABLE as is_nullable, 
                COLUMN_KEY as column_key
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
            AND table_name = 'contacts'
            ORDER BY ordinal_position
        `);
        console.log('\ncontacts tablosu yapısı:');
        contactsColumns.forEach(column => {
            console.log(`- ${column.column_name}: ${column.column_type} (${column.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}) ${column.column_key}`);
        });

        // roles tablosunun yapısını kontrol et
        const [rolesColumns] = await connection.query(`
            SELECT 
                COLUMN_NAME as column_name, 
                COLUMN_TYPE as column_type, 
                IS_NULLABLE as is_nullable, 
                COLUMN_KEY as column_key
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
            AND table_name = 'roles'
            ORDER BY ordinal_position
        `);
        console.log('\nroles tablosu yapısı:');
        rolesColumns.forEach(column => {
            console.log(`- ${column.column_name}: ${column.column_type} (${column.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}) ${column.column_key}`);
        });

        // contact_roles tablosunun yapısını kontrol et
        const [contactRolesColumns] = await connection.query(`
            SELECT 
                COLUMN_NAME as column_name, 
                COLUMN_TYPE as column_type, 
                IS_NULLABLE as is_nullable, 
                COLUMN_KEY as column_key
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
            AND table_name = 'contact_roles'
            ORDER BY ordinal_position
        `);
        console.log('\ncontact_roles tablosu yapısı:');
        contactRolesColumns.forEach(column => {
            console.log(`- ${column.column_name}: ${column.column_type} (${column.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}) ${column.column_key}`);
        });

        // Foreign key'leri kontrol et
        const [foreignKeys] = await connection.query(`
            SELECT 
                TABLE_NAME as table_name,
                COLUMN_NAME as column_name,
                REFERENCED_TABLE_NAME as referenced_table_name,
                REFERENCED_COLUMN_NAME as referenced_column_name,
                CONSTRAINT_NAME as constraint_name
            FROM information_schema.key_column_usage
            WHERE table_schema = DATABASE()
            AND referenced_table_name IS NOT NULL
        `);
        console.log('\nForeign key\'ler:');
        foreignKeys.forEach(fk => {
            console.log(`- ${fk.table_name}.${fk.column_name} -> ${fk.referenced_table_name}.${fk.referenced_column_name} (${fk.constraint_name})`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Tablo kontrolü sırasında hata:', error);
        process.exit(1);
    } finally {
        connection.release();
    }
}

checkTables(); 