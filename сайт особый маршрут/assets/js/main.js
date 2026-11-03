/* =========================================================
   Интерактив страниц: вкладки, аккордеон, фильтры галереи,
   просмотр галереи и счётчики слотов.
   ========================================================= */
(function () {
  'use strict';

  /* --------------------------- Вкладки --------------------------- */
  function initTabs() {
    var lists = document.querySelectorAll('[role="tablist"]');

    Array.prototype.forEach.call(lists, function (list) {
      var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
      if (!tabs.length) return;

      function select(tab, focus) {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute('aria-selected', on ? 'true' : 'false');
          t.tabIndex = on ? 0 : -1;
          var panel = document.getElementById(t.getAttribute('aria-controls'));
          if (panel) panel.hidden = !on;
        });
        if (focus) tab.focus();
        if (tab.id) {
          try {
            history.replaceState(null, '', '#' + tab.id);
          } catch (e) { /* file:// */ }
        }
      }

      tabs.forEach(function (tab) {
        tab.addEventListener('click', function () { select(tab, false); });

        tab.addEventListener('keydown', function (e) {
          var i = tabs.indexOf(tab);
          var next = null;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = tabs[(i + 1) % tabs.length];
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = tabs[(i - 1 + tabs.length) % tabs.length];
          else if (e.key === 'Home') next = tabs[0];
          else if (e.key === 'End') next = tabs[tabs.length - 1];
          if (next) { e.preventDefault(); select(next, true); }
        });
      });

      var fromHash = window.location.hash ? document.getElementById(window.location.hash.slice(1)) : null;
      var initial = (fromHash && tabs.indexOf(fromHash) !== -1) ? fromHash : tabs[0];
      tabs.forEach(function (t) {
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = t !== initial;
        t.setAttribute('aria-selected', t === initial ? 'true' : 'false');
        t.tabIndex = t === initial ? 0 : -1;
      });
    });

    document.addEventListener('click', function (e) {
      var link = e.target.closest('[data-open-tab]');
      if (!link) return;
      var tab = document.getElementById(link.dataset.openTab);
      if (!tab) return;
      e.preventDefault();
      tab.click();
      tab.scrollIntoView({ behavior: 'smooth', block: 'center' });
      tab.focus({ preventScroll: true });
    });
  }

  /* -------------------------- Аккордеон -------------------------- */
  function initAccordions() {
    var buttons = document.querySelectorAll('.acc__btn');

    Array.prototype.forEach.call(buttons, function (btn) {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (!panel) return;
      panel.hidden = btn.getAttribute('aria-expanded') !== 'true';

      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        panel.hidden = open;
      });
    });

    var all = document.querySelectorAll('[data-acc-all]');
    Array.prototype.forEach.call(all, function (ctrl) {
      ctrl.addEventListener('click', function () {
        var scope = document.getElementById(ctrl.dataset.accAll);
        if (!scope) return;
        var expand = ctrl.dataset.state !== 'open';
        Array.prototype.forEach.call(scope.querySelectorAll('.acc__btn'), function (b) {
          b.setAttribute('aria-expanded', expand ? 'true' : 'false');
          var p = document.getElementById(b.getAttribute('aria-controls'));
          if (p) p.hidden = !expand;
        });
        ctrl.dataset.state = expand ? 'open' : 'closed';
        ctrl.textContent = expand ? 'Свернуть все' : 'Развернуть все';
      });
    });
  }

  /* ----------------------- Фильтры галереи ----------------------- */
  function initFilters() {
    var groups = document.querySelectorAll('[data-filter-group]');

    Array.prototype.forEach.call(groups, function (group) {
      var target = document.getElementById(group.dataset.filterGroup);
      if (!target) return;
      var chips = Array.prototype.slice.call(group.querySelectorAll('[data-filter]'));
      var items = Array.prototype.slice.call(target.children);
      var counter = group.querySelector('[data-filter-count]') ||
                    document.querySelector('[data-filter-count="' + group.dataset.filterGroup + '"]');

      function apply(value) {
        var shown = 0;
        items.forEach(function (item) {
          var ok = value === 'all' || item.dataset.kind === value;
          item.hidden = !ok;
          if (ok) shown++;
        });
        chips.forEach(function (c) {
          c.setAttribute('aria-pressed', c.dataset.filter === value ? 'true' : 'false');
        });
        if (counter) counter.textContent = String(shown);
      }

      chips.forEach(function (c) {
        c.addEventListener('click', function () { apply(c.dataset.filter); });
      });

      apply('all');
    });
  }

  /* -------------------------- Просмотр --------------------------- */
  function initLightbox() {
    var triggers = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox]'));
    if (!triggers.length) return;

    var box = document.createElement('div');
    box.className = 'lightbox';
    box.hidden = true;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Просмотр материала');
    box.innerHTML =
      '<div class="lightbox__box">' +
        '<button type="button" class="lightbox__close" aria-label="Закрыть просмотр">✕</button>' +
        '<div class="lightbox__stage" data-lb-stage></div>' +
        '<h3 data-lb-title style="margin-bottom:.3em"></h3>' +
        '<p data-lb-note style="color:var(--ink-3)"></p>' +
        '<div class="lightbox__nav">' +
          '<button type="button" class="btn btn--ghost" data-lb-prev>← Предыдущий</button>' +
          '<button type="button" class="btn btn--ghost" data-lb-next>Следующий →</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(box);

    var stage = box.querySelector('[data-lb-stage]');
    var title = box.querySelector('[data-lb-title]');
    var note = box.querySelector('[data-lb-note]');
    var closeBtn = box.querySelector('.lightbox__close');
    var prevBtn = box.querySelector('[data-lb-prev]');
    var nextBtn = box.querySelector('[data-lb-next]');

    var index = 0;
    var lastFocused = null;

    function visible() {
      return triggers.filter(function (t) {
        var item = t.closest('[data-kind]') || t;
        return !item.hidden && t.offsetParent !== null;
      });
    }

    function show(list, i) {
      if (!list.length) return;
      index = (i + list.length) % list.length;
      var t = list[index];
      var kind = t.dataset.lightbox || 'Материал';
      var src = t.dataset.src || '';

      var playing = stage.querySelector('video');
      if (playing) playing.pause();

      if (src && kind === 'Видео') {
        stage.className = 'lightbox__stage lightbox__stage--media';
        stage.innerHTML = '<video src="' + src.replace(/"/g, '&quot;') + '" controls autoplay playsinline></video>';
      } else if (src) {
        stage.className = 'lightbox__stage lightbox__stage--media';
        stage.innerHTML = '<img src="' + src.replace(/"/g, '&quot;') + '" alt="">';
      } else {
        stage.className = 'lightbox__stage';
        stage.innerHTML = '<span style="font-size:2.4rem" aria-hidden="true">' +
          (kind === 'Видео' ? '🎬' : '🖼️') + '</span><span>Файл не загружен</span>';
      }

      title.textContent = t.dataset.title || '';
      note.textContent = t.dataset.note || '';
      note.hidden = !note.textContent;

      var many = list.length > 1;
      prevBtn.hidden = !many;
      nextBtn.hidden = !many;
    }

    function open(t) {
      var list = visible();
      lastFocused = document.activeElement;
      box.hidden = false;
      show(list, list.indexOf(t));
      closeBtn.focus();
      document.body.style.overflow = 'hidden';
    }

    function close() {
      var playing = stage.querySelector('video');
      if (playing) playing.pause();
      stage.innerHTML = '';
      box.hidden = true;
      document.body.style.overflow = '';
      if (lastFocused) lastFocused.focus();
    }

    triggers.forEach(function (t) {
      t.addEventListener('click', function () { open(t); });
    });

    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', function () { show(visible(), index - 1); });
    nextBtn.addEventListener('click', function () { show(visible(), index + 1); });

    box.addEventListener('click', function (e) { if (e.target === box) close(); });

    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') show(visible(), index + 1);
      else if (e.key === 'ArrowLeft') show(visible(), index - 1);
      else if (e.key === 'Tab') {
        var focusable = Array.prototype.slice.call(
          box.querySelectorAll('button:not([hidden])')
        );
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  function initSlots() {
    var holders = document.querySelectorAll('[data-slots]');

    Array.prototype.forEach.call(holders, function (holder) {
      var count = parseInt(holder.dataset.slots, 10) || 0;
      var label = holder.dataset.slotLabel || 'PDF';
      var html = '';
      for (var i = 1; i <= count; i++) {
        html +=
          '<div class="pdf-slot">' +
            '<span class="pdf-slot__icon" aria-hidden="true">PDF</span>' +
            '<span class="pdf-slot__num">' + label + ' № ' + i + '</span>' +
            '<p class="pdf-slot__hint">Слот свободен — файл добавляется при наполнении сайта.</p>' +
          '</div>';
      }
      holder.innerHTML = html;
    });
  }

  function init() {
    initSlots();
    initTabs();
    initAccordions();
    initFilters();
    initLightbox();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
