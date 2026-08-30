// debug: generar campo paramétrico Hs=6 en Node y reconstruir Hs
import { crearEstadoBase, profundidadEn } from '../src/app/estado.js';
import { generarCampo } from '../src/app/campoOlas.js';
const e = crearEstadoBase();
e.oleaje.modo = 'parametrico'; e.oleaje.Hs = 6; e.oleaje.Tp = 8; e.oleaje.nComponentes = 48;
const comps = generarCampo(e);
const sum2 = comps.reduce((s,c)=>s+c.a*c.a,0);
console.log('n=', comps.length, 'Σa²·2=', (2*Math.sqrt(sum2)).toFixed(4), 'Hs objetivo=6');
console.log('steepness suma:', comps.reduce((s,c)=>s+c.a*c.k,0).toFixed(4));
console.log('primeras 3:', comps.slice(0,3).map(c=>`${c.a.toFixed(3)}m/L${(2*Math.PI/c.k).toFixed(0)}m`).join(' '));
