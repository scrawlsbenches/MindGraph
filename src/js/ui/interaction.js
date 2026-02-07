/* ============================================
   MindGraph — User Interaction (mouse, keyboard)
   ============================================ */

let dragNode = null, isPanning = false, psx = 0, psy = 0, csx = 0, csy = 0, mdTime = 0;

function gmw(e) {
  const r = canvas.getBoundingClientRect();
  const sx = e.clientX - r.left, sy = e.clientY - r.top;
  return { sx, sy, ...s2w(sx, sy) };
}

function findNode(wx, wy) {
  for (let i = NUM_NODES - 1; i >= 0; i--) {
    const n = nodes[i];
    if (!n.visible) continue;
    const dx = wx - n.x, dy = wy - n.y, hr = Math.max(n.r, 6) + 3 / camZoom;
    if (dx * dx + dy * dy < hr * hr) return n;
  }
  return null;
}

canvas.addEventListener('mousedown', e => {
  mdTime = Date.now();
  const { sx, sy, x, y } = gmw(e);
  const hit = findNode(x, y);
  if (hit) {
    if (e.shiftKey || pathMode) {
      if (!pathStart) {
        pathStart = hit;
        pathResult = null; pathParticles = [];
        labelVisCache = null;
        updatePathBanner();
        return;
      } else if (pathStart.id !== hit.id) {
        pathResult = bfsPath(pathStart.id, hit.id);
        pathParticles = [];
        labelVisCache = null;
        updatePathBanner();
        selectedNode = null; depthMap = null;
        updateND();
        return;
      }
    }
    dragNode = hit; dragNode.pinned = true;
    canvas.classList.add('grabbing');
  } else {
    isPanning = true; psx = sx; psy = sy; csx = camX; csy = camY;
    canvas.classList.add('grabbing');
  }
});

canvas.addEventListener('mousemove', e => {
  const { sx, sy, x, y } = gmw(e);
  if (dragNode) { dragNode.x = x; dragNode.y = y; dragNode.vx = 0; dragNode.vy = 0; return; }
  if (isPanning) { camX = csx + (sx - psx); camY = csy + (sy - psy); return; }
  const hit = findNode(x, y);
  if (hit !== hoveredNode) { hoveredNode = hit; labelVisCache = null; canvas.classList.toggle('node-hover', !!hit); }
  if (hit) {
    const nb = neighbors(hit.id);
    const connW = [...nb].map(id => nodes[id].word).slice(0, 10).join(', ');
    tooltip.style.display = 'block';
    tooltip.style.left = (sx + 16) + 'px';
    tooltip.style.top = (sy - 12) + 'px';
    tooltip.innerHTML =
      `<div class="tt-word" style="color:${hit.color}">${hit.word}</div>` +
      `<div class="tt-cluster">${CLUSTER_NAMES[hit.cluster]} \u00B7 ${nb.size} connections</div>` +
      `<div class="tt-connections">\u2192 ${connW}${nb.size > 10 ? '\u2026' : ''}</div>`;
  } else {
    tooltip.style.display = 'none';
  }
});

canvas.addEventListener('mouseup', e => {
  if (dragNode && Date.now() - mdTime < 200) selectNode(dragNode);
  if (dragNode) labelVisCache = null;
  dragNode = null; isPanning = false;
  canvas.classList.remove('grabbing');
});

canvas.addEventListener('mouseleave', () => {
  dragNode = null; isPanning = false; hoveredNode = null; labelVisCache = null;
  tooltip.style.display = 'none';
  canvas.classList.remove('grabbing', 'node-hover');
});

canvas.addEventListener('dblclick', e => {
  const { x, y } = gmw(e);
  const hit = findNode(x, y);
  if (hit) {
    hit.pinned = false;
  } else {
    camX = 0; camY = 0; camZoom = 1;
    selectedNode = null; labelVisCache = null;
    updateND();
  }
});

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const mx = e.clientX - r.left, my = e.clientY - r.top;
  const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
  const nz = Math.max(0.15, Math.min(8, camZoom * f));
  camX = mx - (mx - camX) * (nz / camZoom);
  camY = my - (my - camY) * (nz / camZoom);
  camZoom = nz;
}, { passive: false });

// Sidebar zoom/fit/unpin buttons
document.getElementById('btnZoomIn').onclick = () => camZoom = Math.min(8, camZoom * 1.3);
document.getElementById('btnZoomOut').onclick = () => camZoom = Math.max(0.15, camZoom / 1.3);
document.getElementById('btnFit').onclick = () => { camX = 0; camY = 0; camZoom = 1; };
document.getElementById('btnUnpin').onclick = () => nodes.forEach(n => n.pinned = false);

// Node selection & detail
function selectNode(n) {
  if (selectedNode === n) {
    selectedNode = null; depthMap = null;
  } else {
    selectedNode = n;
    pathResult = null; pathStart = null; pathParticles = [];
    updatePathBanner();
    selectionDepth = 1;
    updateDepthMap();
    flyToNode(n);
  }
  labelVisCache = null;
  updateND();
}

function setDepth(d) {
  selectionDepth = d;
  updateDepthMap();
  labelVisCache = null;
  document.querySelectorAll('.nd-depth-btn').forEach(b =>
    b.classList.toggle('active', +b.dataset.depth === d)
  );
  updateND();
}

// Depth button click handlers
document.querySelectorAll('.nd-depth-btn').forEach(btn => {
  btn.addEventListener('click', () => setDepth(+btn.dataset.depth));
});
