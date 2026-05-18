const db = require('../config/db');

const obtenerCategorias = (req, res) => {
  const sql = 'SELECT * FROM categorias';
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener categorías:', err);
      return res.status(500).json({ error: 'Error al consultar las categorías' });
    }
    res.json(results);
  });
};

const crearCategoria = (req, res) => {
  const { nombreCategoria } = req.body;

  // ✅ Cloudinary devuelve la URL completa en req.file.path
  const imagenPath = req.file ? req.file.path : null;

  if (!nombreCategoria) {
    return res.status(400).json({ error: 'El nombre de la categoría es obligatorio' });
  }

  const sql = 'INSERT INTO categorias (NombreCategoria, ImagenPath) VALUES (?, ?)';
  
  db.query(sql, [nombreCategoria, imagenPath], (err, result) => {
    if (err) {
      console.error('Error al crear categoría:', err);
      return res.status(500).json({ error: 'Error interno al crear la categoría' });
    }

    res.status(201).json({
      mensaje: 'Categoría creada exitosamente',
      categoriaID: result.insertId,
      nombreCategoria: nombreCategoria,
      imagenPath: imagenPath
    });
  });
};

const actualizarCategoria = (req, res) => {
  const { id } = req.params; 
  const { nombreCategoria } = req.body;

  // ✅ Cloudinary devuelve la URL completa en req.file.path
  const imagenPath = req.file ? req.file.path : null;

  if (!nombreCategoria && !imagenPath) {
    return res.status(400).json({ error: 'No hay datos para actualizar' });
  }

  let sql = '';
  let params = [];

  if (nombreCategoria && imagenPath) {
    sql = 'UPDATE categorias SET NombreCategoria = ?, ImagenPath = ? WHERE CategoriaID = ?';
    params = [nombreCategoria, imagenPath, id];
  } else if (nombreCategoria) {
    sql = 'UPDATE categorias SET NombreCategoria = ? WHERE CategoriaID = ?';
    params = [nombreCategoria, id];
  } else if (imagenPath) {
    sql = 'UPDATE categorias SET ImagenPath = ? WHERE CategoriaID = ?';
    params = [imagenPath, id];
  }

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('Error al actualizar categoría:', err);
      return res.status(500).json({ error: 'Error interno al actualizar la categoría' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json({ mensaje: 'Categoría actualizada exitosamente' });
  });
};

const eliminarCategoria = (req, res) => {
  const { id } = req.params;

  const sql = 'DELETE FROM categorias WHERE CategoriaID = ?';
  
  db.query(sql, [id], (err, result) => {
    if (err) {
      if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
        return res.status(400).json({ 
          error: 'No se puede eliminar esta categoría porque hay productos que pertenecen a ella. Cambia los productos de categoría primero.' 
        });
      }
      console.error('Error al eliminar categoría:', err);
      return res.status(500).json({ error: 'Error interno al eliminar la categoría' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json({ mensaje: 'Categoría eliminada exitosamente' });
  });
};

module.exports = {
  obtenerCategorias,
  crearCategoria,
  actualizarCategoria, 
  eliminarCategoria  
};