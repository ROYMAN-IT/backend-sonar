const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'sql105.infinityfree.com',
  user: process.env.DB_USER || 'if0_42681185',
  password: process.env.DB_PASSWORD || '5773adxTYNk',
  database: process.env.DB_NAME || 'if0_42681185_sonar_db',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Tes Koneksi saat startup
pool.getConnection()
  .then((conn) => {
    console.log('⚡ Terhubung ke Database MySQL');
    conn.release();
  })
  .catch((err) => {
    console.error('❌ Error Database MySQL:', err.message);
  });

module.exports = pool;