// Drawing only: the Three.js scene, the sun, the sky, the chase camera and the
// HUD. The camera answers the car's speed with a little field-of-view kick.
import * as THREE from 'three';

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fc6de);
  scene.fog = new THREE.Fog(0xcfe0ea, 220, 720);

  const sun = new THREE.DirectionalLight(0xfff0cd, 2.6);
  sun.position.set(140, 220, 90);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfd9ee, 0x8a7a5a, 1.5));

  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 1600);
  camera.position.set(0, 40, 170);

  const speedEl = document.getElementById('hud-speed');
  const streetEl = document.getElementById('hud-street');
  const compassEl = document.getElementById('hud-compass');
  const cameraTarget = new THREE.Vector3();
  const cameraPosition = new THREE.Vector3(0, 40, 170);
  const lookTarget = new THREE.Vector3();

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  resize();
  window.addEventListener('resize', resize);

  return {
    scene,
    updateHud(car, streetName) {
      if (!speedEl) return;
      const mph = Math.round(Math.abs(car.speed) * 2.2);
      speedEl.textContent = `${mph}`;
      streetEl.textContent = streetName(car.x, car.z);
      const degrees = ((Math.atan2(Math.sin(car.heading), -Math.cos(car.heading)) * 180) / Math.PI + 360) % 360;
      compassEl.textContent = COMPASS[Math.round(degrees / 45) % 8];
    },
    chase(car, dt) {
      const forwardX = Math.sin(car.heading);
      const forwardZ = Math.cos(car.heading);
      cameraTarget.set(
        car.x - forwardX * 13.5,
        6.2,
        car.z - forwardZ * 13.5,
      );
      cameraPosition.lerp(cameraTarget, Math.min(1, dt * 5));
      camera.position.copy(cameraPosition);
      lookTarget.set(car.x + forwardX * 9, 2.2, car.z + forwardZ * 9);
      camera.lookAt(lookTarget);
      const targetFov = 58 + Math.min(10, Math.abs(car.speed) * 0.22);
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 3);
        camera.updateProjectionMatrix();
      }
    },
    setView(position, lookAt, fov) {
      cameraPosition.set(position[0], position[1], position[2]);
      camera.position.copy(cameraPosition);
      camera.lookAt(lookAt[0], lookAt[1], lookAt[2]);
      camera.fov = fov;
      camera.updateProjectionMatrix();
    },
    draw() {
      renderer.render(scene, camera);
    },
  };
}
