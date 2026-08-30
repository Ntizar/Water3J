// swe.js — Solver de aguas someras (método virtual pipes, CPU) — W3J-T08
// La app usará la versión GPGPU equivalente (docs/07); este módulo CPU es la
// implementación de referencia auditable.
// Referencias: lisyarus/webgpu-shallow-water (virtual pipes), bshishov/UnityTerrainErosionGPU
// (outflow scaling). Fronteras cerradas por defecto (reflectantes).
export class SWEPipes {
  constructor({ nx, ny, dx, dy = dx, ground = () => 0, hw0 = () => 0 }) {
    this.nx = nx; this.ny = ny; this.dx = dx; this.dy = dy;
    const n = nx * ny;
    this.zb = new Float64Array(n);
    this.hw = new Float64Array(n);
    // flujos volumétricos por interfaz (m³/s):
    // fX[(nx+1)·j + i] = flujo en la interfaz entre celda (i-1,j) y (i,j), i=0..nx
    // fY[nx·(j+1) + i] = flujo entre (i,j-1) y (i,j), j=0..ny
    this.fX = new Float64Array((nx + 1) * ny);
    this.fY = new Float64Array(nx * (ny + 1));
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const idx = j * nx + i;
        this.zb[idx] = ground((i + 0.5) * dx, (j + 0.5) * dy);
        this.hw[idx] = hw0((i + 0.5) * dx, (j + 0.5) * dy);
      }
  }
  superficie(i, j) { const k = j * this.nx + i; return this.zb[k] + this.hw[k]; }
  volumenTotal() { let v = 0; for (let k = 0; k < this.hw.length; k++) v += this.hw[k]; return v * this.dx * this.dy; }

  paso(dt, { g = 9.81, friccion = 0.0 } = {}) {
    const { nx, ny, dx, dy, zb, hw, fX, fY } = this;
    const A = dx * dy;
    const damp = Math.exp(-friccion * dt); // fricción por unidad de tiempo
    // --- 1) aceleración de flujos por diferencia de superficie ---
    // Los flujos SON la velocidad de transporte (m³/s); su ecuación es de momentum:
    // f' = A·g·ds/dx (fuente) − fricción. En equilibrio hidrostático ds→0 y f→0.
    // X: i=0 y i=nx son fronteras cerradas (flujo 0)
    for (let j = 0; j < ny; j++) {
      fX[(nx + 1) * j + 0] = 0; fX[(nx + 1) * j + nx] = 0;
      for (let i = 1; i < nx; i++) {
        const ds = this.superficie(i - 1, j) - this.superficie(i, j);
        const idx = (nx + 1) * j + i;
        fX[idx] = (fX[idx] + A * g * ds / dx * dt) * damp;
        // corte de flujo en secciones secas (h de ambas celdas < umbral)
        const hmin = Math.min(hw[j * nx + i - 1], hw[j * nx + i]);
        if (hmin < 1e-6) fX[idx] = 0;
      }
    }
    for (let i = 0; i < nx; i++) {
      fY[nx * 0 + i] = 0; fY[nx * ny + i] = 0;
      for (let j = 1; j < ny; j++) {
        const ds = this.superficie(i, j - 1) - this.superficie(i, j);
        const idx = nx * j + i;
        fY[idx] = (fY[idx] + A * g * ds / dy * dt) * damp;
        const hmin = Math.min(hw[(j - 1) * nx + i], hw[j * nx + i]);
        if (hmin < 1e-6) fY[idx] = 0;
      }
    }
    // --- 2) escalado de outflow (no sacar más agua de la que hay) ---
    const escala = new Float64Array(nx * ny).fill(1);
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const fxIzq = fX[(nx + 1) * j + i];      // salida si >0
        const fxDer = fX[(nx + 1) * j + i + 1];  // salida si <0
        const fyAbajo = fY[nx * j + i];          // salida si <0 (j-1 -> j entra)
        const fyArriba = fY[nx * (j + 1) + i];   // salida si >0
        const out = Math.max(0, fxIzq) + Math.max(0, -fxDer) + Math.max(0, -fyAbajo) + Math.max(0, fyArriba);
        const idx = j * nx + i;
        if (out > 1e-12) escala[idx] = Math.min(1, (hw[idx] * A) / dt / out);
      }
    // aplicar escalado solo a flujos de salida
    for (let j = 0; j < ny; j++)
      for (let i = 1; i < nx; i++) {
        const idx = (nx + 1) * j + i;
        if (fX[idx] > 0) fX[idx] *= escala[j * nx + i - 1];
        else if (fX[idx] < 0) fX[idx] *= escala[j * nx + i];
      }
    for (let i = 0; i < nx; i++)
      for (let j = 1; j < ny; j++) {
        const idx = nx * j + i;
        if (fY[idx] > 0) fY[idx] *= escala[(j - 1) * nx + i];
        else if (fY[idx] < 0) fY[idx] *= escala[j * nx + i];
      }
    // --- 3) advección de columnas (donante pierde, receptor gana) ---
    const dh = new Float64Array(nx * ny);
    for (let j = 0; j < ny; j++)
      for (let i = 1; i < nx; i++) {
        const idx = (nx + 1) * j + i, f = fX[idx];
        if (f > 0) { dh[j * nx + i - 1] -= f; dh[j * nx + i] += f; }       // (i-1) → (i)
        else if (f < 0) { dh[j * nx + i] += f; dh[j * nx + i - 1] -= f; } // (i) → (i-1)
      }
    for (let i = 0; i < nx; i++)
      for (let j = 1; j < ny; j++) {
        const idx = nx * j + i, f = fY[idx];
        if (f > 0) { dh[(j - 1) * nx + i] -= f; dh[j * nx + i] += f; }    // (j-1) → (j)
        else if (f < 0) { dh[j * nx + i] += f; dh[(j - 1) * nx + i] -= f; } // (j) → (j-1)
      }
    for (let k = 0; k < hw.length; k++) {
      hw[k] += dh[k] * dt / A;
      if (hw[k] < 0) hw[k] = 0; // clamp anti-negativos (outflow scaling ya lo evita casi siempre)
    }
  }
}
