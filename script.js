/**
 * IR Research Portfolio — Dashboard Script
 * Loads project data from project-data.json (GitHub Action generated)
 * Falls back to live GitHub API for public repos.
 */

const REPOS = [
  {
    id: 'knowledge-base',
    owner: 'NH-Ontik',
    repo: 'international-relations-knowledge-base-by-nh-ontik',
    label: 'IR Knowledge Base',
    staticMetrics: { notes: 233, words: '62k' },
  },
  {
    id: 'history-atlas',
    owner: 'NH-Ontik',
    repo: 'ir-history-atlas',
    label: 'IR History Atlas',
    staticMetrics: { events: 173 },
  },
  {
    id: 'ukraine-war',
    owner: 'NH-Ontik',
    repo: 'ukraine-war',
    label: 'The Ukraine War',
    staticMetrics: { events: 20 },
  },
  {
    id: 'cuban-missile',
    owner: 'NH-Ontik',
    repo: 'cuban-missile-crisis',
    label: 'Cuban Missile Crisis',
    staticMetrics: { days: 13 },
  },
];

/* ─── HELPERS ─── */

function timeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function truncate(str, len) {
  if (!str) return '—';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

function formatNumber(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

/* ─── GITHUB API ─── */

async function fetchRepo(owner, repo) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return res.json();
}

async function fetchCommits(owner, repo, count = 5) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${count}`
  );
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return res.json();
}

/* ─── RENDER ─── */

function renderStats(data) {
  const statEvents = document.getElementById('statEvents');
  const statNotes = document.getElementById('statNotes');
  const statWords = document.getElementById('statWords');

  if (data.totals) {
    if (statEvents) statEvents.textContent = formatNumber(data.totals.events || 0);
    if (statNotes) statNotes.textContent = formatNumber(data.totals.notes || 0);
    if (statWords) statWords.textContent = data.totals.words || '—';
  }
}

function renderCardCommit(id, commit) {
  const el = document.getElementById(`${id}-commit`);
  if (!el || !commit) return;
  const msg = el.querySelector('.card-commit-msg');
  const time = el.querySelector('.card-commit-time');
  if (msg) msg.textContent = truncate(commit.message, 80);
  if (time) time.textContent = timeAgo(commit.date);
}

function renderCardMetric(id, key, value) {
  const el = document.getElementById(`${id}-${key}`);
  if (el) el.textContent = value;
}

function renderAnalytics(id, analytics) {
  if (!analytics) return;
  const set = (elId, val) => {
    const el = document.getElementById(elId);
    if (el) el.textContent = val;
  };
  set(`${id}-visitors`, formatNumber(analytics.uniqueVisitors || 0));
  set(`${id}-pageviews`, formatNumber(analytics.pageViews || 0));

  // Top pages
  const pageList = document.querySelector(`#${id}-top-pages .analytics-page-list`);
  if (pageList && analytics.topPages && analytics.topPages.length) {
    pageList.innerHTML = analytics.topPages
      .map(
        (p) => `
      <li class="analytics-page-item">
        <span class="analytics-page-path">${p.title || p.path}</span>
        <span class="analytics-page-count">${formatNumber(p.count)}</span>
      </li>`
      )
      .join('');
  }
}

function renderActivity(commits) {
  const list = document.getElementById('activityList');
  if (!list || !commits.length) return;

  list.innerHTML = commits
    .map(
      (c) => `
    <li class="activity-item">
      <span class="activity-item-dot"></span>
      <span class="activity-item-msg"><strong>${c.repo}</strong> ${truncate(c.message, 70)}</span>
      <span class="activity-item-time">${timeAgo(c.date)}</span>
    </li>`
    )
    .join('');
}

function renderLastUpdated(dateStr) {
  const el = document.getElementById('lastUpdated');
  if (el && dateStr) el.textContent = `Updated ${timeAgo(dateStr)}`;
}

/* ─── SCROLL REVEAL ─── */

function initReveal() {
  const targets = document.querySelectorAll('.flip-card, .activity');
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  targets.forEach((el) => observer.observe(el));
}

/* ─── FLIP CARD CLICK ─── */

function initFlipCards() {
  document.querySelectorAll('.flip-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      card.classList.toggle('flipped');
      card.setAttribute('aria-expanded', card.classList.contains('flipped'));
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.classList.toggle('flipped');
        card.setAttribute('aria-expanded', card.classList.contains('flipped'));
      }
    });
  });
}

/* ─── MAIN ─── */

async function main() {
  let data = null;

  // 1. Try loading pre-built project-data.json (from GitHub Action)
  try {
    const res = await fetch('project-data.json?t=' + Date.now());
    if (res.ok) data = await res.json();
  } catch (_) {
    /* not deployed yet, fall through */
  }

  // 2. If no JSON, fetch live from GitHub API
  if (!data) {
    data = { projects: {}, activity: [], totals: {} };
    const allCommits = [];

    const results = await Promise.allSettled(
      REPOS.map(async (r) => {
        const [repo, commits] = await Promise.all([
          fetchRepo(r.owner, r.repo).catch(() => null),
          fetchCommits(r.owner, r.repo, 5).catch(() => []),
        ]);
        return { ...r, repoData: repo, commitsData: commits };
      })
    );

    let totalEvents = 0;
    let totalNotes = 0;

    results.forEach((result) => {
      if (result.status !== 'fulfilled') return;
      const { id, repoData, commitsData, staticMetrics } = result.value;

      const latestCommit = commitsData[0]
        ? {
            message: commitsData[0].commit.message,
            date: commitsData[0].commit.author.date,
          }
        : null;

      data.projects[id] = {
        commitCount: commitsData.length,
        latestCommit,
      };

      // Aggregate static metrics
      if (staticMetrics) {
        Object.entries(staticMetrics).forEach(([k, v]) => {
          if (typeof v === 'number') {
            if (k === 'events') totalEvents += v;
            if (k === 'notes') totalNotes += v;
          }
        });
      }

      // Collect activity
      commitsData.forEach((c) => {
        allCommits.push({
          repo: result.value.label,
          message: c.commit.message,
          date: c.commit.author.date,
        });
      });
    });

    data.totals = {
      events: totalEvents,
      notes: totalNotes,
      words: '62k',
    };

    // Sort activity by date, take top 8
    allCommits.sort((a, b) => new Date(b.date) - new Date(a.date));
    data.activity = allCommits.slice(0, 8);
  }

  // 3. Render everything
  renderStats(data);

  // Render card metrics from static data
  REPOS.forEach((r) => {
    if (r.staticMetrics) {
      Object.entries(r.staticMetrics).forEach(([k, v]) => {
        renderCardMetric(r.id, k, typeof v === 'number' ? String(v) : v);
      });
    }
  });

  // Render commit counts and latest commits
  if (data.projects) {
    Object.entries(data.projects).forEach(([id, proj]) => {
      // Commit count
      const commitCountEl = document.getElementById(`${id}-commits`);
      if (commitCountEl && proj.commitCount) {
        commitCountEl.textContent = proj.commitCount;
      }
      // Latest commit
      renderCardCommit(id, proj.latestCommit);
      // Cloudflare analytics
      renderAnalytics(id, proj.analytics);
    });
  }

  renderActivity(data.activity || []);

  // Last updated timestamp
  if (data.activity && data.activity.length > 0) {
    renderLastUpdated(data.activity[0].date);
  }

  // 4. Initialize interactions
  initReveal();
  initFlipCards();
}

document.addEventListener('DOMContentLoaded', main);
