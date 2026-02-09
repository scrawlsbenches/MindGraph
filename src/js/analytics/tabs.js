/* ============================================
   MindGraph — Analytics Tab Builders
   ============================================ */

import { nodes, adj, edges, NUM_NODES } from '../core/graph-data.js';
import { CLUSTER_NAMES, CLUSTER_KEYWORDS, CLUSTER_COLORS } from '../core/config.js';

// Helper: compute degrees
export function computeDegrees() {
  return nodes.map((n) => ({ n, deg: adj.get(n.id)?.size || 0 }));
}

/**
 * @param {import('../../types/graph').GraphNode} n
 * @returns {number}
 */
export function computeBridgeScore(n) {
  const nb = adj.get(n.id) || new Set();
  return [...nb].filter((id) => nodes[id].cluster !== n.cluster).length;
}

function computeClusterEdgeMatrix() {
  const nc = CLUSTER_NAMES.length;
  const m = Array.from({ length: nc }, () => Array(nc).fill(0));
  for (const e of edges) {
    const ca = nodes[e.a].cluster,
      cb = nodes[e.b].cluster;
    m[ca][cb]++;
    if (ca !== cb) m[cb][ca]++;
  }
  return m;
}

export function computeGraphDensity() {
  const n = NUM_NODES;
  return edges.length / ((n * (n - 1)) / 2);
}

function computeAvgDegree() {
  const degs = computeDegrees();
  return degs.reduce((s, d) => s + d.deg, 0) / degs.length;
}

export function computeClusteringCoeff() {
  let total = 0,
    count = 0;
  const sample = nodes.filter((_, i) => i % 3 === 0);
  for (const n of sample) {
    const nb = [...(adj.get(n.id) || [])];
    if (nb.length < 2) continue;
    let triangles = 0;
    for (let i = 0; i < nb.length; i++) {
      for (let j = i + 1; j < nb.length; j++) {
        if (adj.get(nb[i])?.has(nb[j])) triangles++;
      }
    }
    total += triangles / ((nb.length * (nb.length - 1)) / 2);
    count++;
  }
  return count > 0 ? total / count : 0;
}

/**
 * @param {string} word
 * @returns {number}
 */
export function wordSentiment(word) {
  const positive = [
    'nice',
    'bright',
    'sweet',
    'warm',
    'soft',
    'gentle',
    'calm',
    'kind',
    'discover',
    'explore',
    'music',
    'dance',
    'friend',
    'home',
    'dream',
    'wonder',
    'light',
    'quiet',
    'new',
    'open',
    'festival',
    'art',
    'show',
    'book',
    'surprise',
  ];
  const negative = [
    'strange',
    'odd',
    'push',
    'pull',
    'run',
    'fast',
    'far',
    'end',
    'leave',
    'stop',
    'back',
    'wall',
    'floor',
    'mirror',
    'wait',
    'bit',
  ];
  if (positive.includes(word)) return 1;
  if (negative.includes(word)) return -1;
  return 0;
}

function wordHash(w, i) {
  let h = 0;
  for (let c = 0; c < w.length; c++) h = ((h << 5) - h + w.charCodeAt(c)) | 0;
  return Math.abs((h * (i + 1) * 7919) % 100);
}

