const jwt = require('jsonwebtoken');

// 1. Middleware para verificar que el usuario tenga un token válido
const verificarToken = (req, res, next) => {
  // Los tokens usualmente se envían en los Headers bajo "Authorization" con el formato "Bearer <token>"
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token.' });
  }

  try {
    // Verificamos el token con la misma clave secreta del .env
    const decodificado = jwt.verify(token, process.env.JWT_SECRET);
    
    // Guardamos los datos del usuario (usuarioID y rolID) en la petición (req)
    // para que los siguientes controladores puedan saber quién hizo la petición
    req.usuario = decodificado;
    
    next(); // El token es válido, permitimos que la petición continúe su camino
  } catch (error) {
    return res.status(403).json({ error: 'El token proporcionado es inválido o ha expirado.' });
  }
};

// 2. Middleware para verificar que el usuario sea Administrador
const esAdmin = (req, res, next) => {
  // 1. Usamos req.usuario (que es como lo guardó verificarToken)
  console.log("Verificando rol del usuario:", req.usuario);

  // 2. Buscamos la propiedad 'rol' (que es como la guardó el login en el token)
  if (req.usuario && req.usuario.rol === 1) {
    next(); // Es admin, le abrimos la puerta
  } else {
    res.status(403).json({ error: 'Acceso denegado: Se requieren permisos de administrador' });
  }
};

module.exports = {
  verificarToken,
  esAdmin
};