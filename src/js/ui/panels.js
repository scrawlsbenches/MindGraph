/* ============================================
   MindGraph — Panel Management (right panel, node detail, path)
   ============================================ */

const nodeDetail = document.getElementById('nodeDetail');
const panelContent = document.getElementById('panelContent');

// Close node detail
document.getElementById('ndClose').onclick = () => {
  selectedNode = null; depthMap = null; labelVisCache = null;
  updateND();
};

// Update node detail popover
function updateND() {
  if (!selectedNode) { nodeDetail.classList.remove('visible'); updateStatus(); return; }
  const n = selectedNode;
  nodeDetail.classList.add('visible');
  document.getElementById('ndDot').style.background = n.color;
  const w = document.getElementById('ndWord');
  w.textContent = n.word; w.style.color = n.color;

  const directNb = neighbors(n.id);
  const same = [...directNb].filter(id => nodes[id].cluster === n.cluster);
  const diff = [...directNb].filter(id => nodes[id].cluster !== n.cluster);
  const totalVisible = depthMap ? depthMap.size - 1 : directNb.size;

  document.getElementById('ndMeta').innerHTML =
    `<b>Cluster:</b> ${CLUSTER_NAMES[n.cluster]}<br>` +
    `<b>Direct:</b> ${directNb.size} connections \u00B7 ${diff.length} bridges` +
    (selectionDepth > 1 ? `<br><b>Depth ${selectionDepth}:</b> ${totalVisible} nodes visible` : '');

  document.querySelectorAll('.nd-depth-btn').forEach(b =>
    b.classList.toggle('active', +b.dataset.depth === selectionDepth)
  );

  document.getElementById('ndConnections').innerHTML = same.map(id => {
    const m = nodes[id];
    return `<span class="nd-chip" data-nid="${id}"><span class="cd" style="background:${m.color}"></span>${m.word}</span>`;
  }).join('');

  document.getElementById('ndBridges').innerHTML = diff.length
    ? diff.map(id => {
        const m = nodes[id];
        return `<span class="nd-chip" data-nid="${id}"><span class="cd" style="background:${m.color}"></span>${m.word} <span style="opacity:0.5;font-size:9px">(${CLUSTER_NAMES[m.cluster].split(' ')[0]})</span></span>`;
      }).join('')
    : '<span style="font-size:11px;color:var(--text-muted)">No cross-cluster bridges</span>';

  nodeDetail.querySelectorAll('.nd-chip').forEach(c => {
    c.onclick = () => { const t = nodes[+c.dataset.nid]; if (t) selectNode(t); };
  });
  updateStatus();
}

// Path banner
function updatePathBanner() {
  const banner = document.getElementById('pathBanner');
  const pathNodes = document.getElementById('pathNodes');
  if (!pathStart && !pathResult) {
    banner.classList.add('hidden');
    return;
  }
  banner.classList.remove('hidden');
  if (pathResult) {
    pathNodes.innerHTML = pathResult.map((id, i) => {
      const n = nodes[id];
      return (i > 0 ? '<span class="path-arrow">\u2192</span>' : '') +
        `<span class="path-node" style="background:${n.color}30;color:${n.color}" onclick="selectNode(nodes[${id}]);updateND()">${n.word}</span>`;
    }).join('');
  } else if (pathStart) {
    pathNodes.innerHTML = `<span class="path-node" style="background:${pathStart.color}30;color:${pathStart.color}">${pathStart.word}</span>` +
      '<span class="path-arrow">\u2192</span><span style="color:var(--text-muted);font-size:11px">click target node</span>';
  }
}

document.getElementById('pathClose').onclick = () => {
  pathStart = null; pathResult = null; pathParticles = [];
  labelVisCache = null;
  updatePathBanner();
};

// Graph control buttons
document.getElementById('btnHulls').onclick = function() {
  showHulls = !showHulls;
  this.classList.toggle('active', showHulls);
};

document.getElementById('btnPathMode').onclick = function() {
  pathMode = !pathMode;
  this.classList.toggle('active', pathMode);
  if (!pathMode) {
    pathStart = null; pathResult = null; pathParticles = [];
    labelVisCache = null;
    updatePathBanner();
  }
};

document.getElementById('btnMinimap').onclick = function() {
  showMinimap = !showMinimap;
  this.classList.toggle('active', showMinimap);
  mmDiv.classList.toggle('hidden', !showMinimap);
};

// Right panel close/toggle
document.getElementById('panelClose').onclick = () => {
  document.getElementById('rightPanel').classList.add('collapsed');
  document.getElementById('panelToggle').classList.add('visible');
};

document.getElementById('panelToggle').onclick = () => {
  document.getElementById('rightPanel').classList.remove('collapsed');
  document.getElementById('panelToggle').classList.remove('visible');
};

// AI chat close
document.getElementById('aiChatClose').onclick = () => {
  document.getElementById('aiChat').style.display = 'none';
};

// Tab switching
let currentTab = 0;
const tabBuilders = [buildTab0, buildTab1, buildTab2, buildTab3, buildTab4, buildTab5, buildTab6, buildTab7];

document.querySelectorAll('.panel-tab').forEach(tab => {
  tab.addEventListener('click', function() {
    const idx = +this.dataset.tab;
    currentTab = idx;
    document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    panelContent.innerHTML = tabBuilders[idx]();
  });
});

// Status bar
function updateStatus() {
  const vis = nodes.filter(n => n.visible).length;
  const sel = selectedNode ? ` \u00B7 Selected: ${selectedNode.word}` : '';
  const srch = searchQuery ? ` \u00B7 Search: "${searchQuery}"` : '';
  document.getElementById('statusText').textContent = `${vis} nodes \u00B7 ${edges.length} edges${sel}${srch}`;
}
