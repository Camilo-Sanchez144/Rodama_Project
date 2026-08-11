const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Configuración de la base de datos MySQL (localhost, root, sin contraseña)
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'tienda_online'
};

// Crear pool de conexiones
const pool = mysql.createPool(dbConfig);

// ==========================================
// ENDPOINTS DE PEDIDO
// ==========================================

// 1. GET /api/pedido -> Obtener todos los pedidos con sus detalles

// GET /api/productos -> Obtener el catálogo completo de productos con sus detalles e imágenes
app.get('/api/productos', async (req, res) => {
    try {
        // 1. Obtener la lista base de productos
        const [productos] = await pool.query(`
            SELECT id_producto AS id, nombre AS name, precio AS price, categoria AS category
            FROM producto
        `);

        // 2. Mapear cada producto para traer sus imágenes y stock por talla
        for (let producto of productos) {
            // Traer imágenes
            const [imagenes] = await pool.query(`
                SELECT url FROM imagen_producto WHERE id_producto = ?
            `, [producto.id]);

            producto.images = imagenes.map(img => img.url);
            producto.image = producto.images[0] || 'https://via.placeholder.com/700x900?text=Producto';

            // Traer variantes (tallas, color y stock)
            const [detalles] = await pool.query(`
                SELECT talla, stock, color FROM detalle_producto WHERE id_producto = ?
            `, [producto.id]);

            // Construir el objeto stockBySize y calcular stock total
            const stockBySize = {};
            let stockTotal = 0;

            detalles.forEach(d => {
                stockBySize[d.talla] = d.stock;
                stockTotal += d.stock;
            });

            producto.stockBySize = stockBySize;
            producto.stock = stockTotal;
            producto.sizes = Object.keys(stockBySize);
        }

        res.json(productos);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }
});

app.get('/api/pedido', async (req, res) => {
    try {
        const [pedidos] = await pool.query(`
            SELECT p.id_pedido, p.id_usuario, p.direccion, p.fecha, p.precio AS total_pedido,
                   u.nombre AS usuario_nombre, u.apellido AS usuario_apellido
            FROM pedido p
            LEFT JOIN usuario u ON p.id_usuario = u.id
            ORDER BY p.id_pedido DESC
        `);

        // Obtener detalles para cada pedido
        for (let pedido of pedidos) {
            const [detalles] = await pool.query(`
                SELECT dp.id_detalle_pedido, dp.id_producto, dp.cantidad, dp.precio, dp.fecha_de_compra,
                       pr.nombre AS producto_nombre
                FROM detalle_pedido dp
                LEFT JOIN producto pr ON dp.id_producto = pr.id_producto
                WHERE dp.id_pedido = ?
            `, [pedido.id_pedido]);
            pedido.detalles = detalles;
        }

        res.json({ status: 'success', data: pedidos });
    } catch (error) {
        console.error('Error al obtener pedidos:', error);
        res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }
});

// 2. GET /api/pedido/:id -> Obtener un pedido específico por ID
app.get('/api/pedido/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [pedidos] = await pool.query(`
            SELECT p.id_pedido, p.id_usuario, p.direccion, p.fecha, p.precio AS total_pedido,
                   u.nombre AS usuario_nombre, u.correo
            FROM pedido p
            LEFT JOIN usuario u ON p.id_usuario = u.id
            WHERE p.id_pedido = ?
        `, [id]);

        if (pedidos.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Pedido no encontrado' });
        }

        const pedido = pedidos[0];
        const [detalles] = await pool.query(`
            SELECT dp.id_detalle_pedido, dp.id_producto, dp.cantidad, dp.precio, dp.fecha_de_compra,
                   pr.nombre AS producto_nombre
            FROM detalle_pedido dp
            LEFT JOIN producto pr ON dp.id_producto = pr.id_producto
            WHERE dp.id_pedido = ?
        `, [id]);

        pedido.detalles = detalles;
        res.json({ status: 'success', data: pedido });
    } catch (error) {
        console.error('Error al obtener el pedido:', error);
        res.status(500).json({ status: 'error', message: 'Error al consultar la base de datos' });
    }
});

// 3. POST /api/pedido -> Crear un nuevo pedido con sus detalles
app.post('/api/pedido', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id_usuario, direccion, items } = req.body;

        if (!id_usuario || !direccion || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ status: 'error', message: 'Faltan datos obligatorios del pedido' });
        }

        // Calcular el total del pedido
        const totalPrecio = items.reduce((total, item) => total + (item.price * item.quantity), 0);
        const fechaActual = new Date().toISOString().split('T')[0];

        // Insertar en la tabla pedido
        const [resPedido] = await connection.query(
            `INSERT INTO pedido (id_usuario, direccion, fecha, precio) VALUES (?, ?, ?, ?)`,
            [id_usuario, direccion, fechaActual, totalPrecio]
        );

        const idPedidoGenerado = resPedido.insertId;

        // Insertar en la tabla detalle_pedido para cada producto
        for (const item of items) {
            await connection.query(
                `INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio, fecha_de_compra) 
                 VALUES (?, ?, ?, ?, ?)`,
                [idPedidoGenerado, item.productId || 1, item.quantity, item.price, fechaActual]
            );
        }

        await connection.commit();
        res.status(201).json({
            status: 'success',
            message: 'Pedido registrado con éxito',
            id_pedido: idPedidoGenerado
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error al guardar el pedido:', error);
        res.status(500).json({ status: 'error', message: 'Error al procesar la compra en la base de datos' });
    } finally {
        connection.release();
    }
});

// 4. DELETE /api/pedido/:id -> Eliminar un pedido por ID
app.delete('/api/pedido/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [resultado] = await pool.query(`DELETE FROM pedido WHERE id_pedido = ?`, [id]);

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'Pedido no encontrado' });
        }

        res.json({ status: 'success', message: `Pedido ${id} eliminado correctamente` });
    } catch (error) {
        console.error('Error al eliminar pedido:', error);
        res.status(500).json({ status: 'error', message: 'Error al eliminar el pedido' });
    }
});

// Servir archivos estáticos del frontend
app.use(express.static(__dirname));

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor API corriendo en http://localhost:${PORT}`);
});