// probe-portus.mjs — probar las 2 vías de datos de la boya 1111
const urls = [
  'https://portus.puertos.es/Portus_RT?station=1111&params=Hm0,Tp',
  'https://portus.puertos.es/PortusData/rtChart?station=1111&params=Hm0,Tp&fecha_ini=20260816&fecha_fin=20260830',
];
for (const u of urls) {
  try {
    const r = await fetch(u);
    const t = await r.text();
    console.log(u.slice(0, 70), '→', r.status, '|', t.slice(0, 250));
  } catch (e) {
    console.log(u.slice(0, 70), 'FALLO', e.message);
  }
}
