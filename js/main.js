/* ==========================================================================
   shubhamnirmal.com.np · v4 interactions (vanilla JS)
   ========================================================================== */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };

  var EMAIL = 'suvamniraml456@gmail.com';
  var PHONE = '+977 982-128-7731';

  /* ---------------------------------------------------------------- theme */
  var themeBtn = $('#themeBtn');
  function currentTheme() {
    var t = root.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function paintThemeBtn() {
    var dark = currentTheme() === 'dark';
    $('.ico-sun', themeBtn).style.display = dark ? 'block' : 'none';
    $('.ico-moon', themeBtn).style.display = dark ? 'none' : 'block';
    themeBtn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  }
  themeBtn.addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    store.set('sn-theme', next);
    paintThemeBtn();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', paintThemeBtn);
  paintThemeBtn();

  /* ---------------------------------------------------------------- toast */
  var toastEl, toastT;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  /* ---------------------------------------------------------------- nav + scroll */
  var nav = $('#nav'), links = $('#navLinks'), menuBtn = $('#menuBtn');
  var fill = $('#timelineFill'), timeline = $('#timeline');
  var lastY = window.scrollY, ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY;
    nav.classList.toggle('scrolled', y > 10);
    if (!links.classList.contains('open')) {
      if (y > 700 && y > lastY + 4) nav.classList.add('hide');
      else if (y < lastY - 4 || y < 700) nav.classList.remove('hide');
    }
    lastY = y;
    if (fill && timeline) {
      var r = timeline.getBoundingClientRect();
      fill.style.transform = 'scaleY(' + clamp((window.innerHeight * 0.65 - r.top) / r.height, 0, 1) + ')';
    }
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  function closeMenu() { links.classList.remove('open'); nav.classList.remove('menu-open'); menuBtn.setAttribute('aria-expanded', 'false'); }
  menuBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = links.classList.toggle('open');
    nav.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  $$('.nav-link').forEach(function (a) { a.addEventListener('click', closeMenu); });
  document.addEventListener('click', function (e) { if (!nav.contains(e.target)) closeMenu(); });

  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        $$('.nav-link').forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach(function (s) { spy.observe(s); });
  }

  /* ---------------------------------------------------------------- counters + reveal */
  function countUp(el) {
    var to = parseFloat(el.getAttribute('data-to')) || 0;
    if (reduced) { el.textContent = to; return; }
    var start = performance.now(), dur = 1500;
    (function step(now) {
      var p = clamp((now - start) / dur, 0, 1);
      el.textContent = Math.round(to * (1 - Math.pow(2, -10 * p)));
      if (p < 1) requestAnimationFrame(step); else el.textContent = to;
    })(start);
  }

  function setupReveal() {
    var items = $$('.reveal');
    var groups = new Map();
    items.forEach(function (el) {
      var i = groups.get(el.parentElement) || 0;
      groups.set(el.parentElement, i + 1);
      el.style.setProperty('--d', Math.min(i * 0.08, 0.4) + 's');
    });
    if (reduced || !('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------------- pointer effects */
  function setupPointer() {
    $$('.spot').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
    if (!finePointer || reduced) return;
    $$('.magnetic').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.transform = 'translate(' + (e.clientX - r.left - r.width / 2) * 0.2 + 'px,' + (e.clientY - r.top - r.height / 2) * 0.3 + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
    $$('.tilt').forEach(function (el) {
      var max = el.classList.contains('portrait') ? 7 : 3;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transition = 'transform .12s ease-out, box-shadow .4s, border-color .3s';
        el.style.transform = 'perspective(1100px) rotateX(' + (-py * max).toFixed(2) + 'deg) rotateY(' + (px * max * 1.2).toFixed(2) + 'deg)';
      });
      el.addEventListener('pointerleave', function () {
        el.style.transition = 'transform .8s cubic-bezier(.16,1,.3,1), box-shadow .4s, border-color .3s';
        el.style.transform = '';
      });
    });
  }

  /* ---------------------------------------------------------------- projects (data-driven) */
  var GH = 'https://github.com/SHUBHAM-NIRMAL18/';
  var PROJECTS = [
    { id: 'makecv', feat: true, cats: ['web', 'ai'], live: true, category: 'AI product',
      title: 'MakeCV Resume Builder',
      desc: 'An AI-powered resume builder that creates ATS-friendly CVs in under 5 minutes, with a live PDF preview.',
      highlights: ['Generative-AI layer writes role-specific content', 'Multi-step wizard with real-time print-ready PDF preview', 'JWT auth with automatic token refresh'],
      stack: { Frontend: ['Next.js', 'React', 'TypeScript'], Backend: ['Django', 'Django REST Framework', 'JWT'], 'AI & docs': ['Generative AI', 'OpenAPI / Swagger', 'PDF generation'] },
      overview: 'MakeCV helps job seekers in India create ATS-friendly CVs fast. A step-by-step form collects the details, AI writes tailored content, and a live preview produces a print-ready PDF.',
      result: 'Resume creation went from hours to under 5 minutes.',
      shot: '<img src="asset/Project/make_cv.svg" alt="MakeCV resume builder interface" loading="lazy" />',
      links: [['Live site', 'https://www.makecv.online/', 'primary'], ['API docs', 'https://api.makecv.online/api/v1/docs']] },

    { id: 'skillbridge', feat: false, cats: ['web', 'ai'], category: 'Recruitment platform',
      title: 'SkillBridge',
      desc: 'A recruitment management system connecting candidates and employers, from job posting to signed digital offer letter.',
      highlights: ['Hybrid recommendation engine (content-based + collaborative filtering)', 'Digital offer letters with e-signatures and PDF export', 'Khalti & eSewa payments for credit-based job posting'],
      stack: { Backend: ['Python', 'Django 4.2', 'django-allauth', 'django-taggit', 'CKEditor', 'django-ratelimit'], Frontend: ['HTML5', 'CSS3', 'JavaScript (AJAX / Fetch)', 'Bootstrap 5'], 'Data & AI': ['PostgreSQL', 'Hybrid ML recommendations'], 'Payments & docs': ['Khalti API', 'eSewa API', 'WeasyPrint (PDF)'], Infra: ['Docker', 'Docker Compose', 'Gunicorn'] },
      overview: 'SkillBridge streamlines hiring for internships and jobs. Candidates get personalised recommendations and track applications; employers review applicants in an AJAX drawer with skill-overlap analytics and issue legally structured digital offer letters.',
      result: 'One platform covering the full hiring lifecycle: posting, matching, applications, offers and payments.',
      shot: '<div class="mock mock-sb"><div class="bar"><i></i><i></i><i></i><b>skillbridge / recommended</b></div>' +
        '<div class="job"><strong>Backend Intern</strong><span>Kathmandu · Django</span><span class="match">92%<em style="--w:92%"></em></span></div>' +
        '<div class="job"><strong>Junior Data Analyst</strong><span>Remote · SQL, Python</span><span class="match">78%<em style="--w:78%"></em></span></div></div>',
      links: [['Code', GH + 'skillbridge']] },

    { id: 'stock', feat: false, cats: ['data', 'web'], category: 'Data & analytics',
      title: 'NEPSE Stock Crawler & Dashboard',
      desc: 'Crawls Nepali financial news, auto-tags it by company, and analyses buyer/seller behaviour in a role-gated dashboard.',
      highlights: ['Scrapy crawlers for ShareSansar & MeroLagani with Celery scheduling', 'VWAP, buy/sell pressure and volume-anomaly detection (μ + 1.5σ)', 'Live crawl status over Server-Sent Events, RBAC (Admin / Analyst / Viewer)'],
      stack: { Frontend: ['Next.js 16', 'React 19', 'TypeScript', 'Tailwind CSS v4', 'Recharts', 'Zod'], Backend: ['Django 5', 'Django REST Framework', 'SimpleJWT', 'drf-spectacular'], 'Data pipeline': ['Scrapy', 'Celery', 'Celery Beat', 'Redis', 'PostgreSQL 16', 'SSE'], Infra: ['Docker Compose (6 services)'] },
      overview: 'A full-stack market-intelligence system for the Nepal Stock Exchange. News is crawled politely (robots.txt, throttling), deduplicated and auto-categorised to companies; price and floorsheet data feed a behaviour-analysis engine whose results appear in interactive charts.',
      result: 'News-to-insight pipeline running end-to-end in six containers with a single command.',
      shot: '<div class="mock mock-stock"><div class="bar"><i></i><i></i><i></i><b>nepse / NABIL · 30d</b></div>' +
        '<svg viewBox="0 0 300 90" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="sg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f5a524" stop-opacity=".35"/><stop offset="1" stop-color="#f5a524" stop-opacity="0"/></linearGradient></defs>' +
        '<path d="M0 70 L25 62 L50 66 L75 50 L100 55 L125 40 L150 44 L175 30 L200 36 L225 22 L250 28 L275 14 L300 18 L300 90 L0 90Z" fill="url(#sg)"/>' +
        '<path class="line-draw" d="M0 70 L25 62 L50 66 L75 50 L100 55 L125 40 L150 44 L175 30 L200 36 L225 22 L250 28 L275 14 L300 18" fill="none" stroke="#f5a524" stroke-width="2"/></svg>' +
        '<div class="kpis"><span>VWAP<b>512.4</b></span><span>Pressure<b class="up">Bullish</b></span><span>Volume<b class="warn">Anomaly</b></span></div></div>',
      links: [['Code', GH + 'stock-crawler-dashboard']] },

    { id: 'rag', feat: true, cats: ['ai'], category: 'AI · RAG',
      title: 'Document-Aware RAG Chatbot',
      desc: 'A production-style RAG backend: upload PDFs, ask questions, get grounded answers with citations, and book interviews in chat.',
      highlights: ['Fixed-size or semantic chunking, Gemini embeddings (768-dim) in Qdrant', 'Answers cite source chunks with similarity scores; reranking with FlashRank', 'LLM slot-filling books interviews (name, email, date, time) into PostgreSQL'],
      stack: { API: ['Python', 'FastAPI', 'Uvicorn', 'Pydantic v2'], 'AI & search': ['Google Gemini (google-genai)', 'text-embedding-004', 'Qdrant', 'FlashRank'], Data: ['PostgreSQL 16', 'async SQLAlchemy', 'asyncpg', 'Redis 7 (chat memory)', 'pypdf'], Quality: ['pytest', 'pytest-asyncio', 'httpx'], Infra: ['Docker', 'Docker Compose'] },
      overview: 'A document-aware chatbot backend built without black-box abstractions. Documents are chunked and embedded, stored in Qdrant, and retrieved explicitly for each question; multi-turn memory lives in Redis, and the assistant can collect booking details conversationally.',
      result: 'Grounded answers with citations instead of guesses, plus a working booking flow.',
      shot: '<div class="mock mock-rag"><div class="msg u">What is the notice period for interns?</div>' +
        '<div class="msg a">Interns have a 15-day notice period after probation.<div class="src"><span>policy.pdf · p4</span><span>0.91</span></div></div>' +
        '<div class="msg u">Book me an interview Friday 2pm</div></div>',
      links: [['Code', GH + 'rag-chat-backend', 'primary']] },

    { id: 'studygigs', feat: false, cats: ['web'], category: 'Marketplace',
      title: 'StudyGigs',
      desc: 'A peer-to-peer academic marketplace connecting students who need help with solvers who provide it.',
      highlights: ['Task posting, bidding and deliverables', 'Dispute resolution flow', 'Student, solver and admin roles'],
      stack: { 'Full stack': ['Next.js', 'TypeScript', 'Tailwind CSS'], Data: ['Prisma ORM'] },
      overview: 'StudyGigs lets students post academic tasks, receive bids from solvers, exchange deliverables and resolve disputes, with separate experiences for students, solvers and admins.',
      result: 'A complete two-sided marketplace flow from posting to delivery.',
      shot: '<div class="mock mock-sg"><div class="bar"><i></i><i></i><i></i><b>studygigs / task #482</b></div>' +
        '<div class="task"><strong>Database normalisation assignment</strong><div class="meta"><span>DBMS</span><span>Due 3 days</span><span>Open</span></div></div>' +
        '<div class="bids"><div class="bid win"><i></i>Solver A<b>Rs 900</b></div><div class="bid"><i></i>Solver B<b>Rs 1,100</b></div><div class="bid"><i></i>Solver C<b>Rs 1,250</b></div></div></div>',
      links: [['Code', GH + 'studygigs']] },

    { id: 'tk', feat: false, cats: ['web'], category: 'Internal tool',
      title: 'Candidate Review Dashboard',
      desc: 'An internal tool for reviewing job candidates, with role-based access and live updates.',
      highlights: ['Filtering, sorting and pagination pushed down into SQL', 'RBAC for admins and reviewers with JWT', 'Real-time updates via Server-Sent Events, covered by tests'],
      stack: { Backend: ['Python', 'FastAPI', 'SQLAlchemy 2', 'SQLite', 'Pydantic', 'python-jose (JWT)', 'passlib / bcrypt', 'sse-starlette'], Frontend: ['React 19', 'Vite', 'TypeScript', 'React Router 7', 'lucide-react'], Quality: ['pytest', 'Swagger / OpenAPI'], Infra: ['Docker Compose'] },
      overview: 'A full-stack take-home project done properly: a FastAPI service with seeded roles, efficient SQL-side search, and a React dashboard that updates live as reviewers act.',
      result: 'Fast, secure reviewing with tests and one-command setup.',
      shot: '<div class="mock mock-tk"><table><thead><tr><th>Candidate</th><th>Role</th><th>Status</th></tr></thead><tbody>' +
        '<tr><td>A. Sharma</td><td>Backend</td><td><span class="st g">Shortlisted</span></td></tr>' +
        '<tr><td>R. Thapa</td><td>Frontend</td><td><span class="st b">Interview</span></td></tr>' +
        '<tr><td>S. Karki</td><td>Data</td><td><span class="st y">Pending</span></td></tr>' +
        '<tr><td>M. Rai</td><td>DevOps</td><td><span class="st r">Rejected</span></td></tr></tbody></table></div>',
      links: [['Code', GH + 'tk-candidate-review']] },

    { id: 'thunder', feat: false, cats: ['web'], live: true, category: 'Productivity',
      title: 'Thunder Kanban',
      desc: 'A drag-and-drop task board for teams, with secure logins and fast, cached loading.',
      highlights: ['Drag-and-drop workflows with priorities', 'Token rotation and LocalStorage caching', 'OpenAPI docs via drf-spectacular'],
      stack: { Frontend: ['React', 'TypeScript', 'Tailwind CSS', 'React Hook Form', 'Zod'], Backend: ['Django REST Framework', 'PostgreSQL', 'drf-spectacular'], Hosting: ['Vercel', 'Render'] },
      overview: 'A project-management board where teams create boards, columns and tasks, drag work between stages and set priorities.',
      result: 'Smooth drag-and-drop on desktop and mobile, deployed on Vercel + Render.',
      shot: '<div class="project-shot shot-kanban" style="position:absolute;inset:0" aria-hidden="true"><div><b>To do</b><i></i><i></i><i class="s"></i></div><div><b>Doing</b><i class="hl"></i><i class="s"></i></div><div><b>Done</b><i></i><i></i><i></i></div></div>',
      links: [['Live site', 'https://thunder-kanban.vercel.app/', 'primary'], ['Code', GH]] },

    { id: 'upstart', feat: false, cats: ['web'], category: 'Education',
      title: 'UpStart SAT Platform',
      desc: 'Timed SAT practice tests with instant scoring and section-wise performance insights.',
      highlights: ['Randomised question pools', 'Scoring and telemetry engine', 'Indexed lookups for heavy test load'],
      stack: { Backend: ['Python', 'Django'], Data: ['PostgreSQL'] },
      overview: 'A mock-test platform that recreates real SAT conditions: timed sections, randomised questions and instant results.',
      result: 'Students get section-by-section feedback the moment they finish.',
      shot: '<div class="project-shot shot-sat" style="position:absolute;inset:0" aria-hidden="true"><span class="timer" data-timer>64:59</span><span class="q">Question 14 of 27 · Reading &amp; Writing</span><span class="opts"><i></i><i class="hl"></i><i></i><i></i></span></div>',
      links: [['Code', GH]] },

    { id: 'medlife', feat: false, cats: ['web'], category: 'E-commerce',
      title: 'Medlife Online Pharmacy',
      desc: 'An online pharmacy with product search, cart, prescription uploads, secure checkout and an admin dashboard.',
      highlights: ['Dynamic product search with AJAX', 'Cart state and order validation', 'Admin reports'],
      stack: { Backend: ['Python', 'Django', 'Django ORM'], Frontend: ['HTML', 'CSS', 'JavaScript (AJAX)'], Data: ['MySQL'] },
      overview: 'Customers search medicines, manage a cart and check out, while staff manage stock and orders from an admin dashboard.',
      result: 'A complete store flow from search to checkout.',
      shot: '<img src="asset/Project/Medlife.png" alt="Medlife online pharmacy home page" loading="lazy" />',
      links: [['Code', GH + '-MEDLIFE-Online_Pharmacy_System']] },
  ];

  function flatStack(p) { var out = []; Object.keys(p.stack).forEach(function (k) { out = out.concat(p.stack[k]); }); return out; }
  function linkBtn(l, small) {
    var ext = l[1].indexOf('github.com') > -1 ? '<svg><use href="#i-github"/></svg> ' : '';
    return '<a class="btn ' + (l[2] === 'primary' ? 'btn-primary' : 'btn-ghost') + (small ? ' btn-sm' : '') + '" href="' + l[1] + '" target="_blank" rel="noopener">' + ext + esc(l[0]) + ' <svg><use href="#i-ext"/></svg></a>';
  }
  function renderProjects() {
    var grid = $('#projectGrid'); if (!grid) return;
    grid.innerHTML = PROJECTS.map(function (p, i) {
      return '<article class="project reveal tilt' + (p.feat ? ' feat' : '') + '" data-i="' + i + '" data-id="' + p.id + '" data-cats="' + p.cats.join(' ') + '">' +
        '<div class="project-shot">' + p.shot + '<span class="cat">' + (p.live ? '<span class="status-dot"></span>Live · ' : '') + esc(p.category) + '</span></div>' +
        '<div class="project-info">' +
          '<h3>' + esc(p.title) + '</h3>' +
          '<p class="desc">' + esc(p.desc) + '</p>' +
          '<ul class="highlights">' + p.highlights.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ul>' +
          '<p class="stack-label">Tech used</p>' +
          '<ul class="tags">' + flatStack(p).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
          '<div class="project-actions">' + p.links.map(function (l) { return linkBtn(l, true); }).join('') +
          '<button class="btn btn-ghost btn-sm" type="button" data-open="' + i + '">Case study</button></div>' +
        '</div></article>';
    }).join('');
  }
  renderProjects();

  // filters
  $$('.filter').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = b.getAttribute('data-filter');
      $$('.filter').forEach(function (x) { x.classList.toggle('active', x === b); x.setAttribute('aria-selected', String(x === b)); });
      $$('#projectGrid .project').forEach(function (c) {
        var show = f === 'all' || c.getAttribute('data-cats').split(' ').indexOf(f) > -1;
        c.classList.toggle('hide', !show);
        c.classList.toggle('feat', show && f === 'all' && PROJECTS[+c.getAttribute('data-i')].feat);
        if (show) { c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop', 'in'); }
      });
    });
  });

  var modal = $('#modal'), modalBody = $('#modalBody'), lastFocus = null;
  function openProject(i) {
    var p = PROJECTS[i]; if (!p) return;
    lastFocus = document.activeElement;
    var stackHtml = Object.keys(p.stack).map(function (k) {
      return '<div class="stack-row"><dt>' + esc(k) + '</dt><dd><ul class="tags">' + p.stack[k].map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></dd></div>';
    }).join('');
    modalBody.innerHTML =
      '<div class="project-shot modal-shot">' + p.shot + '</div>' +
      '<p class="modal-cat">' + esc(p.category) + '</p>' +
      '<h3 id="modalTitle">' + esc(p.title) + '</h3>' +
      '<h4>Overview</h4><p>' + esc(p.overview) + '</p>' +
      '<h4>Result</h4><p>' + esc(p.result) + '</p>' +
      '<h4>Highlights</h4><ul class="list">' + p.highlights.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>' +
      '<h4>Tech stack</h4><dl class="stack-table">' + stackHtml + '</dl>' +
      '<div class="modal-actions">' + p.links.map(function (l) { return linkBtn(l, true); }).join('') + '</div>';
    modal.hidden = false;
    document.body.classList.add('locked');
    requestAnimationFrame(function () { requestAnimationFrame(function () { modal.classList.add('open'); }); });
    $('#modalClose').focus({ preventScroll: true });
    modalBody.scrollTop = 0;
  }
  function closeModal() {
    if (modal.hidden) return;
    modal.classList.remove('open');
    document.body.classList.remove('locked');
    setTimeout(function () { modal.hidden = true; }, reduced ? 0 : 300);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-open]');
    if (b) { e.stopPropagation(); openProject(+b.getAttribute('data-open')); return; }
    var c = e.target.closest('#projectGrid .project');
    if (c && !e.target.closest('a, button')) openProject(+c.getAttribute('data-i'));
    var j = e.target.closest('[data-jump]');
    if (j) {
      var card = $('#projectGrid [data-id="' + j.getAttribute('data-jump') + '"]');
      if (card) setTimeout(function () { card.classList.add('flash'); setTimeout(function () { card.classList.remove('flash'); }, 1600); }, 700);
    }
  });
  $('#modalClose').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeModal(); closeChat(); } });

  /* ---------------------------------------------------------------- visitor counter */
  // Free, no-signup counters. Change NS to your own namespace if you like.
  var NS = 'shubhamnirmal-com-np', KEY = 'visits';
  function showVisitors(n) {
    var el = $('#visitorCount'); if (!el || !n) return;
    if (reduced) { el.textContent = '#' + n.toLocaleString('en-US'); return; }
    var start = performance.now(), from = Math.max(0, n - 60);
    (function step(now) {
      var p = clamp((now - start) / 1400, 0, 1);
      el.textContent = '#' + Math.round(from + (n - from) * (1 - Math.pow(1 - p, 3))).toLocaleString('en-US');
      if (p < 1) requestAnimationFrame(step);
    })(start);
  }
  function getJSON(url) {
    return fetch(url, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  (function visitors() {
    var el = $('#visitorCount'); if (!el) return;
    var counted = false;
    try { counted = !!sessionStorage.getItem('sn-counted'); } catch (e) {}
    var primary = 'https://api.counterapi.dev/v1/' + NS + '/' + KEY + (counted ? '' : '/up');
    var backup = 'https://abacus.jasoncameron.dev/' + (counted ? 'get' : 'hit') + '/' + NS + '/' + KEY;
    getJSON(primary).then(function (d) { return d.count; })
      .catch(function () { return getJSON(backup).then(function (d) { return d.value; }); })
      .then(function (n) {
        if (typeof n !== 'number') throw new Error('bad');
        try { sessionStorage.setItem('sn-counted', '1'); } catch (e) {}
        showVisitors(n);
      })
      .catch(function () { el.textContent = '#—'; $('#visitors').title = 'Counter is offline right now'; });
  })();

  var timer = $('[data-timer]');
  if (timer && !reduced) {
    var secs = 64 * 60 + 59;
    setInterval(function () {
      secs = secs <= 0 ? 64 * 60 + 59 : secs - 1;
      timer.textContent = String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0');
    }, 1000);
  }

  /* ---------------------------------------------------------------- contact */
  function copyText(text) {
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove(); return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; }, fallback);
    return Promise.resolve(fallback());
  }
  $('#copyEmail').addEventListener('click', function () { copyText(EMAIL).then(function (ok) { toast(ok ? 'Email copied' : EMAIL); }); });

  // "Book a session" style links pre-select the topic
  $$('[data-subject]').forEach(function (a) {
    a.addEventListener('click', function () {
      var sel = $('#cfTopic');
      $$('option', sel).forEach(function (o) { if (o.textContent === a.getAttribute('data-subject')) sel.value = o.value; });
    });
  });

  var form = $('#contactForm'), status = $('#formStatus');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = null;
    $$('input, textarea', form).forEach(function (f) {
      var ok = f.checkValidity() && f.value.trim() !== '';
      f.closest('.form-row').classList.toggle('invalid', !ok);
      if (!ok && !bad) bad = f;
    });
    if (bad) { status.className = 'form-status err'; status.textContent = 'Please fill in your ' + (bad.name === 'email' ? 'email address' : bad.name) + '.'; bad.focus(); return; }
    var name = $('#cfName').value.trim(), email = $('#cfEmail').value.trim(), topic = $('#cfTopic').value, msg = $('#cfMessage').value.trim();
    var body = 'Name: ' + name + '\nEmail: ' + email + '\nTopic: ' + topic + '\n\n' + msg;
    status.className = 'form-status ok';
    status.textContent = 'Thanks ' + name + '! Your email app is opening with the message ready to send.';
    window.location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(topic + ' | from ' + name) + '&body=' + encodeURIComponent(body);
  });
  $$('input, textarea', form).forEach(function (f) { f.addEventListener('input', function () { f.closest('.form-row').classList.remove('invalid'); }); });

  /* ---------------------------------------------------------------- clock */
  (function () {
    var els = $$('.np-time'), yr = $('#year');
    if (yr) yr.textContent = new Date().getFullYear();
    var fmt; try { fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kathmandu', hour: '2-digit', minute: '2-digit', hour12: false }); } catch (e) {}
    function tick() { var t = fmt ? fmt.format(new Date()) : ''; els.forEach(function (el) { el.textContent = t; }); }
    tick(); setInterval(tick, 20000);
  })();

  /* ---------------------------------------------------------------- chatbot */
  var chatToggle = $('#chatToggle'), chatWin = $('#chatWindow'), chatLog = $('#chatLog'), chatInput = $('#chatInput');
  function openChat() { chatWin.hidden = false; chatToggle.setAttribute('aria-expanded', 'true'); chatLog.scrollTop = chatLog.scrollHeight; setTimeout(function () { chatInput.focus(); }, 50); }
  function closeChat() { if (chatWin.hidden) return; chatWin.hidden = true; chatToggle.setAttribute('aria-expanded', 'false'); }
  chatToggle.addEventListener('click', function () { chatWin.hidden ? openChat() : closeChat(); });
  $('#chatClose').addEventListener('click', closeChat);

  var REPLIES = [
    [/(remote|hybrid|on.?site|relocat|time ?zone|location|where.*based)/, 'I\'m based in Lalitpur, Nepal (UTC+5:45) and open to remote and hybrid work. My hours overlap well with Europe, the Middle East and Asia, and I\'m happy to adjust for calls with US teams.'],
    [/(service|offer|help|do you do|hire|work with)/, 'I can help with:\n• Frontend (Next.js, React, TypeScript)\n• AI integration (RAG chatbots, smart search, recommendations)\n• Backend & API development\n• Workflow automation\n• Web scraping & data feeds\n• 1:1 IT career advice\n\nTell me about your project in the contact form and I\'ll reply within a day.'],
    [/(career|advice|mentor|session|1:1|one on one|guidance|interview|junior|student)/, 'Yes! I offer 1:1 IT career sessions: choosing a path, reviewing your CV and portfolio, a learning roadmap, and mock interviews. Pick "1:1 IT career session" in the contact form to book one.'],
    [/(automat|workflow|script|cron|repetitive|excel|spreadsheet)/, 'Workflow automation is one of my favourite jobs: Python scripts and scheduled jobs that handle reports, data syncs, spreadsheets and emails for you. At Honest Forwarder I automated daily Google Merchant Center product feeds.'],
    [/(rag|\bai\b|chatbot|llm|gpt|gemini|assistant|integrat)/, 'AI integration is a big part of my work. I recently built a document-aware RAG chatbot backend (FastAPI, Qdrant, Gemini, Redis) that answers with citations and can book interviews in chat. SkillBridge also uses a hybrid recommendation engine I built.'],
    [/(scrap|crawl|feed|price|competitor|merchant)/, 'I build scrapers for competitor prices and product data, and generate Google Merchant Center-ready feeds that update automatically every day.'],
    [/(skill|tech|stack|language|framework|tool)/, 'My main stack: Python, Django and Django REST Framework on the backend; React, Next.js and TypeScript on the frontend; PostgreSQL and MySQL; plus Docker, Git, AWS, Postman and Figma.'],
    [/(project|portfolio|built|made|example)/, 'Some things I\'ve built:\n1. MakeCV: AI resume builder (live)\n2. SkillBridge: recruitment platform with AI recommendations\n3. NEPSE stock crawler & analytics dashboard\n4. Document-aware RAG chatbot\n5. StudyGigs: student marketplace\n6. Candidate review dashboard\n7. Thunder Kanban (live)\n\nOpen any project in the Work section for the full stack and case study.'],
    [/(experience|job|company|intern|fellow|worked)/, 'Experience:\n• Software Developer at Honest Forwarder (Sep 2025–now): +32% sales from faster APIs, scrapers and feed automation.\n• Software Development Fellow at Cloco Nepal (Jun–Aug 2025): secure APIs and Next.js dashboards.\n• Django Developer Intern at Raijin Tech (Nov 2024–Feb 2025): 20% faster queries.'],
    [/(php|cve|vulnerab|security|php2shell)/, 'If you run PHP, update to 8.5.12, 8.4.27, 8.3.36 or 8.2.35 right away. I wrote a step-by-step guide to the PHP2Shell flaws (CVE-2026-109618 and 109619) in the Blog section.'],
    [/(price|cost|rate|budget|charge|fee)/, 'It depends on scope. Share a few details in the contact form (what you need and when) and I\'ll send a clear estimate, usually within a day.'],
    [/(contact|reach|email|phone|call|whatsapp|number|location|where)/, 'You can reach me at ' + EMAIL + ' or ' + PHONE + '. I\'m based in Lalitpur, Nepal (UTC+5:45) and work with clients worldwide.'],
    [/(cv|resume)/, 'You can download my CV from the Experience section; there\'s a "Download my CV" button.'],
    [/^(hi|hello|hey|namaste|yo|hola)\b/, 'Namaste! How can I help? Ask me about services, projects, career advice or how to get in touch.'],
  ];
  function reply(q) {
    var s = q.toLowerCase();
    for (var i = 0; i < REPLIES.length; i++) if (REPLIES[i][0].test(s)) return REPLIES[i][1];
    return 'Good question! I\'m a simple assistant, so I may not know that one. Try asking about services, projects, experience or career advice, or send Shubham a message through the contact form.';
  }
  function bubble(text, who) {
    var b = document.createElement('div');
    b.className = 'bubble ' + who; b.textContent = text;
    chatLog.appendChild(b); chatLog.scrollTop = chatLog.scrollHeight;
    return b;
  }
  function ask(q) {
    if (!q.trim()) return;
    bubble(q, 'user');
    var t = document.createElement('div');
    t.className = 'bubble bot typing'; t.innerHTML = '<span></span><span></span><span></span>';
    chatLog.appendChild(t); chatLog.scrollTop = chatLog.scrollHeight;
    setTimeout(function () { t.classList.remove('typing'); t.textContent = reply(q); chatLog.scrollTop = chatLog.scrollHeight; }, 650 + Math.random() * 400);
  }
  $('#chatForm').addEventListener('submit', function (e) { e.preventDefault(); ask(chatInput.value); chatInput.value = ''; });
  $$('.chat-chips button').forEach(function (b) { b.addEventListener('click', function () { ask(b.getAttribute('data-q')); }); });

  /* ---------------------------------------------------------------- boot */
  function boot() {
    root.classList.add('booted');
    $$('.hero .count').forEach(countUp);
  }
  setupReveal();
  setupPointer();
  if (window.SNIntro) window.SNIntro.play(boot); else boot();
  var replayBtn = $('#replayIntro');
  if (replayBtn) replayBtn.addEventListener('click', function () {
    if (reduced) { toast('Intro is off because your system prefers reduced motion'); return; }
    if (window.SNIntro) window.SNIntro.replay(function () {});
  });
})();
