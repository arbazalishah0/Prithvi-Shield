// PRITHVI-SHIELD Command — 3D Earth & Landslide Geodynamics Engine
// Three.js & GSAP ScrollTrigger Interactive WebGL Earth + Terrain

if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// 1. Three.js Scene Setup
const canvas = document.getElementById('webgl-canvas');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x070a11, 0.02);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 16, 26);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// ══ 2. PROCEDURAL 3D EARTH GLOBE ══
const earthGroup = new THREE.Group();
earthGroup.position.set(12, 14, -8); // Positioned in upper right celestial space

// Earth Core Sphere (Deep Ocean Blue with Specular)
const earthGeo = new THREE.SphereGeometry(6.5, 48, 48);
const earthMat = new THREE.MeshStandardMaterial({
  color: 0x0a192f,
  roughness: 0.6,
  metalness: 0.3,
  emissive: 0x021329,
  emissiveIntensity: 0.4
});
const earthMesh = new THREE.Mesh(earthGeo, earthMat);
earthGroup.add(earthMesh);

// Earth Landmass Wireframe Grid Overlay (Cyan Grid Lines)
const earthWireMat = new THREE.MeshBasicMaterial({
  color: 0x00e5ff,
  wireframe: true,
  transparent: true,
  opacity: 0.35
});
const earthWireMesh = new THREE.Mesh(earthGeo, earthWireMat);
earthWireMesh.scale.set(1.008, 1.008, 1.008);
earthGroup.add(earthWireMesh);

// Earth Glowing Atmospheric Aura
const atmosGeo = new THREE.SphereGeometry(7.2, 32, 32);
const atmosMat = new THREE.MeshBasicMaterial({
  color: 0x38bdf8,
  transparent: true,
  opacity: 0.12,
  side: THREE.BackSide
});
const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
earthGroup.add(atmosMesh);

// Hazard Hotspot Pulsing Beacons on India Coordinates
const beaconGeo = new THREE.RingGeometry(0.15, 0.45, 16);
const beaconMatRed = new THREE.MeshBasicMaterial({
  color: 0xef4444,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.85
});
const beaconHimalaya = new THREE.Mesh(beaconGeo, beaconMatRed);
beaconHimalaya.position.set(2.8, 4.2, 4.0);
beaconHimalaya.lookAt(beaconHimalaya.position.clone().multiplyScalar(2));
earthGroup.add(beaconHimalaya);

const beaconMatGold = new THREE.MeshBasicMaterial({
  color: 0xf59e0b,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.85
});
const beaconWayanad = new THREE.Mesh(beaconGeo, beaconMatGold);
beaconWayanad.position.set(3.2, 2.0, 4.8);
beaconWayanad.lookAt(beaconWayanad.position.clone().multiplyScalar(2));
earthGroup.add(beaconWayanad);

// Orbiting InSAR Radar Satellite & Telemetry Ring
const orbitRingGeo = new THREE.RingGeometry(9.2, 9.28, 64);
const orbitRingMat = new THREE.MeshBasicMaterial({
  color: 0x0284c7,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.25
});
const orbitRing = new THREE.Mesh(orbitRingGeo, orbitRingMat);
orbitRing.rotation.x = Math.PI / 3;
earthGroup.add(orbitRing);

// Satellite Body
const satGroup = new THREE.Group();
const satBody = new THREE.Mesh(
  new THREE.BoxGeometry(0.5, 0.3, 0.3),
  new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 })
);
satGroup.add(satBody);

const panelGeo = new THREE.BoxGeometry(0.9, 0.05, 0.4);
const panelMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.3 });
const panelL = new THREE.Mesh(panelGeo, panelMat);
panelL.position.x = -0.7;
satGroup.add(panelL);
const panelR = new THREE.Mesh(panelGeo, panelMat);
panelR.position.x = 0.7;
satGroup.add(panelR);

satGroup.position.set(6.8, 5.0, 4.2);
earthGroup.add(satGroup);

scene.add(earthGroup);

// ══ 3. PROCEDURAL MOUNTAIN SLOPE TERRAIN ══
const terrainWidth = 56;
const terrainDepth = 56;
const segments = 100;
const geometry = new THREE.PlaneGeometry(terrainWidth, terrainDepth, segments, segments);
geometry.rotateX(-Math.PI / 2);

const pos = geometry.attributes.position;
for (let i = 0; i < pos.count; i++) {
  const x = pos.getX(i);
  const z = pos.getZ(i);
  
  let elevation = Math.sin(x * 0.12) * Math.cos(z * 0.12) * 4.2;
  elevation += Math.sin(x * 0.35 + z * 0.28) * 2.2;
  elevation += Math.cos(x * 0.7 - z * 0.5) * 0.8;
  
  if (x > -10 && x < 10 && z > -8 && z < 12) {
    elevation -= 2.6 * Math.exp(-(x * x + z * z) / 28);
  }
  pos.setY(i, elevation);
}
geometry.computeVertexNormals();

