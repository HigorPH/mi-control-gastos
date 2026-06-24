const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Probar conexión y crear tabla
connection.getConnection((err, conn) => {
    if (err) {
        console.error('Error al conectar a MySQL en Alwaysdata:', err.message);
    } else {
        console.log('Conectado a la base de datos MySQL (Alwaysdata).');
        
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS transacciones (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tipo VARCHAR(10) NOT NULL CHECK(tipo IN ('ingreso', 'gasto')),
                monto DECIMAL(10, 2) NOT NULL,
                categoria VARCHAR(50) NOT NULL,
                fecha DATE NOT NULL,
                descripcion TEXT
            )
        `;
        
        conn.query(createTableQuery, (err) => {
            if (err) {
                console.error('Error al crear la tabla transacciones:', err.message);
            } else {
                console.log('Tabla transacciones lista en MySQL.');
            }
            conn.release();
        });
    }
});

// Exportar una interfaz similar a la que teníamos con sqlite3 para no reescribir todo el servidor
const db = {
    all: (sql, params, callback) => {
        connection.query(sql, params, (err, results) => {
            callback(err, results);
        });
    },
    run: (sql, params, callback) => {
        connection.query(sql, params, function(err, results) {
            const context = {};
            if (results) {
                context.lastID = results.insertId;
                context.changes = results.affectedRows;
            }
            if (callback) {
                callback.call(context, err);
            }
        });
    },
    get: (sql, params, callback) => {
        connection.query(sql, params, (err, results) => {
            callback(err, results && results.length > 0 ? results[0] : null);
        });
    }
};

module.exports = db;
