const db = require('../config/db');
const { crearNotificacion } = require('./notificacionesController');

// ==========================================
// 1. OBTENER TODAS LAS ÓRDENES (ADMIN)
// ==========================================
const obtenerOrdenes = (req, res) => {
  const sql = `
    SELECT
      o.OrdenID,
      DATE_FORMAT(o.Fecha - INTERVAL 6 HOUR, '%Y-%m-%dT%H:%i:%s') AS Fecha,
      o.PrecioTotal,
      o.EstadoID,
      p.NombreProducto,
      p.ImagenPath,
      eo.NombreEstado,
      c.Nombre    AS CompradorNombre,
      c.Apellidos AS CompradorApellidos,
      v.Nombre    AS VendedorNombre,
      v.Apellidos AS VendedorApellidos
    FROM ordenes o
    INNER JOIN productos   p  ON o.ProductoID  = p.ProductoID
    INNER JOIN usuarios    c  ON o.CompradorID = c.UsuarioID
    INNER JOIN usuarios    v  ON o.VendedorID  = v.UsuarioID
    INNER JOIN estadoorden eo ON o.EstadoID    = eo.EstadoID
    ORDER BY o.Fecha DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al consultar las órdenes' });
    res.json(results);
  });
};

// ==========================================
// 2. CREAR UNA ORDEN
// ==========================================
const crearOrden = (req, res) => {
  const { PrecioTotal, VendedorID, CompradorID, ProductoID, EstadoID } = req.body;

  if (!PrecioTotal || !VendedorID || !CompradorID || !ProductoID || !EstadoID) {
    return res.status(400).json({ error: 'Faltan datos obligatorios para crear la orden' });
  }

  if (VendedorID === CompradorID) {
    return res.status(400).json({ error: 'No puedes comprar tu propio producto' });
  }

  const sql = `
    INSERT INTO ordenes (Fecha, PrecioTotal, VendedorID, CompradorID, ProductoID, EstadoID)
    VALUES (NOW() - INTERVAL 6 HOUR, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [PrecioTotal, VendedorID, CompradorID, ProductoID, EstadoID], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error interno al crear la orden' });

    db.query('UPDATE productos SET DisponibilidadID = 2 WHERE ProductoID = ?', [ProductoID]);

    res.status(201).json({ mensaje: 'Orden creada exitosamente', ordenID: result.insertId });
  });
};

// ==========================================
// 3. ACEPTAR SOLICITUD DE COMPRA
// ==========================================
const aceptarOrden = (req, res) => {
  const VendedorID = req.usuario.id;
  const { ordenID } = req.params;

  const sqlNotif = `
    SELECT n.ProductoID, n.RemitenteID AS CompradorID,
           p.NombreProducto, p.Precio,
           u.Nombre AS VendedorNombre, u.Apellidos AS VendedorApellidos,
           u.Telefono AS VendedorTelefono
    FROM notificaciones n
    JOIN productos p ON p.ProductoID = n.ProductoID
    JOIN usuarios  u ON u.UsuarioID  = ?
    WHERE n.NotificacionID = ? AND n.Tipo = 'solicitud_compra'
  `;

  db.query(sqlNotif, [VendedorID, ordenID], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al buscar la solicitud' });
    if (results.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });

    const solicitud = results[0];

    const sqlOrden = `
      INSERT INTO ordenes (ProductoID, CompradorID, VendedorID, PrecioTotal, EstadoID, Fecha)
      VALUES (?, ?, ?, ?, 1, NOW() - INTERVAL 6 HOUR)
    `;

    db.query(sqlOrden, [solicitud.ProductoID, solicitud.CompradorID, VendedorID, solicitud.Precio], (err, result) => {
      if (err) return res.status(500).json({ error: 'Error al crear la orden' });

      const nuevaOrdenID = result.insertId;

      db.query('UPDATE productos SET DisponibilidadID = 2 WHERE ProductoID = ?', [solicitud.ProductoID]);
      db.query('DELETE FROM notificaciones WHERE NotificacionID = ?', [ordenID]);

      const nombreVendedor = `${solicitud.VendedorNombre} ${solicitud.VendedorApellidos}`;
      crearNotificacion(
        solicitud.CompradorID,
        `${nombreVendedor} aceptó tu solicitud de compra`,
        `Coordiná la entrega de "${solicitud.NombreProducto}" al número ${solicitud.VendedorTelefono}.`,
        'compra_aceptada',
        solicitud.ProductoID,
        nuevaOrdenID
      );

      res.json({ mensaje: 'Orden creada correctamente', ordenID: nuevaOrdenID });
    });
  });
};

