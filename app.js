import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { STLExporter } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/exporters/STLExporter.js';

const viewer = document.querySelector('#viewer');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#111827');
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 1000);
camera.position.set(82, 72, 96);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.domElement.style.touchAction = 'none';
viewer.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.target.set(0, 0, 0);
controls.minDistance = 35;
controls.maxDistance = 240;
scene.add(new THREE.HemisphereLight(0xffffff, 0xb7c0a9, 2.1));
const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
keyLight.position.set(50, 90, 60);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xffffff, 1.2);
fillLight.position.set(-50, 30, -40);
scene.add(fillLight);
const grid = new THREE.GridHelper(180, 18, 0x526378, 0x273446);
grid.position.y = -0.5;
scene.add(grid);

const modelRoot = new THREE.Group();
scene.add(modelRoot);
let preset = 'tag';
let generatedFileUrl = null;
let placementType = null;
let pointerStart = null;
const placedShapes = [];
const colorControl = document.querySelector('#color');
const widthControl = document.querySelector('#width');
const depthControl = document.querySelector('#depth');
const thicknessControl = document.querySelector('#thickness');
const form = document.querySelector('form[name="wycena-3d"]');
const fileInput = document.querySelector('#model-file');

// Shape tools are inserted into the preview so you can select a primitive,
// then click on the 3D work area to place it on the model.
const toolbar = document.createElement('div');
toolbar.className = 'shape-tools';
toolbar.innerHTML = '<div class="shape-tools-buttons"><span class="shape-tools-label">DODAJ KSZTAŁT</span><button type="button" data-shape="box">＋ Sześcian</button><button type="button" data-shape="cylinder">＋ Walec</button><button type="button" data-shape="sphere">＋ Kula</button><button type="button" data-shape="cancel" class="shape-cancel" hidden>Anuluj</button></div><span class="shape-hint" aria-live="polite">Wybierz kształt, a potem kliknij miejsce na podglądzie.</span>';
viewer.parentElement.insertBefore(toolbar, viewer);
const toolbarStyle = document.createElement('style');
toolbarStyle.textContent = `.shape-tools{padding:10px 14px;background:rgba(15,23,36,.94);border-bottom:1px solid rgba(255,255,255,.08)}.shape-tools-buttons{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.shape-tools-label{margin-right:4px;color:#b4bfd1;font:700 8px 'DM Sans',sans-serif;letter-spacing:1px}.shape-tools button{padding:7px 9px;border:1px solid rgba(255,255,255,.12);border-radius:6px;background:#1a2939;color:#edf7ff;font:600 9px 'DM Sans',sans-serif;cursor:pointer}.shape-tools button:hover,.shape-tools button[aria-pressed=true]{border-color:#b8f36b;background:rgba(184,243,107,.14);color:#dffeb7}.shape-tools .shape-cancel{border-color:rgba(255,126,126,.3);color:#ffb1b1}.shape-hint{display:block;margin-top:7px;color:#9eabc0;font:400 9px 'DM Sans',sans-serif}.shape-placement-active #viewer canvas{cursor:crosshair}`;
document.head.appendChild(toolbarStyle);

