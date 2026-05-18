const db = require('../config/db');

const obtenerComentariosPorProducto = (req, res) => {
  const { productoID } = req.params;

  const sql = `
    SELECT c.*, u.Nombre, u.Apellidos 
    FROM comentarios c
    JOIN usuarios u ON c.CompradorID = u.UsuarioID
    WHERE c.ProductoID = ?
    ORDER BY c.Fecha DESC
  `;
  
  db.query(sql, [productoID], (err, results) => {
    if (err) {
      console.error('Error al obtener comentarios:', err);
      return res.status(500).json({ error: 'Error al consultar los comentarios' });
    }
    res.json(results);
  });
};

const crearComentario = (req, res) => {
  const { ProductoID, VendedorID, Texto, Valoracion } = req.body;
  // ✅ CompradorID viene del token, no del body
  const CompradorID = req.usuario.id;

  if (!ProductoID || !VendedorID || !Valoracion) {
    return res.status(400).json({ error: 'Faltan datos obligatorios para la reseña' });
  }

  if (Valoracion < 1 || Valoracion > 5) {
    return res.status(400).json({ error: 'La valoración debe ser entre 1 y 5' });
  }

  const sql = `
    INSERT INTO comentarios 
    (ProductoID, CompradorID, VendedorID, Comentario, Valoracion, FechaComentario) 
    VALUES (?, ?, ?, ?, ?, NOW() - INTERVAL 6 HOUR)
  `;
  
  db.query(sql, [ProductoID, CompradorID, VendedorID, Texto, Valoracion], (err, result) => {
    if (err) {
      console.error('Error al crear comentario:', err);
      return res.status(500).json({ error: 'Error interno al guardar el comentario' });
    }
    res.status(201).json({ mensaje: '¡Gracias por tu reseña!', comentarioID: result.insertId });
  });
};

// ✅ NUEVA: calificar luego de una compra completada
const calificarVendedor = (req, res) => {
  const CompradorID = req.usuario.id;
  const { ordenID } = req.params;
  const { valoracion, texto } = req.body;

  if (!valoracion || valoracion < 1 || valoracion > 5) {
    return res.status(400).json({ error: 'La valoración debe ser entre 1 y 5' });
  }

  // 1. Verificar que la orden existe, es del comprador y está completada
  const sqlOrden = `
    SELECT o.ProductoID, o.VendedorID
    FROM ordenes o
    WHERE o.OrdenID = ? AND o.CompradorID = ? AND o.EstadoID = 2
  `;

  db.query(sqlOrden, [ordenID, CompradorID], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al verificar la orden' });
    if (results.length === 0) {
      return res.status(404).json({ error: 'Orden no encontrada o no autorizada' });
    }

    const { ProductoID, VendedorID } = results[0];

    // 2. Verificar que no haya calificado ya este producto
    db.query(
      'SELECT COUNT(*) + 0 AS total FROM comentarios WHERE CompradorID = ? AND ProductoID = ?',
      [CompradorID, ProductoID],
      (err, check) => {
        if (err) return res.status(500).json({ error: 'Error al verificar calificación' });
        if (check[0].total > 0) {
          return res.status(400).json({ error: 'Ya calificaste esta compra' });
        }

        // 3. Guardar la calificación
        const sqlInsert = `
          INSERT INTO comentarios (ProductoID, CompradorID, VendedorID, Comentario, Valoracion, FechaComentario)
          VALUES (?, ?, ?, ?, ?, NOW() - INTERVAL 6 HOUR)
        `;

        db.query(sqlInsert, [ProductoID, CompradorID, VendedorID, texto || '', valoracion], (err) => {
          if (err) return res.status(500).json({ error: 'Error al guardar la calificación' });

          // 4. Eliminar la notificacion de compra_completada
          db.query(
            "DELETE FROM notificaciones WHERE OrdenID = ? AND Tipo = 'compra_completada' AND UsuarioID = ?",
            [ordenID, CompradorID]
          );

          res.json({ mensaje: 'Calificación guardada exitosamente' });
        });
      }
    );
  });
};

const actualizarComentario = (req, res) => {
  const { id } = req.params;
  const { Texto, Valoracion } = req.body;
  // ✅ CompradorID viene del token
  const CompradorID = req.usuario.id;

  if (Valoracion && (Valoracion < 1 || Valoracion > 5)) {
    return res.status(400).json({ error: 'La valoración debe ser entre 1 y 5' });
  }

  const sql = `
    UPDATE comentarios 
    SET Comentario = ?, Valoracion = ? 
    WHERE ComentarioID = ? AND CompradorID = ?
  `;
  
  db.query(sql, [Texto, Valoracion, id, CompradorID], (err, result) => {
    if (err) {
      console.error('Error al actualizar comentario:', err);
      return res.status(500).json({ error: 'Error interno al actualizar el comentario' });
    }
    if (result.affectedRows === 0) {
      return res.status(403).json({ error: 'Comentario no encontrado o no tienes permiso para editarlo' });
    }
    res.json({ mensaje: 'Comentario actualizado exitosamente' });
  });
};