// ==========================================
// 4. COMPLETAR ORDEN
// ==========================================
const completarOrden = (req, res) => {
  const { ordenID } = req.params;

  const sqlOrden = `
    SELECT o.*, p.NombreProducto
    FROM ordenes o
    JOIN productos p ON p.ProductoID = o.ProductoID
    WHERE o.OrdenID = ? AND o.EstadoID = 1
  `;

  db.query(sqlOrden, [ordenID], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al buscar la orden' });
    if (results.length === 0) return res.status(404).json({ error: 'Orden no encontrada o ya procesada' });

    const orden = results[0];

    db.query('UPDATE ordenes SET EstadoID = 2 WHERE OrdenID = ?', [ordenID], (err) => {
      if (err) return res.status(500).json({ error: 'Error al completar la orden' });

      crearNotificacion(
        orden.CompradorID,
        `Tu compra de "${orden.NombreProducto}" fue completada`,
        `Ya podés calificar al vendedor. Tu opinión ayuda a la comunidad TecHub.`,
        'compra_completada',
        orden.ProductoID,
        orden.OrdenID
      );

      res.json({ mensaje: 'Orden completada' });
    });
  });
};

// ==========================================
// 5. CANCELAR ORDEN
// ==========================================
const cancelarOrden = (req, res) => {
  const { ordenID } = req.params;

  const sqlOrden = `
    SELECT o.*, p.NombreProducto
    FROM ordenes o
    JOIN productos p ON p.ProductoID = o.ProductoID
    WHERE o.OrdenID = ? AND o.EstadoID = 1
  `;

  db.query(sqlOrden, [ordenID], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al buscar la orden' });
    if (results.length === 0) return res.status(404).json({ error: 'Orden no encontrada o ya procesada' });

    const orden = results[0];

    db.query('DELETE FROM ordenes WHERE OrdenID = ?', [ordenID], (err) => {
      if (err) return res.status(500).json({ error: 'Error al cancelar la orden' });

      db.query('UPDATE productos SET DisponibilidadID = 1 WHERE ProductoID = ?', [orden.ProductoID]);

      crearNotificacion(
        orden.CompradorID,
        `La compra de "${orden.NombreProducto}" fue cancelada`,
        `El vendedor canceló la orden. El producto vuelve a estar disponible.`,
        'compra_cancelada',
        orden.ProductoID,
        null
      );

      res.json({ mensaje: 'Orden cancelada' });
    });
  });
};

// ==========================================
// 6. ACTUALIZAR ESTADO (ADMIN)
// ==========================================
const actualizarEstadoOrden = (req, res) => {
  const { id } = req.params;
  const { EstadoID } = req.body;

  if (!EstadoID) return res.status(400).json({ error: 'El EstadoID es obligatorio' });

  db.query('UPDATE ordenes SET EstadoID = ? WHERE OrdenID = ?', [EstadoID, id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error interno al actualizar la orden' });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Orden no encontrada' });

    if (EstadoID == 3) {
      const sqlProducto = `
        UPDATE productos SET DisponibilidadID = 1
        WHERE ProductoID = (SELECT ProductoID FROM ordenes WHERE OrdenID = ?)
      `;
      db.query(sqlProducto, [id]);
    }

    res.json({ mensaje: 'Estado de la orden actualizado exitosamente' });
  });
};

// ==========================================
// 7. ELIMINAR ORDEN (ADMIN)
// ==========================================
const eliminarOrden = (req, res) => {
  const { id } = req.params;

  db.query('DELETE FROM ordenes WHERE OrdenID = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error interno al eliminar la orden' });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Orden no encontrada' });
    res.json({ mensaje: 'Orden eliminada exitosamente' });
  });
};

// ==========================================
// 8. MIS COMPRAS (usa token)
// ==========================================
const obtenerMisCompras = (req, res) => {
  const CompradorID = req.usuario.id;

  const sql = `
    SELECT
      o.OrdenID,
      DATE_FORMAT(o.Fecha - INTERVAL 6 HOUR, '%Y-%m-%dT%H:%i:%s') AS Fecha,
      o.PrecioTotal,
      o.EstadoID,
      o.ProductoID,
      p.NombreProducto,
      p.ImagenPath,
      eo.NombreEstado,
      v.Nombre    AS VendedorNombre,
      v.Apellidos AS VendedorApellidos
    FROM ordenes o
    INNER JOIN productos   p  ON o.ProductoID = p.ProductoID
    INNER JOIN usuarios    v  ON o.VendedorID = v.UsuarioID
    INNER JOIN estadoorden eo ON o.EstadoID   = eo.EstadoID
    WHERE o.CompradorID = ?
    ORDER BY o.Fecha DESC
  `;

  db.query(sql, [CompradorID], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener tus compras' });
    res.json(results);
  });
};

