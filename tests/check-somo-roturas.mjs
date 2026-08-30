
import { estudioTransecto } from '../src/studio/motor.js';
const perfilXH = [ {x:0,h:79},{x:697,h:26.8},{x:1394,h:27.9},{x:2091,h:26},{x:2675,h:35.9},{x:4419,h:19},{x:4768,h:0.8} ];
// Nota: el perfil real de EMODnet muestra la escalera del DTM — Somo tiene barra arenosa en h≈19-26 m,
// y la zona de surf real (barra de rompiente) está en los últimos ~500 m, que EMODnet suaviza.
// Comprobar con un temporal real y un swell de surf:
for (const [Hs0, T, nombre] of [[1.4, 9, 'swell de surf'], [3.0, 13, 'temporal invernal'], [5.5, 16, 'tormenta (borrascas nov-feb)']]) {
  const e = estudioTransecto({ Hs0, T, alfa0: 20*Math.PI/180, perfil: perfilXH, estructuras: [] });
  const primeroRompe = e.puntos.find(p => p.rompe);
  const HsMax = Math.max(...e.puntos.map(p => p.Hs));
  console.log(`${nombre}: Hs0=${Hs0} T=${T}s → primera rotura en x=${primeroRompe?.x} m (h=${primeroRompe?.h} m, Hs rompe=${primeroRompe?.Hs} m) · Hs máx=${HsMax.toFixed(2)} m`);
}
