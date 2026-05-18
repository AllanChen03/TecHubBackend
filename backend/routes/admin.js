const express = require('express');
const router = express.Router();
const adminController = require('../controllers/usuarios/adminController');
const categoriaController = require('../controllers/categoriaController');
const ordenController = require('../controllers/ordenController');
const comentariosController = require('../controllers/comentariosController');
const productoController = require('../controllers/productoController');

const { verificarToken, esAdmin } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Login admin
router.post('/login', adminController.loginAdmin);

// Categorías
router.get('/categorias',     verificarToken, esAdmin, categoriaController.obtenerCategorias);
router.post('/categorias',    verificarToken, esAdmin, upload.single('imagen'), categoriaController.crearCategoria);
router.put('/categorias/:id', verificarToken, esAdmin, upload.single('imagen'), categoriaController.actualizarCategoria);
router.delete('/categorias/:id', verificarToken, esAdmin, categoriaController.eliminarCategoria);

// Usuarios
router.get('/usuarios',       verificarToken, esAdmin, adminController.obtenerUsuarios);
router.post('/usuarios',      verificarToken, esAdmin, adminController.crearUsuario);
router.put('/usuarios/:id',   verificarToken, esAdmin, adminController.actualizarUsuario);
router.delete('/usuarios/:id', verificarToken, esAdmin, adminController.eliminarUsuario);

// Productos
router.get('/productos',      verificarToken, esAdmin, productoController.obtenerProductos);
router.delete('/productos/:id',  verificarToken, esAdmin, productoController.eliminarProducto);

// Órdenes
router.get('/ordenes', verificarToken, esAdmin, ordenController.obtenerOrdenes);

// Comentarios
router.get('/comentarios',        verificarToken, esAdmin, comentariosController.obtenerTodosComentarios);
router.delete('/comentarios/:id', verificarToken, esAdmin, comentariosController.eliminarComentarioAdmin);

module.exports = router;