// Topographical Shaded Base Mesh
const terrainMaterial = new THREE.MeshStandardMaterial({
  color: 0x0f172a,
  roughness: 0.8,
  metalness: 0.25,
  flatShading: true
});
const terrainMesh = new THREE.Mesh(geometry, terrainMaterial);
terrainMesh.position.y = -2;
scene.add(terrainMesh);

// Topographic Contour Lines Overlay
const wireframeMaterial = new THREE.MeshBasicMaterial({
  color: 0x00e5ff,
  wireframe: true,
  transparent: true,
  opacity: 0.28
});
const wireframeMesh = new THREE.Mesh(geometry, wireframeMaterial);
wireframeMesh.position.y = -1.97;
scene.add(wireframeMesh);

// Failure Plane / Rupture Slip Scarp
const scarGeometry = new THREE.CylinderGeometry(3.2, 5.8, 0.15, 36);
const scarMaterial = new THREE.MeshBasicMaterial({
  color: 0xef4444,
  wireframe: true,
  transparent: true,
  opacity: 0.6
});
const scarMesh = new THREE.Mesh(scarGeometry, scarMaterial);
scarMesh.position.set(0, -2.4, 2);
scene.add(scarMesh);

// Sliding Debris Cone Mesh
const debrisGeometry = new THREE.ConeGeometry(3.5, 2.2, 16);
debrisGeometry.rotateX(Math.PI);
const debrisMaterial = new THREE.MeshStandardMaterial({
  color: 0xb91c1c,
  roughness: 0.9,
  metalness: 0.1,
  transparent: true,
  opacity: 0.75
});
const debrisMesh = new THREE.Mesh(debrisGeometry, debrisMaterial);
debrisMesh.position.set(0, -1.2, 2);
debrisMesh.scale.set(1, 0.5, 1.4);
scene.add(debrisMesh);

// Rainfall Particles System
const rainCount = 1000;
const rainGeo = new THREE.BufferGeometry();
const rainPositions = new Float32Array(rainCount * 3);
for (let i = 0; i < rainCount; i++) {
  rainPositions[i * 3] = (Math.random() - 0.5) * 45;
  rainPositions[i * 3 + 1] = Math.random() * 25 + 5;
  rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 45;
}
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
const rainMaterial = new THREE.PointsMaterial({
  color: 0x38bdf8,
  size: 0.14,
  transparent: true,
  opacity: 0.0
});
const rainParticles = new THREE.Points(rainGeo, rainMaterial);
scene.add(rainParticles);

// 4. Scene Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0x00e5ff, 2.6);
directionalLight.position.set(14, 26, 14);
scene.add(directionalLight);
const secondaryLight = new THREE.DirectionalLight(0xf59e0b, 1.4);
secondaryLight.position.set(-16, 18, -10);
scene.add(secondaryLight);

// 5. GSAP ScrollTrigger Camera Choreography
let timeline = null;
if (typeof gsap !== 'undefined' && gsap.timeline) {
  timeline = gsap.timeline({
    scrollTrigger: {
      trigger: '.content-container',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.2
    }
  });

  // Section 2: Slope Mechanics (Dive into shear failure zone)
  timeline.to(camera.position, {
    x: -8,
    y: 6.5,
    z: 14,
    ease: 'power2.inOut'
  }, 0);

  timeline.to(camera.rotation, {
    x: -0.2,
    y: -0.35,
    z: 0.05,
    ease: 'power2.inOut'
  }, 0);

  // Section 3: In-depth Classifications (Inspect rupture scar & slip angle)
  timeline.to(camera.position, {
    x: 6,
    y: 4.2,
    z: 8,
    ease: 'power2.inOut'
  }, 1);

  timeline.to(camera.rotation, {
    x: -0.1,
    y: 0.52,
    z: 0.06,
    ease: 'power2.inOut'
  }, 1);

  // Section 4: Multi-Hazard Telemetry Matrix (Focus back to 3D Earth Globe)
  timeline.to(camera.position, {
    x: 10,
    y: 16,
    z: 10,
    ease: 'power2.inOut'
  }, 2);

  timeline.to(camera.rotation, {
    x: -0.2,
    y: 0.45,
    z: 0.05,
    ease: 'power2.inOut'
  }, 2);
}

// Interactive State Variables
let isRainActive = false;
let isSaturated = false;
let isFailureTriggered = false;
let autoRotate = true;
let satAngle = 0;

// Interactive HUD Controls
window.toggleRainSimulation = function() {
  isRainActive = !isRainActive;
  const btn = document.getElementById('hud-btn-rain');
  const badge = document.getElementById('hud-status-rain');
  
  if (isRainActive) {
    rainMaterial.opacity = 0.8;
    if (btn) btn.classList.add('active');
    if (badge) {
      badge.textContent = '145 mm/hr (CRITICAL)';
      badge.style.color = '#ef4444';
    }
  } else {
    rainMaterial.opacity = 0.0;
    if (btn) btn.classList.remove('active');
    if (badge) {
      badge.textContent = 'Normal (0 mm/h)';
      badge.style.color = '#00e5ff';
    }
  }
};

