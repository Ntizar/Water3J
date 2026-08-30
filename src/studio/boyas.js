// boyas.js — Estaciones de Puertos del Estado con coordenadas reales
// Fuente de las coordenadas: listado público de estaciones de Portus (REDCOS, nivel del mar y boyas)
// El código es el que usa la API StationData (el mismo del selector de la demo).

export const ESTACIONES = [
  { code: '1111', nombre: 'Bilbao Exterior',      lat: 43.4583, lon: -3.1583, tipo: 'boya' },
  { code: '1112', nombre: 'Bilbao Litoral',       lat: 43.6070, lon: -3.8450, tipo: 'boyanivel' },
  { code: '1211', nombre: 'Gijón Exterior',       lat: 43.5583, lon: -5.6917, tipo: 'boyas' },
  { code: '1311', nombre: 'Cádiz Exterior',       lat: 36.4833, lon: -6.7750, tipo: 'boyas' },
  { code: '1411', nombre: 'Tenerife Sur',         lat: 27.9583, lon: -15.3917, tipo: 'boyas' },
  { code: '1511', nombre: 'Valencia Exterior',    lat: 39.4583, lon:  0.1417, tipo: 'boyas' },
  { code: '1611', nombre: 'Barcelona Exterior',   lat: 41.3083, lon:  2.1917, tipo: 'boyas' },
  { code: '1711', nombre: 'Málaga',               lat: 36.7083, lon: -4.4250, tipo: 'boyas' },
  { code: '1811', nombre: 'A Coruña Exterior',    lat: 43.4083, lon: -8.4417, tipo: 'boyas' },
  { code: '1911', nombre: 'Palma de Mallorca',    lat: 39.4917, lon:  2.6917, tipo: 'boyas' },
];

// A 1 lon ≈ 78 km a esta latitud — calibrar al crear el estudio: 1 px de mapa ≈ dx real
export function buscarEstacion(code) {
  return ESTACIONES.find(e => e.code === code);
}
