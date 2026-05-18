const db = require('../config/db');
 
const obtenerSedes = (req, res) => {
  db.query('SELECT SedeID, NombreSede FROM sedes', (err, results) => {
    if (err) {
      console.error('Error al obtener sedes:', err);
      return res.status(500).json({ error: 'Error al obtener sedes' });
    }
    res.json(results);
  });
};
 
const obtenerCondiciones = (req, res) => {
  db.query('SELECT CondicionID, EstadoProducto FROM condicionproducto', (err, results) => {
    if (err) {
      console.error('Error al obtener condiciones:', err);
      return res.status(500).json({ error: 'Error al obtener condiciones' });
    }
    res.json(results);
  });
};
 
module.exports = { 
    obtenerSedes, 
    obtenerCondiciones 
};