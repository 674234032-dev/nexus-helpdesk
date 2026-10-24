
const mysql = require('mysql2/promise');
require('dotenv').config();

// รองรับฐานข้อมูลบนคลาวด์ (เช่น Aiven) ที่ต้องใช้ SSL และพอร์ตเฉพาะ
function sslConfig() {
  if (process.env.DB_SSL_CA) return { ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n') };
  if (process.env.DB_SSL === 'true') return { rejectUnauthorized: false };
  return undefined;
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  ssl: sslConfig(),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nexus_helpdesk',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ทดสอบการเชื่อมต่อฐานข้อมูล
async function testConnection() {
  let connection;

  try {
    connection = await pool.getConnection();

    const [rows] = await connection.query(
      'SELECT DATABASE() AS databaseName'
    );

    console.log(
      'เชื่อมต่อ MySQL สำเร็จ ฐานข้อมูล:',
      rows[0].databaseName
    );

    return true;
  } catch (error) {
    console.error('เชื่อมต่อ MySQL ไม่สำเร็จ:', error.message);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

module.exports = {
  pool,
  testConnection
};
