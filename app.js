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
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.domElement.style.touchAction = 'none';
viewer.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.target.set(0, 0, 0);
controls.minDistance = 25;
controls.maxDistance = 240;
scene.add(new THREE.HemisphereLight(0xffffff, 0x47546a, 2));
const keyLight = new THREE.DirectionalLight(0xffffff, 3);
keyLight.position.set(50, 90, 60);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xffffff, 1.3);
fillLight.position.set(-50, 30, -40);
scene.add(fillLight);
const grid = new THREE.GridHelper(180, 18, 0x526378, 0x273446);
grid.position.y = -0.5;
scene.add(grid);

const modelRoot = new THREE.Group();
scene.add(modelRoot);
const widthControl = document.querySelector('#width');
const depthControl = document.querySelector('#depth');
const heightControl = document.querySelector('#thickness');
const colorControl = document.querySelector('#color');
const fileInput = document.querySelector('#model-file');
const form = document.querySelector('form[name="wycena-3d"]');
const projectCards = [...document.querySelectorAll('.project-card')];
let projectId = 'keychain';
let selectedPartId = null;
let parts = [];
let currentDownloadUrl = null;

const projectFactories = {
  keychain: () => [
    { id: 'plate', name: 'Płytka breloka', type: 'rounded', width: 42, depth: 26, height: 5, x: 0, y: 2.5, z: 0, color: '#b8f36b' },
    { id: 'ring', name: 'Kółko', type: 'ring', width: 10, depth: 10, height: 2, x: -18, y: 5.2, z: 0, color: '#5de6ff' }
  ],
  house: () => [
    { id: 'body', name: 'Ściany domku', type: 'box', width: 34, depth: 28, height: 22, x: 0, y: 11, z: 0, color: '#ffb454' },
    { id: 'roof', name: 'Dach', type: 'triangle', width: 42, depth: 32, height: 12, x: 0, y: 28, z: 0, color: '#ff7ec7' },
    { id: 'door', name: 'Drzwi', type: 'box', width: 9, depth: 2, height: 13, x: 0, y: 6.5, z: 15, color: '#5de6ff' }
  ],
  planter: () => [
    { id: 'pot', name: 'Doniczka', type: 'cylinder', width: 32, depth: 32, height: 28, x: 0, y: 14, z: 0, color: '#8df0c6' },
    { id: 'rim', name: 'Obręcz doniczki', type: 'ring', width: 36, depth: 36, height: 3, x: 0, y: 27, z: 0, color: '#b8f36b' }
  ],
  coaster: () => [
    { id: 'base', name: 'Podstawka', type: 'cylinder', width: 64, depth: 64, height: 5, x: 0, y: 2.5, z: 0, color: '#5de6ff' },
    { id: 'accent', name: 'Wypukły środek', type: 'cylinder', width: 34, depth: 34, height: 2, x: 0, y: 6, z: 0, color: '#b8f36b' }
  ]
};
const projectNames = { keychain: 'BRELOK', house: 'DOMEK', planter: 'DONICZKA', coaster: 'PODSTAWKA' };

