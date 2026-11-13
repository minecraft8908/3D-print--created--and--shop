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
let selectedShapeId = null;
let nextShapeId = 1;
const placedShapes = [];
const colorControl = document.querySelector('#color');
const widthControl = document.querySelector('#width');
const depthControl = document.querySelector('#depth');
const thicknessControl = document.querySelector('#thickness');
const form = document.querySelector('form[name="wycena-3d"]');
const fileInput = document.querySelector('#model-file');
const shapePicker = document.querySelector('.shape-picker');
const editPanel = document.createElement('section');
editPanel.className = 'shape-edit-panel';
editPanel.setAttribute('aria-live', 'polite');
editPanel.innerHTML = `
  <div class="shape-edit-heading"><span>EDYTUJ ZAZNACZONY KSZTAŁT</span><span class="shape-selection-status">Nie wybrano</span></div>
  <label class="shape-edit-field">Szerokość <output data-value="width">12 mm</output><input data-edit="width" type="range" min="4" max="60" value="12" disabled></label>
  <label class="shape-edit-field">Głębokość <output data-value="depth">12 mm</output><input data-edit="depth" type="range" min="4" max="60" value="12" disabled></label>
  <label class="shape-edit-field">Wysokość <output data-value="height">8 mm</output><input data-edit="height" type="range" min="2" max="30" value="8" disabled></label>
  <label class="shape-edit-color">Kolor kształtu <input data-edit="color" type="color" value="#5de6ff" disabled></label>
`;
shapePicker.after(editPanel);
const editStyle = document.createElement('style');
editStyle.textContent = `.shape-edit-panel{margin-top:14px;padding:12px;border:1px solid rgba(255,255,255,.09);border-radius:8px;background:rgba(255,255,255,.025)}.shape-edit-heading{display:flex;flex-direction:column;gap:5px;margin-bottom:12px;color:#b4bfd1;font:700 8px 'DM Sans',sans-serif;letter-spacing:.8px}.shape-selection-status{color:#8df0c6;font-size:9px;letter-spacing:0}.shape-edit-field{display:grid;grid-template-columns:1fr auto;gap:7px;margin:10px 0;color:#d6dfec;font:600 9px 'DM Sans',sans-serif}.shape-edit-field output{color:#b4bfd1;font-weight:400}.shape-edit-field input{grid-column:1/-1;width:100%;accent-color:#5de6ff}.shape-edit-color{display:flex;align-items:center;justify-content:space-between;margin-top:12px;color:#d6dfec;font:600 9px 'DM Sans',sans-serif}.shape-edit-color input{width:30px;height:24px;padding:2px;border:1px solid rgba(255,255,255,.1);border-radius:5px;background:#0e1620}.shape-picker .shape-btn[aria-pressed=true]{border-color:#5de6ff;background:rgba(93,230,255,.15);color:#c8f7ff}.shape-picker .cancel-btn{border-color:rgba(255,126,126,.3);color:#ffb1b1}.shape-picker .cancel-btn:disabled{opacity:.4;cursor:not-allowed}`;
document.head.appendChild(editStyle);

