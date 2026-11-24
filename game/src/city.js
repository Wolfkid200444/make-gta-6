// Vice Bay: a deterministic low-poly coastal city built from a seed.
// Streets run on a 52-unit grid; the ocean waits at the south edge.
// Every building, palm and lamp comes from the seed, so the city is the same
// on every load and every screenshot is reproducible.
import * as THREE from 'three';
import { createRandom, intBetween, pick } from './random.js';

export const STREET_STEP = 52;
export const ROAD_HALF = 7;
export const GRID = 3;
export const CITY_HALF = GRID * STREET_STEP + ROAD_HALF; // 163
export const WATER_Z = 205;
export const BOUNDS = { minX: -CITY_HALF, maxX: CITY_HALF, minZ: -CITY_HALF, maxZ: 196 };

export const AVENUES = ['Coral Ave', 'Palm Ave', 'Sunset Ave', 'Marina Blvd', 'Ocean Dr', 'Bay St', 'Harbor Rd'];
export const STREETS = ['Flamingo St', 'Hibiscus St', 'Tropicana Ave', 'Vice Ave', 'Neon St', 'Coconut Ln', 'Biscayne Blvd'];

const BUILDING_COLORS = [
  0xf2e3c6, 0xe8b48a, 0x7fb3a3, 0xd98a7a, 0xe6d3a3,
  0x9db8c4, 0xf0c98f, 0xc98a6b, 0x8fb8a8, 0xe0a080,
];
const ROOF_COLOR = 0x4a4550;
const ROAD_COLOR = 0x343945;
const WALK_COLOR = 0xcfc7b4;
const GROUND_COLOR = 0xb9bd93;
const SAND_COLOR = 0xe8d9ae;
const WATER_COLOR = 0x2f7ea6;
const DASH_COLOR = 0xe8e4d2;
const TRUNK_COLOR = 0x7a5230;
const CANOPY_COLOR = 0x3f7d44;
const LAMP_COLOR = 0x2c2f36;
const LAMP_GLOW = 0xffe9a8;

function flat(color) {
  return new THREE.MeshLambertMaterial({ color });
}

