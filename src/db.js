import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'agenda_direksi',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
})
export const q = (sql, params = []) => pool.query(sql, params)
