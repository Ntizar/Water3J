# Guía 10 — Datos reales de Puertos del Estado en Water3J

## De dónde salen los datos
Water3J lee la **API pública de Portus (Puertos del Estado)**, la misma que alimenta
sus widgets oficiales:

```
https://poem.puertos.es/portus/StationData?code={CODIGO_BOYA}
  &params=Hm0,Tp,DirM&from={AAAAMMDD}@{HHMM}&to={AAAAMMDD}@{HHMM}
```

- `Hm0` — altura significativa espectral (m) → entra en la app como **Hs**
- `Tp` — periodo de pico (s) → **Tp**
- `DirM` / `DirP` — dirección media/de pico de procedencia (°) → **Dirección**
- Respuesta: `[[cabeceras], [[timestamp_UNIX, [valor, calidad], ...], ...]]`
- La **calidad = 1** significa dato validado por Puertos del Estado.

## Qué hace la app con ello
1. Descarga las últimas 24 h de la boya elegida.
2. Toma el **último registro con calidad 1** y lo inyecta en el estado del oleaje.
3. Muestra el **originen en pantalla**: "DATOS REALES · BOYA DE {nombre} · {fecha hora} GMT · fuente: Puertos del Estado".
4. Todo lo que ves después (propagación, cargas, rotura) parte de esa medición real.

## Limitaciones (honestidad)
- La API es pública pero **sin CORS abierto**: la app usa un pequeño proxy de lectura
  o tú descargas el JSON y lo cargas con el botón "Cargar datos de boya (JSON)".
- Series históricas largas (SIMAR-44, reanálisis): se piden por el formulario oficial
  de bancodatos.puertos.es y se suben aquí como CSV — el parser de SIMAR está incluido.
- Crédito obligatorio: "Fuente: Puertos del Estado" aparece siempre que hay datos suyos en pantalla.

## Cómo validar a mano el número que ves
1. Abre `https://portus.puertos.es` → Datos en Tiempo Real → tu boya.
2. Compara Hm0 y Tp con los del panel: deben coincidir (misma hora GMT).
3. Si quieres reproducir la llamada a mano: pega la URL de arriba en el navegador
   con el código de tu boya (la lista de códigos está en el selector de la app).