// ---- Tab 1: AI Insights ----
export function buildTab0() {
  const stats = CLUSTER_NAMES.map((name, ci) => {
    const cn = nodes.filter((n) => n.cluster === ci);
    const ce = edges.filter((e) => nodes[e.a].cluster === ci && nodes[e.b].cluster === ci);
    return {
      name,
      ci,
      count: cn.length,
      edgeCount: ce.length,
      pct: Math.round((cn.length / NUM_NODES) * 100),
      kw: CLUSTER_KEYWORDS[ci].slice(0, 3),
    };
  });

  let h = `<div class="section-header"><h3>Main Topics</h3><span class="subtitle">(focus for high-level understanding)</span>
    <div class="section-header-actions"><button class="small-btn" onclick="activeCluster=-1;toggleCluster(-1)">\u27F3 reset</button></div></div>`;

  stats.forEach((s) => {
    h += `<div class="topic-card t${s.ci}" data-cluster="${s.ci}" onclick="toggleCluster(${s.ci})">
      <div class="topic-card-title"><span class="num">${s.ci + 1}.</span> ${s.name}</div>
      <div class="topic-bar-row"><div class="topic-bar" style="width:${s.pct}%"></div>
        <span class="topic-stat">${s.pct}% | ${s.count} nodes \u00B7 ${s.edgeCount} edges</span></div>
      <div class="topic-keywords">${s.kw.map((k) => `<span class="keyword-chip" onclick="event.stopPropagation();searchInput.value='${k}';searchInput.dispatchEvent(new Event('input'))">${k}</span>`).join('')}</div>
    </div>`;
  });

  h += `<div class="action-row"><button class="action-btn highlight">AI: Summarize Topics</button></div>
    <div class="section-divider"></div>
    <div class="section-header"><h3>Most Influential Concepts</h3></div><div class="concepts-row">`;

  [...nodes]
    .sort((a, b) => (adj.get(b.id)?.size || 0) - (adj.get(a.id)?.size || 0))
    .slice(0, 12)
    .forEach((n) => {
      h += `<div class="concept-chip" onclick="selectNode(nodes[${n.id}]);updateND()"><div class="concept-dot" style="background:${n.color}"></div>${n.word}</div>`;
    });

  h += `</div><div class="action-row"><button class="action-btn primary">Reveal Underlying Ideas</button></div>
    <div class="section-divider"></div>
    <div class="section-header"><h3>Bridge Concepts</h3><span class="subtitle">(connect different clusters)</span></div><div class="concepts-row">`;

  nodes
    .map((n) => ({ n, cross: computeBridgeScore(n) }))
    .sort((a, b) => b.cross - a.cross)
    .slice(0, 10)
    .forEach(({ n }) => {
      h += `<div class="concept-chip" onclick="selectNode(nodes[${n.id}]);updateND()"><div class="concept-dot" style="background:${n.color}"></div>${n.word}</div>`;
    });

  h += `</div><div class="section-divider"></div>
    <div class="diversity-section"><h3>Topical Diversity</h3>
    <div class="diversity-subtitle">(target for optimal exploration)</div>
    <div class="diversity-bar-track"><div class="diversity-bar-fill"></div></div>
    <div class="diversity-labels"><span>Focused</span><span>\u25B2 Current</span><span>Dispersed</span></div></div>`;

  return h;
}

// ---- Tab 2: Main Ideas ----
export function buildTab1() {
  const degs = computeDegrees().sort((a, b) => b.deg - a.deg);
  const maxDeg = degs[0]?.deg || 1;

  let h = `<div class="section-header"><h3>Concept Centrality Ranking</h3><span class="subtitle">(by connection count)</span></div>`;

  degs.slice(0, 20).forEach((d, i) => {
    const pct = Math.round((d.deg / maxDeg) * 100);
    h += `<div class="bar-row">
      <span class="bar-label" onclick="selectNode(nodes[${d.n.id}]);updateND()" title="${d.n.word}">${i + 1}. ${d.n.word}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${d.n.color}"></div></div>
      <span class="bar-val">${d.deg}</span>
    </div>`;
  });

  h += `<div class="section-divider"></div>
    <div class="section-header"><h3>Degree Distribution</h3><span class="subtitle">(how connections are spread)</span></div>`;

  const buckets = {};
  degs.forEach((d) => {
    buckets[d.deg] = (buckets[d.deg] || 0) + 1;
  });
  const sorted = Object.entries(buckets).sort((a, b) => +a[0] - +b[0]);
  const maxCount = Math.max(...sorted.map((s) => s[1]));

  h += `<div class="trend-bars" style="height:50px;">`;
  sorted.forEach(([deg, count]) => {
    h += `<div class="trend-bar" style="height:${Math.round((count / maxCount) * 100)}%;background:var(--accent-blue)" title="${count} nodes with ${deg} connections"></div>`;
  });
  h += `</div><div class="trend-x-labels"><span>Low degree</span><span>High degree</span></div>`;

  return h;
}

