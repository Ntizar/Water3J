
import { velocidadFase, numeroOnda } from '../src/fisica/olas.js';
const g = 9.81;
const Td = Math.sqrt(2 * Math.PI * 200 / g);
const cd = velocidadFase(Td, 1000);
console.log('deep: c=', cd.toFixed(3), 'teo=', Math.sqrt(g * 200 / (2 * Math.PI)).toFixed(3));
const Ts = Math.sqrt(2 * Math.PI * 60 / g);
const cs = velocidadFase(Ts, 2);
console.log('shallow: c=', cs.toFixed(3), 'teo=', Math.sqrt(g * 2).toFixed(3), 'err%=', (100 * Math.abs(cs - Math.sqrt(g * 2)) / Math.sqrt(g * 2)).toFixed(2));
