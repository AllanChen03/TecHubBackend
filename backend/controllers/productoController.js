const db = require('../config/db');

const obtenerProductos = (req, res) => {
  const UsuarioID = req.usuario.id;

  const sql = `
    SELECT 
      p.*,
      s.NombreSede,
      c.EstadoProducto,
      cat.NombreCategoria
    FROM productos p
    LEFT JOIN sedes             s   ON p.SedeID     = s.SedeID
    LEFT JOIN condicionproducto c   ON p.CondicionID = c.CondicionID
    LEFT JOIN categorias        cat ON p.CategoriaID = cat.CategoriaID
    WHERE p.UsuarioID != ?
    AND p.DisponibilidadID = 1
  `;

  db.query(sql, [UsuarioID], (err, results) => {
    if (err) {
      console.error('Error al obtener productos:', err);
      return res.status(500).json({ error: 'Error al consultar los productos' });
    }
    res.json(results);
  });
};
const crearProducto = (req, res) => {
  const {
    NombreProducto,
    DescripcionProducto,
    Precio,
    CategoriaID,
    SedeID,
    CondicionID
  } = req.body;

  const UsuarioID = req.usuario.id;

  const ImagenPath = req.file
    ? req.file.path
    : null;

  const DisponibilidadID = 1;

  const sql = `
    INSERT INTO productos
    (
      NombreProducto,
      DescripcionProducto,
      Precio,
      ImagenPath,
      CategoriaID,
      UsuarioID,
      SedeID,
      CondicionID,
      DisponibilidadID
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      NombreProducto,
      DescripcionProducto,
      Precio,
      ImagenPath,
      CategoriaID,
      UsuarioID,
      SedeID,
      CondicionID,
      DisponibilidadID
    ],
    (err, result) => {
      if (err) {
        console.error('Error al crear producto:', err);
        return res.status(500).json({ error: 'Error al crear producto' });
      }

      res.status(201).json({
        mensaje: 'Producto creado correctamente',
        productoID: result.insertId
      });
    }
  );
};

const actualizarProducto = (req, res) => {
  const { id } = req.params;

  const {
    NombreProducto,
    DescripcionProducto,
    Precio,
    CategoriaID,
    SedeID,
    CondicionID,
    DisponibilidadID
  } = req.body;

  let sql = `
    UPDATE productos
    SET
      NombreProducto = ?,
      DescripcionProducto = ?,
      Precio = ?,
      CategoriaID = ?,
      SedeID = ?,
      CondicionID = ?,
      DisponibilidadID = ?
  `;

  const valores = [
    NombreProducto,
    DescripcionProducto,
    Precio,
    CategoriaID,
    SedeID,
    CondicionID,
    DisponibilidadID
  ];

  if (req.file) {
    sql += `, ImagenPath = ?`;
    valores.push(req.file.path);
  }

  sql += ` WHERE ProductoID = ?`;
  valores.push(id);

  db.query(sql, valores, (err, result) => {
    if (err) {
      console.error('Error al actualizar producto:', err);
      return res.status(500).json({ error: 'Error al actualizar producto' });
    }

    res.json({ mensaje: 'Producto actualizado correctamente' });
  });
};

const eliminarProducto = (req, res) => {
  const { id } = req.params;

  const sql = `DELETE FROM productos WHERE ProductoID = ?`;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error al eliminar producto:', err);
      return res.status(500).json({ error: 'Error al eliminar producto' });
    }

    res.json({ mensaje: 'Producto eliminado correctamente' });
  });
};

// ✅ CORREGIDO: también con JOIN para que "Mis Productos" muestre los nombres
const obtenerMisProductos = (req, res) => {
  const UsuarioID = req.usuario.id;

  const sql = `
    SELECT 
      p.*,
      s.NombreSede,
      c.EstadoProducto,
      cat.NombreCategoria
    FROM productos p
    LEFT JOIN sedes             s   ON p.SedeID     = s.SedeID
    LEFT JOIN condicionproducto c   ON p.CondicionID = c.CondicionID
    LEFT JOIN categorias        cat ON p.CategoriaID = cat.CategoriaID
    WHERE p.UsuarioID = ?
    AND NOT EXISTS (
      SELECT 1 FROM ordenes o
      WHERE o.ProductoID = p.ProductoID
      AND o.EstadoID = 2
    )
  `;

  db.query(sql, [UsuarioID], (err, results) => {
    if (err) {
      console.error('Error al obtener productos:', err);
      return res.status(500).json({ error: 'Error al obtener productos' });
    }

    res.json(results);
  });
};

// Detalle de un producto por ID, incluyendo datos del vendedor
const obtenerProductoPorId = (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT
      p.*,
      s.NombreSede,
      c.EstadoProducto,
      cat.NombreCategoria,
      u.Nombre        AS VendedorNombre,
      u.Apellidos     AS VendedorApellidos,
      u.Telefono      AS VendedorTelefono,
      ROUND(
        (SELECT AVG(com.Valoracion) FROM comentarios com WHERE com.VendedorID = u.UsuarioID),
        1
      )               AS VendedorValoracion,
      (SELECT COUNT(*) + 0 FROM comentarios com WHERE com.VendedorID = u.UsuarioID)
                      AS VendedorTotalResenas
    FROM productos p
    LEFT JOIN sedes             s   ON p.SedeID      = s.SedeID
    LEFT JOIN condicionproducto c   ON p.CondicionID  = c.CondicionID
    LEFT JOIN categorias        cat ON p.CategoriaID  = cat.CategoriaID
    LEFT JOIN usuarios          u   ON p.UsuarioID    = u.UsuarioID
    WHERE p.ProductoID = ?
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('Error al obtener producto:', err);
      return res.status(500).json({ error: 'Error al obtener el producto' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(results[0]);
  });
};

module.exports = {
  obtenerProductos,
  obtenerProductoPorId,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  obtenerMisProductos
};