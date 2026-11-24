// The player's car: a low-poly coupe built from boxes, with arcade driving
// physics — throttle, brake, reverse, steering that answers with speed, and
// a circle-vs-building collision that slides along walls instead of sticking.
import * as THREE from 'three';

const RADIUS = 2.3;
const MAX_SPEED = 40;
const MAX_REVERSE = 12;
const ACCEL = 24;
const BRAKE = 42;
const DRAG = 0.55;
const WHEELBASE = 3.1;

function carBody(color) {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1d2b36 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x1a1d22 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.85, 2.0), paint);
  body.position.y = 0.75;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.75, 1.75), glass);
  cabin.position.set(-0.25, 1.5, 0);
  group.add(cabin);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 1.9), paint);
  nose.position.set(2.3, 0.62, 0);
  group.add(nose);
  const lightMaterial = new THREE.MeshLambertMaterial({ color: 0xfff2c0, emissive: 0xffedb0, emissiveIntensity: 1 });
  [-0.6, 0.6].forEach((z) => {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.34), lightMaterial);
    head.position.set(2.56, 0.78, z);
    group.add(head);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.34),
      new THREE.MeshLambertMaterial({ color: 0xd42020, emissive: 0xaa1010, emissiveIntensity: 0.8 }));
    tail.position.set(-2.26, 0.78, z);
    group.add(tail);
  });
  const wheels = [];
  [[1.45, 0.95], [1.45, -0.95], [-1.45, 0.95], [-1.45, -0.95]].forEach(([x, z]) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.44, z);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.36, 12), dark);
    wheel.rotation.x = Math.PI / 2;
    pivot.add(wheel);
    group.add(pivot);
    wheels.push(pivot);
  });
  return { group, wheels };
}

export function createCar(scene) {
  const { group, wheels } = carBody(0xe8483f);
  scene.add(group);
  const state = { x: 0, z: 130, heading: Math.PI, speed: 0, steer: 0, bumped: 0 };

  function collide(colliders, bounds) {
    for (let i = 0; i < colliders.length; i += 1) {
      const box = colliders[i];
      const nearX = Math.max(box.minX, Math.min(state.x, box.maxX));
      const nearZ = Math.max(box.minZ, Math.min(state.z, box.maxZ));
      const dx = state.x - nearX;
      const dz = state.z - nearZ;
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq >= RADIUS * RADIUS) continue;
      const distance = Math.sqrt(distanceSq) || 0.001;
      const pushX = (dx / distance) * (RADIUS - distance);
      const pushZ = (dz / distance) * (RADIUS - distance);
      if (Math.abs(pushX) > Math.abs(pushZ)) state.x += pushX;
      else state.z += pushZ;
      if (Math.abs(state.speed) > 4) state.bumped = 1;
      state.speed *= 0.55;
    }
    state.x = Math.max(bounds.minX, Math.min(bounds.maxX, state.x));
    state.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, state.z));
  }

  return {
    state,
    group,
    reset(pose) {
      state.x = pose.x;
      state.z = pose.z;
      state.heading = pose.heading;
      state.speed = 0;
      state.steer = 0;
      state.bumped = 0;
      group.position.set(state.x, 0, state.z);
      group.rotation.y = state.heading - Math.PI / 2;
    },
    update(dt, input, colliders, bounds) {
      const forward = input.throttle;
      const braking = input.brake;
      if (forward) state.speed += ACCEL * dt;
      if (braking) {
        state.speed += state.speed > 0.5 ? -BRAKE * dt : -ACCEL * 0.6 * dt;
      }
      if (!forward && !braking) state.speed -= state.speed * DRAG * dt;
      if (input.handbrake) state.speed -= state.speed * 3.2 * dt;
      state.speed = Math.max(-MAX_REVERSE, Math.min(MAX_SPEED, state.speed));
      if (Math.abs(state.speed) < 0.05 && !forward && !braking) state.speed = 0;
      const targetSteer = input.steer * 0.5 * Math.min(1, 10 / Math.max(6, Math.abs(state.speed)));
      state.steer += (targetSteer - state.steer) * Math.min(1, dt * 8);
      // Steering right (D) turns the car toward the screen's right: the heading
      // falls as the car turns clockwise seen from above.
      state.heading -= (state.speed / WHEELBASE) * Math.tan(state.steer) * dt;
      state.x += Math.sin(state.heading) * state.speed * dt;
      state.z += Math.cos(state.heading) * state.speed * dt;
      collide(colliders, bounds);
      state.bumped = Math.max(0, state.bumped - dt * 2);
      group.position.set(state.x, 0, state.z);
      // The nose is built along +X; heading - PI/2 turns it onto the direction
      // of travel (sin heading, cos heading).
      group.rotation.y = state.heading - Math.PI / 2;
      const spin = (state.speed * dt) / 0.44;
      wheels.forEach((wheel) => { wheel.rotation.z += spin; });
    },
  };
}
