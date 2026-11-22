import mysql from 'mysql2/promise'

// env agar bisa jalan di Docker (host=db) tanpa mengubah perilaku lokal
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'agenda_direksi',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
})
export const q = (sql, params = []) => pool.query(sql, params)
