/* =========================================================
   Сборка страниц из assets/data/content.js.
   Работает до main.js: сначала строим разметку, потом
   main.js навешивает вкладки, аккордеон, фильтры и просмотр.
   ========================================================= */
(function () {
  'use strict';

  var C = window.SITE_CONTENT || {};

  /* ------------------------ помощники ------------------------ */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Абзацы из многострочного текста: пустая строка — новый абзац.
  function paragraphs(text, cls) {
    var t = String(text || '').trim();
    if (!t) return '';
    return t.split(/\n\s*\n/).map(function (p) {
      return '<p' + (cls ? ' class="' + cls + '"' : '') + '>' +
        esc(p).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  function set(id, html) {
    var node = document.getElementById(id);
    if (!node) return;
    if (html != null && html !== '') {
      node.innerHTML = html;
    }
  }

  function setText(id, text) {
    var node = document.getElementById(id);
    if (!node) return;
    if (text != null && text !== '') {
      node.textContent = text;
    }
  }

  function slot(icon, title, hint, extraClass) {
    return '<div class="slot ' + (extraClass || '') + '">' +
      '<span class="slot__art" aria-hidden="true">' + icon + '</span>' +
      '<span class="slot__title">' + esc(title) + '</span>' +
      (hint ? '<p class="slot__hint">' + esc(hint) + '</p>' : '') +
      '</div>';
  }

  function emptyState(icon, title, hint) {
    return '<div class="empty">' +
      '<span class="empty__art" aria-hidden="true">' + icon + '</span>' +
      '<p class="empty__title">' + esc(title) + '</p>' +
      (hint ? '<p class="empty__hint">' + esc(hint) + '</p>' : '') +
      '</div>';
  }

  function isVideo(file) { return /\.(mp4|webm|ogg|ogv|mov|m4v)$/i.test(file || ''); }

  var TONES = ['tone-1', 'tone-2', 'tone-3', 'tone-4', 'tone-5', 'tone-6'];
  function tone(i) { return TONES[i % TONES.length]; }

  function dateRu(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    return m ? m[3] + '.' + m[2] + '.' + m[1] : (iso || '');
  }

  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/);
    var a = parts[0] ? parts[0][0] : '';
    var b = parts[1] ? parts[1][0] : '';
    return (a + b).toUpperCase();
  }

  /* --------------------- карточки с медиа --------------------- */

  function mediaTile(item, index, opts) {
    opts = opts || {};
    var file = item.file || '';
    var caption = item.title || item.caption || '';
    var video = item.kind === 'video' || isVideo(file);
    var kindLabel = video ? 'Видео' : 'Фото';

    var inner;
    if (file) {
      inner = video
        ? '<span class="gallery__frame gallery__frame--video">' +
            '<video src="' + esc(file) + '" preload="metadata" muted playsinline></video>' +
            '<span class="gallery__play" aria-hidden="true">▶</span>' +
          '</span>'
        : '<span class="gallery__frame gallery__frame--img">' +
            '<img src="' + esc(file) + '" alt="' + esc(caption) + '" loading="lazy">' +
          '</span>';
    } else {
      inner = '<span class="gallery__frame">' +
        '<span style="font-size:2rem" aria-hidden="true">' + (video ? '🎬' : '📷') + '</span>' +
        '<span>' + esc(kindLabel) + ' не загружено</span></span>';
    }

    return '<figure class="gallery__item" data-kind="' + (video ? 'video' : 'foto') + '">' +
      (opts.badge === false ? '' : '<span class="gallery__kind">' + kindLabel + '</span>') +
      '<button type="button" class="gallery__btn"' +
        ' data-lightbox="' + kindLabel + '"' +
        (file ? ' data-src="' + esc(file) + '"' : '') +
        ' data-title="' + esc(caption || (kindLabel + ' № ' + (index + 1))) + '"' +
        ' data-note="' + esc(file ? '' : 'Файл добавляется в админке.') + '">' +
        inner +
      '</button>' +
      (caption ? '<figcaption class="gallery__cap">' + esc(caption) + '</figcaption>' : '') +
      '</figure>';
  }

  function pdfCard(item, index, label) {
    var file = item.file || '';
    var title = item.title || (label + ' № ' + (index + 1));
    if (!file) {
      return '<div class="pdf-slot">' +
        '<span class="pdf-slot__icon" aria-hidden="true">PDF</span>' +
        '<span class="pdf-slot__num">' + esc(title) + '</span>' +
        '<p class="pdf-slot__hint">Файл не загружен.</p>' +
        '</div>';
    }
    return '<a class="pdf-slot pdf-slot--filled" href="' + esc(file) + '" target="_blank" rel="noopener noreferrer">' +
      '<span class="pdf-slot__icon" aria-hidden="true">PDF</span>' +
      '<span class="pdf-slot__num">' + esc(title) + '</span>' +
      '<p class="pdf-slot__hint">Открыть <span aria-hidden="true">↗</span></p>' +
      '</a>';
  }

  /* ========================= ГЛАВНАЯ ========================= */
  function renderHome() {
    var s = C.site || {}, h = C.home || {};

    setText('hero-eyebrow', s.heroEyebrow);
    setText('hero-title', s.heroTitle);
    setText('motto-label', s.mottoLabel);
    setText('motto-text', s.motto);

    var hp = h.heroPhoto || {};
    set('hero-art', hp.file
      ? '<div class="hero__photo"><img src="' + esc(hp.file) + '" alt="' + esc(hp.alt || '') + '"></div>'
      : slot('📸', 'Блок фото обучающихся', 'Главное фото добавляется в админке.', 'slot--wide'));

    var st = h.students || {};
    setText('students-eyebrow', st.eyebrow);
    setText('students-title', st.title);

    var photos = st.photos || [];
    set('students-photos', photos.length
      ? photos.map(function (p, i) { return mediaTile(p, i, { badge: false }); }).join('')
      : emptyState('📷', 'Фотографии не добавлены', 'Загрузите снимки в админке, раздел «Главная».'));
    var grid = document.getElementById('students-photos');
    if (grid) grid.className = photos.length ? 'gallery' : '';

    set('students-text', st.text
      ? paragraphs(st.text, 'lead')
      : slot('✍️', 'Текст про обучающихся', 'Добавляется в админке.'));

    var ab = h.about || {};
    setText('about-eyebrow', ab.eyebrow);
    setText('about-title', ab.title);
    set('about-text', ab.text
      ? '<div class="prose">' + paragraphs(ab.text, 'lead') + '</div>'
      : slot('📝', 'Блок «О чём сайт»', 'Текст добавляется в админке.'));

    var icons = { 'metody.html': '🧠', 'resursy.html': '🧭', 'psiholog.html': '💬', 'logoped.html': '🗣️',
                  'defektolog.html': '📘', 'tetradi.html': '📗', 'galereya.html': '📸', 'otzyvy.html': '⭐' };
    set('about-toc', (C.nav || []).filter(function (p) { return p.href !== 'index.html'; })
      .map(function (p, i) {
        return '<a class="toc__link ' + tone(i) + '" href="' + esc(p.href) + '">' +
          '<span class="toc__ico" aria-hidden="true">' + (icons[p.href] || '📄') + '</span>' +
          esc(p.full || p.title) + '</a>';
      }).join(''));

    var memo = h.memo || {};
    setText('memo-eyebrow', memo.eyebrow);
    setText('memo-title', memo.title);
    setText('memo-intro', memo.intro);

    var items = memo.items || [];
    set('memo-acc', items.length ? items.map(function (it, i) {
      var id = 'memo-' + (i + 1);
      return '<div class="acc__item ' + tone(i) + '">' +
        '<h3 style="margin:0">' +
          '<button type="button" class="acc__btn" id="' + id + '" aria-expanded="' + (i === 0) + '" aria-controls="' + id + '-p">' +
            '<span class="acc__emoji" aria-hidden="true">' + esc(it.emoji || '•') + '</span>' +
            '<span>' + esc(it.title) + '</span>' +
            '<svg class="acc__chev" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
              'stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>' +
          '</button>' +
        '</h3>' +
        '<div class="acc__panel" id="' + id + '-p" role="region" aria-labelledby="' + id + '">' +
          paragraphs(it.text) +
        '</div>' +
      '</div>';
    }).join('') : emptyState('📋', 'Пункты памятки не добавлены', ''));

    var allBtn = document.querySelector('[data-acc-all]');
    if (allBtn && !items.length) allBtn.hidden = true;
  }

  /* ====================== МЕТОДЫ И ПОДХОДЫ ====================== */
  function methodCard(it, i) {
    var link = it.linkText && it.linkHref
      ? '<p style="margin-top:1em"><a class="btn btn--ghost" href="' + esc(it.linkHref) + '">' + esc(it.linkText) + '</a></p>'
      : '';
    return '<article class="card card--hover ' + tone(i) + '"><div class="method">' +
      '<span class="card__icon" aria-hidden="true">' + esc(it.icon || '•') + '</span>' +
      '<span class="method__name">' + esc(it.name) + '</span>' +
      (it.desc ? '<p class="method__desc">' + esc(it.desc) + '</p>' : '') +
      (it.example ? '<p class="method__example"><b>Пример:</b> ' + esc(it.example) + '</p>' : '') +
      link +
    '</div></article>';
  }

  function renderMethods() {
    var m = C.methods || {};
    setText('page-title', m.title);

    [['approaches', 'podhody'], ['effective', 'metody'], ['bySpecialist', 'specialisty']]
      .forEach(function (pair) {
        var data = m[pair[0]] || {};
        var tab = document.getElementById('tab-' + pair[1]);
        if (tab) {
          var label = tab.querySelector('[data-label]');
          if (label) label.textContent = data.tab || '';
        }
        var items = data.items || [];
        set('grid-' + pair[1], items.length
          ? items.map(methodCard).join('')
          : emptyState('🗂', 'Пока не добавлено', 'Добавьте пункты в админке.'));
      });
  }

  /* ======================= ПОЛЕЗНЫЕ РЕСУРСЫ ======================= */
  function renderResources() {
    var r = C.resources || {};
    setText('page-title', r.title);
    setText('page-lead', r.lead);

    var kinds = r.kinds || [];
    var items = r.items || [];

    set('res-filters',
      '<button type="button" class="chip" data-filter="all" aria-pressed="true">Все</button>' +
      kinds.map(function (k) {
        return '<button type="button" class="chip" data-filter="' + esc(k.id) + '" aria-pressed="false">' +
          esc(k.label) + '</button>';
      }).join('') +
      '<span class="lead" style="margin-left:auto;align-self:center">Показано: ' +
        '<b data-filter-count="res-grid">' + items.length + '</b></span>');

    set('res-grid', items.length ? items.map(function (it, i) {
      var host = '';
      try { host = new URL(it.url).host + new URL(it.url).pathname.replace(/\/$/, ''); }
      catch (e) { host = it.url || ''; }
      return '<a class="card card--hover res ' + tone(i) + '" data-kind="' + esc(it.kind || '') + '" ' +
        'href="' + esc(it.url) + '" target="_blank" rel="noopener noreferrer">' +
        '<span class="res__badge" aria-hidden="true">' + esc(it.icon || '🔗') + '</span>' +
        '<p class="res__title">' + esc(it.title) + '</p>' +
        '<p class="res__url">' + esc(host) + '</p>' +
        '<span class="res__go">Открыть <span aria-hidden="true">↗</span>' +
          '<span class="visually-hidden">(откроется в новой вкладке)</span></span>' +
      '</a>';
    }).join('') : emptyState('🧭', 'Ссылки не добавлены', 'Добавьте ресурсы в админке.'));

    var note = document.getElementById('res-note');
    if (note) {
      if (r.note) note.querySelector('[data-note]').textContent = r.note;
      else note.hidden = true;
    }
  }

  /* ====================== СТРАНИЦЫ СПЕЦИАЛИСТОВ ====================== */
  function renderSpecialist(key) {
    var sp = (C.specialists || {})[key] || {};
    setText('page-eyebrow', sp.eyebrow);
    setText('page-title', sp.title);
    document.title = (sp.title || 'Специалист') + ' — ' + ((C.site || {}).title || '');

    var L = sp.letter || {};
    set('letter', '<article class="letter">' +
      (L.heading ? '<h2>' + esc(L.heading) + '</h2>' : '') +
      (L.intro ? '<p><b>' + esc(L.intro) + '</b></p>' : '') +
      (L.paragraphs || []).map(function (p) { return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>'; }).join('') +
      (L.signOff || L.signRole
        ? '<p class="letter__sign">' + esc(L.signOff || '') + '<span>' + esc(L.signRole || '') + '</span></p>'
        : '') +
      '<p style="margin-top:1.6em"><a class="btn" href="#zapis">Запись на консультацию</a></p>' +
    '</article>');

    var photos = sp.photos || [];
    set('spec-photos', photos.length
      ? photos.map(function (p, i) { return mediaTile(p, i, { badge: false }); }).join('')
      : emptyState('📷', 'Фотографии не добавлены', 'Загрузите снимки в админке.'));
    var pg = document.getElementById('spec-photos');
    if (pg) pg.className = photos.length ? 'gallery' : '';

    var pdfs = sp.pdfs || [];
    set('spec-pdfs', pdfs.length
      ? pdfs.map(function (p, i) { return pdfCard(p, i, 'Статья'); }).join('')
      : emptyState('📄', 'Статьи не добавлены', 'Загрузите PDF-файлы в админке.'));
    var dg = document.getElementById('spec-pdfs');
    if (dg) dg.className = pdfs.length ? 'grid grid--4' : '';

    var blog = sp.blog || [];
    set('spec-blog', blog.length ? blog.map(function (b, i) {
      return '<article class="card ' + tone(i) + '">' +
        '<h3 class="card__title">' + esc(b.title) + '</h3>' +
        '<div class="card__text">' + paragraphs(b.text) + '</div>' +
      '</article>';
    }).join('') : emptyState('💡', 'Записей пока нет', 'Добавьте советы в админке.'));
    var bg = document.getElementById('spec-blog');
    if (bg) bg.className = blog.length ? 'grid grid--3' : '';

    var others = Object.keys(C.specialists || {}).filter(function (k) { return k !== key; });
    var icons = { psiholog: '💬', logoped: '🗣️', defektolog: '📘' };
    var toneByKey = { psiholog: 'tone-2', logoped: 'tone-1', defektolog: 'tone-3' };
    set('spec-others', others.map(function (k) {
      return '<a class="toc__link ' + (toneByKey[k] || '') + '" href="' + k + '.html">' +
        '<span class="toc__ico" aria-hidden="true">' + (icons[k] || '📄') + '</span>' +
        esc(C.specialists[k].title || k) + '</a>';
    }).join(''));
  }

  /* ======================= РАБОЧИЕ ТЕТРАДИ ======================= */
  function renderWorkbooks() {
    var w = C.workbooks || {};
    setText('page-title', w.title);
    setText('page-lead', w.lead);

    var subjects = w.subjects || [];
    var total = subjects.reduce(function (n, s) { return n + (s.books || []).length; }, 0);
    var noteEl = document.getElementById('wb-note');
    if (noteEl) {
      noteEl.innerHTML = '<span aria-hidden="true">📚</span><span><b>' + esc(w.note || '') + '</b> ' +
        'Загружено книг: ' + total + (w.maxBooks ? ' из ' + w.maxBooks : '') + '.</span>';
    }

    set('wb-tabs', subjects.map(function (s, i) {
      return '<button class="tab" role="tab" id="wb-tab-' + i + '" aria-controls="wb-panel-' + i + '" ' +
        'aria-selected="' + (i === 0) + '">' +
        '<span aria-hidden="true">' + esc(s.icon || '📗') + '</span> ' + esc(s.title) + '</button>';
    }).join(''));

    set('wb-panels', subjects.map(function (s, i) {
      var books = s.books || [];
      return '<div class="tabpanel" role="tabpanel" id="wb-panel-' + i + '" aria-labelledby="wb-tab-' + i + '" ' +
        'tabindex="0"' + (i === 0 ? '' : ' hidden') + '>' +
        '<h2>«' + esc(s.title) + '»</h2>' +
        '<p class="lead" style="margin-bottom:var(--gap)"><span class="counter">' +
          '<span class="counter__num">' + books.length + '</span> книг PDF</span></p>' +
        (books.length
          ? '<div class="grid grid--4">' + books.map(function (b, j) { return pdfCard(b, j, 'Книга'); }).join('') + '</div>'
          : emptyState('📗', 'Книги не загружены', 'Загрузите PDF-файлы в админке.')) +
      '</div>';
    }).join(''));
  }

  /* ====================== ИНТЕРЕСНЫЕ МОМЕНТЫ ====================== */
  function renderGallery() {
    var g = C.gallery || {};
    setText('page-title', g.title);
    setText('page-lead', g.lead);

    var items = g.items || [];
    set('gal-filters',
      '<button type="button" class="chip" data-filter="all" aria-pressed="true">Всё</button>' +
      '<button type="button" class="chip" data-filter="foto" aria-pressed="false">Фото</button>' +
      '<button type="button" class="chip" data-filter="video" aria-pressed="false">Видео</button>' +
      '<span class="lead" style="margin-left:auto;align-self:center">Показано: ' +
        '<b data-filter-count="moments">' + items.length + '</b></span>');

    var box = document.getElementById('moments');
    if (!box) return;
    if (items.length) {
      box.className = 'gallery';
      box.innerHTML = items.map(function (it, i) { return mediaTile(it, i); }).join('');
    } else {
      box.className = '';
      box.innerHTML = emptyState('📸', 'Материалы не добавлены', 'Загрузите фото и видео в админке.');
      var f = document.getElementById('gal-filters');
      if (f) f.hidden = true;
    }
  }

  /* ========================== ОТЗЫВЫ ========================== */
  function renderReviews() {
    var r = C.reviews || {};
    setText('page-title', r.title);

    var items = (r.items || []).slice();
    var box = document.getElementById('reviews');
    if (!box) return;

    if (!items.length) {
      box.className = '';
      box.innerHTML = emptyState('⭐', 'Отзывов пока нет', 'Добавьте отзывы в админке.');
      var sorters = document.getElementById('review-sort');
      if (sorters) sorters.hidden = true;
      return;
    }

    box.className = 'grid grid--reviews';
    box.innerHTML = items.map(function (it, i) {
      var stars = Math.max(0, Math.min(5, parseInt(it.rating, 10) || 0));
      return '<article class="card review ' + tone(i) + '" data-date="' + esc(it.date || '') + '">' +
        '<div class="review__head">' +
          '<span class="review__avatar" aria-hidden="true">' + esc(initials(it.name)) + '</span>' +
          '<span><span class="review__who">' + esc(it.name) + '</span><br>' +
          '<span class="review__date"><time datetime="' + esc(it.date || '') + '">' + esc(dateRu(it.date)) + '</time></span></span>' +
        '</div>' +
        (stars ? '<div class="review__stars" aria-label="Оценка: ' + stars + ' из 5">' +
          '★★★★★'.slice(0, stars) + '</div>' : '') +
        (it.text
          ? '<div class="card__text">' + paragraphs(it.text) + '</div>'
          : slot('💬', 'Текст отзыва', 'Добавляется в админке.')) +
      '</article>';
    }).join('');
  }

  /* ========================== запуск ========================== */
  var PAGES = {
    home: renderHome,
    methods: renderMethods,
    resources: renderResources,
    workbooks: renderWorkbooks,
    gallery: renderGallery,
    reviews: renderReviews
  };

  function init() {
    var page = document.body.dataset.page;
    if (page === 'specialist') renderSpecialist(document.body.dataset.spec);
    else if (PAGES[page]) PAGES[page]();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