// ---- Tab 3: Content Gaps ----
export function buildTab2() {
  const matrix = computeClusterEdgeMatrix();

  let h = `<div class="section-header"><h3>Cluster Connectivity Matrix</h3><span class="subtitle">(cross-cluster edges)</span></div>`;

  h += `<div class="matrix-grid" style="grid-template-columns:60px repeat(5,1fr);">`;
  h += `<div class="matrix-header"></div>`;
  for (let i = 0; i < 5; i++)
    h += `<div class="matrix-header" style="color:${CLUSTER_COLORS[i]}">${CLUSTER_NAMES[i].split(' ')[0]}</div>`;
  for (let r = 0; r < 5; r++) {
    h += `<div class="matrix-header" style="color:${CLUSTER_COLORS[r]};text-align:right;padding-right:6px">${CLUSTER_NAMES[r].split(' ')[0]}</div>`;
    for (let c = 0; c < 5; c++) {
      const val = matrix[r][c];
      const maxVal = Math.max(...matrix.flat());
      const intensity = r === c ? 0.4 : Math.max(0.08, (val / maxVal) * 0.6);
      const color = r === c ? CLUSTER_COLORS[r] : '#8b99b0';
      h += `<div class="matrix-cell" style="background:${color}${Math.round(intensity * 255)
        .toString(16)
        .padStart(2, '0')};color:${val > 0 ? '#e8ecf4' : 'transparent'}">${val}</div>`;
    }
  }
  h += `</div>`;

  h += `<div class="section-divider"></div><div class="section-header"><h3>Content Gaps</h3><span class="subtitle">(weakest cluster connections \u2014 explore these)</span></div>`;

  const pairs = [];
  for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) pairs.push({ i, j, count: matrix[i][j] });
  pairs.sort((a, b) => a.count - b.count);

  pairs.forEach((p) => {
    const strength = p.count <= 2 ? 'weak' : p.count <= 4 ? 'moderate' : 'strong';
    const label = p.count <= 2 ? 'Weak' : p.count <= 4 ? 'Moderate' : 'Strong';
    const bridgeWords = edges
      .filter((e) => {
        const ca = nodes[e.a].cluster,
          cb = nodes[e.b].cluster;
        return (ca === p.i && cb === p.j) || (ca === p.j && cb === p.i);
      })
      .map((e) => `${nodes[e.a].word}\u2194${nodes[e.b].word}`)
      .slice(0, 3);

    h += `<div class="gap-card">
      <div class="gap-card-title">
        <span style="color:${CLUSTER_COLORS[p.i]}">${CLUSTER_NAMES[p.i]}</span>
        <span style="color:var(--text-muted)">\u2194</span>
        <span style="color:${CLUSTER_COLORS[p.j]}">${CLUSTER_NAMES[p.j]}</span>
        <span class="gap-strength gap-${strength}">${label} \u00B7 ${p.count}</span>
      </div>
      <div class="gap-card-desc">${bridgeWords.length ? 'Bridges: ' + bridgeWords.join(', ') : 'No direct bridges \u2014 potential gap to explore'}</div>
    </div>`;
  });

  h += `<div class="action-row"><button class="action-btn primary">AI: Suggest Missing Connections</button></div>`;
  return h;
}

// ---- Tab 4: Relations ----
export function buildTab3() {
  let h = `<div class="section-header"><h3>Cross-Cluster Relations</h3><span class="subtitle">(how topics connect through bridge words)</span></div>`;

  const pairMap = {};
  for (const e of edges) {
    const ca = nodes[e.a].cluster,
      cb = nodes[e.b].cluster;
    if (ca === cb) continue;
    const key = Math.min(ca, cb) + '-' + Math.max(ca, cb);
    if (!pairMap[key]) pairMap[key] = { ca: Math.min(ca, cb), cb: Math.max(ca, cb), bridges: [] };
    pairMap[key].bridges.push({ a: nodes[e.a].word, b: nodes[e.b].word, w: e.weight });
  }

  Object.values(pairMap)
    .sort((a, b) => b.bridges.length - a.bridges.length)
    .forEach((pair) => {
      h += `<div class="relation-pair" onclick="toggleCluster(${pair.ca})">
      <div class="relation-dot" style="background:${CLUSTER_COLORS[pair.ca]}"></div>
      <span style="font-size:11px;font-weight:600;color:${CLUSTER_COLORS[pair.ca]}">${CLUSTER_NAMES[pair.ca].split('&')[0].trim()}</span>
      <span class="relation-arrow">\u21C4</span>
      <div class="relation-dot" style="background:${CLUSTER_COLORS[pair.cb]}"></div>
      <span style="font-size:11px;font-weight:600;color:${CLUSTER_COLORS[pair.cb]}">${CLUSTER_NAMES[pair.cb].split('&')[0].trim()}</span>
      <span class="relation-words">${pair.bridges.length} bridges</span>
    </div>`;

      h += `<div style="padding:0 12px 10px;display:flex;flex-wrap:wrap;gap:4px;">`;
      pair.bridges.slice(0, 6).forEach((b) => {
        h += `<span class="keyword-chip" style="background:var(--bg-tertiary);color:var(--text-secondary);border:1px solid var(--border-color);font-size:10px;padding:2px 6px;border-radius:3px">${b.a} \u2194 ${b.b}</span>`;
      });
      if (pair.bridges.length > 6)
        h += `<span style="font-size:10px;color:var(--text-muted)">+${pair.bridges.length - 6} more</span>`;
      h += `</div>`;
    });

  h += `<div class="section-divider"></div><div class="section-header"><h3>Top Bridge Nodes</h3><span class="subtitle">(nodes connecting the most clusters)</span></div><div class="concepts-row">`;

  const bridgeData = nodes
    .map((n) => {
      const nb = adj.get(n.id) || new Set();
      const clusters = new Set([...nb].map((id) => nodes[id].cluster));
      clusters.delete(n.cluster);
      return { n, clusterCount: clusters.size, bridgeEdges: computeBridgeScore(n) };
    })
    .sort((a, b) => b.clusterCount - a.clusterCount || b.bridgeEdges - a.bridgeEdges)
    .slice(0, 10);

  bridgeData.forEach(({ n, clusterCount, bridgeEdges }) => {
    h += `<div class="concept-chip" onclick="selectNode(nodes[${n.id}]);updateND()">
      <div class="concept-dot" style="background:${n.color}"></div>${n.word}
      <span style="font-size:9px;color:var(--text-muted)">${clusterCount}c/${bridgeEdges}e</span>
    </div>`;
  });
  h += `</div>`;
  return h;
}

