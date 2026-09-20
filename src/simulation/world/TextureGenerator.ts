import * as THREE from 'three/webgpu';

/**
 * Procedural texture generator for architectural 3D office materials.
 * Creates high-resolution, lightweight canvas textures with zero network requests.
 */

let cachedFloorTexture: THREE.CanvasTexture | null = null;
let cachedWoodTexture: THREE.CanvasTexture | null = null;
let cachedWhiteboardTexture: THREE.CanvasTexture | null = null;
let cachedComputerTexture: THREE.CanvasTexture | null = null;

/**
 * Architectural Studio Terrazzo & Grid Tile floor texture.
 * Features crisp architectural joints, warm stone tones, and tactile Bauhaus surface variation.
 */
export function getFloorTexture(): THREE.CanvasTexture {
  if (cachedFloorTexture) return cachedFloorTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Warm Bauhaus architectural limestone / terrazzo atelier base
  ctx.fillStyle = '#EFE7D8';
  ctx.fillRect(0, 0, 1024, 1024);

  // Architectural drafting hairline grid
  const tileSize = 64;
  ctx.strokeStyle = 'rgba(17, 17, 17, 0.09)';
  ctx.lineWidth = 1;

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

  // Crosshair coordinate marks at major architectural grid intersections
  ctx.fillStyle = 'rgba(17, 17, 17, 0.28)';
  for (let x = 0; x <= 1024; x += tileSize * 2) {
    for (let y = 0; y <= 1024; y += tileSize * 2) {
      ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
  }

  // Tactile Bauhaus terrazzo stone aggregate (primary accents + limestone + graphite)
  for (let i = 0; i < 750; i++) {
    const px = Math.random() * 1024;
    const py = Math.random() * 1024;
    const rand = Math.random();
    if (rand < 0.07) {
      ctx.fillStyle = 'rgba(229, 57, 53, 0.42)'; // Bauhaus Red
    } else if (rand < 0.14) {
      ctx.fillStyle = 'rgba(36, 87, 166, 0.42)'; // Bauhaus Blue
    } else if (rand < 0.21) {
      ctx.fillStyle = 'rgba(244, 196, 48, 0.48)'; // Bauhaus Yellow
    } else if (rand < 0.50) {
      ctx.fillStyle = 'rgba(17, 17, 17, 0.12)'; // Graphite speckles
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // White limestone aggregate
    }
    const size = 1.0 + Math.random() * 1.5;
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
 * Scandinavian Blonde Birch natural wood grain texture.
 */
export function getWoodDeskTexture(): THREE.CanvasTexture {
  if (cachedWoodTexture) return cachedWoodTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Clean blonde Scandinavian birch base
  ctx.fillStyle = '#F2E8D7';
  ctx.fillRect(0, 0, 512, 512);

  // Soft natural wood grain banding
  for (let y = 0; y < 512; y += 3) {
    const darkness = 0.03 + Math.random() * 0.05;
    ctx.fillStyle = `rgba(140, 105, 68, ${darkness})`;
    const h = 1.5 + Math.random() * 2.5;
    ctx.fillRect(0, y, 512, h);
  }

  // Flowing organic wood grain lines
  ctx.strokeStyle = 'rgba(120, 85, 50, 0.07)';
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

/**
 * High-tech IDE & Telemetry Computer Screen Texture.
 * Renders a crisp developer environment with syntax highlighting,
 * file tabs, live metrics sparklines, and terminal logs.
 */
export function getComputerScreenTexture(): THREE.CanvasTexture {
  if (cachedComputerTexture) return cachedComputerTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;

  // 1. Sleek dark command center background
  ctx.fillStyle = '#0a0d16';
  ctx.fillRect(0, 0, 1024, 768);

  // 2. Window Title Bar & Tabs
  ctx.fillStyle = '#111625';
  ctx.fillRect(0, 0, 1024, 42);

  // Window control dots
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(22, 21, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(42, 21, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(62, 21, 6, 0, Math.PI * 2);
  ctx.fill();

  // Tabs
  ctx.fillStyle = '#1a2236';
  ctx.fillRect(90, 8, 160, 34);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('⚡ ats_engine.ts', 105, 30);

  ctx.fillStyle = '#111625';
  ctx.fillRect(255, 8, 145, 34);
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('job_stream.rs', 270, 30);

  ctx.fillStyle = '#111625';
  ctx.fillRect(405, 8, 150, 34);
  ctx.fillText('telemetry.onnx', 418, 30);

  // Title bar header label
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('NEXIS INTELLIGENCE SUITE — NODE #01', 750, 26);

  // 3. Left Pane: Code Editor (width 620px)
  ctx.fillStyle = '#0c101c';
  ctx.fillRect(0, 42, 620, 686);

  // Line numbers gutter
  ctx.fillStyle = '#111625';
  ctx.fillRect(0, 42, 48, 686);
  ctx.fillStyle = '#475569';
  ctx.font = '13px monospace';
  for (let i = 1; i <= 22; i++) {
    const lineNum = i < 10 ? `0${i}` : `${i}`;
    ctx.fillText(lineNum, 14, 50 + i * 28);
  }

  // Syntax highlighted code lines
  const codeLines: { text: string; color: string }[] = [
    { text: '// NEXIS Autonomous Career Orchestration Engine', color: '#6ee7b7' },
    { text: "import { AgentCluster, NeuralMatcher } from '@nexis/core';", color: '#38bdf8' },
    { text: "import { STAR_Optimizer } from './resume_forge';", color: '#38bdf8' },
    { text: '', color: '#fff' },
    { text: 'export async function processJobMatching(candidate, jds) {', color: '#f59e0b' },
    { text: '  const cluster = new AgentCluster({ autonomous: true });', color: '#e2e8f0' },
    { text: '  const evaluation = await cluster.evaluateFit(candidate, jds);', color: '#c084fc' },
    { text: '  if (evaluation.matchScore > 0.92) {', color: '#fb923c' },
    { text: '    const resume = await STAR_Optimizer.tailor(candidate);', color: '#38bdf8' },
    { text: '    console.log("[PASS] High Fit: " + evaluation.rating);', color: '#4ade80' },
    { text: '    return { status: "AUTO_APPLY_READY", score: 98.4 };', color: '#34d399' },
    { text: '  }', color: '#fb923c' },
    { text: '  return cluster.planSkillGaps(candidate, jds);', color: '#c084fc' },
    { text: '}', color: '#f59e0b' },
    { text: '', color: '#fff' },
    { text: '// ── Live Agent Stream ──────────────────────────', color: '#64748b' },
    { text: 'cluster.on("task_completed", (agent, result) => {', color: '#38bdf8' },
    { text: '  telemetry.log(`Agent ${agent.name} delivered payload`);', color: '#e2e8f0' },
    { text: '  soundEffect.play("task_ding");', color: '#cbd5e1' },
    { text: '});', color: '#38bdf8' },
    { text: 'console.log(">> STATUS: ALL 6 AGENTS SYNCHRONIZED [OK]");', color: '#10b981' },
  ];

  ctx.font = '14px monospace';
  codeLines.forEach((line, idx) => {
    ctx.fillStyle = line.color;
    ctx.fillText(line.text, 62, 78 + idx * 28);
  });

  // Divider line
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(620, 42, 2, 686);

  // 4. Right Pane: Telemetry Dashboard (width 402px)
  ctx.fillStyle = '#0e1322';
  ctx.fillRect(622, 42, 402, 686);

  // Card 1: Metric Header
  ctx.fillStyle = '#161d30';
  ctx.fillRect(638, 58, 370, 110);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(638, 58, 370, 110);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('SYSTEM MATCH SCORE', 655, 84);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('98.7%', 655, 126);

  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('▲ OPTIMAL TIER (TOP 1%)', 800, 126);

  // Card 2: Live Sparkline Graph
  ctx.fillStyle = '#161d30';
  ctx.fillRect(638, 182, 370, 150);
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
  ctx.strokeRect(638, 182, 370, 150);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('LIVE ATS THROUGHPUT / SEC', 655, 206);

  // Draw smooth sparkline curve
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 3;
  ctx.beginPath();
  const graphPoints = [
    [655, 300], [690, 270], [730, 285], [770, 240], [810, 255], [860, 220], [900, 230], [950, 215], [990, 225]
  ];
  graphPoints.forEach(([gx, gy], i) => {
    if (i === 0) ctx.moveTo(gx, gy);
    else ctx.lineTo(gx, gy);
  });
  ctx.stroke();

  // Shimmer area under curve
  ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
  ctx.lineTo(990, 315);
  ctx.lineTo(655, 315);
  ctx.closePath();
  ctx.fill();

  // Card 3: Agent Task Meters
  ctx.fillStyle = '#161d30';
  ctx.fillRect(638, 346, 370, 220);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.strokeRect(638, 346, 370, 220);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('ACTIVE AGENT TELEMETRY', 655, 370);

  const agentBars = [
    { name: 'Director (Hat)', pct: 95, color: '#4f46e5' },
    { name: 'Vision (Glasses)', pct: 88, color: '#2563eb' },
    { name: 'Strategist (Headphones)', pct: 92, color: '#7c3aed' },
    { name: 'Writer (Cap)', pct: 84, color: '#10b981' },
    { name: 'Hunter (Antenna)', pct: 90, color: '#f59e0b' },
    { name: 'Mirror (Crown)', pct: 78, color: '#ec4899' },
  ];

  agentBars.forEach((bar, i) => {
    const y = 390 + i * 26;
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px monospace';
    ctx.fillText(bar.name, 655, y + 10);

    // Track
    ctx.fillStyle = '#0a0d16';
    ctx.fillRect(820, y, 165, 12);
    // Fill
    ctx.fillStyle = bar.color;
    ctx.fillRect(820, y, (bar.pct / 100) * 165, 12);
  });

  // Card 4: Terminal console footer
  ctx.fillStyle = '#090d17';
  ctx.fillRect(638, 580, 370, 130);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.strokeRect(638, 580, 370, 130);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '11px monospace';
  ctx.fillText('> nexis --cluster-health: 100% OK', 652, 606);
  ctx.fillStyle = '#4ade80';
  ctx.fillText('> pipeline: 48 jobs scanned, 3 interviews ready', 652, 626);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText('> DPDP Guard: zero PII leaks detected', 652, 646);
  ctx.fillStyle = '#f59e0b';
  ctx.fillText('> WebGPU Render: Active 60fps █', 652, 666);

  // 5. Bottom Status Bar (height 40px)
  ctx.fillStyle = '#090c14';
  ctx.fillRect(0, 728, 1024, 40);
  ctx.strokeStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(0, 728);
  ctx.lineTo(1024, 728);
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('● NEXIS TERMINAL CONNECTED', 20, 752);

  ctx.fillStyle = '#64748b';
  ctx.font = '12px monospace';
  ctx.fillText('UTF-8 | TypeScript 5.7 | 6 Autonomous Nodes | Memory: 32MB', 260, 752);

  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('LATENCY: 12ms [OPTIMAL]', 860, 752);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedComputerTexture = texture;
  return texture;
}
