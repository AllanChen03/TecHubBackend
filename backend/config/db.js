const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ← Agrega esto:
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Error conectando a la BD:', err.message);
  } else {
    console.log('✅ Conectado a la base de datos MySQL');
    connection.release();
  }
});

module.exports = db;