const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const registroController = require('../controllers/usuarios/registroController');
const usuarioController = require('../controllers/usuarios/usuarioController');
const productoController = require('../controllers/productoController');
const categoriaController = require('../controllers/categoriaController');
const ordenController = require('../controllers/ordenController');
const publicacionesController = require('../controllers/publicacionesController');
const notificacionesController = require('../controllers/notificacionesController');
const comentariosController = require('../controllers/comentariosController');


const { upload } = require('../middleware/upload');


// Autenticación y Registro
router.post('/registro', registroController.crearUsuario);
router.put('/:id', verificarToken, registroController.editarUsuario);
router.post('/login', usuarioController.login);
router.post('/verificar', registroController.verificarCuenta);
router.put('/:id/password', verificarToken, usuarioController.editarContrasena);
router.delete('/:id', verificarToken, registroController.eliminarUsuario);

// Recuperar contraseña
router.post('/recuperarContrasena', usuarioController.solicitarRecuperacion);
router.post('/restablecerContrasena', usuarioController.restablecerContrasena);
router.post('/reenviarCodigo', registroController.reenviarCodigoRegistro);

// Categorías
router.get('/categorias', verificarToken, categoriaController.obtenerCategorias);

// Productos
router.get('/productos', verificarToken, productoController.obtenerProductos);
router.get('/productos/:id', productoController.obtenerProductoPorId);

// Ordenes
router.get('/mis-compras',  verificarToken, ordenController.obtenerMisCompras);
router.get('/mis-ventas',   verificarToken, ordenController.obtenerMisVentas);

router.post('/ordenes/:ordenID/aceptar',    verificarToken, ordenController.aceptarOrden);
router.put('/ordenes/:ordenID/completar',   verificarToken, ordenController.completarOrden);
router.put('/ordenes/:ordenID/cancelar',    verificarToken, ordenController.cancelarOrden);
router.get('/ordenes/:ordenID/detalle',     verificarToken, ordenController.obtenerDetalleOrden);


router.get('/ordenes',     verificarToken, ordenController.obtenerOrdenes);
router.post('/ordenes',    verificarToken, ordenController.crearOrden);
router.put('/ordenes/:id', verificarToken, ordenController.actualizarEstadoOrden);
router.delete('/ordenes/:id', verificarToken, ordenController.eliminarOrden);

// Publicaciones
router.get('/sedes', verificarToken, publicacionesController.obtenerSedes);
router.get('/condiciones', verificarToken, publicacionesController.obtenerCondiciones);
router.post('/productos', verificarToken, upload.single('imagen'), productoController.crearProducto);  
router.get('/mis-productos', verificarToken, productoController.obtenerMisProductos);
router.put('/productos/:id', verificarToken, upload.single('imagen'), productoController.actualizarProducto); 
router.delete('/productos/:id', verificarToken, productoController.eliminarProducto);

// Notificaciones
router.post('/solicitar-compra/:productoID', verificarToken, notificacionesController.solicitarCompra);
router.get('/notificaciones',                verificarToken, notificacionesController.obtenerNotificaciones);
router.delete('/notificaciones/:id',         verificarToken, notificacionesController.eliminarNotificacion);


// Comentarios
router.get('/mi-valoracion', verificarToken, comentariosController.obtenerMiValoracion);
router.get('/mi-valoracion-comprador', verificarToken, comentariosController.obtenerMiValoracionComprador);
router.post('/calificar/:ordenID', verificarToken, comentariosController.calificarVendedor);
router.post('/calificarComprador/:ordenID', verificarToken, comentariosController.calificarComprador);
router.get('/ordenes/:ordenID/detalle-venta', verificarToken, ordenController.obtenerDetalleVenta);
router.get('/comentarios/:productoID', verificarToken, comentariosController.obtenerComentariosPorProducto);

router.get('/perfil-publico/:id',              verificarToken, comentariosController.obtenerPerfilPublico);
router.get('/perfil-publico/:id/comentarios',          verificarToken, comentariosController.obtenerComentariosVendedor);
router.get('/perfil-publico/:id/comentarios-comprador', verificarToken, comentariosController.obtenerComentariosComprador);



module.exports = router;