// ---- Tab 5: Sentiment ----
export function buildTab4() {
  let h = `<div class="section-header"><h3>Semantic Tone Analysis</h3><span class="subtitle">(word-level sentiment per cluster)</span></div>`;

  h += `<div class="sentiment-legend">
    <span><span class="sentiment-legend-dot" style="background:#22c55e"></span>Positive</span>
    <span><span class="sentiment-legend-dot" style="background:#5a6a82"></span>Neutral</span>
    <span><span class="sentiment-legend-dot" style="background:#ef4444"></span>Negative</span>
  </div>`;

  const clusterSentiments = CLUSTER_NAMES.map((name, ci) => {
    const words = CLUSTER_KEYWORDS[ci];
    let pos = 0,
      neg = 0,
      neu = 0;
    words.forEach((w) => {
      const s = wordSentiment(w);
      if (s > 0) pos++;
      else if (s < 0) neg++;
      else neu++;
    });
    return { name, ci, pos, neg, neu, total: words.length };
  });

  clusterSentiments.forEach((cs) => {
    const posPct = Math.round((cs.pos / cs.total) * 100);
    const negPct = Math.round((cs.neg / cs.total) * 100);
    const neuPct = 100 - posPct - negPct;
    h += `<div class="sentiment-row">
      <span class="sentiment-label" style="color:${CLUSTER_COLORS[cs.ci]}">${cs.name.split('&')[0].trim()}</span>
      <div class="sentiment-bar-track">
        <div class="sentiment-seg" style="width:${posPct}%;background:#22c55e"></div>
        <div class="sentiment-seg" style="width:${neuPct}%;background:#2a3a55"></div>
        <div class="sentiment-seg" style="width:${negPct}%;background:#ef4444"></div>
      </div>
    </div>`;
  });

  h += `<div class="section-divider"></div>`;
  clusterSentiments.forEach((cs) => {
    const words = CLUSTER_KEYWORDS[cs.ci];
    h += `<div style="margin-bottom:10px;">
      <div style="font-size:11px;font-weight:700;color:${CLUSTER_COLORS[cs.ci]};margin-bottom:4px">${cs.name}</div>
      <div style="display:flex;flex-wrap:wrap;gap:3px">`;
    words.forEach((w) => {
      const s = wordSentiment(w);
      const bg = s > 0 ? 'rgba(34,197,94,0.15)' : s < 0 ? 'rgba(239,68,68,0.15)' : 'var(--bg-tertiary)';
      const col = s > 0 ? '#22c55e' : s < 0 ? '#ef4444' : 'var(--text-muted)';
      h += `<span style="font-size:10px;padding:1px 5px;border-radius:3px;background:${bg};color:${col};cursor:pointer" onclick="searchInput.value='${w}';searchInput.dispatchEvent(new Event('input'))">${w}</span>`;
    });
    h += `</div></div>`;
  });

  h += `<div class="action-row"><button class="action-btn highlight">AI: Analyze Emotional Patterns</button></div>`;
  return h;
}

