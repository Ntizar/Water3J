# Informes y análisis científico — Water3J

Cómo generar informes útiles desde la web app, aprendiendo de MIKE Zero y del ecosistema XBeach (xbeach-toolbox, QBeach), pero 100% en cliente.

## 1. Qué generan las herramientas profesionales (referencia)

- **MIKE:** Data Viewer para series temporales/cortes + compositor de informes; salidas de estadísticas acumuladas y subseries; variables derivadas (deriva de Stokes...)
- **XBeach:** salida NetCDF seleccionable (tipos y tiempos de salida) + toolbox Python para postproceso (perfiles, hidrodinámica, morfología) + plots estandarizados
- **QBeach (2026):** el camino actual es "plugin QGIS" — confirma que el postproceso científico sigue siendo externo y desconectado del modelo

**Conclusión:** en el ecosistema profesional, el informe es siempre una segunda sesión de trabajo con otras herramientas. Water3J puede integrarlo: **la simulación Y el informe en la misma pestaña**.

## 2. Datos que la app ya tiene (y que valen oro)

Todo lo que se calcula en GPU/CPU para pintar es a la vez un resultado científico:
- Campo η(x,y,t) — elevación de superficie
- Hs y Tp locales (del espectro o de envolvente simulada)
- Profundidad h(x,y) y su evolución (sedimentos)
- Velocidades de corriente u(x,y) si SWE activo
- τ de corte en fondo
- Presiones sobre estructuras (Goda)
- Series temporales en puntos de observación (gauges, como WebFlood)

## 3. Arquitectura del generador de informes

```
Estado de simulación (memoria)
  ↓ (muestreo: gauges, secciones, mallas reducidas)
Resultados estructurados (JSON en memoria)
  ↓
┌──────────────────┬───────────────────┬──────────────┐
│ Gráficos (canvas)│ Capturas 3D       │ Tablas       │
│ series, espectro,│ toDataURL del     │ puntos,      │
│ perfiles, rosas  │ canvas WebGL      │ gauges       │
└──────────────────┴───────────────────┴──────────────┘
  ↓
Plantilla HTML (print-friendly, A4)
  ↓
├── Vista previa en modal (print CSS)
├── PDF vía window.print() (cero dependencias) 
└── JSON/CSV exportable ( interoperable)
```

### Capturas de la escena 3D
- `renderer.domElement.toDataURL()` tras render con `preserveDrawingBuffer` o render inmediato antes de capturar (mejor: hacer un render explícito justo antes de capturar y no activar preserveDrawingBuffer permanentemente — coste cero)
- Capturas con overlay científico activado (escala de colores de η, corrientes...) — la imagen del informe muestra el campo, no solo el mar bonito
- Multi-vista: perspectiva general + vista aérea + sección transversal (colocar cámara programáticamente)

### Gauges (puntos de observación)
- El usuario pincha puntos en la escena → se registran series temporales de η, H, u
- Gráfico de serie temporal en el informe + tabla de estadísticas (Hs, Hmax, Tp medidos)
- Patrón tomado de WebFlood (gauges interactivos sobre la simulación)

## 4. Contenido tipo de informe

1. **Portada:** escenario, fecha, preset, parámetros de oleaje incidente (Hs, Tp, dirección, viento)
2. **Resumen ejecutivo:** mapa de Hs con escala de color + 3-4 bullets de conclusiones automáticas (ej: "coeficiente de transmisión tras el dique Kt ≈ 0.3; agitación en la bocana Hs ≈ 0.4 m")
3. **Campos calculados:** capturas con overlay (η, corrientes, τ, Kd)
4. **Series temporales:** gráficos de gauges
5. **Perfil de playa:** sección transversal con batimetría inicial vs final (si sedimentos activos) + comparación con perfil de equilibrio de Dean
6. **Cargas en estructuras:** diagrama de presiones Goda del muro seleccionado
7. **Anexo metodológico:** fórmulas usadas (del propio docs/02-04) con parámetros concretos — trazabilidad científica

### Conclusiones automáticas (reglas simples, no IA)
El informe calcula valores derivados con las fórmulas de los docs:
- Kt (transmisión tras dique), Kd (difracción en bocana), Co (coeficiente de reflexión medido)
- Presión de diseño en muro (Goda simplificado)
- Transporte neto longitudinal (CERC) → tendencia erosión/acreción
Estos números convierten el visualizador en herramienta de pre-diseño.

## 5. Formato de exportación

| Formato | Cómo | Uso |
|---|---|---|
| **PDF** | window.print() con CSS @media print A4 | Entregable humano |
| **CSV** | Blob + download | Series temporales a Excel/Python |
| **JSON** | Blob + download | Escenario completo (recargable en la app) |
| **PNG** | toDataURL | Capturas sueltas |
| **GeoTIFF** | Fase futura, cliente o worker | Batimetría/h campo a GIS |

Escenarios guardables como JSON (batimetría, estructuras, espectro, gauges) = proyectos compartibles por URL (base64 en hash) o fichero — mismo patrón que los presets de Water Pro pero abiertos.

## 6. Performance del generador
- El muestreo de campos desde texturas GPU: `renderer.readRenderTargetPixels()` de una textura reducida (no de la resolución completa) — el informe no necesita 512², con 128² basta
- Generar el informe es un evento puntual (botón), no continuo — puede tardar 200ms sin afectar fps
- Gráficos: canvas 2D nativo o Chart.js ligero; nada de D3 completo
- PDF: NUNCA jsPDF completo (pesado, layout pobre) — print CSS nativo da PDF perfecto con el diálogo de impresión del navegador

## 7. Roadmap de informes

| Fase | Feature |
|---|---|
| Fase 2 | Gauges interactivos + gráfico de serie temporal |
| Fase 3 | Capturas con overlay científico |
| Fase 4 | Informe PDF automático con conclusiones |
| Fase 5 | Comparación pre/post tormenta (sedimentos) |
| Fase 6 | Export GeoTIFF + integración con batimetrías reales |