function billboardTexture(lines, background, foreground) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  context.fillStyle = background;
  context.fillRect(0, 0, 512, 256);
  context.fillStyle = foreground;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = 'bold 64px system-ui, sans-serif';
  context.fillText(lines[0], 256, lines.length > 1 ? 96 : 128);
  if (lines.length > 1) {
    context.font = '32px system-ui, sans-serif';
    context.fillText(lines[1], 256, 176);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createCity(scene, seed) {
  const random = createRandom(seed);
  const colliders = [];
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  // Ground, beach and ocean.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1100, 1100), flat(GROUND_COLOR));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 60);
  scene.add(ground);
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(900, 46), flat(SAND_COLOR));
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(0, 0.03, CITY_HALF + 22);
  scene.add(beach);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(900, 420), flat(WATER_COLOR));
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.4, WATER_Z + 210);
  scene.add(water);

  // Roads: one dark strip per avenue and street.
  const roadMaterial = flat(ROAD_COLOR);
  for (let i = -GRID; i <= GRID; i += 1) {
    const along = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF * 2, CITY_HALF * 2), roadMaterial);
    along.rotation.x = -Math.PI / 2;
    along.position.set(i * STREET_STEP, 0.02, 0);
    scene.add(along);
    const across = new THREE.Mesh(new THREE.PlaneGeometry(CITY_HALF * 2, ROAD_HALF * 2), roadMaterial);
    across.rotation.x = -Math.PI / 2;
    across.position.set(0, 0.02, i * STREET_STEP);
    scene.add(across);
  }

  // Lane dashes, one instanced mesh for the whole city.
  const dashPositions = [];
  for (let i = -GRID; i <= GRID; i += 1) {
    for (let at = -CITY_HALF + 8; at <= CITY_HALF - 8; at += 8) {
      const nearCrossing = Math.abs(((at % STREET_STEP) + STREET_STEP) % STREET_STEP) < 10
        || Math.abs(STREET_STEP - (((at % STREET_STEP) + STREET_STEP) % STREET_STEP)) < 10;
      if (nearCrossing) continue;
      dashPositions.push([i * STREET_STEP, at, false]);
      dashPositions.push([at, i * STREET_STEP, true]);
    }
  }
  const dashes = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.5, 0.04, 3), flat(DASH_COLOR), dashPositions.length,
  );
  dashPositions.forEach(([x, z, across], index) => {
    dummy.position.set(x, 0.05, z);
    dummy.rotation.set(0, across ? Math.PI / 2 : 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    dashes.setMatrixAt(index, dummy.matrix);
  });
  scene.add(dashes);

  // Blocks: sidewalks, buildings, parks. Blocks sit between the streets.
  const buildings = [];
  const parks = [];
  for (let bx = -GRID; bx < GRID; bx += 1) {
    for (let bz = -GRID; bz < GRID; bz += 1) {
      const cx = bx * STREET_STEP + STREET_STEP / 2;
      const cz = bz * STREET_STEP + STREET_STEP / 2;
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), flat(WALK_COLOR));
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(cx, 0.05, cz);
      scene.add(walk);
      const distance = Math.hypot(cx, cz);
      if (random() < 0.12 && distance > 60) {
        parks.push({ x: cx, z: cz });
        continue;
      }
      const split = random() < 0.4;
      const count = split ? 2 : 1;
      for (let b = 0; b < count; b += 1) {
        const w = intBetween(random, 14, 26);
        const d = intBetween(random, 14, 26);
        const centreBonus = distance < 80 ? random() * 26 : random() * 6;
        const h = 9 + random() * 14 + centreBonus;
        const x = split ? cx + (b === 0 ? -9 : 9) : cx + (random() - 0.5) * 8;
        const z = split ? cz + (random() - 0.5) * 6 : cz + (random() - 0.5) * 8;
        buildings.push({ x, z, w, d, h, color: pick(random, BUILDING_COLORS) });
        colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      }
    }
  }

  // Buildings and their roof caps, two instanced meshes.
  const buildingMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), buildings.length,
  );
  const roofMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1), flat(ROOF_COLOR), buildings.length,
  );
  buildings.forEach((building, index) => {
    dummy.position.set(building.x, building.h / 2, building.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(building.w, building.h, building.d);
    dummy.updateMatrix();
    buildingMesh.setMatrixAt(index, dummy.matrix);
    buildingMesh.setColorAt(index, color.setHex(building.color));
    dummy.position.set(building.x, building.h + 0.4, building.z);
    dummy.scale.set(building.w * 0.86, 0.8, building.d * 0.86);
    dummy.updateMatrix();
    roofMesh.setMatrixAt(index, dummy.matrix);
  });
  scene.add(buildingMesh);
  scene.add(roofMesh);

  // Parks: lawns and palms.
  const parkMaterial = flat(0x7fae62);
  const palmSpots = [];
  parks.forEach((park) => {
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), parkMaterial);
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(park.x, 0.08, park.z);
    scene.add(lawn);
    for (let i = 0; i < 5; i += 1) {
      palmSpots.push([park.x + (random() - 0.5) * 30, park.z + (random() - 0.5) * 30]);
    }
  });

  // Palms along the sidewalks and the beach, one trunk and one canopy mesh each.
  for (let i = -GRID; i <= GRID; i += 1) {
    for (let at = -CITY_HALF + 20; at <= CITY_HALF - 20; at += 52) {
      palmSpots.push([i * STREET_STEP + 10.5, at + (random() - 0.5) * 8]);
      palmSpots.push([at + (random() - 0.5) * 8, i * STREET_STEP - 10.5]);
    }
  }
  for (let x = -160; x <= 160; x += 32) palmSpots.push([x, CITY_HALF + 12]);
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.32, 0.45, 5.4, 6), flat(TRUNK_COLOR), palmSpots.length);
  const canopies = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.4, 0), flat(CANOPY_COLOR), palmSpots.length);
  palmSpots.forEach(([x, z], index) => {
    dummy.position.set(x, 2.7, z);
    dummy.rotation.set(0, random() * Math.PI, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    trunks.setMatrixAt(index, dummy.matrix);
    dummy.position.set(x, 6.2, z);
    dummy.scale.set(1, 0.62, 1);
    dummy.updateMatrix();
    canopies.setMatrixAt(index, dummy.matrix);
  });
  scene.add(trunks);
  scene.add(canopies);

  // Street lamps along the roads.
  const lampSpots = [];
  for (let i = -GRID; i <= GRID; i += 1) {
    for (let at = -CITY_HALF + 13; at <= CITY_HALF - 13; at += 26) {
      lampSpots.push([i * STREET_STEP + 8.6, at]);
      lampSpots.push([at, i * STREET_STEP + 8.6]);
    }
  }
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 6), flat(LAMP_COLOR), lampSpots.length);
  const heads = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.36, 8, 6),
    new THREE.MeshLambertMaterial({ color: LAMP_GLOW, emissive: 0xffe9a8, emissiveIntensity: 0.9 }),
    lampSpots.length,
  );
  lampSpots.forEach(([x, z], index) => {
    dummy.position.set(x, 3, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    poles.setMatrixAt(index, dummy.matrix);
    dummy.position.set(x, 6.1, z);
    dummy.updateMatrix();
    heads.setMatrixAt(index, dummy.matrix);
  });
  scene.add(poles);
  scene.add(heads);

  // Billboards on poles near the centre: the city's own signs.
  const signs = [
    { lines: ['VICE BAY', 'SUN • SURF • STREETS'], background: '#e8483f', foreground: '#ffffff', x: 10.5, z: -26 },
    { lines: ['PALM COURT', 'HOTEL'], background: '#1f6f8b', foreground: '#ffe9a8', x: -62, z: 10.5 },
    { lines: ['NEON MOTEL', 'VACANCY'], background: '#7a4a9e', foreground: '#ffffff', x: 62, z: 62 },
  ];
  signs.forEach((sign) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 9, 6), flat(LAMP_COLOR));
    pole.position.set(sign.x, 4.5, sign.z);
    scene.add(pole);
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(14, 7, 0.6),
      new THREE.MeshLambertMaterial({ map: billboardTexture(sign.lines, sign.background, sign.foreground) }),
    );
    board.position.set(sign.x, 11, sign.z);
    board.rotation.y = Math.PI / 4;
    scene.add(board);
    colliders.push({ minX: sign.x - 0.6, maxX: sign.x + 0.6, minZ: sign.z - 0.6, maxZ: sign.z + 0.6 });
  });

  return {
    colliders,
    startPose: { x: 0, z: 130, heading: Math.PI },
    streetName(x, z) {
      const ai = Math.max(0, Math.min(AVENUES.length - 1, Math.round((x + GRID * STREET_STEP) / STREET_STEP)));
      const si = Math.max(0, Math.min(STREETS.length - 1, Math.round((z + GRID * STREET_STEP) / STREET_STEP)));
      return `${AVENUES[ai]} & ${STREETS[si]}`;
    },
  };
}
