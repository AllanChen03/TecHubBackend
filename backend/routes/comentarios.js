const express = require('express');
const router = express.Router();
const comentariosController = require('../controllers/comentariosController');


router.get('/producto/:productoID', comentariosController.obtenerComentariosPorProducto);

router.post('/', comentariosController.crearComentario);

router.put('/:id', comentariosController.actualizarComentario);

router.delete('/:id', comentariosController.eliminarComentario);

module.exports = router;