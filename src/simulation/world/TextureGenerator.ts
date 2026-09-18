import * as THREE from 'three/webgpu';

/**
 * Procedural texture generator for architectural 3D office materials.
 * Creates high-resolution, lightweight canvas textures with zero network requests.
 */

let cachedFloorTexture: THREE.CanvasTexture | null = null;
let cachedWoodTexture: THREE.CanvasTexture | null = null;
let cachedWhiteboardTexture: THREE.CanvasTexture | null = null;

/**
 * Architectural Studio Terrazzo & Grid Tile floor texture.
 * Features crisp architectural joints, warm stone tones, and tactile surface variation.
 */
export function getFloorTexture(): THREE.CanvasTexture {
  if (cachedFloorTexture) return cachedFloorTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Base warm architectural terrazzo / honed stone
  ctx.fillStyle = '#dbe3ed';
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle tonal variation across tiles
  const tileSize = 128;
  for (let x = 0; x < 1024; x += tileSize) {
    for (let y = 0; y < 1024; y += tileSize) {
      const shade = (Math.sin(x * 12.9898 + y * 78.233) * 0.5 + 0.5) * 0.05;
      ctx.fillStyle = `rgba(255, 255, 255, ${shade})`;
      ctx.fillRect(x, y, tileSize, tileSize);
    }
  }

  // Architectural tile joints / grout lines (crisp and visible)
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 4;

  for (let x = 0; x <= 1024; x += tileSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1024);
    ctx.stroke();
  }

  for (let y = 0; y <= 1024; y += tileSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // Natural mineral terrazzo flecks
  for (let i = 0; i < 4000; i++) {
    const r = Math.random();
    if (r < 0.4) {
      ctx.fillStyle = 'rgba(71, 85, 105, 0.25)'; // Darker slate specks
    } else if (r < 0.7) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; // White quartz specks
    } else {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.2)'; // Mid-tone stone specks
    }
    const px = Math.random() * 1024;
    const py = Math.random() * 1024;
    const size = 1.5 + Math.random() * 2.5;
    ctx.fillRect(px, py, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedFloorTexture = texture;
  return texture;
}

/**
 * Warm Scandinavian Natural Oak wood grain texture.
 */
export function getWoodDeskTexture(): THREE.CanvasTexture {
  if (cachedWoodTexture) return cachedWoodTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Warm honey-oak base
  ctx.fillStyle = '#dfcaa0';
  ctx.fillRect(0, 0, 512, 512);

  // Warm grain banding
  for (let y = 0; y < 512; y += 3) {
    const darkness = 0.04 + Math.random() * 0.08;
    ctx.fillStyle = `rgba(130, 92, 50, ${darkness})`;
    const h = 1.5 + Math.random() * 2.5;
    ctx.fillRect(0, y, 512, h);
  }

  // Flowing organic wood grain lines
  ctx.strokeStyle = 'rgba(110, 75, 40, 0.08)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const y = Math.random() * 512;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(150, y + 15, 350, y - 12, 512, y + 8);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedWoodTexture = texture;
  return texture;
}

/**
 * Startup Whiteboard Sprint Canvas Texture with diagrams and sticky notes.
 */
export function getWhiteboardTexture(): THREE.CanvasTexture {
  if (cachedWhiteboardTexture) return cachedWhiteboardTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Whiteboard glossy base
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 1024, 1024);

  // Faint dot grid
  ctx.fillStyle = '#cbd5e1';
  for (let x = 40; x < 1024; x += 40) {
    for (let y = 40; y < 1024; y += 40) {
      ctx.fillRect(x, y, 2, 2);
    }
  }

  // Header Title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('NEXIS ARCHITECTURE SPRINT', 60, 90);

  // System Architecture Boxes (Marker lines)
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#2563eb'; // Blue marker
  ctx.strokeRect(80, 150, 220, 120);
  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('AI ROUTER', 110, 215);

  ctx.strokeStyle = '#10b981'; // Green marker
  ctx.strokeRect(400, 150, 240, 120);
  ctx.fillStyle = '#065f46';
  ctx.fillText('6 AGENT TEAM', 430, 215);

  ctx.strokeStyle = '#8b5cf6'; // Purple marker
  ctx.strokeRect(740, 150, 200, 120);
  ctx.fillStyle = '#5b21b6';
  ctx.fillText('SUPABASE DB', 760, 215);

  // Connecting arrows
  ctx.strokeStyle = '#64748b';
  ctx.beginPath();
  ctx.moveTo(300, 210);
  ctx.lineTo(400, 210);
  ctx.moveTo(640, 210);
  ctx.lineTo(740, 210);
  ctx.stroke();

  // Kanban / Agile Columns
  ctx.strokeStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(80, 340);
  ctx.lineTo(940, 340);
  ctx.stroke();

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('TODO', 120, 380);
  ctx.fillText('IN PROGRESS', 420, 380);
  ctx.fillText('VERIFIED 100%', 750, 380);

  // Colorful sticky notes
  const drawSticky = (x: number, y: number, color: string, text: string) => {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(x + 4, y + 4, 140, 120); // Shadow
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 140, 120);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(text, x + 15, y + 60);
  };

  drawSticky(100, 420, '#fef08a', 'Resume Parser');
  drawSticky(100, 560, '#fbcfe8', 'DPDP Guard');
  drawSticky(410, 420, '#bae6fd', 'Agent State');
  drawSticky(410, 560, '#fed7aa', 'Interview Grill');
  drawSticky(740, 420, '#bbf7d0', 'Live Production');
  drawSticky(740, 560, '#bbf7d0', 'WebGPU 3D OK');

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedWhiteboardTexture = texture;
  return texture;
}