window.toggleSaturation = function() {
  isSaturated = !isSaturated;
  const btn = document.getElementById('hud-btn-sat');
  const badgeFs = document.getElementById('hud-status-fs');
  
  if (isSaturated) {
    terrainMaterial.color.setHex(0x064e3b);
    wireframeMaterial.color.setHex(0x34d399);
    if (btn) btn.classList.add('active');
    if (badgeFs) {
      badgeFs.textContent = '0.88 (SLOPE FAILURE)';
      badgeFs.style.color = '#ef4444';
    }
  } else {
    terrainMaterial.color.setHex(0x0f172a);
    wireframeMaterial.color.setHex(0x00e5ff);
    if (btn) btn.classList.remove('active');
    if (badgeFs) {
      badgeFs.textContent = '1.42 (STABLE)';
      badgeFs.style.color = '#00e5ff';
    }
  }
};

window.triggerSlopeSlip = function() {
  isFailureTriggered = !isFailureTriggered;
  const btn = document.getElementById('hud-btn-slip');
  
  if (isFailureTriggered) {
    if (btn) btn.classList.add('active');
    if (typeof gsap !== 'undefined') {
      gsap.to(debrisMesh.position, {
        x: 1.5,
        y: -3.8,
        z: 8.5,
        duration: 2.2,
        ease: 'power3.in'
      });
      gsap.to(scarMaterial, { opacity: 0.9, duration: 0.5 });
    }
  } else {
    if (btn) btn.classList.remove('active');
    if (typeof gsap !== 'undefined') {
      gsap.to(debrisMesh.position, {
        x: 0,
        y: -1.2,
        z: 2,
        duration: 1.2,
        ease: 'power2.out'
      });
    }
  }
};

window.setCameraView = function(viewName) {
  if (typeof gsap === 'undefined') return;
  autoRotate = false;
  
  if (viewName === 'earth') {
    gsap.to(camera.position, { x: 10, y: 15, z: 8, duration: 1.8, ease: 'power2.out' });
    gsap.to(camera.rotation, { x: -0.1, y: 0.45, z: 0.05, duration: 1.8 });
  } else if (viewName === 'scarp') {
    gsap.to(camera.position, { x: 3, y: 2.5, z: 7, duration: 1.5, ease: 'power2.out' });
    gsap.to(camera.rotation, { x: -0.1, y: 0.4, z: 0.05, duration: 1.5 });
  } else if (viewName === 'overhead') {
    gsap.to(camera.position, { x: 0, y: 24, z: 12, duration: 1.5, ease: 'power2.out' });
    gsap.to(camera.rotation, { x: -1.1, y: 0, z: 0, duration: 1.5 });
  } else if (viewName === 'default') {
    gsap.to(camera.position, { x: 0, y: 16, z: 26, duration: 1.8, ease: 'power2.out' });
    gsap.to(camera.rotation, { x: -0.3, y: 0, z: 0, duration: 1.8 });
    autoRotate = true;
  }
};

window.toggleHudVisibility = function() {
  const hud = document.querySelector('.terrain-hud-controls');
  const reopenBtn = document.getElementById('hud-reopen-btn');
  if (!hud) return;

  if (hud.classList.contains('hud-hidden')) {
    hud.classList.remove('hud-hidden');
    if (reopenBtn) reopenBtn.classList.add('hidden');
  } else {
    hud.classList.add('hud-hidden');
    if (reopenBtn) reopenBtn.classList.remove('hidden');
  }
};

window.scrollToSection = function(id) {
  const target = document.getElementById(id);
  if (target) target.scrollIntoView({ behavior: 'smooth' });
};

// 6. Animation Render Loop
function animate() {
  requestAnimationFrame(animate);

  // 3D Earth Globe Slow Rotation
  earthGroup.rotation.y += 0.0015;

  // InSAR Satellite Orbit
  satAngle += 0.015;
  satGroup.position.x = Math.cos(satAngle) * 9.2;
  satGroup.position.z = Math.sin(satAngle) * 9.2;
  satGroup.rotation.y = -satAngle;

  // Mountain Slow Rotation
  if (autoRotate) {
    terrainMesh.rotation.y += 0.0003;
    wireframeMesh.rotation.y += 0.0003;
    scarMesh.rotation.y += 0.0003;
    debrisMesh.rotation.y += 0.0003;
  }

  // Rain Simulation
  if (isRainActive) {
    const p = rainGeo.attributes.position;
    for (let i = 0; i < rainCount; i++) {
      let y = p.getY(i) - 0.7;
      if (y < -2) y = 25;
      p.setY(i, y);
    }
    p.needsUpdate = true;
  }

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
