/**
 * LOTTE INDIA — THREE.JS 3D CONFECTIONERY STUDIO
 * =================================================
 * Reverse-engineered from competitor architecture and adapted for vanilla JS + Three.js.
 *
 * Architecture (matches competitor pattern):
 *   1. HeroScene  — floating Choco Pie + orbiting treats (homepage hero)
 *   2. DioramaScene — 4-chapter scroll diorama: Assemble → Anatomy → Bite → Numbers
 *   3. ProductStudio — drag-to-orbit Babylon-style studio on choco-pie.html (3 lighting presets)
 *
 * Engine: Three.js r165 (ES module CDN)
 * Animation: GSAP ScrollTrigger for scroll chapters
 * No external model files — all geometry is procedural.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';

// ─────────────────────────── Utilities ───────────────────────────

const clamp01 = v => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const damp = (current, target, lambda, dt) => current + (target - current) * (1 - Math.exp(-lambda * dt));

/** Small seeded PRNG — identical layout on every load. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Lathe geometry from [radius, height] pairs. */
function latheGeometry(pairs, segments = 96) {
  const pts = pairs.map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(pts, segments);
  g.computeVertexNormals();
  return g;
}

/** Speckle bump texture painted on a canvas. */
function speckleTexture(seed, count, rMin, rMax, repeatX, repeatY) {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#808080';
  g.fillRect(0, 0, size, size);
  const rnd = mulberry32(seed);
  for (let i = 0; i < count; i++) {
    const x = rnd() * size, y = rnd() * size;
    const r = rMin + rnd() * (rMax - rMin);
    const v = rnd() > 0.5 ? 255 : 0;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(${v},${v},${v},${0.18 + rnd() * 0.3})`);
    grad.addColorStop(1, `rgba(${v},${v},${v},0)`);
    g.fillStyle = grad;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  return t;
}

// ─────────────────────────── Procedural Models ───────────────────────────

/** Full Choco Pie: shell + marshmallow seam + drizzle. */
function buildChocoPieGeometries() {
  const shellG = latheGeometry([
    [0, 0.34], [0.7, 0.33], [1.06, 0.28], [1.2, 0.18],
    [1.27, 0.05], [1.28, -0.02], [1.24, -0.04], [1.0, -0.03], [0, -0.03],
  ]);
  const coreG = latheGeometry([
    [0, 0.07], [0.9, 0.075], [1.12, 0.05], [1.2, 0],
    [1.12, -0.05], [0.9, -0.075], [0, -0.07],
  ]);
  const baseG = latheGeometry([
    [0, 0.03], [1.05, 0.03], [1.22, 0.0], [1.26, -0.08],
    [1.2, -0.17], [1.0, -0.2], [0, -0.2],
  ]);
  const drizzleGeos = [-0.5, 0, 0.5].map((z, k) => {
    const pts = [];
    for (let s = 0; s <= 10; s++) {
      const x = -0.95 + (1.9 * s) / 10;
      const zz = z + (s % 2 ? 0.15 : -0.15) + k * 0.01;
      const r = Math.hypot(x, zz);
      if (r > 1.1) continue;
      pts.push(new THREE.Vector3(x, 0.34 - 0.08 * Math.min(1, (r / 1.08) ** 2) + 0.012, zz));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.022, 8, false);
  });
  return { shellG, coreG, baseG, drizzleGeos };
}

/** Twist-wrapped toffee (Coffy Bite / Eclairs / Caramilk style). */
function buildToffeeGroup(scene, color, bandColor) {
  const g = new THREE.Group();
  g.rotation.z = Math.PI / 2;
  const bodyMat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.42, 10, 24), bodyMat);
  g.add(body);
  if (bandColor) {
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.245, 0.245, 0.12, 32, 1, true),
      new THREE.MeshPhysicalMaterial({ color: bandColor, roughness: 0.25, clearcoat: 1, side: THREE.DoubleSide })
    );
    g.add(band);
  }
  [1, -1].forEach(dir => {
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.26, 20, 1, true),
      new THREE.MeshPhysicalMaterial({ color, roughness: 0.2, clearcoat: 1, side: THREE.DoubleSide })
    );
    tip.position.y = dir * 0.55;
    tip.rotation.z = dir === 1 ? Math.PI : 0;
    g.add(tip);
  });
  return g;
}

/** Lotte Glyph tile (diamond rotated 45°) */
function buildGlyphTile(color) {
  const geo = new THREE.BoxGeometry(0.6, 0.6, 0.12);
  const mesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
    color, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1
  }));
  mesh.rotation.z = Math.PI / 4;
  return mesh;
}

/** Pepero stick (biscuit core + chocolate coat). */
function buildPeperoStick() {
  const g = new THREE.Group();
  const biscuit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.5, 16),
    new THREE.MeshStandardMaterial({ color: '#D9A867', roughness: 0.7 })
  );
  biscuit.position.y = 0.55;
  g.add(biscuit);
  const choco = new THREE.Mesh(
    new THREE.CylinderGeometry(0.058, 0.058, 1.1, 20),
    new THREE.MeshPhysicalMaterial({ color: '#3B1E12', roughness: 0.3, clearcoat: 0.8 })
  );
  choco.position.y = -0.2;
  g.add(choco);
  return g;
}

// ─────────────────────────── Studio Lights ───────────────────────────

const LIGHT_PRESETS = {
  'warm-morning': {
    ambient: 0.35, ambientColor: '#FFE9CC',
    key: { color: '#FFC98C', intensity: 2.8, pos: [-4.2, 5, -2.4] },
    rim: { color: '#FFE7C4', intensity: 1.4 },
    bg: '#F5DEB3',
  },
  'diwali-gold': {
    ambient: 0.12, ambientColor: '#FF9E3D',
    key: { color: '#FFA640', intensity: 1.8, pos: [-3.4, 5.5, -2] },
    rim: { color: '#FFC266', intensity: 2.2 },
    bg: '#24100A',
  },
  'crisp-editorial': {
    ambient: 0.4, ambientColor: '#FFFFFF',
    key: { color: '#FFFFFF', intensity: 2.4, pos: [-0.6, 7, -1.2] },
    rim: { color: '#DCE6FF', intensity: 1.6 },
    bg: '#E2E3E7',
  },
};

function applyLightPreset(preset, ambientLight, keyLight, rimLight, renderer, bgEl) {
  const p = LIGHT_PRESETS[preset] || LIGHT_PRESETS['warm-morning'];
  ambientLight.intensity = p.ambient;
  ambientLight.color.set(p.ambientColor);
  keyLight.color.set(p.key.color);
  keyLight.intensity = p.key.intensity;
  keyLight.position.set(...p.key.pos);
  rimLight.color.set(p.rim.color);
  rimLight.intensity = p.rim.intensity;
  if (bgEl) bgEl.style.background = p.bg;
}

// ─────────────────────────── Real 3D Lotte Choco Pie Packet Generator ───────────────────────────

/**
 * Builds a realistic 3D Lotte Choco Pie packet with authentic packaging texture,
 * realistic pillow puff curvature, glossy cellophane clearcoat, gold crimp seals,
 * and an authentic 3D chocolate choco pie beside it.
 */
export function buildRealChocoPiePacket(onReady) {
  const group = new THREE.Group();

  const loader = new THREE.TextureLoader();
  loader.load('assets/official/choco-brand.png', (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;

    // 1. Realistic Puffed Packaging Body
    const W = 2.4, H = 1.82, D = 0.38;
    const packGeo = new THREE.BoxGeometry(W, H, D, 16, 16, 4);
    const pos = packGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / (W * 0.5);
      const y = pos.getY(i) / (H * 0.5);
      const z = pos.getZ(i);
      const bulge = Math.max(0, 1 - (x * x * 0.45 + y * y * 0.45));
      if (Math.abs(z) > 0.05) {
        pos.setZ(i, z * (0.85 + 0.35 * bulge));
      }
    }
    packGeo.computeVertexNormals();

    const frontMat = new THREE.MeshPhysicalMaterial({
      map: texture,
      transparent: true,
      roughness: 0.22,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
      reflectivity: 0.85,
      sheen: 0.35,
      sheenColor: new THREE.Color('#FF6666')
    });

    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: '#B8000E',
      roughness: 0.26,
      metalness: 0.15,
      clearcoat: 0.8,
      clearcoatRoughness: 0.12
    });

    // Box faces: [px, nx, py, ny, pz (front), nz (back)]
    const packMesh = new THREE.Mesh(packGeo, [bodyMat, bodyMat, bodyMat, bodyMat, frontMat, bodyMat]);
    packMesh.castShadow = true;
    packMesh.receiveShadow = true;
    group.add(packMesh);

    // 2. Gold Crimp Foil Seal Ribs (top & bottom of snack packet)
    const crimpGeo = new THREE.CylinderGeometry(0.045, 0.045, W * 0.96, 16);
    const crimpMat = new THREE.MeshPhysicalMaterial({
      color: '#D4AF37',
      metalness: 0.85,
      roughness: 0.28,
      clearcoat: 0.6
    });
    const topCrimp = new THREE.Mesh(crimpGeo, crimpMat);
    topCrimp.rotation.z = Math.PI / 2;
    topCrimp.position.set(0, H * 0.5, 0);
    group.add(topCrimp);

    const botCrimp = new THREE.Mesh(crimpGeo, crimpMat);
    botCrimp.rotation.z = Math.PI / 2;
    botCrimp.position.set(0, -H * 0.5, 0);
    group.add(botCrimp);

    // 3. Realistic 3D Round Choco Pie sitting in front of the pack
    const pieGroup = new THREE.Group();
    pieGroup.scale.setScalar(0.42);
    pieGroup.position.set(0.68, -0.42, 0.36);
    pieGroup.rotation.set(-0.32, 0.42, -0.12);

    const { shellG, coreG, baseG, drizzleGeos } = buildChocoPieGeometries();
    const chocoMat = new THREE.MeshPhysicalMaterial({
      color: '#34150C',
      roughness: 0.28,
      clearcoat: 0.92,
      clearcoatRoughness: 0.14,
      sheen: 0.4,
      sheenColor: new THREE.Color('#783820')
    });
    const pieMarshMat = new THREE.MeshPhysicalMaterial({
      color: '#FFF8F0',
      roughness: 0.85,
      emissive: new THREE.Color('#FFE8D0'),
      emissiveIntensity: 0.18
    });
    const pieBiscuitMat = new THREE.MeshStandardMaterial({
      color: '#B57038',
      roughness: 0.8
    });

    const chocoShell = new THREE.Mesh(shellG, chocoMat);
    chocoShell.castShadow = true;
    pieGroup.add(chocoShell);

    const chocoCore = new THREE.Mesh(coreG, pieMarshMat);
    pieGroup.add(chocoCore);

    const chocoBase = new THREE.Mesh(baseG, pieBiscuitMat);
    pieGroup.add(chocoBase);

    const chocoDrizzleMat = new THREE.MeshPhysicalMaterial({ color: '#522010', roughness: 0.22, clearcoat: 1 });
    drizzleGeos.forEach(dg => pieGroup.add(new THREE.Mesh(dg, chocoDrizzleMat)));

    group.add(pieGroup);

    if (onReady) onReady(group);
  });

  return group;
}

// ═══════════════════════════════════════════════════════════════════
// MODULE 1: HERO SCENE — REAL 3D CHOCO PIE PACKET
// ═══════════════════════════════════════════════════════════════════

export function initHeroScene(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, canvas.clientWidth / canvas.clientHeight, 0.05, 50);
  camera.position.set(0, 0.1, 4.6);

  // ── Studio Lighting ──
  const ambient = new THREE.AmbientLight('#FFE9CC', 0.4);
  scene.add(ambient);
  const keyLight = new THREE.DirectionalLight('#FFF0D6', 2.4);
  keyLight.position.set(3, 4, 4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 0.1;
  keyLight.shadow.camera.far = 20;
  scene.add(keyLight);
  const rimLight = new THREE.PointLight('#E60012', 8, 12);
  rimLight.position.set(-3.5, 2, -2.5);
  scene.add(rimLight);
  const fillLight = new THREE.DirectionalLight('#BBDDFF', 0.8);
  fillLight.position.set(-3, -1, 3);
  scene.add(fillLight);

  // ── Contact shadow plane ──
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 6),
    new THREE.ShadowMaterial({ opacity: 0.38, color: '#3A080A' })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -1.15;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  // ── Real 3D Lotte Choco Pie Packet Rig ──
  const rig = new THREE.Group();
  scene.add(rig);

  const packetGroup = new THREE.Group();
  packetGroup.position.set(0, 0.05, 0);
  packetGroup.rotation.set(0.12, -0.15, 0.04);
  rig.add(packetGroup);

  buildRealChocoPiePacket((loadedModel) => {
    packetGroup.add(loadedModel);
  });

  // ── Pointer tracking & drag-to-orbit ──
  const pointer = new THREE.Vector2();
  let isDragging = false;
  let dragRotY = 0;
  let dragRotX = 0;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener('mousedown', e => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  window.addEventListener('mouseup', () => { isDragging = false; });
  window.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    if (isDragging) {
      dragRotY += (e.clientX - lastX) * 0.015;
      dragRotX += (e.clientY - lastY) * 0.008;
      lastX = e.clientX;
      lastY = e.clientY;
    }
  });

  // Touch drag
  let lastTouchX = 0;
  let lastTouchY = 0;
  canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', e => {
    if (e.touches.length === 1) {
      dragRotY += (e.touches[0].clientX - lastTouchX) * 0.015;
      dragRotX += (e.touches[0].clientY - lastTouchY) * 0.008;
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
    }
  }, { passive: true });

  // ── Resize ──
  const resizeObserver = new ResizeObserver(() => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w > 0 && h > 0) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  });
  resizeObserver.observe(canvas);

  // ── Render loop ──
  const clock = new THREE.Clock();
  let rafId;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function animate() {
    rafId = requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    if (!reduced) {
      // Gentle idle floating bob and subtle packet breathing
      packetGroup.position.y = 0.05 + Math.sin(t * 1.4) * 0.04;
      packetGroup.rotation.y += dt * 0.22 + dragRotY * 0.15;
      packetGroup.rotation.x = THREE.MathUtils.clamp(packetGroup.rotation.x + dragRotX * 0.1, -0.4, 0.4);
      dragRotY *= 0.92;
      dragRotX *= 0.92;

      // Mouse interactive tilt
      rig.rotation.y = damp(rig.rotation.y, pointer.x * 0.22, 4, dt);
      rig.rotation.x = damp(rig.rotation.x, -pointer.y * 0.14, 4, dt);
    }

    renderer.render(scene, camera);
  }

  animate();

  return {
    dispose() {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      renderer.dispose();
    }
  };
}

// ═══════════════════════════════════════════════════════════════════
// MODULE 2: SCROLL DIORAMA (Choco Pie page — 4 chapters)
// ═══════════════════════════════════════════════════════════════════

/** Camera path: Catmull-Rom spline through 4 control points (matches competitor's cameraPath). */
const CAMERA_POS = [
  new THREE.Vector3(-1.08, 0.35, 7.2),
  new THREE.Vector3(1.0, -0.85, 6.5),
  new THREE.Vector3(-0.9, 1.25, 6.6),
  new THREE.Vector3(0, 0.45, 8.4),
];
const CAMERA_LOOK = [
  new THREE.Vector3(-1.35, 0, 0),
  new THREE.Vector3(-1.0, 0.1, 0),
  new THREE.Vector3(-1.15, 0.05, 0),
  new THREE.Vector3(0, 0.15, 0),
];
const CAM_SPLINE_POS = new THREE.CatmullRomCurve3(CAMERA_POS);
const CAM_SPLINE_LOOK = new THREE.CatmullRomCurve3(CAMERA_LOOK);

export function initDiorama(canvasId, sectionsSelector) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  // --- Driver state (GSAP writes these; render loop reads them) ---
  const D = {
    path: 0,       // 0=assemble, 1=anatomy, 2=bite, 3=numbers
    explode: 0,    // 0=assembled, 1=layers separated
    labels: 0,     // anatomy label opacity
    bite: 0,       // 0=whole, 1=bitten
    recede: 0,     // pie sinks for numbers
    morph: 0,      // number particles formed
    num: 0,        // which number 0,1,2
    intro: 0,      // load-in progress
    spin: 0,
    velocity: 0,
    wide: window.innerWidth >= 900 ? 1 : 0,
  };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, canvas.clientWidth / canvas.clientHeight, 0.05, 60);
  camera.position.copy(CAMERA_POS[0]);
  camera.lookAt(CAMERA_LOOK[0]);

  // ── Lights ──
  scene.add(new THREE.AmbientLight('#FFE9CC', 0.3));
  const keyLight = new THREE.DirectionalLight('#FFC98C', 1.8);
  keyLight.position.set(3, 5, 4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight('#E73437', 10, 12);
  rimLight.position.set(-4, 1, -2);
  scene.add(rimLight);

  // ── Floor shadow ──
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.ShadowMaterial({ opacity: 0.3, color: '#5E0A12' })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -0.6;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  // ── Joy arcs (background rings) ──
  const arcGroup = new THREE.Group();
  arcGroup.position.z = -3.2;
  scene.add(arcGroup);
  [
    { r: 2.6, arc: Math.PI * 1.55, t: 0.016, rot: 0.3, speed: 0.05 },
    { r: 3.2, arc: Math.PI * 1.2,  t: 0.01,  rot: 2.1, speed: -0.035 },
    { r: 3.9, arc: Math.PI * 1.75, t: 0.008, rot: 4.0, speed: 0.02 },
    { r: 4.7, arc: Math.PI * 0.9,  t: 0.006, rot: 1.2, speed: -0.015 },
  ].forEach(({ r, arc, t, rot, speed }, i) => {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(r, t, 8, 160, arc),
      new THREE.MeshBasicMaterial({ color: '#ED1D24', transparent: true, opacity: 0.55 - i * 0.1 })
    );
    mesh.rotation.z = rot;
    mesh.userData.speed = speed;
    arcGroup.add(mesh);
  });

  // ── Depth particles ──
  const ptCount = 220;
  const rnd0 = mulberry32(3);
  const ptPos = new Float32Array(ptCount * 3);
  const ptCol = new Float32Array(ptCount * 3);
  const palette = [new THREE.Color('#D98A2B'), new THREE.Color('#3B1E12'), new THREE.Color('#ED1D24'), new THREE.Color('#E8D9C4')];
  for (let i = 0; i < ptCount; i++) {
    ptPos[i*3]   = (rnd0() - 0.5) * 16;
    ptPos[i*3+1] = (rnd0() - 0.5) * 9;
    ptPos[i*3+2] = -2 - rnd0() * 6;
    const c = palette[i % palette.length];
    ptCol.set([c.r, c.g, c.b], i*3);
  }
  const ptGeo = new THREE.BufferGeometry();
  ptGeo.setAttribute('position', new THREE.BufferAttribute(ptPos, 3));
  ptGeo.setAttribute('color', new THREE.BufferAttribute(ptCol, 3));
  const ptMat = new THREE.PointsMaterial({ size: 0.045, vertexColors: true, transparent: true, opacity: 0.55, sizeAttenuation: true, depthWrite: false });
  scene.add(new THREE.Points(ptGeo, ptMat));

  // ── Choco Pie (3 separable layers) ──
  const { shellG, coreG, baseG, drizzleGeos } = buildChocoPieGeometries();
  const chocoTex = speckleTexture(11, 900, 1, 3.5, 10, 3);
  const biscuitTex = speckleTexture(29, 700, 1.5, 5, 8, 2);

  const shellMat = new THREE.MeshPhysicalMaterial({
    color: '#3B1E12', roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.16,
    sheen: 0.35, sheenColor: new THREE.Color('#7a3b25'), bumpMap: chocoTex, bumpScale: 0.6,
  });
  const coreMat = new THREE.MeshPhysicalMaterial({
    color: '#FFF9F0', roughness: 0.85, sheen: 1,
    sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.6,
    emissive: new THREE.Color('#FFE3C8'), emissiveIntensity: 0.14,
  });
  const baseMat = new THREE.MeshStandardMaterial({
    color: '#B9773A', roughness: 0.8, bumpMap: biscuitTex, bumpScale: 1.2,
  });
  const drizzleMat = new THREE.MeshPhysicalMaterial({ color: '#6B3424', roughness: 0.22, clearcoat: 1 });

  const assembly = new THREE.Group();
  assembly.rotation.set(0.52, 0, 0);
  assembly.scale.setScalar(0.44);
  scene.add(assembly);

  // Shell layer (dome + drizzle)
  const shellLayer = new THREE.Group();
  shellLayer.position.y = 0.24;
  const shellMesh = new THREE.Mesh(shellG, shellMat); shellMesh.castShadow = true;
  shellLayer.add(shellMesh);
  drizzleGeos.forEach(g => shellLayer.add(new THREE.Mesh(g, drizzleMat)));
  assembly.add(shellLayer);

  // Marshmallow core
  const coreMesh = new THREE.Mesh(coreG, coreMat);
  coreMesh.position.y = 0.13;
  assembly.add(coreMesh);

  // Biscuit base
  const baseMesh = new THREE.Mesh(baseG, baseMat);
  baseMesh.castShadow = true;
  assembly.add(baseMesh);

  // ── Bite: custom shader that cuts a scalloped crescent out of the pie ──
  const BITE_ANGLE = 0;
  const BITE_RADIUS = 1.42;
  const BITE_GLSL = `
  uniform float uBiteOn;
  uniform vec3 uCutColor;
  varying vec3 vBitePos;
  float biteMask(vec2 p) {
    float d = 1e3;
    for (int i = 0; i < 3; i++) {
      float a = ${BITE_ANGLE.toFixed(4)} + (float(i) - 1.0) * 0.3;
      d = min(d, length(p - vec2(sin(a), cos(a)) * ${BITE_RADIUS.toFixed(3)}) - 0.4);
    }
    return d;
  }`;

  function withBite(mat, mode, cutColor, uniforms) {
    mat.side = THREE.DoubleSide;
    const cut = new THREE.Color(cutColor);
    mat.onBeforeCompile = shader => {
      shader.uniforms.uBiteOn = uniforms.uBiteOn;
      shader.uniforms.uCutColor = { value: cut };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vBitePos;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBitePos = position;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${BITE_GLSL}`)
        .replace('#include <clipping_planes_fragment>',
          `#include <clipping_planes_fragment>
           float biteD = biteMask(vBitePos.xz);
           ${mode === 'cut' ? 'if (uBiteOn > 0.5 && biteD < 0.0) discard;' : 'if (biteD >= 0.0) discard;'}`)
        .replace('#include <color_fragment>',
          '#include <color_fragment>\nif (!gl_FrontFacing) diffuseColor.rgb = uCutColor;');
      mat.needsUpdate = true;
    };
    mat.customProgramCacheKey = () => `bite-${mode}-${cutColor}`;
    return mat;
  }

  const biteUniforms = { uBiteOn: { value: 0 } };
  const shellCutMat = withBite(shellMat.clone(), 'cut', '#7A4A2A', biteUniforms);
  const coreCutMat  = withBite(coreMat.clone(),  'cut', '#FFF1E0', biteUniforms);
  const baseCutMat  = withBite(baseMat.clone(),  'cut', '#C98E52', biteUniforms);
  shellMesh.material = shellCutMat;
  coreMesh.material  = coreCutMat;
  baseMesh.material  = baseCutMat;

  // Bitten piece (duplicated geometry with 'keep' shader)
  const pivotGroup = new THREE.Group();
  pivotGroup.visible = false;
  assembly.add(pivotGroup);
  const kOffset = new THREE.Group();
  pivotGroup.add(kOffset);
  const BITE_CENTER = new THREE.Vector3(Math.sin(BITE_ANGLE) * 1.15, 0.12, Math.cos(BITE_ANGLE) * 1.15);
  kOffset.position.copy(BITE_CENTER).negate();
  const kShell = new THREE.Group();
  kShell.add(new THREE.Mesh(shellG, withBite(shellMat.clone(), 'keep', '#7A4A2A', biteUniforms)));
  drizzleGeos.forEach(g => kShell.add(new THREE.Mesh(g, withBite(drizzleMat.clone(), 'keep', '#4A2416', biteUniforms))));
  kOffset.add(kShell);
  const kCore = new THREE.Mesh(coreG, withBite(coreMat.clone(), 'keep', '#FFF1E0', biteUniforms));
  kOffset.add(kCore);
  const kBase = new THREE.Mesh(baseG, withBite(baseMat.clone(), 'keep', '#C98E52', biteUniforms));
  kOffset.add(kBase);

  // Marshmallow strands
  const STRAND_ANGLES = [-0.3, -0.15, 0, 0.15, 0.3];
  const strandMat = new THREE.MeshPhysicalMaterial({ color: '#FFF9F0', roughness: 0.7, sheen: 1, sheenColor: new THREE.Color('#fff') });
  const strandGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true);
  const strands = STRAND_ANGLES.map(() => {
    const s = new THREE.Mesh(strandGeo, strandMat);
    s.visible = false;
    assembly.add(s);
    return s;
  });

  // Crumb burst
  const CRUMB_COUNT = 30;
  const rnd1 = mulberry32(5);
  const BITE_DIR = new THREE.Vector3(Math.sin(BITE_ANGLE), 0, Math.cos(BITE_ANGLE));
  const crumbPaths = Array.from({ length: CRUMB_COUNT }, () => ({
    v: new THREE.Vector3(
      BITE_DIR.x * (0.6 + rnd1()) + (rnd1() - 0.5) * 1.6,
      0.6 + rnd1() * 1.4,
      BITE_DIR.z * (0.6 + rnd1()) + (rnd1() - 0.5) * 1.6,
    ),
    spin: new THREE.Vector3(rnd1() * 8, rnd1() * 8, rnd1() * 8),
    scale: 0.5 + rnd1() * 0.9,
  }));
  const crumbGeo = new THREE.DodecahedronGeometry(0.06, 0);
  const crumbMat = new THREE.MeshStandardMaterial({ color: '#8A5530', roughness: 0.9 });
  const crumbs = new THREE.InstancedMesh(crumbGeo, crumbMat, CRUMB_COUNT);
  crumbs.visible = false;
  crumbs.frustumCulled = false;
  assembly.add(crumbs);

  // ── Number particles (Chapter 4) ──
  const NUM_COUNT = 1800;
  const heroNumbers = ['1914', '2006', '1M+'];

  async function buildNumberGeometry() {
    const family = getComputedStyle(document.body).fontFamily || 'sans-serif';
    const font = px => `800 ${px}px ${family}`;
    try { await document.fonts.load(font(200), heroNumbers.join(' ')); } catch {}
    const W = 1400, H = 420;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.font = font(320);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const refW = Math.max(...heroNumbers.map(n => ctx.measureText(n).width));
    const rnd = mulberry32(7);
    const step = 3;
    const sets = heroNumbers.map(text => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#000';
      ctx.fillText(text, W / 2, H / 2);
      const data = ctx.getImageData(0, 0, W, H).data;
      const pts = [];
      for (let y = 0; y < H; y += step)
        for (let x = 0; x < W; x += step)
          if (data[(y * W + x) * 4 + 3] > 128)
            pts.push((x - W / 2) / refW, -(y - H / 2) / refW);
      for (let i = pts.length / 2 - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [pts[i*2], pts[j*2]] = [pts[j*2], pts[i*2]];
        [pts[i*2+1], pts[j*2+1]] = [pts[j*2+1], pts[i*2+1]];
      }
      return pts;
    });
    const jitter = step / refW;
    const attr = (fillFn, size) => {
      const a = new Float32Array(NUM_COUNT * size);
      for (let i = 0; i < NUM_COUNT; i++) fillFn(i, a);
      return new THREE.BufferAttribute(a, size);
    };
    const target = set => (i, out) => {
      const n = set.length / 2 || 1, k = (i % n) * 2;
      out[i*3]   = (set[k]   ?? 0) + (rnd() - 0.5) * jitter;
      out[i*3+1] = (set[k+1] ?? 0) + (rnd() - 0.5) * jitter;
      out[i*3+2] = (rnd() - 0.5) * 0.02;
    };
    const startFn = (i, out) => {
      let x = 0, y = 0, z = 0;
      do { x = rnd()*2-1; y = rnd()*2-1; z = rnd()*2-1; }
      while (x*x + y*y + z*z > 1);
      out.set([x, y * 0.6, z], i*3);
    };
    const geo = new THREE.BufferGeometry();
    const a = attr(target(sets[0]), 3);
    geo.setAttribute('position', a);
    geo.setAttribute('aA', a);
    geo.setAttribute('aB', attr(target(sets[1]), 3));
    geo.setAttribute('aC', attr(target(sets[2]), 3));
    geo.setAttribute('aStart', attr(startFn, 3));
    geo.setAttribute('aRand', attr((i, out) => { out[i] = rnd(); }, 1));
    return geo;
  }

  const numVertex = `
attribute vec3 aStart; attribute vec3 aA; attribute vec3 aB; attribute vec3 aC; attribute float aRand;
uniform float uMorph, uNum, uTime, uScale, uStartRadius, uPixel;
uniform vec3 uTarget, uStart;
varying float vAlpha; varying float vRand;
float ease(float t) { t = clamp(t, 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
void main() {
  float m = ease((uMorph - aRand * 0.4) / 0.6);
  float t1 = ease((uNum - aRand * 0.35) / 0.65);
  float t2 = ease((uNum - 1.0 - aRand * 0.35) / 0.65);
  vec3 glyph = mix(mix(aA, aB, t1), aC, t2);
  float swirl = sin(t1 * 3.14159) + sin(t2 * 3.14159);
  glyph += normalize(aStart + vec3(1e-4)) * swirl * 0.14;
  vec3 target = uTarget + glyph * uScale;
  vec3 start = uStart + aStart * uStartRadius;
  vec3 p = mix(start, target, m);
  p.y += sin(m * 3.14159) * uStartRadius * 0.7 * (0.4 + aRand);
  p.xy += vec2(sin(uTime * 1.3 + aRand * 40.0), cos(uTime * 1.1 + aRand * 31.0)) * 0.005 * uScale * m;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uPixel * (0.7 + aRand * 0.6);
  vAlpha = smoothstep(0.0, 0.2, m);
  vRand = aRand;
}`;
  const numFragment = `
varying float vAlpha; varying float vRand;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  vec3 col = vRand < 0.62 ? vec3(0.231, 0.118, 0.071) : (vRand < 0.9 ? vec3(0.725, 0.467, 0.227) : vec3(0.929, 0.114, 0.141));
  gl_FragColor = vec4(col, smoothstep(0.5, 0.25, d) * vAlpha);
}`;
  const numUniforms = {
    uMorph: { value: 0 }, uNum: { value: 0 }, uTime: { value: 0 },
    uScale: { value: 1 }, uStartRadius: { value: 1 }, uPixel: { value: 3 },
    uTarget: { value: new THREE.Vector3() }, uStart: { value: new THREE.Vector3() },
  };
  const numMat = new THREE.ShaderMaterial({
    vertexShader: numVertex, fragmentShader: numFragment,
    transparent: true, depthWrite: false, depthTest: false,
    uniforms: numUniforms,
  });
  const numGroup = new THREE.Group();
  numGroup.visible = false;
  scene.add(numGroup);

  buildNumberGeometry().then(geo => {
    const pts = new THREE.Points(geo, numMat);
    pts.frustumCulled = false;
    pts.renderOrder = 10;
    numGroup.add(pts);
  });

  // ── Foreground crumbs (scattered pieces in front) ──
  const fgCrumbGeo = new THREE.DodecahedronGeometry(0.05, 0);
  const fgCrumbs = new THREE.InstancedMesh(fgCrumbGeo, new THREE.MeshStandardMaterial({ color: '#3B1E12', roughness: 0.9 }), 36);
  const rnd2 = mulberry32(17);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 36; i++) {
    const side = i % 2 ? 1 : -1;
    const y = side < 0 ? -1.1 - rnd2() * 1.4 : (rnd2() - 0.5) * 3.6;
    dummy.position.set(side * (2.2 + rnd2() * 2.2), y, 1.2 + rnd2() * 1.6);
    dummy.rotation.set(rnd2() * 3, rnd2() * 3, rnd2() * 3);
    dummy.scale.setScalar(0.6 + rnd2() * 1.2);
    dummy.updateMatrix();
    fgCrumbs.setMatrixAt(i, dummy.matrix);
  }
  fgCrumbs.instanceMatrix.needsUpdate = true;
  scene.add(fgCrumbs);

  // ── Scroll chapters: set up with IntersectionObserver ──
  const sections = sectionsSelector ? document.querySelectorAll(sectionsSelector) : [];

  // Smooth scroll chapter animation using requestAnimationFrame
  let targetD = { path: 0, explode: 0, labels: 0, bite: 0, recede: 0, morph: 0, num: 0, intro: 0 };

  function updateChapterFromScroll() {
    const scrolled = window.scrollY;
    const totalH = document.documentElement.scrollHeight - window.innerHeight;
    const progress = clamp01(scrolled / Math.max(totalH, 1));
    // Distribute 4 chapters evenly over scroll
    const ch = progress * 3;
    targetD.path = ch;
    if (ch < 1) {
      targetD.explode = 0; targetD.labels = 0; targetD.bite = 0; targetD.recede = 0; targetD.morph = 0;
    } else if (ch < 2) {
      targetD.explode = smooth(1, 1.6, ch);
      targetD.labels = smooth(1.2, 1.8, ch);
      targetD.bite = 0; targetD.recede = 0; targetD.morph = 0;
    } else if (ch < 3) {
      targetD.explode = 1 - smooth(2.0, 2.3, ch);
      targetD.labels = 0;
      targetD.bite = smooth(2.0, 3.0, ch);
      targetD.recede = 0; targetD.morph = 0;
    } else {
      targetD.explode = 0; targetD.labels = 0; targetD.bite = 1;
      targetD.recede = smooth(3.0, 3.5, ch);
      targetD.morph = smooth(3.3, 4.0, ch);
    }
  }

  window.addEventListener('scroll', updateChapterFromScroll, { passive: true });

  // Intro animation
  const introStart = performance.now();
  const INTRO_DUR = 1200;

  // ── Resize ──
  const resizeObs = new ResizeObserver(() => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    D.wide = w >= 900 ? 1 : 0;
  });
  resizeObs.observe(canvas);

  // ── Pointer ──
  const ptr = new THREE.Vector2();
  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  });

  // ── Render loop ──
  const clock = new THREE.Clock();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tmpM = new THREE.Object3D();
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpDir = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  let idle = 0;
  let rafId;

  function animate() {
    rafId = requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const k = reduced ? 1 : 1 - Math.exp(-6 * dt);

    // Intro
    const introP = Math.min(1, (performance.now() - introStart) / INTRO_DUR);
    D.intro = introP;

    // Lerp D toward targetD
    ['path', 'explode', 'labels', 'bite', 'recede', 'morph'].forEach(key => {
      D[key] = D[key] + (targetD[key] - D[key]) * Math.min(1, k * 3);
    });

    if (!reduced) idle += dt * 0.12;

    const bob = reduced ? 0 : Math.sin(t * 0.8) * 0.05;
    // Assembly: position, scale, rotation
    assembly.position.y = bob + (1 - D.intro) * 1.4 - D.recede * 2.6;
    assembly.scale.setScalar(0.44 * (0.55 + 0.45 * D.intro) * (1 - D.recede * 0.35));
    // Pointer tilt
    if (!reduced) {
      assembly.rotation.x = damp(assembly.rotation.x, 0.52 - ptr.y * 0.14, 5, dt);
      assembly.rotation.z = damp(assembly.rotation.z, -ptr.x * 0.1, 5, dt);
    }
    // Idle + scroll spin
    assembly.rotation.y = reduced ? assembly.rotation.y : idle;

    // ── Chapter 2: explode layers ──
    const e = D.explode;
    shellLayer.position.y = damp(shellLayer.position.y, 0.24 + e * 0.8, 6, dt);
    shellLayer.rotation.x = damp(shellLayer.rotation.x, -e * 0.16, 6, dt);
    coreMesh.position.y = damp(coreMesh.position.y, 0.13 + e * 0.15, 6, dt);
    baseMesh.position.y = damp(baseMesh.position.y, 0 - e * 0.62, 6, dt);
    baseMesh.rotation.x = damp(baseMesh.rotation.x, e * 0.12, 6, dt);

    // ── Chapter 3: bite ──
    const b = D.bite;
    const biting = b > 0.002;
    biteUniforms.uBiteOn.value = biting ? 1 : 0;
    const pull = smooth(0, 0.6, b);
    const fly  = clamp01((b - 0.6) / 0.4);
    if (pivotGroup) {
      pivotGroup.visible = biting && fly < 0.985;
      const dist = pull * 0.55 + fly * fly * 2.4;
      pivotGroup.position.copy(BITE_CENTER).addScaledVector(BITE_DIR, dist);
      pivotGroup.position.y += Math.sin(pull * Math.PI * 0.5) * 0.22 + fly * 0.9;
      pivotGroup.rotation.set(-pull * 0.32 - fly * 1.3, fly * 0.6, pull * 0.18 + fly * 0.9);
      pivotGroup.scale.setScalar(Math.max(0.001, 1 - fly * 0.85));
      kShell.position.copy(shellLayer.position);
      kShell.rotation.copy(shellLayer.rotation);
      kCore.position.copy(coreMesh.position);
      kBase.position.copy(baseMesh.position);
      pivotGroup.updateMatrix();

      // Marshmallow strands
      const snap = 1 - smooth(0.56, 0.62, b);
      strands.forEach((s, i) => {
        s.visible = biting && snap > 0.01;
        if (!s.visible) return;
        const ang = BITE_ANGLE + STRAND_ANGLES[i];
        tmpA.set(Math.sin(ang) * 1.0, coreMesh.position.y + ((i%3)-1)*0.035, Math.cos(ang) * 1.0);
        tmpB.copy(tmpA).sub(BITE_CENTER).applyMatrix4(pivotGroup.matrix);
        tmpDir.subVectors(tmpB, tmpA);
        const len = Math.max(0.001, tmpDir.length());
        s.position.addVectors(tmpA, tmpB).multiplyScalar(0.5);
        s.quaternion.setFromUnitVectors(up, tmpDir.normalize());
        const outer = Math.abs(i - 2) / 2;
        const r = 0.1 * Math.sqrt(0.08 / Math.max(0.08, len)) * snap * (1 - outer * 0.45);
        s.scale.set(r, len, r);
      });
    }

    // Crumb burst
    const bt = clamp01((b - 0.56) / 0.44);
    crumbs.visible = bt > 0 && bt < 1;
    if (crumbs.visible) {
      crumbPaths.forEach((cp, i) => {
        tmpM.position.copy(BITE_CENTER).addScaledVector(cp.v, bt * 1.3);
        tmpM.position.y -= 2.8 * bt * bt;
        tmpM.rotation.set(cp.spin.x * bt, cp.spin.y * bt, cp.spin.z * bt);
        tmpM.scale.setScalar(cp.scale * (1 - bt * 0.5));
        tmpM.updateMatrix();
        crumbs.setMatrixAt(i, tmpM.matrix);
      });
      crumbs.instanceMatrix.needsUpdate = true;
    }

    // ── Camera on spline ──
    const camT = clamp01(D.path / 3);
    const camPos = CAM_SPLINE_POS.getPoint(camT);
    const camLook = CAM_SPLINE_LOOK.getPoint(camT);
    camera.position.lerp(camPos, k * 0.5);
    const lookTarget = new THREE.Vector3().lerpVectors(camera.position, camLook, 0.1);
    camera.lookAt(camLook);

    // ── Chapter 4: number particles ──
    numGroup.visible = D.morph > 0.001;
    if (numGroup.visible) {
      numGroup.position.copy(camera.position);
      numGroup.quaternion.copy(camera.quaternion);
      const fov = camera.fov * Math.PI / 180;
      const visH = 2 * 8 * Math.tan(fov / 2);
      const visW = visH * (canvas.clientWidth / Math.max(canvas.clientHeight, 1));
      const width = Math.min(visW * 0.84, visH * 1.2);
      numUniforms.uScale.value = width;
      numUniforms.uTarget.value.set(0, visH * 0.09, -8);
      numUniforms.uStart.value.set(0, -visH * 0.3, -8);
      numUniforms.uStartRadius.value = Math.min(visW, visH) * 0.2;
      numUniforms.uMorph.value = D.morph;
      numUniforms.uNum.value = D.num;
      numUniforms.uTime.value = t;
      numUniforms.uPixel.value = renderer.getPixelRatio() * (canvas.clientWidth < 640 ? 2.8 : 3.8);
    }

    // Background arcs slow drift
    if (!reduced) {
      arcGroup.children.forEach((c, i) => { c.rotation.z += dt * arcGroup.children[i].userData?.speed || 0; });
    }

    renderer.render(scene, camera);
  }

  animate();

  return {
    setNumber(n) { D.num = clamp01(n); },
    dispose() {
      cancelAnimationFrame(rafId);
      resizeObs.disconnect();
      window.removeEventListener('scroll', updateChapterFromScroll);
      renderer.dispose();
    }
  };
}

