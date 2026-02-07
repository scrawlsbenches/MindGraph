/* ============================================
   MindGraph — Search & Cluster Filtering
   ============================================ */

const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
const searchBox = document.getElementById('searchBox');

searchInput.oninput = () => {
  searchQuery = searchInput.value.trim().toLowerCase();
  searchClear.classList.toggle('visible', searchQuery.length > 0);
  searchBox.classList.toggle('active', searchQuery.length > 0);
  nodes.forEach(n => n.matchesSearch = searchQuery ? n.word.includes(searchQuery) : true);
  labelVisCache = null;
  updateStatus();
};

searchClear.onclick = () => {
  searchInput.value = '';
  searchQuery = '';
  searchClear.classList.remove('visible');
  searchBox.classList.remove('active');
  nodes.forEach(n => n.matchesSearch = true);
  labelVisCache = null;
  updateStatus();
};

// Cluster filter pills
const filterPills = document.getElementById('filterPills');
CLUSTER_NAMES.forEach((name, ci) => {
  const b = document.createElement('button');
  b.className = 'filter-pill';
  b.dataset.cluster = ci;
  b.textContent = CLUSTER_KEYWORDS[ci][0];
  b.onclick = () => toggleCluster(ci);
  filterPills.appendChild(b);
});

function toggleCluster(ci) {
  activeCluster = activeCluster === ci ? -1 : ci;
  filterPills.querySelectorAll('.filter-pill').forEach(p =>
    p.classList.toggle('dimmed', activeCluster !== -1 && +p.dataset.cluster !== activeCluster)
  );
  nodes.forEach(n => {
    n.targetAlpha = (activeCluster === -1 || n.cluster === activeCluster) ? 1 : 0;
  });
  const h = nodes.filter(n => n.targetAlpha === 0).length;
  document.getElementById('hiddenLabel').textContent = h > 0 ? h + ' hidden' : '';
  document.querySelectorAll('.topic-card').forEach(tc =>
    tc.classList.toggle('active', activeCluster === +tc.dataset.cluster)
  );
  labelVisCache = null;
  updateStatus();
}
