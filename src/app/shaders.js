// shaders.js — GLSL compartido. La matemática debe coincidir con campoOlas.js (CPU).

export const COMMON = `
  // Gerstner vertical simplificado (senoidal con fase de dispersión) — coincide con alturaEn()
  float olaAltura(vec2 p, vec4 w, float t) {
    float L = w.w;
    float k = 6.28318 / L;
    float c = sqrt(9.81 / k);
    float f = k * (dot(w.xy, p) - c * t);
    // w.z = amplitud·k? No: pasamos amplitud en w.z vía uniformes (steepness aquí = a)
    return w.z * sin(f);
  }
`;

export const VERTEX_AGUA = /* glsl */`
  uniform float uTiempo;
  uniform vec4 uOlas[MAX_OLAS];
  uniform int uNumOlas;
  varying vec3 vNormal;
  varying vec3 vPosMundo;
  varying float vEta;

  ${COMMON}

  void main() {
    vec3 p = position; // plano XZ (rotado abajo)
    vec2 xz = p.xz;
    float eta = 0.0;
    float dhx = 0.0, dhz = 0.0;
    for (int i = 0; i < MAX_OLAS; i++) {
      if (i >= uNumOlas) break;
      vec4 w = uOlas[i];
      float L = w.w;
      float k = 6.28318 / L;
      float c = sqrt(9.81 / k);
      float f = k * (dot(w.xy, xz) - c * uTiempo);
      float a = w.z; // amplitud
      eta += a * sin(f);
      // derivadas para normal
      float dfdx = k * w.x;
      float dfdz = k * w.y;
      dhx += a * cos(f) * dfdx;
      dhz += a * cos(f) * dfdz;
    }
    vec3 desplazada = vec3(p.x, p.y + eta, p.z);
    vNormal = normalize(vec3(-dhx, 1.0, -dhz));
    vEta = eta;
    vec4 mundo = modelMatrix * vec4(desplazada, 1.0);
    vPosMundo = mundo.xyz;
    gl_Position = projectionMatrix * viewMatrix * mundo;
  }
`;

export const FRAGMENT_AGUA = /* glsl */`
  uniform vec3 uColorProfundo;
  uniform vec3 uColorSomero;
  uniform vec3 uColorEspuma;
  uniform vec3 uSol;
  uniform float uUmbralEspuma;
  varying vec3 vNormal;
  varying vec3 vPosMundo;
  varying float vEta;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vPosMundo);
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    // color base según profundidad simulada por altura local (MVP; h real via batimetría en v2)
    float mezcla = clamp(vEta * 0.5 + 0.5, 0.0, 1.0);
    vec3 base = mix(uColorProfundo, uColorSomero, mezcla);
    // especular solar
    vec3 H = normalize(uSol + V);
    float spec = pow(max(dot(N, H), 0.0), 120.0) * 0.9;
    // espuma en crestas
    float espuma = smoothstep(uUmbralEspuma, uUmbralEspuma + 0.25, vEta);
    vec3 col = mix(base, uColorEspuma, espuma * 0.8);
    col = mix(col, vec3(0.75, 0.85, 0.95), fresnel * 0.6); // cielo reflejado fake
    col += vec3(1.0, 0.95, 0.85) * spec;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export const VERTEX_FONDO = /* glsl */`
  varying vec3 vPosMundo;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 mundo = modelMatrix * vec4(position, 1.0);
    vPosMundo = mundo.xyz;
    gl_Position = projectionMatrix * viewMatrix * mundo;
  }
`;

export const FRAGMENT_FONDO = /* glsl */`
  uniform float uTiempo;
  uniform vec3 uArena;
  uniform float uEscalaCauticas;
  varying vec3 vPosMundo;
  varying vec2 vUv;

  // caústicas procedurales: interferencia de 3 ondas móviles (barato y creíble)
  float caustica(vec2 p, float t) {
    float v = 0.0;
    vec2 dir1 = vec2(0.9, 0.4), dir2 = vec2(-0.6, 0.8), dir3 = vec2(0.3, -0.9);
    v += sin(dot(p, dir1) * 3.1 + t * 1.3);
    v += sin(dot(p, dir2) * 4.3 - t * 1.1);
    v += sin(dot(p, dir3) * 5.7 + t * 0.9);
    return pow(clamp(0.5 + v / 3.0, 0.0, 1.0), 4.0);
  }

  void main() {
    float c = caustica(vPosMundo.xz * uEscalaCauticas, uTiempo);
    vec3 col = uArena * (0.65 + 0.55 * c);
    // oscurecer con la "profundidad" visual (más lejos de cámara costa = más hondo)
    gl_FragColor = vec4(col, 1.0);
  }
`;

export const VERTEX_CIELO = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = position;
    vec4 mundo = modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * mundo;
  }
`;

export const FRAGMENT_CIELO = /* glsl */`
  uniform vec3 uCenit;
  uniform vec3 uHorizonte;
  uniform vec3 uSol;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float h = clamp(d.y, 0.0, 1.0);
    vec3 col = mix(uHorizonte, uCenit, pow(h, 0.6));
    float sol = pow(max(dot(d, normalize(uSol)), 0.0), 800.0);
    float halo = pow(max(dot(d, normalize(uSol)), 0.0), 8.0) * 0.25;
    col += vec3(1.0, 0.9, 0.7) * (sol + halo);
    gl_FragColor = vec4(col, 1.0);
  }
`;