// ═══════════════════════════════════════════════════════════════════
// MODULE 3: PRODUCT STUDIO (interactive drag-to-orbit)
// Matches Babylon.js BabylonShowcase: 3 lighting presets, product switcher,
// canvas-drawn pack print, drag/keyboard orbit, entrance animation
// ═══════════════════════════════════════════════════════════════════

export function initProductStudio(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;

  const scene = new THREE.Scene();
  scene.background = null;
  const camera = new THREE.PerspectiveCamera(32, canvas.clientWidth / canvas.clientHeight, 0.05, 50);
  camera.position.set(0, 0.3, 5.0);
  camera.lookAt(0, 0.3, 0);

  // ── Lights (match Babylon preset: warm-morning default) ──
  const ambientLight = new THREE.AmbientLight('#FFE9CC', 0.35);
  scene.add(ambientLight);
  const keyLight = new THREE.SpotLight('#FFC98C', 2.8, 20, Math.PI / 3.2, 0.4);
  keyLight.position.set(-4.2, 5, -2.4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.bias = -0.0004;
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight('#FFE7C4', 1.4);
  rimLight.position.set(2, 4, -6);
  scene.add(rimLight);
  // Fill softbox (rect area light equivalent)
  const fillLight = new THREE.PointLight('#FFF3D8', 1.2, 15);
  fillLight.position.set(3, 3, 3);
  scene.add(fillLight);

  // ── Reflective floor ──
  const floorGeo = new THREE.PlaneGeometry(10, 10);
  const floorMat = new THREE.MeshStandardMaterial({ color: '#E6CDA8', roughness: 0.42, metalness: 0 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Contact shadow disc under product
  const contactGeo = new THREE.PlaneGeometry(3, 3);
  const contactCanvas = document.createElement('canvas');
  contactCanvas.width = contactCanvas.height = 256;
  const cctx = contactCanvas.getContext('2d');
  const rg = cctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  rg.addColorStop(0, 'rgba(20,8,4,0.42)');
  rg.addColorStop(0.35, 'rgba(20,8,4,0.25)');
  rg.addColorStop(1, 'rgba(20,8,4,0)');
  cctx.fillStyle = rg;
  cctx.fillRect(0, 0, 256, 256);
  const contactTex = new THREE.CanvasTexture(contactCanvas);
  const contactMat = new THREE.MeshBasicMaterial({ map: contactTex, transparent: true });
  const contactShadow = new THREE.Mesh(contactGeo, contactMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.003;
  scene.add(contactShadow);

  // ── Turntable group ──
  const turntable = new THREE.Group();
  scene.add(turntable);

  // ── Build Choco Pie carton (matches competitor's cp-box design) ──
  function buildChocoPieCarton() {
    const g = new THREE.Group();
    const W = 1.9, H = 0.62, D2 = 1.3;

    // Red rounded box body
    const boxMat = new THREE.MeshPhysicalMaterial({ color: '#E73437', roughness: 0.24, clearcoat: 0.95 });
    const boxGeo = new THREE.BoxGeometry(W, H, D2);
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.y = H / 2;
    box.rotation.y = 0.32;
    box.castShadow = true;
    g.add(box);

    // Pack print canvas on top
    const topCanvas = document.createElement('canvas');
    topCanvas.width = 512; topCanvas.height = 320;
    const tc = topCanvas.getContext('2d');
    tc.fillStyle = '#E73437'; tc.fillRect(0, 0, 512, 320);
    // Warm sun glow
    const sg = tc.createRadialGradient(360, 160, 0, 360, 160, 215);
    sg.addColorStop(0, 'rgba(255,214,150,0.55)'); sg.addColorStop(1, 'rgba(255,214,150,0)');
    tc.fillStyle = sg; tc.fillRect(0, 0, 512, 320);
    // Border
    tc.strokeStyle = 'rgba(255,248,236,0.85)'; tc.lineWidth = 3;
    tc.strokeRect(16, 14, 480, 292);
    // Text
    tc.fillStyle = '#FFFFFF'; tc.textAlign = 'center';
    tc.font = `800 20px 'Poppins', sans-serif`;
    tc.fillText('LOTTE', 110, 65);
    tc.font = `italic 700 72px Georgia, serif`;
    tc.fillText('Choco', 155, 160);
    tc.fillText('Pie', 155, 240);
    tc.font = `700 13px 'Poppins', sans-serif`;
    tc.fillStyle = '#FFE6C7';
    tc.fillText("INDIA'S No.1 CHOCO PIE", 155, 290);
    // Pack count badge
    tc.fillStyle = '#FFF6E8';
    tc.beginPath(); tc.arc(458, 65, 28, 0, Math.PI*2); tc.fill();
    tc.fillStyle = '#C41E24'; tc.font = `800 22px 'Poppins', sans-serif`;
    tc.fillText('12', 458, 68);
    tc.font = `700 10px 'Poppins', sans-serif`;
    tc.fillText('PIES', 458, 84);
    const topTex = new THREE.CanvasTexture(topCanvas);
    const topPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(W - 0.1, D2 - 0.1),
      new THREE.MeshPhysicalMaterial({ map: topTex, clearcoat: 0.5 })
    );
    topPlane.rotation.x = -Math.PI / 2;
    topPlane.position.y = H + 0.001;
    topPlane.rotation.y = 0.32;
    g.add(topPlane);

    // Actual pie sitting on top of the box
    const { shellG, drizzleGeos } = buildChocoPieGeometries();
    const pieMini = new THREE.Group();
    pieMini.scale.setScalar(0.28);
    pieMini.position.set(0.42, H + 0.001, 0.08);
    pieMini.rotation.y = -0.6;
    pieMini.rotation.x = 0.52;
    pieMini.add(new THREE.Mesh(shellG, new THREE.MeshPhysicalMaterial({
      color: '#3A1A12', roughness: 0.3, clearcoat: 1,
    })));
    drizzleGeos.forEach(dg => pieMini.add(new THREE.Mesh(dg, new THREE.MeshPhysicalMaterial({
      color: '#6B3424', roughness: 0.22, clearcoat: 1
    }))));
    g.add(pieMini);

    // Pie leaning against front
    const pieLean = new THREE.Group();
    pieLean.scale.setScalar(0.28);
    pieLean.position.set(-0.42, 0.11, -D2 / 2 - 0.165);
    pieLean.rotation.set(-1.2, 0, 0.05);
    pieLean.add(new THREE.Mesh(shellG, new THREE.MeshPhysicalMaterial({
      color: '#3A1A12', roughness: 0.3, clearcoat: 1,
    })));
    g.add(pieLean);

    return g;
  }

  /** Coffy Bite: glass jar of toffees */
  function buildCoffyBiteJar() {
    const g = new THREE.Group();
    const jarProfile = [
      [0, 0.002], [0.5, 0.002], [0.56, 0.03], [0.585, 0.1],
      [0.59, 0.95], [0.565, 1.07], [0.5, 1.16], [0.44, 1.2], [0.44, 1.3],
    ];
    const jarGeo = latheGeometry(jarProfile, 80);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#FFFFFF', roughness: 0.04, transparent: true, opacity: 0.18,
      side: THREE.DoubleSide, transmission: 0.9, ior: 1.5,
    });
    g.add(new THREE.Mesh(jarGeo, glassMat));
    // Lid
    const lidProfile = [
      [0, 1.42], [0.36, 1.42], [0.43, 1.405], [0.46, 1.38],
      [0.465, 1.36], [0.47, 1.34], [0.465, 1.32], [0.455, 1.27], [0.44, 1.27],
    ];
    const lid = new THREE.Mesh(latheGeometry(lidProfile, 80),
      new THREE.MeshPhysicalMaterial({ color: '#C9862E', roughness: 0.22, metalness: 0.85 }));
    g.add(lid);
    // A few toffees visible inside
    const coffyWrap = new THREE.MeshPhysicalMaterial({ color: '#5A2F1B', roughness: 0.22, clearcoat: 1 });
    const toffGeo = new THREE.CapsuleGeometry(0.085, 0.3, 10, 24);
    for (let i = 0; i < 8; i++) {
      const rnd = mulberry32(i * 7);
      const t = new THREE.Mesh(toffGeo, coffyWrap);
      t.position.set((rnd() - 0.5) * 0.6, 0.15 + i * 0.1, (rnd() - 0.5) * 0.6);
      t.rotation.set(rnd() * Math.PI, rnd() * Math.PI, Math.PI / 2);
      g.add(t);
    }
    return g;
  }

  /** Caramilk pile of toffees */
  function buildCaramilkPile() {
    const g = new THREE.Group();
    const yellowMat = new THREE.MeshPhysicalMaterial({ color: '#F0D830', roughness: 0.2, clearcoat: 1 });
    const heap = [[0,0.09,0],[0.42,0.09,0.12],[-0.4,0.09,0.1],[0.18,0.09,-0.4],[-0.22,0.09,-0.38]];
    heap.forEach(([x, y, z], i) => {
      const tg = buildToffeeGroup(scene, '#F0D830', '#603078');
      tg.position.set(x, y, z);
      tg.scale.setScalar(0.5);
      g.add(tg);
    });
    // Hero candy on top
    const hero = buildToffeeGroup(scene, '#F0D830', '#603078');
    hero.position.set(0, 0.42, -0.05);
    hero.rotation.set(0.15, -0.35, 0.12);
    hero.scale.setScalar(0.8);
    g.add(hero);
    return g;
  }

  /** Pepero pack + sticks */
  function buildPeperoDisplay() {
    const g = new THREE.Group();
    const packMat = new THREE.MeshPhysicalMaterial({ color: '#E4002B', roughness: 0.24, clearcoat: 0.95 });
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.75, 0.3), packMat);
    pack.position.y = 0.875;
    pack.rotation.y = 0.28;
    pack.castShadow = true;
    g.add(pack);
    // Fan of sticks emerging from top
    const stickPositions = [
      [-0.24, 1.6, 0], [-0.12, 1.75, 0], [0, 1.85, 0], [0.12, 1.75, 0], [0.24, 1.6, 0],
    ];
    stickPositions.forEach((pos, i) => {
      const s = buildPeperoStick();
      s.position.set(...pos);
      s.rotation.z = (i - 2) * 0.08;
      s.scale.setScalar(0.9);
      g.add(s);
    });
    // A few sticks on the floor
    [[- 0.3, 0, 0.5], [0.15, 0, 0.22], [0.55, 0, -0.18]].forEach(([x, z, ry]) => {
      const s = buildPeperoStick();
      s.position.set(x, 0.041, z);
      s.rotation.set(0, ry || 0, Math.PI / 2);
      s.scale.setScalar(0.9);
      g.add(s);
    });
    return g;
  }

  const products = {
    'choco-pie': buildChocoPieCarton(),
    'coffy-bite': buildCoffyBiteJar(),
    'caramilk': buildCaramilkPile(),
    'pepero': buildPeperoDisplay(),
  };

  let activeProduct = 'choco-pie';
  Object.entries(products).forEach(([id, obj]) => {
    obj.visible = id === activeProduct;
    turntable.add(obj);
    obj.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  });

  // ── Drag orbit (matches Babylon ArcRotateCamera feel) ──
  let isDragging = false, lastX = 0, lastY = 0;
  let targetRotY = 0, targetRotX = 0.15, currentRotY = 0, currentRotX = 0.15;
  let targetZoom = 5.0, currentZoom = 5.0;
  const ALPHA0 = -Math.PI / 2 - 0.42;
  const BETA0  = Math.PI / 2.42;

  canvas.addEventListener('mousedown', e => { isDragging = true; lastX = e.clientX; lastY = e.clientY; });
  window.addEventListener('mouseup', () => { isDragging = false; });
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    targetRotY += (e.clientX - lastX) * 0.012;
    targetRotX = Math.max(-0.3, Math.min(0.5, targetRotX + (e.clientY - lastY) * 0.008));
    lastX = e.clientX; lastY = e.clientY;
  });
  // Touch
  let lastTouch = null;
  canvas.addEventListener('touchstart', e => { if (e.touches.length === 1) lastTouch = e.touches[0]; }, { passive: true });
  canvas.addEventListener('touchmove', e => {
    if (!lastTouch || e.touches.length !== 1) return;
    const t = e.touches[0];
    targetRotY += (t.clientX - lastTouch.clientX) * 0.012;
    lastTouch = t;
  }, { passive: true });

  // ── Entrance animation ──
  let entered = false;
  const enterStart = { y: -1.5, s: 0 };
  const enterEnd   = { y: 0, s: 1 };
  let enterP = 0;
  const ENTER_DUR = 1400;
  let enterStartTime = null;

  function triggerEntrance() {
    if (entered) return;
    entered = true;
    enterStartTime = performance.now();
  }

  const entObs = new IntersectionObserver(([e]) => {
    if (e.isIntersecting && e.intersectionRatio >= 0.4) triggerEntrance();
  }, { threshold: 0.4 });
  entObs.observe(canvas);

  // Pause off-screen
  let visible = true;
  const visObs = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.01 });
  visObs.observe(canvas);

  // ── Keyboard controls ──
  canvas.setAttribute('tabindex', '0');
  canvas.addEventListener('keydown', e => {
    switch (e.key) {
      case 'ArrowLeft':  targetRotY -= 0.3; break;
      case 'ArrowRight': targetRotY += 0.3; break;
      case 'ArrowUp':    targetZoom = Math.max(2.4, targetZoom - 0.4); break;
      case 'ArrowDown':  targetZoom = Math.min(9, targetZoom + 0.4); break;
      case 'r': case 'R': targetRotY = 0; targetRotX = 0.15; targetZoom = 5.0; break;
    }
  });

  // ── Resize ──
  const resizeObs2 = new ResizeObserver(() => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
  resizeObs2.observe(canvas);

  // ── Render loop ──
  const clock2 = new THREE.Clock();
  const reduced2 = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let rafId2;

  function animate2() {
    rafId2 = requestAnimationFrame(animate2);
    if (!visible) return;
    const dt = Math.min(clock2.getDelta(), 0.05);
    const t = clock2.elapsedTime;
    const inertia = 0.88;

    // Entrance drop
    if (entered && enterStartTime) {
      enterP = Math.min(1, (performance.now() - enterStartTime) / ENTER_DUR);
      const ep = enterP * enterP * (3 - 2 * enterP); // smoothstep
      turntable.position.y = -1.5 + ep * 1.5;
      turntable.scale.setScalar(0.5 + ep * 0.5);
    } else if (!entered) {
      turntable.position.y = -1.5;
      turntable.scale.setScalar(0.5);
    }

    // Smooth orbit (matches Babylon camera inertia 0.88)
    if (!reduced2) {
      currentRotY += (targetRotY - currentRotY) * (1 - inertia + dt * 2);
      currentRotX += (targetRotX - currentRotX) * (1 - inertia + dt * 2);
      currentZoom += (targetZoom - currentZoom) * 0.08;
    } else {
      currentRotY = targetRotY;
      currentRotX = targetRotX;
      currentZoom = targetZoom;
    }

    turntable.rotation.y = currentRotY;
    // Float bob
    if (!reduced2 && enterP >= 1) {
      turntable.position.y = Math.sin(t * 1.5) * 0.03;
    }

    // Camera position (spherical arc camera)
    const phi = currentRotX + 0.15; // elevation
    camera.position.set(
      Math.sin(0) * currentZoom,
      Math.sin(phi) * currentZoom * 0.4 + 0.3,
      Math.cos(0) * currentZoom
    );
    camera.lookAt(0, 0.3, 0);

    // Update floor colour per preset
    renderer.render(scene, camera);
  }

  animate2();

  return {
    setProduct(id) {
      if (!products[id]) return;
      const prev = products[activeProduct];
      const next = products[id];
      if (prev) prev.visible = false;
      if (next) next.visible = true;
      activeProduct = id;
      // Reset camera framing per product type
      const frames = {
        'choco-pie': 5.0, 'coffy-bite': 4.8, 'caramilk': 4.0, 'pepero': 5.5,
      };
      targetZoom = frames[id] || 5.0;
      targetRotY += Math.PI / 4; // spin to new product
    },
    setPreset(preset) {
      const bgEl = canvas.parentElement?.querySelector('.studio-backdrop');
      applyLightPreset(preset, ambientLight, keyLight, rimLight, renderer, bgEl);
    },
    rotate(dir) { targetRotY += dir * Math.PI / 4; },
    zoom(dir) { targetZoom = Math.max(2.4, Math.min(9, targetZoom + dir * 0.6)); },
    reset() { targetRotY = 0; targetRotX = 0.15; targetZoom = 5.0; },
    enter() { triggerEntrance(); },
    dispose() {
      cancelAnimationFrame(rafId2);
      resizeObs2.disconnect();
      entObs.disconnect();
      visObs.disconnect();
      renderer.dispose();
    }
  };
}