function material() {
  return new THREE.MeshStandardMaterial({ color: colorControl.value, roughness: 0.48, metalness: 0.04 });
}
function addMesh(geometry, y) {
  const mesh = new THREE.Mesh(geometry, material());
  mesh.position.y = y;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  modelRoot.add(mesh);
  return mesh;
}
function roundedPlate(width, depth, thickness, radius = 3) {
  const w = width, d = depth, r = Math.min(radius, width / 4, depth / 4);
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -d / 2);
  shape.lineTo(w / 2 - r, -d / 2); shape.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
  shape.lineTo(w / 2, d / 2 - r); shape.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
  shape.lineTo(-w / 2 + r, d / 2); shape.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
  shape.lineTo(-w / 2, -d / 2 + r); shape.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 8 });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -thickness / 2, 0);
  return geometry;
}
function makePlacedGeometry(type, size) {
  if (type === 'box') return new THREE.BoxGeometry(size, size, size);
  if (type === 'cylinder') return new THREE.CylinderGeometry(size / 2, size / 2, size, 32);
  return new THREE.SphereGeometry(size / 2, 32, 20);
}
function createModel() {
  modelRoot.clear();
  const w = Number(widthControl.value), d = Number(depthControl.value), t = Number(thicknessControl.value);
  if (preset === 'coaster') {
    addMesh(new THREE.CylinderGeometry(w / 2, w / 2, t, 64), 0);
  } else {
    addMesh(roundedPlate(w, d, t, preset === 'tag' ? Math.min(w, d) * .13 : 3), 0);
    if (preset === 'tag') {
      const loop = addMesh(new THREE.TorusGeometry(Math.min(d * .12, 4), Math.max(t * .22, .65), 12, 32), t * .5 + .01);
      loop.position.set(-w * .34, t * .5 + .01, 0);
      loop.rotation.x = Math.PI / 2;
      loop.material = material();
    }
  }
  for (const shape of placedShapes) {
    const mesh = addMesh(makePlacedGeometry(shape.type, shape.size), t / 2 + shape.size / 2);
    mesh.position.x = shape.x;
    mesh.position.z = shape.z;
  }
  modelRoot.rotation.y = -0.12;
  updateLabels();
}
function updateLabels() {
  document.querySelector('#width-value').value = `${widthControl.value} mm`;
  document.querySelector('#depth-value').value = `${depthControl.value} mm`;
  document.querySelector('#thickness-value').value = `${thicknessControl.value} mm`;
  document.querySelector('#dimensions').textContent = `${widthControl.value} × ${depthControl.value} × ${thicknessControl.value} mm`;
  document.querySelector('#model-name').textContent = `${preset === 'tag' ? 'BRELOK' : preset === 'plate' ? 'TABLICZKA' : 'PODSTAWKA'} / 01`;
}
function currentStl() {
  modelRoot.updateMatrixWorld(true);
  const exporter = new STLExporter();
  return new Blob([exporter.parse(modelRoot, { binary: true })], { type: 'model/stl' });
}
function attachModelFile() {
  const blob = currentStl();
  const file = new File([blob], `${preset}-forma.stl`, { type: 'model/stl' });
  const transfer = new DataTransfer();
  transfer.items.add(file);
  fileInput.files = transfer.files;
  document.querySelector('#file-name').textContent = file.name;
  if (generatedFileUrl) URL.revokeObjectURL(generatedFileUrl);
  generatedFileUrl = URL.createObjectURL(blob);
  document.querySelector('#download').dataset.ready = 'true';
  return file;
}
function updateModel() {
  createModel();
  attachModelFile();
}
function setPlacement(type) {
  placementType = type;
  controls.enabled = !type;
  viewer.classList.toggle('shape-placement-active', Boolean(type));
  toolbar.querySelector('[data-shape="cancel"]').hidden = !type;
  toolbar.querySelectorAll('[data-shape]:not([data-shape="cancel"])').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.shape === type));
  });
  toolbar.querySelector('.shape-hint').textContent = type
    ? 'Kliknij na obszarze podglądu, aby postawić kształt. Naciśnij Esc, aby anulować.'
    : 'Wybierz kształt, a potem kliknij miejsce na podglądzie.';
}
toolbar.querySelectorAll('[data-shape]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.shape === 'cancel') setPlacement(null);
  else setPlacement(button.dataset.shape);
}));
renderer.domElement.addEventListener('pointerdown', event => { pointerStart = { x: event.clientX, y: event.clientY }; });
renderer.domElement.addEventListener('pointerup', event => {
  if (!placementType || !pointerStart) return;
  const moved = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
  pointerStart = null;
  if (moved > 6) return;
  const bounds = renderer.domElement.getBoundingClientRect();
  const pointer = new THREE.Vector2(
    ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
    -((event.clientY - bounds.top) / bounds.height) * 2 + 1
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(pointer, camera);
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const point = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(ground, point)) return;
  const size = Math.max(6, Math.min(16, Number(thicknessControl.value) * 2));
  placedShapes.push({ type: placementType, x: point.x, z: point.z, size });
  setPlacement(null);
  updateModel();
});
window.addEventListener('keydown', event => { if (event.key === 'Escape' && placementType) setPlacement(null); });

document.querySelectorAll('.preset').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.preset').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  preset = button.dataset.preset;
  updateModel();
}));
[widthControl, depthControl, thicknessControl, colorControl].forEach(input => input.addEventListener('input', updateModel));
document.querySelector('#reset').addEventListener('click', () => {
  preset = 'tag'; placedShapes.length = 0; setPlacement(null);
  widthControl.value = 60; depthControl.value = 38; thicknessControl.value = 5; colorControl.value = '#b8f36b';
  document.querySelectorAll('.preset').forEach(item => item.classList.toggle('active', item.dataset.preset === preset));
  updateModel();
});
document.querySelector('#download').addEventListener('click', () => {
  const file = attachModelFile();
  const link = document.createElement('a');
  link.href = generatedFileUrl;
  link.download = file.name;
  document.body.appendChild(link); link.click(); link.remove();
});
form.addEventListener('submit', event => {
  if (!fileInput.files.length) {
    event.preventDefault();
    attachModelFile();
    fileInput.reportValidity();
  }
});
function resize() {
  const width = Math.max(viewer.clientWidth, 1), height = Math.max(viewer.clientHeight, 1);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}
new ResizeObserver(resize).observe(viewer);
function animate() { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); }
updateModel(); resize(); animate();