function material(color = colorControl.value) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.04 });
}
function addMesh(geometry, y, color = colorControl.value) {
  const mesh = new THREE.Mesh(geometry, material(color));
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
function dropGeometry(width, depth, height) {
  const shape = new THREE.Shape();
  shape.moveTo(0, depth / 2);
  shape.bezierCurveTo(width * .48, depth * .45, width * .58, -depth * .2, 0, -depth / 2);
  shape.bezierCurveTo(-width * .58, -depth * .2, -width * .48, depth * .45, 0, depth / 2);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 16 });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -height / 2, 0);
  return geometry;
}
function geometryFor(shape) {
  if (shape.type === 'box') return new THREE.BoxGeometry(shape.width, shape.height, shape.depth);
  if (shape.type === 'cylinder') return new THREE.CylinderGeometry(shape.width / 2, shape.width / 2, shape.height, 48);
  if (shape.type === 'triangle') return triangleGeometry(shape.width, shape.depth, shape.height);
  if (shape.type === 'drop') return dropGeometry(shape.width, shape.depth, shape.height);
  return new THREE.SphereGeometry(1, 32, 24).scale(shape.width / 2, shape.height / 2, shape.depth / 2);
}
function clearModel() {
  for (const child of [...modelRoot.children]) {
    child.geometry?.dispose();
    if (Array.isArray(child.material)) child.material.forEach(item => item.dispose());
    else child.material?.dispose();
  }
  modelRoot.clear();
}
function createModel() {
  clearModel();
  const w = Number(widthControl.value), d = Number(depthControl.value), t = Number(thicknessControl.value);
  if (preset === 'coaster') {
    addMesh(new THREE.CylinderGeometry(w / 2, w / 2, t, 64), 0);
  } else {
    addMesh(roundedPlate(w, d, t, preset === 'tag' ? Math.min(w, d) * .13 : 3), 0);
    if (preset === 'tag') {
      const loop = addMesh(new THREE.TorusGeometry(Math.min(d * .12, 4), Math.max(t * .22, .65), 12, 32), t * .5 + .01);
      loop.position.set(-w * .34, t * .5 + .01, 0);
      loop.rotation.x = Math.PI / 2;
    }
  }
  placedShapes.forEach((shape, index) => {
    const mesh = addMesh(geometryFor(shape), t / 2 + shape.height / 2, shape.color);
    mesh.position.x = shape.x;
    mesh.position.z = shape.z;
    mesh.userData.shapeId = shape.id;
    if (shape.id === selectedShapeId) {
      mesh.material.emissive.set('#203b46');
      mesh.material.emissiveIntensity = 0.45;
    }
    shape.mesh = mesh;
  });
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
function updateEditPanel() {
  const selected = placedShapes.find(shape => shape.id === selectedShapeId);
  const status = editPanel.querySelector('.shape-selection-status');
  const labels = { box: 'Kwadrat', cylinder: 'Koło', sphere: 'Kula', triangle: 'Trójkąt', drop: 'Kropla' };
  status.textContent = selected ? `${labels[selected.type]} — edycja` : 'Kliknij kształt, aby go edytować';
  editPanel.querySelectorAll('[data-edit]').forEach(control => {
    const key = control.dataset.edit;
    control.disabled = !selected;
    if (!selected) return;
    if (key === 'color') control.value = selected.color;
    else {
      control.value = selected[key];
      editPanel.querySelector(`[data-value="${key}"]`).value = `${selected[key]} mm`;
    }
  });
  const removeButton = shapePicker.querySelector('[data-shape="cancel"]');
  removeButton.disabled = !selected;
  removeButton.textContent = selected ? 'Usuń zaznaczony' : 'Usuń kształt';
  shapePicker.querySelectorAll('[data-shape]:not([data-shape="cancel"])').forEach(button => {
    button.setAttribute('aria-pressed', String(selected?.type === button.dataset.shape));
  });
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
  updateEditPanel();
  attachModelFile();
}
function addShape(type) {
  const baseHeight = Number(thicknessControl.value);
  const shape = {
    id: nextShapeId++, type,
    width: 14, depth: 14, height: 8,
    x: 0, z: 0, color: colorControl.value
  };
  // Place each new primitive at the center of the build plate and raise it
  // onto the plate surface. The sliders below edit the selected object.
  placedShapes.push(shape);
  selectedShapeId = shape.id;
  updateModel();
}
shapePicker.querySelectorAll('[data-shape]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.shape === 'cancel') {
    const index = placedShapes.findIndex(shape => shape.id === selectedShapeId);
    if (index >= 0) placedShapes.splice(index, 1);
    selectedShapeId = null;
    updateModel();
    return;
  }
  addShape(button.dataset.shape);
}));
editPanel.querySelectorAll('input[data-edit]').forEach(input => input.addEventListener('input', () => {
  const selected = placedShapes.find(shape => shape.id === selectedShapeId);
  if (!selected) return;
  const key = input.dataset.edit;
  selected[key] = key === 'color' ? input.value : Number(input.value);
  if (key !== 'color') editPanel.querySelector(`[data-value="${key}"]`).value = `${selected[key]} mm`;
  updateModel();
}));
renderer.domElement.addEventListener('pointerup', event => {
  const bounds = renderer.domElement.getBoundingClientRect();
  const pointer = new THREE.Vector2(
    ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
    -((event.clientY - bounds.top) / bounds.height) * 2 + 1
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(pointer, camera);
  const objects = placedShapes.map(shape => shape.mesh).filter(Boolean);
  const hit = raycaster.intersectObjects(objects, false)[0];
  if (hit?.object.userData.shapeId) {
    selectedShapeId = hit.object.userData.shapeId;
    updateModel();
  }
});

document.querySelectorAll('.preset').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.preset').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  preset = button.dataset.preset;
  updateModel();
}));
[widthControl, depthControl, thicknessControl, colorControl].forEach(input => input.addEventListener('input', updateModel));
document.querySelector('#reset').addEventListener('click', () => {
  preset = 'tag';
  placedShapes.length = 0;
  selectedShapeId = null;
  nextShapeId = 1;
  widthControl.value = 60;
  depthControl.value = 38;
  thicknessControl.value = 5;
  colorControl.value = '#b8f36b';
  document.querySelectorAll('.preset').forEach(item => item.classList.toggle('active', item.dataset.preset === preset));
  document.querySelectorAll('.swatch').forEach(item => item.classList.toggle('active', item.dataset.color === '#b8f36b'));
  updateModel();
});
document.querySelectorAll('.swatch').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.swatch').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  colorControl.value = button.dataset.color;
  updateModel();
}));
document.querySelector('#download').addEventListener('click', () => {
  const file = attachModelFile();
  const link = document.createElement('a');
  link.href = generatedFileUrl;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
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
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
updateModel();
resize();
animate();