// ---- Tab 6: Stats ----
export function buildTab5() {
  const density = computeGraphDensity();
  const avgDeg = computeAvgDegree();
  const clustCoeff = computeClusteringCoeff();
  const degs = computeDegrees();
  const maxDeg = Math.max(...degs.map((d) => d.deg));
  const minDeg = Math.min(...degs.map((d) => d.deg));
  const bridgeEdgeCount = edges.filter((e) => nodes[e.a].cluster !== nodes[e.b].cluster).length;
  const intraEdgeCount = edges.length - bridgeEdgeCount;

  let h = `<div class="section-header"><h3>Graph Metrics</h3></div>`;

  h += `<div class="stat-grid">
    <div class="stat-card"><div class="stat-value">${NUM_NODES}</div><div class="stat-label">Nodes</div></div>
    <div class="stat-card"><div class="stat-value">${edges.length}</div><div class="stat-label">Edges</div></div>
    <div class="stat-card"><div class="stat-value">${(density * 100).toFixed(1)}%</div><div class="stat-label">Density</div></div>
    <div class="stat-card"><div class="stat-value">${avgDeg.toFixed(1)}</div><div class="stat-label">Avg Degree</div></div>
    <div class="stat-card"><div class="stat-value">${clustCoeff.toFixed(3)}</div><div class="stat-label">Clustering Coeff.</div></div>
    <div class="stat-card"><div class="stat-value">5</div><div class="stat-label">Clusters</div></div>
    <div class="stat-card"><div class="stat-value">${intraEdgeCount}</div><div class="stat-label">Intra-Cluster Edges</div></div>
    <div class="stat-card"><div class="stat-value">${bridgeEdgeCount}</div><div class="stat-label">Bridge Edges</div></div>
  </div>`;

  h += `<div class="section-divider"></div><div class="section-header"><h3>Degree Range</h3></div>`;
  h += `<div class="bar-row"><span class="bar-label">Min</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round((minDeg / maxDeg) * 100)}%;background:var(--accent-cyan)"></div></div><span class="bar-val">${minDeg}</span></div>`;
  h += `<div class="bar-row"><span class="bar-label">Avg</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round((avgDeg / maxDeg) * 100)}%;background:var(--accent-orange)"></div></div><span class="bar-val">${avgDeg.toFixed(0)}</span></div>`;
  h += `<div class="bar-row"><span class="bar-label">Max</span><div class="bar-track"><div class="bar-fill" style="width:100%;background:var(--accent-green)"></div></div><span class="bar-val">${maxDeg}</span></div>`;

  h += `<div class="section-divider"></div><div class="section-header"><h3>Cluster Sizes</h3></div>`;
  CLUSTER_NAMES.forEach((name, ci) => {
    const count = nodes.filter((n) => n.cluster === ci).length;
    h += `<div class="bar-row">
      <span class="bar-label" style="color:${CLUSTER_COLORS[ci]}" onclick="toggleCluster(${ci})">${name.split('&')[0].trim()}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round((count / NUM_NODES) * 100 * 5)}%;background:${CLUSTER_COLORS[ci]}"></div></div>
      <span class="bar-val">${count}n</span>
    </div>`;
  });

  return h;
}

// ---- Tab 7: Trends ----
export function buildTab6() {
  let h = `<div class="section-header"><h3>Concept Frequency Over Time</h3><span class="subtitle">(simulated temporal distribution)</span></div>`;

  const topNodes = [...nodes].sort((a, b) => (adj.get(b.id)?.size || 0) - (adj.get(a.id)?.size || 0)).slice(0, 10);
  const periods = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'];

  topNodes.forEach((n) => {
    const vals = periods.map((_, i) => wordHash(n.word, i));
    const maxV = Math.max(...vals);
    h += `<div class="trend-bar-group">
      <div class="trend-label" style="color:${n.color}"><span onclick="selectNode(nodes[${n.id}]);updateND()" style="cursor:pointer">${n.word}</span></div>
      <div class="trend-bars">`;
    vals.forEach((v) => {
      h += `<div class="trend-bar" style="height:${Math.max(8, Math.round((v / maxV) * 100))}%;background:${n.color}"></div>`;
    });
    h += `</div><div class="trend-x-labels">${periods.map((p) => `<span>${p.replace('Week ', 'W')}</span>`).join('')}</div></div>`;
  });

  h += `<div class="section-divider"></div>
    <div class="section-header"><h3>Cluster Activity Over Time</h3></div>`;

  CLUSTER_NAMES.forEach((name, ci) => {
    const vals = periods.map((_, i) => 30 + wordHash(name, i * 3) * 0.7);
    const maxV = Math.max(...vals);
    h += `<div class="trend-bar-group">
      <div class="trend-label" style="color:${CLUSTER_COLORS[ci]}">${name}</div>
      <div class="trend-bars">`;
    vals.forEach((v) => {
      h += `<div class="trend-bar" style="height:${Math.max(12, Math.round((v / maxV) * 100))}%;background:${CLUSTER_COLORS[ci]}"></div>`;
    });
    h += `</div></div>`;
  });

  h += `<div class="action-row"><button class="action-btn primary">AI: Identify Emerging Patterns</button></div>`;
  return h;
}

