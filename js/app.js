/* ────────────────────────────────────────
   사회복지정책 알리미 — app.js
   ──────────────────────────────────────── */

const DATA_PATH = './data/policies.json';

const COUNTRY_FLAGS = {
  '일본': '🇯🇵', '독일': '🇩🇪', '영국': '🇬🇧', '스웨덴': '🇸🇪',
  '미국': '🇺🇸', '프랑스': '🇫🇷', '캐나다': '🇨🇦', '덴마크': '🇩🇰',
  '핀란드': '🇫🇮', '네덜란드': '🇳🇱', '호주': '🇦🇺', '뉴질랜드': '🇳🇿',
};

const FACT_LABELS = {
  verified:   { icon: '✅', text: '팩트 확인 완료', cls: 'verified' },
  unverified: { icon: '⏳', text: '검증 중',        cls: 'unverified' },
  partial:    { icon: '⚠️', text: '일부 확인 완료', cls: 'partial' },
};

let allChanges = [];
let activeCategory = 'all';
let searchQuery = '';

/* ─── Data Fetch ─── */
async function loadData() {
  try {
    const res = await fetch(DATA_PATH);
    const json = await res.json();
    allChanges = json.changes || [];
    document.getElementById('last-updated').textContent = '최종 업데이트: ' + formatDate(json.lastUpdated);
    renderStats(json);
    renderAll();
  } catch (e) {
    console.error('데이터 로드 실패:', e);
    document.getElementById('cards-container').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-text">데이터를 불러올 수 없습니다</div>
        <div class="empty-sub">잠시 후 다시 시도해 주세요</div>
      </div>`;
  }
}

/* ─── Stats ─── */
function renderStats(json) {
  const total = allChanges.length;
  const verified = allChanges.filter(c => c.factCheck.status === 'verified').length;
  const categories = [...new Set(allChanges.map(c => c.category))].length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-verified').textContent = verified;
  document.getElementById('stat-categories').textContent = categories;
  document.getElementById('stat-updated-date').textContent = formatDateShort(json.lastUpdated);
}

/* ─── Sidebar Categories ─── */
function renderCategories() {
  const counts = {};
  allChanges.forEach(c => {
    counts[c.category] = (counts[c.category] || 0) + 1;
  });

  const list = document.getElementById('category-list');
  const allItem = list.querySelector('[data-cat="all"]');
  allItem.querySelector('.category-badge').textContent = allChanges.length;

  Object.entries(counts).forEach(([cat, n]) => {
    const li = document.createElement('li');
    li.className = 'category-item';
    li.dataset.cat = cat;
    li.innerHTML = `<span>${cat}</span><span class="category-badge">${n}</span>`;
    li.addEventListener('click', () => setCategory(cat));
    list.appendChild(li);
  });
}

function setCategory(cat) {
  activeCategory = cat;
  document.querySelectorAll('.category-item').forEach(el => {
    el.classList.toggle('active', el.dataset.cat === cat);
  });
  renderAll();
}

/* ─── Filtering ─── */
function filteredChanges() {
  return allChanges.filter(c => {
    const matchCat = activeCategory === 'all' || c.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      c.title.toLowerCase().includes(q) ||
      c.summary.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.tags.some(t => t.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });
}

/* ─── Main Render ─── */
function renderAll() {
  const changes = filteredChanges();

  if (!changes.length) {
    document.getElementById('cards-container').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-text">조건에 맞는 정책 변경사항이 없습니다</div>
        <div class="empty-sub">다른 카테고리나 검색어를 시도해 보세요</div>
      </div>`;
    return;
  }

  /* Group by date */
  const byDate = {};
  changes.forEach(c => {
    if (!byDate[c.date]) byDate[c.date] = [];
    byDate[c.date].push(c);
  });

  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const container = document.getElementById('cards-container');
  container.innerHTML = '';

  sortedDates.forEach(date => {
    const group = document.createElement('div');
    group.className = 'date-group';

    let label = formatDate(date);
    let badge = '';
    if (date === today)     badge = `<span class="date-badge">오늘</span>`;
    else if (date === yesterday) badge = `<span class="date-badge">어제</span>`;

    group.innerHTML = `<div class="date-label">${badge}<span>${label}</span></div>`;

    byDate[date].forEach(c => {
      group.appendChild(buildCard(c));
    });

    container.appendChild(group);
  });
}

