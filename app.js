import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { STLExporter } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/exporters/STLExporter.js';

const viewer = document.querySelector('#viewer');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#f5f6f1');
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 1000);
camera.position.set(82, 72, 96);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
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
const grid = new THREE.GridHelper(180, 18, 0xd1d7c7, 0xe2e6dc);
grid.position.y = -0.5;
scene.add(grid);

const modelRoot = new THREE.Group();
scene.add(modelRoot);
let preset = 'tag';
let generatedFileUrl = null;
const colorControl = document.querySelector('#color');
const widthControl = document.querySelector('#width');
const depthControl = document.querySelector('#depth');
const thicknessControl = document.querySelector('#thickness');
const form = document.querySelector('form[name="wycena-3d"]');
const fileInput = document.querySelector('#model-file');

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

document.querySelectorAll('.preset').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.preset').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  preset = button.dataset.preset;
  updateModel();
}));
[widthControl, depthControl, thicknessControl, colorControl].forEach(input => input.addEventListener('input', updateModel));
document.querySelector('#reset').addEventListener('click', () => {
  preset = 'tag'; widthControl.value = 60; depthControl.value = 38; thicknessControl.value = 5; colorControl.value = '#b8f36b';
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