const eliminarComentario = (req, res) => {
  const { id } = req.params;
  // ✅ CompradorID viene del token
  const CompradorID = req.usuario.id;

  const sql = `DELETE FROM comentarios WHERE ComentarioID = ? AND CompradorID = ?`;
  
  db.query(sql, [id, CompradorID], (err, result) => {
    if (err) {
      console.error('Error al eliminar comentario:', err);
      return res.status(500).json({ error: 'Error al eliminar el comentario' });
    }
    if (result.affectedRows === 0) {
      return res.status(403).json({ error: 'No se encontró el comentario o no estás autorizado para borrarlo' });
    }
    res.json({ mensaje: 'Comentario eliminado correctamente' });
  });
};

// ==========================================
// OBTENER MI VALORACIÓN PROMEDIO
// ==========================================
const obtenerMiValoracion = (req, res) => {
  const VendedorID = req.usuario.id;

  const sql = `
    SELECT 
      ROUND(AVG(Valoracion), 1) AS Promedio,
      COUNT(*) + 0              AS Total
    FROM comentarios
    WHERE VendedorID = ?
  `;

  db.query(sql, [VendedorID], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener valoración' });
    res.json({
      promedio: results[0].Promedio ? parseFloat(results[0].Promedio) : null,
      total: Number(results[0].Total)  // MySQL2 devuelve COUNT como BigInt
    });
  });
};

// ==========================================
// PERFIL PÚBLICO: info + valoracion
// ==========================================
const obtenerPerfilPublico = (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT
      u.UsuarioID,
      u.Nombre,
      u.Apellidos,
      ROUND((SELECT AVG(c.Valoracion) FROM comentarios c
             WHERE c.VendedorID = u.UsuarioID), 1)          AS PromedioVendedor,
      ROUND((SELECT AVG(cac.Valoracion) FROM comentariosAlComprador cac
             WHERE cac.CompradorID = u.UsuarioID), 1)       AS PromedioComprador
    FROM usuarios u
    WHERE u.UsuarioID = ?
  `;

  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener el perfil' });
    if (results.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    const r = results[0];
    res.json({
      UsuarioID:         r.UsuarioID,
      Nombre:            r.Nombre,
      Apellidos:         r.Apellidos,
      PromedioVendedor:  r.PromedioVendedor  ? parseFloat(r.PromedioVendedor)  : null,
      PromedioComprador: r.PromedioComprador ? parseFloat(r.PromedioComprador) : null,
    });
  });
};

// ==========================================
// PERFIL PÚBLICO: comentarios recibidos
// ==========================================
const obtenerComentariosVendedor = (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT
      c.ComentarioID,
      c.Comentario,
      c.Valoracion,
      DATE_FORMAT(c.FechaComentario - INTERVAL 6 HOUR, '%Y-%m-%dT%H:%i:%s') AS Fecha,
      p.NombreProducto,
      u.Nombre    AS CompradorNombre,
      u.Apellidos AS CompradorApellidos
    FROM comentarios c
    JOIN productos p ON p.ProductoID  = c.ProductoID
    JOIN usuarios  u ON u.UsuarioID   = c.CompradorID
    WHERE c.VendedorID = ?
    ORDER BY c.FechaComentario DESC
  `;

  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener comentarios' });
    res.json(results);
  });
};