// ==========================================
// 9. MIS VENTAS (usa token)
// ==========================================
const obtenerMisVentas = (req, res) => {
  const VendedorID = req.usuario.id;

  const sql = `
    SELECT
      o.OrdenID,
      DATE_FORMAT(o.Fecha - INTERVAL 6 HOUR, '%Y-%m-%dT%H:%i:%s') AS Fecha,
      o.PrecioTotal,
      o.EstadoID,
      o.ProductoID,
      o.CompradorID,
      p.NombreProducto,
      p.ImagenPath,
      eo.NombreEstado,
      c.Nombre    AS CompradorNombre,
      c.Apellidos AS CompradorApellidos,
      (SELECT COUNT(*) + 0 FROM comentariosAlComprador cac
       WHERE cac.VendedorID = ? AND cac.ProductoID = o.ProductoID
      ) AS YaCalificadoComprador
    FROM ordenes o
    INNER JOIN productos   p  ON o.ProductoID  = p.ProductoID
    INNER JOIN usuarios    c  ON o.CompradorID = c.UsuarioID
    INNER JOIN estadoorden eo ON o.EstadoID    = eo.EstadoID
    WHERE o.VendedorID = ?
    ORDER BY o.Fecha DESC
  `;

  db.query(sql, [VendedorID, VendedorID], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener tus ventas' });
    res.json(results);
  });
};

// ==========================================
// 10. DETALLE PARA CALIFICAR
// ==========================================
const obtenerDetalleOrden = (req, res) => {
  const CompradorID = req.usuario.id;
  const { ordenID } = req.params;

  const sql = `
    SELECT
      o.OrdenID,
      o.ProductoID,
      o.VendedorID,
      o.EstadoID,
      p.NombreProducto,
      p.ImagenPath,
      v.Nombre    AS VendedorNombre,
      v.Apellidos AS VendedorApellidos,
      (SELECT COUNT(*) + 0 FROM comentarios c
       WHERE c.CompradorID = ? AND c.ProductoID = o.ProductoID
      ) AS YaCalificado
    FROM ordenes o
    JOIN productos p ON p.ProductoID = o.ProductoID
    JOIN usuarios  v ON v.UsuarioID  = o.VendedorID
    WHERE o.OrdenID = ? AND o.CompradorID = ? AND o.EstadoID = 2
  `;

  db.query(sql, [CompradorID, ordenID, CompradorID], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener la orden' });
    if (results.length === 0) return res.status(404).json({ error: 'Orden no encontrada o no autorizada' });
    res.json(results[0]);
  });
};

// ==========================================
// DETALLE DE VENTA PARA QUE VENDEDOR CALIFIQUE
// ==========================================
const obtenerDetalleVenta = (req, res) => {
  const VendedorID = req.usuario.id;
  const { ordenID } = req.params;

  const sql = `
    SELECT
      o.OrdenID,
      o.ProductoID,
      o.CompradorID,
      o.EstadoID,
      p.NombreProducto,
      p.ImagenPath,
      c.Nombre    AS CompradorNombre,
      c.Apellidos AS CompradorApellidos,
      (SELECT COUNT(*) + 0 FROM comentariosAlComprador cac
       WHERE cac.VendedorID = ? AND cac.ProductoID = o.ProductoID
      ) AS YaCalificado
    FROM ordenes o
    JOIN productos p ON p.ProductoID = o.ProductoID
    JOIN usuarios  c ON c.UsuarioID  = o.CompradorID
    WHERE o.OrdenID = ? AND o.VendedorID = ? AND o.EstadoID = 2
  `;

  db.query(sql, [VendedorID, ordenID, VendedorID], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener la orden' });
    if (results.length === 0) return res.status(404).json({ error: 'Orden no encontrada o no autorizada' });
    res.json(results[0]);
  });
};

// ==========================================
// EXPORTAR
// ==========================================
module.exports = {
  obtenerOrdenes,
  crearOrden,
  aceptarOrden,
  completarOrden,
  cancelarOrden,
  actualizarEstadoOrden,
  eliminarOrden,
  obtenerMisCompras,
  obtenerMisVentas,
  obtenerDetalleOrden,
  obtenerDetalleVenta,
};