// ═══════════════════════════════════════════════════════════════════
// MODULE 4: PIE STORY 3D ANIMATION (The Reveal / Anatomy / Product Studio)
// ═══════════════════════════════════════════════════════════════════

export function initPieStory3D(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, canvas.clientWidth / canvas.clientHeight, 0.05, 50);
  camera.position.set(0, 0, 4.8);

  // Studio Lighting
  const ambient = new THREE.AmbientLight('#FFEAD4', 0.45);
  scene.add(ambient);

  const keyLight = new THREE.SpotLight('#FFF2DE', 3.0, 15, Math.PI / 3, 0.3);
  keyLight.position.set(2.8, 4.5, 4.2);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight('#E60012', 7, 10);
  rimLight.position.set(-3.5, 2.0, -2.5);
  scene.add(rimLight);

  const goldAccent = new THREE.PointLight('#FFD700', 4, 8);
  goldAccent.position.set(3.0, -1.5, 2.0);
  scene.add(goldAccent);

  // Soft Contact Floor Shadow
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 6),
    new THREE.ShadowMaterial({ opacity: 0.42, color: '#2B0406' })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -1.2;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  // 3D Real Packet Model
  const rig = new THREE.Group();
  scene.add(rig);

  const modelGroup = new THREE.Group();
  rig.add(modelGroup);

  let realModel = null;
  buildRealChocoPiePacket((loadedModel) => {
    realModel = loadedModel;
    modelGroup.add(loadedModel);
  });

  // Chapter Targets (0: Reveal, 1: Crumb Biscuit, 2: Marshmallow, 3: Rich Cocoa, 4: 3D Studio)
  const chapterPoses = [
    { rotX: 0.05, rotY: -0.15, rotZ: 0.02, camZ: 4.8, camY: 0, scale: 1.0 },
    { rotX: -0.12, rotY: 0.65, rotZ: -0.05, camZ: 4.2, camY: -0.15, scale: 1.08 },
    { rotX: 0.32, rotY: -0.45, rotZ: 0.12, camZ: 4.0, camY: 0.15, scale: 1.12 },
    { rotX: -0.22, rotY: 0.25, rotZ: -0.18, camZ: 3.8, camY: 0.08, scale: 1.18 },
    { rotX: 0.0, rotY: 0.0, rotZ: 0.0, camZ: 4.5, camY: 0, scale: 1.05 },
  ];

  let currentChapter = 0;
  let targetPose = { ...chapterPoses[0] };

  // Drag interaction for Chapter 5 / anytime user drags
  let isDragging = false;
  let dragRotY = 0;
  let dragRotX = 0;
  let lastX = 0, lastY = 0;

  canvas.addEventListener('mousedown', e => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  window.addEventListener('mouseup', () => { isDragging = false; });
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    dragRotY += (e.clientX - lastX) * 0.012;
    dragRotX += (e.clientY - lastY) * 0.008;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  // Touch
  let lastTouchX = 0, lastTouchY = 0;
  canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', e => {
    if (e.touches.length === 1) {
      dragRotY += (e.touches[0].clientX - lastTouchX) * 0.012;
      dragRotX += (e.touches[0].clientY - lastTouchY) * 0.008;
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
    }
  }, { passive: true });

  // Resize
  const resizeObs = new ResizeObserver(() => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w > 0 && h > 0) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  });
  resizeObs.observe(canvas);

  // Render loop
  const clock = new THREE.Clock();
  let rafId;

  function animate() {
    rafId = requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    // Smoothly interpolate towards target chapter pose
    modelGroup.scale.setScalar(damp(modelGroup.scale.x, targetPose.scale, 4, dt));
    camera.position.z = damp(camera.position.z, targetPose.camZ, 3, dt);
    camera.position.y = damp(camera.position.y, targetPose.camY, 3, dt);

    if (currentChapter === 4 || Math.abs(dragRotY) > 0.001 || Math.abs(dragRotX) > 0.001) {
      // Free drag rotation with inertia
      modelGroup.rotation.y += dragRotY;
      modelGroup.rotation.x = THREE.MathUtils.clamp(modelGroup.rotation.x + dragRotX, -0.6, 0.6);
      dragRotY *= 0.92;
      dragRotX *= 0.92;
    } else {
      modelGroup.rotation.x = damp(modelGroup.rotation.x, targetPose.rotX + Math.sin(t * 1.2) * 0.02, 3, dt);
      modelGroup.rotation.y = damp(modelGroup.rotation.y, targetPose.rotY + Math.sin(t * 0.8) * 0.03, 3, dt);
      modelGroup.rotation.z = damp(modelGroup.rotation.z, targetPose.rotZ, 3, dt);
    }

    // Subtle floating bob
    modelGroup.position.y = Math.sin(t * 1.5) * 0.04;

    renderer.render(scene, camera);
  }

  animate();

  return {
    setChapter(ch) {
      currentChapter = Math.max(0, Math.min(4, ch));
      targetPose = { ...chapterPoses[currentChapter] };
    },
    rotate(dir) { dragRotY += dir * 0.4; },
    reset() {
      dragRotY = 0; dragRotX = 0;
      targetPose = { ...chapterPoses[currentChapter] };
    },
    dispose() {
      cancelAnimationFrame(rafId);
      resizeObs.disconnect();
      renderer.dispose();
    }
  };
}