// ---- Tab 8: Structure ----
export function buildTab7() {
  const degs = computeDegrees();
  const avgDeg = degs.reduce((s, d) => s + d.deg, 0) / degs.length;

  const hubs = [],
    bridges = [],
    periphery = [],
    connectors = [];
  nodes.forEach((n) => {
    const deg = adj.get(n.id)?.size || 0;
    const bridgeScore = computeBridgeScore(n);
    if (deg >= avgDeg * 1.5 && bridgeScore >= 2) connectors.push(n);
    else if (deg >= avgDeg * 1.5) hubs.push(n);
    else if (bridgeScore >= 2) bridges.push(n);
    else if (deg <= 2) periphery.push(n);
  });

  let h = `<div class="section-header"><h3>Structural Roles</h3><span class="subtitle">(how each node functions in the network)</span></div>`;

  const categories = [
    {
      icon: '\u2B21',
      title: 'Hub Nodes',
      desc: 'Highly connected within their cluster \u2014 core concepts that anchor topic areas',
      nodes: hubs,
      color: 'var(--accent-green)',
    },
    {
      icon: '\u2B2E',
      title: 'Connector Nodes',
      desc: 'High degree AND cross-cluster bridges \u2014 key integrating concepts',
      nodes: connectors,
      color: 'var(--accent-cyan)',
    },
    {
      icon: '\u21CC',
      title: 'Bridge Nodes',
      desc: 'Connect different topic clusters \u2014 semantic bridges between ideas',
      nodes: bridges,
      color: 'var(--accent-orange)',
    },
    {
      icon: '\u00B7',
      title: 'Periphery Nodes',
      desc: 'Few connections \u2014 specialized or niche concepts',
      nodes: periphery,
      color: 'var(--text-muted)',
    },
  ];

  categories.forEach((cat) => {
    h += `<div class="node-class-card">
      <div class="node-class-title"><span class="node-class-icon">${cat.icon}</span><span style="color:${cat.color}">${cat.title}</span><span style="font-size:10px;color:var(--text-muted);font-weight:400;margin-left:auto">${cat.nodes.length} nodes</span></div>
      <div class="node-class-desc">${cat.desc}</div>
      <div class="concepts-row" style="margin:0">`;
    cat.nodes.slice(0, 12).forEach((n) => {
      h += `<div class="concept-chip" onclick="selectNode(nodes[${n.id}]);updateND()"><div class="concept-dot" style="background:${n.color}"></div>${n.word}</div>`;
    });
    if (cat.nodes.length > 12)
      h += `<span style="font-size:10px;color:var(--text-muted)">+${cat.nodes.length - 12} more</span>`;
    h += `</div></div>`;
  });

  const classified = hubs.length + bridges.length + periphery.length + connectors.length;
  const mid = NUM_NODES - classified;
  if (mid > 0) {
    h += `<div style="font-size:11px;color:var(--text-muted);margin-top:6px">${mid} nodes have average connectivity (not classified as hub, bridge, or periphery)</div>`;
  }

  h += `<div class="section-divider"></div>
    <div class="section-header"><h3>Network Health</h3></div>
    <div class="gap-card">
      <div class="gap-card-title">Resilience</div>
      <div class="gap-card-desc">With ${connectors.length} connector nodes and ${bridges.length} bridge nodes, the network has ${connectors.length + bridges.length > 8 ? 'good' : connectors.length + bridges.length > 4 ? 'moderate' : 'low'} cross-topic resilience. Removing connector nodes would significantly fragment the discourse.</div>
    </div>`;

  h += `<div class="action-row"><button class="action-btn highlight">AI: Structural Analysis Report</button></div>`;
  return h;
}
