const db = require('./database');

const sql = `INSERT INTO transacciones (tipo, monto, categoria, fecha, descripcion) VALUES (?, ?, ?, ?, ?)`;
db.run(sql, ['gasto', 300, 'Transporte', '2026-06-23', 'Uber'], function(err) {
    if (err) {
        console.error('ERROR SQL:', err);
    } else {
        console.log('EXITO. InsertId:', this.lastID);
    }
    process.exit();
});
