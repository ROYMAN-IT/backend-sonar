const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sonar_db',
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