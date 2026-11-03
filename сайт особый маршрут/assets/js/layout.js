/* =========================================================
   Общая «обвязка» сайта: шапка, навигация, панель доступности,
   подвал с формой записи и кнопка «наверх».
   Собирается на каждой странице, чтобы разметка не дублировалась.
   ========================================================= */
(function () {
  'use strict';

  var C = window.SITE_CONTENT || {};
  var SITE = C.site || {};
  var FOOT = C.footer || {};

  var PAGES = C.nav || [{ href: 'index.html', title: 'Главная' }];
  var SPECIALISTS = FOOT.specialists || [];

  var STORE_KEY = 'osobyi-marshrut-a11y';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ------------------------ утилиты ------------------------ */
  function el(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function currentPage() {
    var path = window.location.pathname.split('/').pop();
    return path && path.length ? path : 'index.html';
  }

  // Плавная прокрутка своими силами
  function scrollToY(top, smooth) {
    top = Math.max(0, Math.round(top));
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!smooth || reduce) { window.scrollTo(0, top); return; }

    var start = window.pageYOffset;
    var delta = top - start;
    if (Math.abs(delta) < 2) return;
    var duration = Math.min(700, Math.max(280, Math.abs(delta) * 0.5));
    var t0 = null;

    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / duration);
      var eased = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      window.scrollTo(0, start + delta * eased);
      if (p < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  function offsetOf(el) {
    return el.getBoundingClientRect().top + window.pageYOffset - 24;
  }

  function readPrefs() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function writePrefs(prefs) {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(prefs)); } catch (e) { /* приватный режим */ }
  }

  /* ------------------------ разметка ------------------------ */
  var LOGO_MARK =
    '<svg class="logo__mark" viewBox="0 0 64 64" role="img" aria-hidden="true" focusable="false">' +
      '<defs><linearGradient id="lgm" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#2F7D6E"/><stop offset="1" stop-color="#D9622F"/>' +
      '</linearGradient></defs>' +
      '<circle cx="32" cy="32" r="30" fill="#E6F2EF"/>' +
      '<path d="M14 46c0-12 8-14 14-14s10-4 10-10" fill="none" stroke="url(#lgm)" stroke-width="5" ' +
        'stroke-linecap="round" stroke-dasharray="1 9"/>' +
      '<path d="M40 14c5.5 0 9 3.6 9 8.6 0 6.6-8 11.6-11.4 14.5-.9.8-2.3.8-3.2 0C31 34.2 23 29.2 23 22.6 23 17.6 26.5 14 32 14c1.7 0 3.1.7 4 1.8.9-1.1 2.3-1.8 4-1.8z" fill="#D9622F"/>' +
      '<circle cx="14" cy="46" r="5" fill="#2F7D6E"/>' +
    '</svg>';

  function buildHeader(active) {
    var navItems = PAGES.map(function (p) {
      var cur = p.href === active ? ' aria-current="page"' : '';
      return '<li><a class="nav__link" href="' + esc(p.href) + '"' + cur + '>' + esc(p.title) + '</a></li>';
    }).join('');

    return el(
      '<header class="header">' +
        '<div class="wrap header__bar">' +
          '<a class="logo" href="index.html">' + LOGO_MARK +
            '<span class="logo__text">' +
              '<span class="logo__name">' + esc(SITE.title || '') + '</span>' +
              '<span class="logo__sub">' + esc(SITE.subtitle || '') + '</span>' +
            '</span>' +
          '</a>' +

          '<div class="header__actions">' +
            '<button type="button" class="icon-btn" id="a11y-toggle" aria-expanded="false" aria-controls="a11y-panel">' +
              '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
                '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>' +
              '</svg>' +
              '<span class="visually-hidden">Настройки отображения</span>' +
            '</button>' +
            '<a class="btn btn--accent header__cta" href="#zapis">Запись на консультацию</a>' +
            '<button type="button" class="icon-btn burger" id="nav-toggle" aria-expanded="false" aria-controls="site-nav">' +
              '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">' +
                '<path d="M4 7h16M4 12h16M4 17h16"/>' +
              '</svg>' +
              '<span class="visually-hidden">Меню</span>' +
            '</button>' +
          '</div>' +
        '</div>' +

        '<nav class="nav" id="site-nav" aria-label="Основное меню">' +
          '<div class="wrap"><ul class="nav__list">' + navItems +
            '<li class="nav__cta"><a class="btn btn--accent btn--wide" href="#zapis">Запись на консультацию</a></li>' +
          '</ul></div>' +
        '</nav>' +

        '<div class="wrap">' +
          '<div class="a11y" id="a11y-panel">' +
            '<div class="a11y__group">' +
              '<span class="a11y__label" id="fs-label">Размер шрифта</span>' +
              '<div role="group" aria-labelledby="fs-label" style="display:flex;gap:6px">' +
                '<button type="button" class="a11y__btn" data-fs="1" aria-pressed="true">А</button>' +
                '<button type="button" class="a11y__btn" data-fs="1.15" aria-pressed="false" style="font-size:1.12em">А</button>' +
                '<button type="button" class="a11y__btn" data-fs="1.32" aria-pressed="false" style="font-size:1.28em">А</button>' +
              '</div>' +
            '</div>' +
            '<div class="a11y__group">' +
              '<span class="a11y__label">Контраст</span>' +
              '<button type="button" class="a11y__btn" id="contrast-toggle" aria-pressed="false">Версия для слабовидящих</button>' +
            '</div>' +
            '<div class="a11y__group">' +
              '<button type="button" class="a11y__btn" id="a11y-reset">Сбросить</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</header>'
    );
  }

  function buildFooter(active) {
    var options = SPECIALISTS.map(function (s) {
      return '<option value="' + esc(s) + '">' + esc(s) + '</option>';
    }).join('');

    var map = PAGES.map(function (p) {
      var cur = p.href === active ? ' aria-current="page"' : '';
      return '<li><a href="' + esc(p.href) + '"' + cur + '>' + esc(p.full || p.title) + '</a></li>';
    }).join('');

    var links = (FOOT.links || []).map(function (l) {
      return '<li><a class="social__link" href="' + esc(l.url || '#') + '" target="_blank" rel="noopener noreferrer">' +
        '<span class="social__ico" aria-hidden="true">' + esc(l.icon || '🔗') + '</span>' +
        '<span class="social__meta">' + esc(l.label || '') +
          (l.note ? '<span>' + esc(l.note) + '</span>' : '') +
        '</span></a></li>';
    }).join('');

    return el(
      '<footer class="footer" id="podval">' +
        '<div class="wrap">' +
          '<div class="footer__grid">' +

            '<section id="zapis" aria-labelledby="zapis-title">' +
              '<h2 id="zapis-title">' + esc(FOOT.formTitle || 'Запись на консультацию') + '</h2>' +
              '<p class="footer__note">' + esc(FOOT.formNote || '') + '</p>' +
              '<form class="form" id="consult-form" novalidate>' +
                '<div class="field" data-field="spec">' +
                  '<label class="field__label" for="f-spec">Специалист <span class="field__req" aria-hidden="true">*</span></label>' +
                  '<select class="field__control" id="f-spec" name="spec" required aria-describedby="e-spec">' +
                    '<option value="">— выберите специалиста —</option>' + options +
                  '</select>' +
                  '<p class="field__error" id="e-spec" hidden>Пожалуйста, выберите специалиста.</p>' +
                '</div>' +

                '<div class="form__row">' +
                  '<div class="field" data-field="name">' +
                    '<label class="field__label" for="f-name">Ваше имя <span class="field__req" aria-hidden="true">*</span></label>' +
                    '<input class="field__control" id="f-name" name="name" type="text" required autocomplete="name" ' +
                      'placeholder="Имя и фамилия" aria-describedby="e-name">' +
                    '<p class="field__error" id="e-name" hidden>Укажите, пожалуйста, имя.</p>' +
                  '</div>' +
                  '<div class="field" data-field="contact">' +
                    '<label class="field__label" for="f-contact">Телефон или e-mail <span class="field__req" aria-hidden="true">*</span></label>' +
                    '<input class="field__control" id="f-contact" name="contact" type="text" required ' +
                      'placeholder="+7 ___ ___-__-__" aria-describedby="e-contact">' +
                    '<p class="field__error" id="e-contact" hidden>Укажите телефон или e-mail для связи.</p>' +
                  '</div>' +
                '</div>' +

                '<div class="field" data-field="message">' +
                  '<label class="field__label" for="f-message">Вопрос (по желанию)</label>' +
                  '<textarea class="field__control" id="f-message" name="message" ' +
                    'placeholder="Коротко опишите, с чем нужна помощь"></textarea>' +
                '</div>' +

                '<button class="btn btn--light btn--wide" type="submit">Отправить заявку</button>' +

                '<p class="form__status" id="form-status" role="status" hidden></p>' +
              '</form>' +
            '</section>' +

            '<section aria-labelledby="svyaz-title">' +
              '<h2 id="svyaz-title">' + esc(FOOT.contactsTitle || 'Мы на связи') + '</h2>' +
              '<ul class="social">' + links + '</ul>' +

              '<hr class="divider" style="border-color:rgba(255,255,255,.2);background:rgba(255,255,255,.2)">' +

              '<h3 style="color:#fff">Разделы сайта</h3>' +
              '<ul class="footer__map">' + map + '</ul>' +
            '</section>' +

          '</div>' +

          '<div class="footer__bottom">' +
            '<span>' + esc(FOOT.bottomNote || '') + '</span>' +
            '<span><a href="/admin/" style="color:rgba(255,255,255,0.85);text-decoration:underline;">⚙️ Управление сайтом (Админка)</a></span>' +
            '<span>' + esc(SITE.title || '') + '</span>' +
          '</div>' +
        '</div>' +
      '</footer>'
    );
  }

  /* ------------------------ поведение ------------------------ */
  function initNav() {
    var nav = document.getElementById('site-nav');
    var toggle = document.getElementById('nav-toggle');
    if (!nav || !toggle) return;

    function close() {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) close();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 1140) close();
    });
  }

  function initA11y() {
    var panel = document.getElementById('a11y-panel');
    var toggle = document.getElementById('a11y-toggle');
    var fsButtons = Array.prototype.slice.call(document.querySelectorAll('[data-fs]'));
    var contrastBtn = document.getElementById('contrast-toggle');
    var resetBtn = document.getElementById('a11y-reset');
    if (!panel || !toggle) return;

    var prefs = readPrefs();

    function applyFontScale(scale) {
      document.documentElement.style.setProperty('--fs', scale);
      fsButtons.forEach(function (b) {
        b.setAttribute('aria-pressed', b.dataset.fs === String(scale) ? 'true' : 'false');
      });
    }

    function applyContrast(on) {
      document.body.classList.toggle('contrast', !!on);
      contrastBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }

    applyFontScale(prefs.fs || 1);
    applyContrast(prefs.contrast);

    toggle.addEventListener('click', function () {
      var open = panel.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    fsButtons.forEach(function (b) {
      b.addEventListener('click', function () {
        prefs.fs = parseFloat(b.dataset.fs);
        applyFontScale(prefs.fs);
        writePrefs(prefs);
      });
    });

    contrastBtn.addEventListener('click', function () {
      prefs.contrast = !document.body.classList.contains('contrast');
      applyContrast(prefs.contrast);
      writePrefs(prefs);
    });

    resetBtn.addEventListener('click', function () {
      prefs = { fs: 1, contrast: false };
      applyFontScale(1);
      applyContrast(false);
      writePrefs(prefs);
    });
  }

  function initForm() {
    var form = document.getElementById('consult-form');
    if (!form) return;
    var status = document.getElementById('form-status');

    function setError(name, on) {
      var wrap = form.querySelector('[data-field="' + name + '"]');
      if (!wrap) return;
      wrap.classList.toggle('field--error', on);
      var msg = wrap.querySelector('.field__error');
      if (msg) msg.hidden = !on;
      var input = wrap.querySelector('.field__control');
      if (input) input.setAttribute('aria-invalid', on ? 'true' : 'false');
    }

    ['spec', 'name', 'contact'].forEach(function (n) {
      var input = form.elements[n];
      if (input) {
        input.addEventListener('input', function () { setError(n, false); });
        input.addEventListener('change', function () { setError(n, false); });
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      var first = null;

      ['spec', 'name', 'contact'].forEach(function (n) {
        var input = form.elements[n];
        var bad = !input || !input.value.trim();
        setError(n, bad);
        if (bad) { ok = false; if (!first) first = input; }
      });

      if (!ok) {
        status.hidden = true;
        if (first) first.focus();
        return;
      }

      var spec = form.elements.spec.value;
      var who = form.elements.name.value.trim();
      status.hidden = false;
      status.innerHTML = '<span aria-hidden="true">✅</span><span>' + who +
        ', заявка принята. Специалист: ' + spec + '. С вами свяжутся по указанным контактам.</span>';
      form.reset();
      status.focus && status.focus();
    });
  }

  function initToTop() {
    var btn = el(
      '<button type="button" class="to-top" id="to-top">' +
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" ' +
          'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V6M6 12l6-6 6 6"/></svg>' +
        '<span class="visually-hidden">Наверх</span>' +
      '</button>'
    );
    document.body.appendChild(btn);

    btn.addEventListener('click', function () { scrollToY(0, true); });

    window.addEventListener('scroll', function () {
      btn.classList.toggle('is-visible', window.scrollY > 600);
    }, { passive: true });
  }

  /* ------------------------ запуск ------------------------ */
  function init() {
    var active = currentPage();

    if (!document.querySelector('.skip-link')) {
      var skip = el('<a class="skip-link" href="#main">Перейти к основному содержанию</a>');
      document.body.insertBefore(skip, document.body.firstChild);
    }
    if (!document.querySelector('.header')) {
      var ref = document.querySelector('.skip-link') ? document.querySelector('.skip-link').nextSibling : document.body.firstChild;
      document.body.insertBefore(buildHeader(active), ref);
    }
    if (!document.querySelector('.footer')) {
      document.body.appendChild(buildFooter(active));
    }

    initNav();
    initA11y();
    initForm();
    initToTop();

    if (window.location.hash) {
      var target = document.getElementById(window.location.hash.slice(1));
      if (target) {
        var jump = function () { scrollToY(offsetOf(target), false); };
        window.requestAnimationFrame(jump);
        window.addEventListener('load', function () { window.setTimeout(jump, 80); });
      }
    }

    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href="#zapis"]');
      if (!a) return;
      e.preventDefault();
      var target = document.getElementById('zapis');
      if (!target) return;
      scrollToY(offsetOf(target), true);
      window.setTimeout(function () {
        var f = document.getElementById('f-spec');
        if (f) f.focus({ preventScroll: true });
      }, 450);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