// ==========================================
// VENDEDOR CALIFICA AL COMPRADOR
// ==========================================
const calificarComprador = (req, res) => {
  const VendedorID = req.usuario.id;
  const { ordenID } = req.params;
  const { valoracion, comentario } = req.body;

  if (!valoracion || valoracion < 1 || valoracion > 5) {
    return res.status(400).json({ error: 'La valoración debe ser entre 1 y 5' });
  }

  // 1. Verificar que la orden existe, es del vendedor y está completada
  const sqlOrden = `
    SELECT o.ProductoID, o.CompradorID
    FROM ordenes o
    WHERE o.OrdenID = ? AND o.VendedorID = ? AND o.EstadoID = 2
  `;

  db.query(sqlOrden, [ordenID, VendedorID], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al verificar la orden' });
    if (results.length === 0) return res.status(404).json({ error: 'Orden no encontrada o no autorizada' });

    const { ProductoID, CompradorID } = results[0];

    // 2. Verificar que no haya calificado ya
    db.query(
      'SELECT COUNT(*) + 0 AS total FROM comentariosAlComprador WHERE VendedorID = ? AND ProductoID = ?',
      [VendedorID, ProductoID],
      (err, check) => {
        if (err) return res.status(500).json({ error: 'Error al verificar calificación' });
        if (check[0].total > 0) return res.status(400).json({ error: 'Ya calificaste a este comprador' });

        // 3. Insertar calificación
        const sqlInsert = `
          INSERT INTO comentariosAlComprador (ProductoID, VendedorID, CompradorID, Comentario, Valoracion, FechaComentario)
          VALUES (?, ?, ?, ?, ?, NOW() - INTERVAL 6 HOUR)
        `;

        db.query(sqlInsert, [ProductoID, VendedorID, CompradorID, comentario || '', valoracion], (err) => {
          if (err) return res.status(500).json({ error: 'Error al guardar la calificación' });
          res.json({ mensaje: 'Calificación guardada exitosamente' });
        });
      }
    );
  });
};

// ==========================================
// OBTENER VALORACIÓN PROMEDIO COMO COMPRADOR
// ==========================================
const obtenerMiValoracionComprador = (req, res) => {
  const CompradorID = req.usuario.id;

  const sql = `
    SELECT
      ROUND(AVG(Valoracion), 1) AS Promedio,
      COUNT(*) + 0              AS Total
    FROM comentariosAlComprador
    WHERE CompradorID = ?
  `;

  db.query(sql, [CompradorID], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener valoración' });
    res.json({
      promedio: results[0].Promedio ? parseFloat(results[0].Promedio) : null,
      total: Number(results[0].Total)
    });
  });
};

// ==========================================
// COMENTARIOS RECIBIDOS COMO COMPRADOR
// ==========================================
const obtenerComentariosComprador = (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT
      cac.ComentarioID,
      cac.Comentario,
      cac.Valoracion,
      DATE_FORMAT(cac.FechaComentario - INTERVAL 6 HOUR, '%Y-%m-%dT%H:%i:%s') AS Fecha,
      p.NombreProducto,
      u.Nombre    AS VendedorNombre,
      u.Apellidos AS VendedorApellidos
    FROM comentariosAlComprador cac
    JOIN productos p ON p.ProductoID = cac.ProductoID
    JOIN usuarios  u ON u.UsuarioID  = cac.VendedorID
    WHERE cac.CompradorID = ?
    ORDER BY cac.FechaComentario DESC
  `;

  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener comentarios' });
    res.json(results);
  });
};

// ==========================================
// ADMIN: obtener TODOS los comentarios
// ==========================================
const obtenerTodosComentarios = (req, res) => {
  const sql = `
    SELECT
      c.ComentarioID,
      c.Comentario,
      c.Valoracion,
      DATE_FORMAT(c.FechaComentario - INTERVAL 6 HOUR, '%Y-%m-%dT%H:%i:%s') AS Fecha,
      p.NombreProducto,
      comprador.Nombre    AS CompradorNombre,
      comprador.Apellidos AS CompradorApellidos,
      vendedor.Nombre     AS VendedorNombre,
      vendedor.Apellidos  AS VendedorApellidos
    FROM comentarios c
    JOIN productos p              ON p.ProductoID  = c.ProductoID
    JOIN usuarios   comprador     ON comprador.UsuarioID = c.CompradorID
    JOIN usuarios   vendedor      ON vendedor.UsuarioID  = c.VendedorID
    ORDER BY c.FechaComentario DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener comentarios' });
    res.json(results);
  });
};

// ==========================================
// ADMIN: eliminar cualquier comentario
// ==========================================
const eliminarComentarioAdmin = (req, res) => {
  const { id } = req.params;

  // Solo borra el texto, mantiene la valoración para no afectar el promedio
  db.query(
    "UPDATE comentarios SET Comentario = '' WHERE ComentarioID = ?",
    [id],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Error al eliminar el comentario' });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Comentario no encontrado' });
      res.json({ mensaje: 'Comentario eliminado correctamente' });
    }
  );
};

module.exports = {
  obtenerComentariosPorProducto,
  crearComentario,
  calificarVendedor,
  calificarComprador,
  obtenerMiValoracion,
  obtenerMiValoracionComprador,
  obtenerPerfilPublico,
  obtenerComentariosVendedor,
  obtenerComentariosComprador,
  actualizarComentario,
  eliminarComentario,
  obtenerTodosComentarios,
  eliminarComentarioAdmin
};