/* ─── Card ─── */
function buildCard(c) {
  const fact = FACT_LABELS[c.factCheck.status] || FACT_LABELS.unverified;
  const div = document.createElement('div');
  div.className = 'policy-card';
  div.innerHTML = `
    <div class="card-top">
      <div class="card-meta">
        <span class="cat-badge ${c.category}">${c.category}</span>
        <span class="fact-badge ${fact.cls}">${fact.icon} ${fact.text}</span>
      </div>
    </div>
    <div class="card-title">${c.title}</div>
    <div class="card-summary">${c.summary}</div>
    <div class="key-changes">
      ${c.keyChanges.slice(0, 3).map(k => `
        <div class="change-item">
          <span class="change-icon"></span>
          <span>${k}</span>
        </div>`).join('')}
    </div>
    <div class="card-footer">
      <div class="source-info">
        <span>${c.source.siteName}</span>
        <span class="source-dot"></span>
        <span>${formatDate(c.source.publishedAt)} 발표</span>
      </div>
      <div class="tags">
        ${c.tags.slice(0, 3).map(t => `<span class="tag">#${t}</span>`).join('')}
      </div>
      <button class="read-more" onclick="openModal('${c.id}')">자세히 보기 →</button>
    </div>`;
  return div;
}

/* ─── Modal ─── */
function openModal(id) {
  const c = allChanges.find(x => x.id === id);
  if (!c) return;

  const fact = FACT_LABELS[c.factCheck.status] || FACT_LABELS.unverified;
  const overlay = document.getElementById('modal-overlay');

  document.getElementById('modal-title').textContent = c.title;
  document.getElementById('modal-category').textContent = `${c.category} · ${formatDate(c.date)}`;

  document.getElementById('modal-body').innerHTML = `
    <!-- 요약 -->
    <div class="detail-section">
      <div class="detail-section-title">정책 요약</div>
      <div class="impact-box" style="background:#f0f9ff;border-color:#bae6fd">${c.summary}</div>
    </div>

    <!-- 기존 vs 변경 비교 -->
    <div class="detail-section">
      <div class="detail-section-title">기존 정책과 비교</div>
      <div class="comparison-grid">
        <div class="comparison-box old">
          <div class="comparison-label">기존 정책</div>
          <div class="comparison-text">${c.previousPolicy}</div>
        </div>
        <div class="comparison-box new">
          <div class="comparison-label">변경 후</div>
          <div class="comparison-text">${c.newPolicy}</div>
        </div>
      </div>
    </div>

    <!-- 핵심 변경사항 -->
    <div class="detail-section">
      <div class="detail-section-title">핵심 변경사항</div>
      <div class="key-change-list">
        ${c.keyChanges.map((k, i) => `
          <div class="key-change-item">
            <span class="key-change-num">${i + 1}</span>
            <span>${k}</span>
          </div>`).join('')}
      </div>
    </div>

    <!-- 혜택 신청 방법 -->
    <div class="detail-section">
      <div class="detail-section-title">혜택 신청 방법</div>
      <div class="apply-grid">
        <div class="apply-box">
          <div class="apply-box-title">📋 대상자</div>
          <div class="apply-box-content">${c.howToApply.eligibility}</div>
        </div>
        <div class="apply-box">
          <div class="apply-box-title">📞 문의처</div>
          <div class="apply-box-content">${c.howToApply.contact}</div>
        </div>
        <div class="apply-box">
          <div class="apply-box-title">🔄 신청 절차</div>
          <div class="apply-box-content">${c.howToApply.process}</div>
        </div>
        <div class="apply-box">
          <div class="apply-box-title">📎 필요 서류</div>
          <div class="apply-box-content apply-docs">
            ${c.howToApply.documents.map(d => `<span class="apply-doc">${d}</span>`).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- 생활 영향 -->
    <div class="detail-section">
      <div class="detail-section-title">우리 삶에 미치는 영향</div>
      <div class="impact-box">${c.lifeImpact}</div>
    </div>

    <!-- 해외 사례 -->
    <div class="detail-section">
      <div class="detail-section-title">해외 유사 정책 사례</div>
      <div class="intl-list">
        ${c.internationalCases.map(intl => `
          <div class="intl-card">
            <div class="intl-header">
              <span class="country-flag">${COUNTRY_FLAGS[intl.country] || '🌐'}</span>
              <div class="country-info">
                <div class="country-name">${intl.country}</div>
                <div class="policy-name">${intl.policyName}</div>
              </div>
            </div>
            <div class="intl-body">
              <div>
                <div class="intl-item-title">유사점</div>
                <div class="intl-item-text">${intl.similarity}</div>
              </div>
              <div>
                <div class="intl-item-title">차이점</div>
                <div class="intl-item-text">${intl.difference}</div>
              </div>
            </div>
            <div class="intl-source">출처: ${linkify(intl.source)}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- 팩트체크 -->
    <div class="detail-section">
      <div class="detail-section-title">팩트체크</div>
      <div class="factcheck-box ${c.factCheck.status}">
        <div class="factcheck-header">
          <span style="font-size:18px">${fact.icon}</span>
          <span class="factcheck-status">${fact.text}</span>
          <span style="font-size:12px;color:#6b7280;margin-left:auto">검증일: ${formatDate(c.factCheck.checkedAt)}</span>
        </div>
        <div class="factcheck-body">
          <div class="factcheck-sources">
            ${c.factCheck.sources.map(s => `<span class="factcheck-source">${linkify(s)}</span>`).join('')}
          </div>
          <div class="factcheck-notes">${c.factCheck.notes}</div>
        </div>
      </div>
    </div>

    <!-- 참고 링크 -->
    ${(() => {
      const refs = collectRefs(c);
      if (!refs.length) return '';
      return `
    <div class="detail-section">
      <div class="detail-section-title">참고 링크</div>
      <div class="ref-list">
        ${refs.map(r => `
          <a class="ref-item" href="${r.url}" target="_blank" rel="noopener">
            <span class="ref-item-icon">🔗</span>
            <span class="ref-item-label">${r.label}</span>
            <span class="ref-item-url">${r.url.replace(/^https?:\/\//, '').slice(0, 60)}${r.url.length > 67 ? '…' : ''}</span>
            <span class="ref-item-arrow">↗</span>
          </a>`).join('')}
      </div>
    </div>`;
    })()}

    <!-- 원출처 -->
    <div class="detail-section" style="padding-top:4px;border-top:1px solid var(--border)">
      <div style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:8px">
        <span>📰 원출처: ${c.source.siteName}</span>
        <span>·</span>
        <span>${formatDate(c.source.publishedAt)} 발표</span>
        <a href="${c.source.url}" target="_blank" rel="noopener" style="color:var(--primary);text-decoration:none;margin-left:auto">공식 사이트 →</a>
      </div>
    </div>`;

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ─── Utilities ─── */

/* URL을 텍스트에서 추출해 <a> 태그로 변환 */
function linkify(text) {
  if (!text) return text;
  return text.replace(/(https?:\/\/[^\s;,）\)]+)/g, url => {
    const display = url.length > 55 ? url.slice(0, 52) + '…' : url;
    return `<a href="${url}" target="_blank" rel="noopener" class="ref-link">${display}</a>`;
  });
}

/* 텍스트에서 URL만 뽑아내기 */
function extractUrls(text) {
  if (!text) return [];
  return (text.match(/(https?:\/\/[^\s;,）\)]+)/g) || []);
}

/* 정책 항목의 모든 참고 URL 수집 */
function collectRefs(c) {
  const refs = [];
  const seen = new Set();
  const add = (url, label) => {
    if (url && url.startsWith('http') && !seen.has(url)) {
      seen.add(url);
      refs.push({ url, label });
    }
  };

  add(c.source.url, c.source.siteName);

  (c.factCheck.sources || []).forEach((s, i) => {
    extractUrls(s).forEach(url => add(url, `팩트체크 출처 ${i + 1}`));
    if (s.startsWith('http')) add(s, `팩트체크 출처 ${i + 1}`);
  });

  (c.internationalCases || []).forEach(intl => {
    extractUrls(intl.source).forEach(url => add(url, `해외사례 — ${intl.country} ${intl.policyName}`));
  });

  return refs;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/* ─── Event Listeners ─── */
document.addEventListener('DOMContentLoaded', () => {
  loadData().then(() => renderCategories());

  /* Category click */
  document.getElementById('category-list').addEventListener('click', e => {
    const item = e.target.closest('.category-item');
    if (item) setCategory(item.dataset.cat);
  });

  /* Search */
  const searchInput = document.getElementById('search-input');
  const searchBtn   = document.getElementById('search-btn');

  function doSearch() {
    searchQuery = searchInput.value.trim();
    renderAll();
  }

  searchBtn.addEventListener('click', doSearch);
  searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

  /* Modal close */
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  document.getElementById('modal-close-btn').addEventListener('click', closeModal);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  /* Scroll to top */
  const scrollBtn = document.getElementById('scroll-top');
  window.addEventListener('scroll', () => {
    scrollBtn.classList.toggle('visible', window.scrollY > 300);
  });
  scrollBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
});
