import { crearEstadoBase, profundidadEn } from '../src/app/estado.js';
const e = crearEstadoBase();
const nx = 32, ny = 32, dx = 5;
const datos = new Float32Array(nx * ny);
for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) datos[j*nx+i] = 3;
e.batimetria.rejilla = { nx, ny, dx, datos };
// ¿dónde cae (1000,0)?
const y0 = -(ny*dx)/2; // -80
const j = Math.floor((0 - y0)/dx); // 16
const i = Math.floor(1000/5); // 200 -> FUERA (nx=32)
console.log('i=', i, 'j=', j, 'nx=', nx);  // ¡i=200 fuera de rango!
console.log('h en (1000,0):', profundidadEn(e, 1000, 0));
console.log('h en (100,0):', profundidadEn(e, 100, 0)); // i=20 dentro