function roundedGeometry(width, depth, height) {
  const radius = Math.min(width, depth) * 0.12;
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2 + radius, -depth / 2);
  shape.lineTo(width / 2 - radius, -depth / 2);
  shape.quadraticCurveTo(width / 2, -depth / 2, width / 2, -depth / 2 + radius);
  shape.lineTo(width / 2, depth / 2 - radius);
  shape.quadraticCurveTo(width / 2, depth / 2, width / 2 - radius, depth / 2);
  shape.lineTo(-width / 2 + radius, depth / 2);
  shape.quadraticCurveTo(-width / 2, depth / 2, -width / 2, depth / 2 - radius);
  shape.lineTo(-width / 2, -depth / 2 + radius);
  shape.quadraticCurveTo(-width / 2, -depth / 2, -width / 2 + radius, -depth / 2);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 10 });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -height / 2, 0);
  return geometry;
}
function triangleGeometry(width, depth, height) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -depth / 2);
  shape.lineTo(width / 2, -depth / 2);
  shape.lineTo(0, depth / 2);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -height / 2, 0);
  return geometry;
}
function geometryFor(part) {
  switch (part.type) {
    case 'rounded': return roundedGeometry(part.width, part.depth, part.height);
    case 'cylinder': return new THREE.CylinderGeometry(part.width / 2, part.depth / 2, part.height, 48);
    case 'ring': return new THREE.TorusGeometry(Math.max(1, Math.min(part.width, part.depth) / 2 - 1), Math.max(0.8, part.height / 2), 12, 40);
    case 'triangle': return triangleGeometry(part.width, part.depth, part.height);
    default: return new THREE.BoxGeometry(part.width, part.height, part.depth);
  }
}
function disposeModel() {
  for (const child of [...modelRoot.children]) {
    child.geometry.dispose();
    child.material.dispose();
  }
  modelRoot.clear();
}
function renderModel() {
  disposeModel();
  for (const part of parts) {
    const material = new THREE.MeshStandardMaterial({ color: part.color, roughness: 0.48, metalness: 0.04 });
    if (part.id === selectedPartId) {
      material.emissive.set(part.color);
      material.emissiveIntensity = 0.16;
    }
    const mesh = new THREE.Mesh(geometryFor(part), material);
    mesh.position.set(part.x, part.y, part.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.partId = part.id;
    part.mesh = mesh;
    modelRoot.add(mesh);
  }
  updateSelectionControls();
  updateFileName();
}
function selectProject(id) {
  projectId = id;
  parts = projectFactories[id]();
  selectedPartId = parts[0]?.id ?? null;
  projectCards.forEach(card => card.classList.toggle('active', card.dataset.project === id));
  document.querySelector('#model-name').textContent = projectNames[id];
  document.querySelector('#selected-project-label').textContent = `${projectNames[id]} — kliknij część, aby edytować`;
  renderModel();
  fitCamera();
}
function updateSelectionControls() {
  const part = parts.find(item => item.id === selectedPartId);
  const controls = [
    [widthControl, '#width-value', part?.width],
    [depthControl, '#depth-value', part?.depth],
    [heightControl, '#thickness-value', part?.height]
  ];
  controls.forEach(([input, output, value]) => {
    input.disabled = !part;
    if (part) input.value = Math.max(Number(input.min), Math.min(Number(input.max), value));
    document.querySelector(output).value = part ? `${value} mm` : '—';
  });
  colorControl.disabled = !part;
  if (part) colorControl.value = part.color;
  document.querySelector('#selection-help').textContent = part
    ? `Edytujesz: ${part.name}. Kliknij inną część modelu, aby ją wybrać.`
    : 'Kliknij część modelu w podglądzie, aby ją edytować.';
  document.querySelector('#dimensions').textContent = part
    ? `${part.width} × ${part.depth} × ${part.height} mm`
    : 'Wymiary elementu';
  document.querySelectorAll('.swatch').forEach(button => button.classList.toggle('active', button.dataset.color === part?.color));
}
function updateSelectedPart(field, value) {
  const part = parts.find(item => item.id === selectedPartId);
  if (!part) return;
  part[field] = field === 'color' ? value : Number(value);
  renderModel();
}
function fitCamera() {
  const box = new THREE.Box3().setFromObject(modelRoot);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  controls.target.copy(center);
  const maxDimension = Math.max(size.x, size.y, size.z, 20);
  camera.position.set(center.x + maxDimension * 1.5, center.y + maxDimension * 1.15, center.z + maxDimension * 1.7);
  camera.near = Math.max(0.1, maxDimension / 100);
  camera.far = maxDimension * 20;
  camera.updateProjectionMatrix();
  controls.minDistance = maxDimension * 0.8;
  controls.maxDistance = maxDimension * 8;
  controls.update();
}
function exportStl() {
  modelRoot.updateMatrixWorld(true);
  const exporter = new STLExporter();
  const data = exporter.parse(modelRoot, { binary: true });
  return new Blob([data], { type: 'model/stl' });
}
function updateFileName() {
  document.querySelector('#file-name').textContent = `${projectId}-forma.stl — gotowy do wysłania`;
}
function downloadStl() {
  try {
    const blob = exportStl();
    if (!blob.size) throw new Error('Eksportowany plik jest pusty.');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectId}-forma.stl`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (error) {
    console.error('Nie udało się wygenerować pliku STL:', error);
    alert('Nie udało się pobrać STL. Odśwież stronę i spróbuj ponownie.');
  }
}

projectCards.forEach(card => card.addEventListener('click', () => selectProject(card.dataset.project)));
[widthControl, depthControl, heightControl].forEach((input, index) => {
  const field = ['width', 'depth', 'height'][index];
  input.addEventListener('input', () => updateSelectedPart(field, input.value));
});
colorControl.addEventListener('input', () => updateSelectedPart('color', colorControl.value));
document.querySelectorAll('.swatch').forEach(button => button.addEventListener('click', () => {
  if (!selectedPartId) return;
  colorControl.value = button.dataset.color;
  updateSelectedPart('color', colorControl.value);
}));
document.querySelector('#reset').addEventListener('click', () => selectProject('keychain'));
document.querySelector('#download').addEventListener('click', downloadStl);

renderer.domElement.addEventListener('pointerup', event => {
  const bounds = renderer.domElement.getBoundingClientRect();
  const pointer = new THREE.Vector2(
    ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
    -((event.clientY - bounds.top) / bounds.height) * 2 + 1
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(modelRoot.children, false)[0];
  if (!hit) return;
  selectedPartId = hit.object.userData.partId;
  renderModel();
});
form.addEventListener('submit', event => {
  event.preventDefault();
  try {
    const blob = exportStl();
    const file = new File([blob], `${projectId}-forma.stl`, { type: 'model/stl' });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInput.files = transfer.files;
    form.submit();
  } catch (error) {
    console.error('Nie udało się przygotować STL do formularza:', error);
    alert('Nie udało się przygotować modelu. Spróbuj ponownie.');
  }
});
function resize() {
  const width = Math.max(viewer.clientWidth, 1);
  const height = Math.max(viewer.clientHeight, 1);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}
new ResizeObserver(resize).observe(viewer);
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
selectProject(projectId);
resize();
animate();
