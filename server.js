require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./database');
const path = require('path');
const twilio = require('twilio');
const ExcelJS = require('exceljs');

// Configuración de Twilio
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER;
const myNumber = process.env.MY_WHATSAPP_NUMBER;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json()); // Para parsear JSON
app.use(express.urlencoded({ extended: false })); // Para parsear webhooks de Twilio
app.use(express.static(path.join(__dirname, 'frontend'))); // Servir archivos estáticos

// --- RUTAS DE LA API ---

// 1. Obtener todas las transacciones
app.get('/api/transacciones', (req, res) => {
    const sql = "SELECT * FROM transacciones ORDER BY fecha DESC";
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ data: rows });
    });
});

// 2. Crear una nueva transacción
app.post('/api/transacciones', (req, res) => {
    const { tipo, monto, categoria, fecha, descripcion } = req.body;
    
    // Validación básica
    if (!tipo || !monto || !categoria || !fecha) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const sql = `INSERT INTO transacciones (tipo, monto, categoria, fecha, descripcion) VALUES (?, ?, ?, ?, ?)`;
    const params = [tipo, monto, categoria, fecha, descripcion];

    db.run(sql, params, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({
            message: 'Transacción creada',
            data: { id: this.lastID, tipo, monto, categoria, fecha, descripcion }
        });
    });
});

// 3. Eliminar una transacción
app.delete('/api/transacciones/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'DELETE FROM transacciones WHERE id = ?';

    db.run(sql, id, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Transacción eliminada', changes: this.changes });
    });
});

// 4. Exportar transacciones a Excel
app.get('/api/exportar', (req, res) => {
    const sql = "SELECT * FROM transacciones ORDER BY fecha DESC";
    db.all(sql, [], async (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Gastos e Ingresos');

        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Tipo', key: 'tipo', width: 15 },
            { header: 'Monto', key: 'monto', width: 15 },
            { header: 'Categoría', key: 'categoria', width: 25 },
            { header: 'Fecha', key: 'fecha', width: 15 },
            { header: 'Descripción', key: 'descripcion', width: 40 },
        ];

        // Añadir filas
        rows.forEach(row => {
            worksheet.addRow(row);
        });

        // Estilos básicos
        worksheet.getRow(1).font = { bold: true };
        
        // Estilo de moneda
        worksheet.getColumn('monto').numFmt = '$#,##0.00';

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + 'Historial_Gastos.xlsx');

        await workbook.xlsx.write(res);
        res.status(200).end();
    });
});

// 5. Webhook para recibir mensajes de WhatsApp (Chatbot)
const MessagingResponse = require('twilio').twiml.MessagingResponse;

app.post('/api/webhook/whatsapp', (req, res) => {
    const mensajeEntrante = req.body.Body.trim();
    const numeroRemitente = req.body.From;

    console.log(`Mensaje recibido de ${numeroRemitente}: ${mensajeEntrante}`);

    // Formato esperado: "Gasto 150 Comida Cena" o "Ingreso 1000 Sueldo Quincena"
    const partes = mensajeEntrante.split(' ');
    
    const twiml = new MessagingResponse();

    if (partes.length < 3) {
        twiml.message('❌ Formato incorrecto. Usa: [Tipo] [Monto] [Categoría] [Descripción]');
        return res.type('text/xml').send(twiml.toString());
    }

    const tipoRaw = partes[0].toLowerCase();
    const tipo = (tipoRaw === 'gasto' || tipoRaw === 'ingreso') ? tipoRaw : null;
    const monto = parseFloat(partes[1]);
    const categoria = partes[2];
    const descripcion = partes.slice(3).join(' ') || 'Registro por WhatsApp';
    const fecha = new Date().toISOString().split('T')[0];

    if (!tipo || isNaN(monto)) {
        twiml.message('❌ Error: El tipo debe ser "Gasto" o "Ingreso" y el monto debe ser un número.');
        return res.type('text/xml').send(twiml.toString());
    }

    const sql = `INSERT INTO transacciones (tipo, monto, categoria, fecha, descripcion) VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [tipo, monto, categoria, fecha, descripcion], function(err) {
        if (err) {
            twiml.message('❌ Hubo un error al guardar en la base de datos.');
        } else {
            twiml.message(`✅ ¡Listo! Guardé un ${tipo} por $${monto} en la categoría "${categoria}".`);
        }
        res.type('text/xml').send(twiml.toString());
    });
});

// --- VERCEL CRON JOBS (Reemplazo de node-cron) ---

// 1. Revisión Diaria
app.get('/api/cron/diario', (req, res) => {
    // Seguridad básica (en producción deberías validar un header secreto de Vercel)
    console.log('Ejecutando revisión diaria de gastos desde Vercel Cron...');
    const hoy = new Date().toISOString().split('T')[0];
    const sql = "SELECT COUNT(*) as count FROM transacciones WHERE fecha = ? AND tipo = 'gasto'";
    db.get(sql, [hoy], (err, row) => {
        if (!err && row.count === 0) {
            enviarWhatsApp('👋 ¡Hola! Soy tu asistente financiero. No olvides registrar tus gastos de hoy.');
        }
        res.status(200).json({ message: 'Cron diario ejecutado' });
    });
});

// 2. Resumen Mensual (Se ejecuta el día 1 de cada mes a las 10:00 AM)
app.get('/api/cron/mensual', (req, res) => {
    console.log('Generando resumen mensual desde Vercel Cron...');
    
    // Calcular el mes anterior
    const fechaActual = new Date();
    fechaActual.setMonth(fechaActual.getMonth() - 1); // Mes anterior
    const mes = (fechaActual.getMonth() + 1).toString().padStart(2, '0');
    const anio = fechaActual.getFullYear();
    const patronBusqueda = `${anio}-${mes}-%`;

    const sql = "SELECT SUM(monto) as total FROM transacciones WHERE tipo = 'gasto' AND fecha LIKE ?";
    
    db.get(sql, [patronBusqueda], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const totalGastado = row.total || 0;
        const mensaje = `📊 *Resumen Mensual*\n¡Hola! El mes ha terminado. Tu gasto total del mes pasado fue de *$${Number(totalGastado).toFixed(2)}*.\n\nRecuerda revisar tu dashboard y exportar a Excel para llevar un control detallado.`;
        
        enviarWhatsApp(mensaje);
        res.status(200).json({ message: 'Cron mensual ejecutado' });
    });
});

// Función genérica para enviar WhatsApp
function enviarWhatsApp(texto) {
    if (!myNumber || myNumber.includes('<TU_NUMERO_AQUI>')) return;
    
    twilioClient.messages.create({
        body: texto,
        from: twilioNumber,
        to: myNumber
    }).catch(console.error);
}

// Iniciar el servidor SOLO si se corre localmente (Vercel usa module.exports)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Servidor local corriendo en http://localhost:${PORT}`);
    });
}

// Exportar app para Vercel Serverless
module.exports = app;

// Ruta de prueba para disparar el mensaje manualmente (para que puedas probar)
app.get('/api/test-whatsapp', (req, res) => {
    enviarRecordatorioWhatsApp();
    res.json({ message: 'Se ha intentado enviar el mensaje de WhatsApp. Revisa la consola del servidor.' });
});
