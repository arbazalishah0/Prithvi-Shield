// Register GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

// 1. Three.js Scene Setup
const canvas = document.getElementById('webgl-canvas');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030712, 0.02);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
// Start centered directly on Earth
camera.position.set(0, 0, 16);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// 2. Procedural High-Res Planet Earth Generation
function generateEarthTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Deep Ocean Gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  oceanGrad.addColorStop(0, '#041833');
  oceanGrad.addColorStop(0.5, '#0b3060');
  oceanGrad.addColorStop(1, '#041833');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Continental Landmasses & Mountain Belts
  ctx.fillStyle = '#1c3d31';
  for (let i = 0; i < 480; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const r = Math.random() * 85 + 20;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mountain & Highland Tectonic Ridges
  ctx.fillStyle = '#6e5a40';
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const r = Math.random() * 32 + 5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Swirling Atmospheric Cloud Layer
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  for (let i = 0; i < 180; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const rx = Math.random() * 120 + 30;
    const ry = Math.random() * 25 + 6;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

const earthGroup = new THREE.Group();
// Center Earth slightly down in Section 1 to match the reference video layout
earthGroup.position.set(0, -2.2, 7);
scene.add(earthGroup);

// Earth Core Sphere
const earthRadius = 5.2;
const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64);
const earthMat = new THREE.MeshStandardMaterial({
  map: generateEarthTexture(),
  roughness: 0.7,
  metalness: 0.1
});
const earthMesh = new THREE.Mesh(earthGeo, earthMat);
earthGroup.add(earthMesh);

// Luminous Atmospheric Glow Shell
const atmoGeo = new THREE.SphereGeometry(earthRadius + 0.18, 64, 64);
const atmoMat = new THREE.MeshBasicMaterial({
  color: 0x38bdf8,
  transparent: true,
  opacity: 0.22,
  blending: THREE.AdditiveBlending,
  side: THREE.BackSide
});
const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
earthGroup.add(atmoMesh);

// 3. Local Mountain Terrain & Landslide Slope Geometry (Placed deeper in scene)
const terrainWidth = 50;
const terrainDepth = 50;
const segments = 120;
const terrainGeo = new THREE.PlaneGeometry(terrainWidth, terrainDepth, segments, segments);
terrainGeo.rotateX(-Math.PI / 2);

const pos = terrainGeo.attributes.position;
for (let i = 0; i < pos.count; i++) {
  const x = pos.getX(i);
  const z = pos.getZ(i);
  let elevation = Math.sin(x * 0.18) * Math.cos(z * 0.18) * 4.2;
  elevation += Math.sin(x * 0.45 + z * 0.3) * 1.8;
  // Landslide Rupture Scarp Cutout
  if (x > -8 && x < 8 && z > -6 && z < 10) {
    elevation -= 2.6 * Math.exp(-(x * x + z * z) / 22);
  }
  pos.setY(i, elevation);
}
terrainGeo.computeVertexNormals();

const terrainGroup = new THREE.Group();
terrainGroup.position.set(0, -6, -20);
scene.add(terrainGroup);

const terrainMat = new THREE.MeshStandardMaterial({
  color: 0x1e293b,
  roughness: 0.85,
  metalness: 0.15
});
const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
terrainGroup.add(terrainMesh);

// Topographic Contour Wireframe Overlay
const wireframeMat = new THREE.MeshBasicMaterial({
  color: 0x38bdf8,
  wireframe: true,
  transparent: true,
  opacity: 0.22
});
const wireframeMesh = new THREE.Mesh(terrainGeo, wireframeMat);
wireframeMesh.position.y += 0.02;
terrainGroup.add(wireframeMesh);

// Red Rupture Scar Plane
const scarGeo = new THREE.CylinderGeometry(2.5, 4.5, 0.1, 32);
const scarMat = new THREE.MeshBasicMaterial({
  color: 0xef4444,
  wireframe: true,
  transparent: true,
  opacity: 0.55
});
const scarMesh = new THREE.Mesh(scarGeo, scarMat);
scarMesh.position.set(0, -0.6, 2);
terrainGroup.add(scarMesh);

// 4. Scene Lighting & Stars
const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0x93c5fd, 2.5);
sunLight.position.set(20, 25, 20);
scene.add(sunLight);

// Subtle Background Starfield
const starGeo = new THREE.BufferGeometry();
const starCount = 600;
const starCoords = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i++) {
  starCoords[i] = (Math.random() - 0.5) * 120;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starCoords, 3));
const starMat = new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.4, transparent: true, opacity: 0.6 });
const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

// 5. GSAP ScrollTrigger Sequence: Earth Overview -> Zoom into Landslide Slope
const scrollTimeline = gsap.timeline({
  scrollTrigger: {
    trigger: '.content-container',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1.2
  }
});

// Phase 1 -> Phase 2: Shift Earth to the right and bring local mountain terrain into view
scrollTimeline.to(earthGroup.position, {
  x: 7.5,
  y: 0.5,
  z: 1,
  ease: 'power2.inOut'
}, 0);

scrollTimeline.to(earthGroup.scale, {
  x: 0.6,
  y: 0.6,
  z: 0.6,
  ease: 'power2.inOut'
}, 0);

scrollTimeline.to(camera.position, {
  x: -5,
  y: 3,
  z: 8,
  ease: 'power2.inOut'
}, 0);

// Phase 2 -> Phase 3: Dive into the landslide failure zone (Focus Card)
scrollTimeline.to(earthGroup.position, {
  x: 18,
  y: 4,
  z: -5,
  ease: 'power2.inOut'
}, 1);

scrollTimeline.to(camera.position, {
  x: 3,
  y: -2.5,
  z: -8,
  ease: 'power2.inOut'
}, 1);

scrollTimeline.to(camera.rotation, {
  x: -0.1,
  y: 0.4,
  z: 0.05,
  ease: 'power2.inOut'
}, 1);

// Smooth navigation scroll
function scrollToSection(id) {
  const elem = document.getElementById(id);
  if (elem) elem.scrollIntoView({ behavior: 'smooth' });
}

// 6. Animation Loop
function animate() {
  requestAnimationFrame(animate);
  // Continuous planetary & atmospheric rotation
  earthMesh.rotation.y += 0.0012;
  atmoMesh.rotation.y += 0.0008;
  // Subtle ambient terrain drift
  terrainGroup.rotation.y += 0.0003;
  renderer.render(scene, camera);
}
animate();

// Resize listener
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
