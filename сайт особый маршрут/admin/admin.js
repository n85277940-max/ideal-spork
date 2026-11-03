/* =========================================================
   Админка: редактирует assets/data/content.js через сервер
   ========================================================= */
(function () {
  'use strict';

  var data = null;          // текущий контент
  var dirty = false;        // есть несохранённые правки
  var active = 'site';      // открытый раздел

  var $side = document.getElementById('side');
  var $work = document.getElementById('work');
  var $save = document.getElementById('save-btn');
  var $state = document.getElementById('save-state');
  var $toast = document.getElementById('toast');

  /* ----------------------- мелкие помощники ----------------------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function get(path) {
    if (!path) return data;
    return String(path).split('.').reduce(function (o, k) {
      return (o == null) ? o : o[k];
    }, data);
  }

  function set(path, value) {
    var keys = String(path).split('.');
    var last = keys.pop();
    var target = keys.reduce(function (o, k) {
      if (o[k] == null) o[k] = {};
      return o[k];
    }, data);
    target[last] = value;
  }

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function markDirty() {
    dirty = true;
    $save.disabled = false;
    $state.textContent = 'Есть несохранённые изменения';
    $state.className = 'save-state is-dirty';
  }

  var toastTimer = null;
  function toast(message, isError) {
    $toast.textContent = message;
    $toast.className = 'toast' + (isError ? ' toast--error' : '');
    $toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $toast.hidden = true; }, isError ? 6000 : 2600);
  }

  function bytes(n) {
    if (n < 1024) return n + ' Б';
    if (n < 1024 * 1024) return Math.round(n / 1024) + ' КБ';
    return (n / 1024 / 1024).toFixed(1) + ' МБ';
  }

  function isVideoFile(name) { return /\.(mp4|webm|ogv|mov|m4v)$/i.test(name || ''); }
  function isImageFile(name) { return /\.(jpe?g|png|gif|webp|avif|svg)$/i.test(name || ''); }

  /* ---------------------------- сервер ---------------------------- */
  function api(url, options) {
    return fetch(url, options).then(function (r) {
      return r.json().catch(function () {
        throw new Error('Сервер вернул неожиданный ответ');
      });
    }).then(function (j) {
      if (!j.ok) throw new Error(j.error || 'Неизвестная ошибка');
      return j;
    });
  }

  function upload(file, kind) {
    return api('/api/upload?kind=' + kind, {
      method: 'POST',
      headers: { 'X-Filename': encodeURIComponent(file.name) },
      body: file
    });
  }

  /* ======================= ОПИСАНИЕ РАЗДЕЛОВ ======================= */

  var methodFields = [
    { key: 'icon', label: 'Значок', type: 'text', cls: 'input--emoji', hint: 'Эмодзи, например 🧩' },
    { key: 'name', label: 'Название', type: 'text' },
    { key: 'desc', label: 'Описание', type: 'textarea' },
    { key: 'example', label: 'Пример', type: 'textarea', hint: 'Выводится с подписью «Пример:». Можно оставить пустым.' }
  ];

  function letterBlock(spec, who) {
    return {
      title: 'Обращение к родителям',
      path: 'specialists.' + spec + '.letter',
      fields: [
        { key: 'heading', label: 'Заголовок обращения', type: 'text' },
        { key: 'intro', label: 'Выделенная первая строка', type: 'text', hint: 'Необязательно. Показывается жирным.' },
        { key: 'paragraphs', label: 'Абзацы обращения', type: 'strings', multiline: true,
          placeholder: 'Текст абзаца' },
        { key: 'signOff', label: 'Подпись', type: 'text' },
        { key: 'signRole', label: 'Должность', type: 'text', hint: 'Например: ' + who }
      ]
    };
  }

  function specialistSection(spec, label, icon, who) {
    return {
      id: spec, label: label, icon: icon, group: 'Специалисты',
      title: label,
      lead: 'Обращение, фотографии, статьи в PDF и записи блога.',
      blocks: [
        {
          title: 'Заголовок страницы',
          path: 'specialists.' + spec,
          fields: [
            { key: 'eyebrow', label: 'Надпись над заголовком', type: 'text' },
            { key: 'title', label: 'Заголовок страницы', type: 'text',
              hint: 'Используется и в меню, и в ссылках с других страниц.' }
          ]
        },
        letterBlock(spec, who),
        {
          title: 'Галерея фото',
          path: 'specialists.' + spec,
          fields: [{
            key: 'photos', type: 'list', itemLabel: 'Фото',
            newItem: { file: '', title: '' },
            fields: [
              { key: 'file', label: 'Файл', type: 'image' },
              { key: 'title', label: 'Подпись', type: 'text' }
            ]
          }]
        },
        {
          title: 'Статьи в PDF',
          path: 'specialists.' + spec,
          fields: [{
            key: 'pdfs', type: 'list', itemLabel: 'Статья',
            newItem: { file: '', title: '' },
            fields: [
              { key: 'file', label: 'PDF-файл', type: 'pdf' },
              { key: 'title', label: 'Название статьи', type: 'text' }
            ]
          }]
        },
        {
          title: 'Блог: полезные советы',
          path: 'specialists.' + spec,
          fields: [{
            key: 'blog', type: 'list', itemLabel: 'Запись',
            newItem: { title: '', text: '' },
            fields: [
              { key: 'title', label: 'Заголовок', type: 'text' },
              { key: 'text', label: 'Текст', type: 'textarea',
                hint: 'Пустая строка между абзацами — новый абзац.' }
            ]
          }]
        }
      ]
    };
  }

  var SECTIONS = [
    {
      id: 'site', label: 'Общее', icon: '⚙️', group: 'Сайт',
      title: 'Общие настройки',
      lead: 'Название сайта, заголовок главной страницы и девиз.',
      blocks: [{
        title: 'Название и заголовки',
        path: 'site',
        fields: [
          { key: 'title', label: 'Название сайта', type: 'text' },
          { key: 'subtitle', label: 'Подпись в шапке', type: 'text' },
          { key: 'heroEyebrow', label: 'Надпись над заголовком главной', type: 'text' },
          { key: 'heroTitle', label: 'Заголовок главной страницы', type: 'textarea' },
          { key: 'mottoLabel', label: 'Подпись блока с девизом', type: 'text' },
          { key: 'motto', label: 'Девиз', type: 'textarea' }
        ]
      }, {
        title: 'Меню сайта',
        hint: 'Порядок пунктов меняется стрелками. Адрес страницы менять не нужно.',
        path: '',
        fields: [{
          key: 'nav', type: 'list', itemLabel: 'Пункт меню', titleKey: 'title',
          newItem: { href: 'index.html', title: 'Новый пункт' },
          fields: [
            { key: 'title', label: 'Название в меню', type: 'text' },
            { key: 'full', label: 'Полное название', type: 'text', hint: 'Для подвала и списка разделов. Необязательно.' },
            { key: 'href', label: 'Адрес страницы', type: 'text', cls: 'input--short' }
          ]
        }]
      }]
    },

    {
      id: 'home', label: 'Главная', icon: '🏠', group: 'Страницы',
      title: 'Главная страница',
      lead: 'Фото обучающихся, блок «О чём сайт» и памятка для родителей.',
      blocks: [
        {
          title: 'Главное фото',
          path: 'home.heroPhoto',
          fields: [
            { key: 'file', label: 'Фотография вверху страницы', type: 'image' },
            { key: 'alt', label: 'Описание фото', type: 'text', hint: 'Читают программы экранного доступа.' }
          ]
        },
        {
          title: 'Блок «Фото и про обучающихся»',
          path: 'home.students',
          fields: [
            { key: 'eyebrow', label: 'Надпись над заголовком', type: 'text' },
            { key: 'title', label: 'Заголовок блока', type: 'text' },
            { key: 'text', label: 'Текст про обучающихся', type: 'textarea', cls: 'textarea--tall',
              hint: 'Пустая строка между абзацами — новый абзац.' },
            { key: 'photos', label: 'Фотографии', type: 'list', itemLabel: 'Фото',
              newItem: { file: '', title: '' },
              fields: [
                { key: 'file', label: 'Файл', type: 'image' },
                { key: 'title', label: 'Подпись', type: 'text' }
              ] }
          ]
        },
        {
          title: 'Блок «О чём сайт»',
          path: 'home.about',
          fields: [
            { key: 'eyebrow', label: 'Надпись над заголовком', type: 'text' },
            { key: 'title', label: 'Заголовок блока', type: 'text' },
            { key: 'text', label: 'Текст о сайте', type: 'textarea', cls: 'textarea--tall' }
          ]
        },
        {
          title: 'Памятка для родителей',
          path: 'home.memo',
          fields: [
            { key: 'eyebrow', label: 'Надпись над заголовком', type: 'text' },
            { key: 'title', label: 'Заголовок памятки', type: 'text' },
            { key: 'intro', label: 'Вступление', type: 'textarea' },
            { key: 'items', label: 'Пункты памятки', type: 'list', itemLabel: 'Пункт',
              newItem: { emoji: '⭐', title: '', text: '' },
              fields: [
                { key: 'emoji', label: 'Значок', type: 'text', cls: 'input--emoji' },
                { key: 'title', label: 'Заголовок пункта', type: 'text' },
                { key: 'text', label: 'Текст', type: 'textarea' }
              ] }
          ]
        }
      ]
    },

    {
      id: 'methods', label: 'Методы и подходы', icon: '🧠', group: 'Страницы',
      title: 'Методы и подходы',
      lead: 'Три вкладки страницы: подходы, методы и примеры по специалистам.',
      blocks: [
        { title: 'Заголовок страницы', path: 'methods',
          fields: [{ key: 'title', label: 'Заголовок', type: 'text' }] },
        { title: 'Вкладка «Основные подходы»', path: 'methods.approaches',
          fields: [
            { key: 'tab', label: 'Название вкладки', type: 'text' },
            { key: 'items', label: 'Подходы', type: 'list', itemLabel: 'Подход', titleKey: 'name',
              newItem: { icon: '⭐', name: '', desc: '', example: '' }, fields: methodFields }
          ] },
        { title: 'Вкладка «Эффективные методы»', path: 'methods.effective',
          fields: [
            { key: 'tab', label: 'Название вкладки', type: 'text' },
            { key: 'items', label: 'Методы', type: 'list', itemLabel: 'Метод', titleKey: 'name',
              newItem: { icon: '⭐', name: '', desc: '', example: '' }, fields: methodFields }
          ] },
        { title: 'Вкладка «Примеры по специалистам»', path: 'methods.bySpecialist',
          fields: [
            { key: 'tab', label: 'Название вкладки', type: 'text' },
            { key: 'items', label: 'Специалисты', type: 'list', itemLabel: 'Специалист', titleKey: 'name',
              newItem: { icon: '⭐', name: '', desc: '', example: '', linkText: '', linkHref: '' },
              fields: methodFields.concat([
                { key: 'linkText', label: 'Текст кнопки', type: 'text', hint: 'Необязательно.' },
                { key: 'linkHref', label: 'Адрес кнопки', type: 'text', cls: 'input--short' }
              ]) }
          ] }
      ]
    },

    {
      id: 'resources', label: 'Полезные ресурсы', icon: '🧭', group: 'Страницы',
      title: 'Полезные ресурсы',
      lead: 'Информационный навигатор для родителей: ссылки и их группы.',
      blocks: [
        { title: 'Заголовки страницы', path: 'resources',
          fields: [
            { key: 'title', label: 'Заголовок', type: 'text' },
            { key: 'lead', label: 'Подзаголовок', type: 'text' },
            { key: 'note', label: 'Сноска внизу страницы', type: 'textarea' }
          ] },
        { title: 'Группы ресурсов',
          hint: 'Кнопки-фильтры над списком. Код группы указывается у каждой ссылки.',
          path: 'resources',
          fields: [{ key: 'kinds', type: 'list', itemLabel: 'Группа', titleKey: 'label',
            newItem: { id: '', label: '' },
            fields: [
              { key: 'label', label: 'Название кнопки', type: 'text' },
              { key: 'id', label: 'Код группы', type: 'text', cls: 'input--short',
                hint: 'Латиницей, без пробелов.' }
            ] }] },
        { title: 'Ссылки', path: 'resources',
          fields: [{ key: 'items', type: 'list', itemLabel: 'Ссылка',
            newItem: { icon: '🔗', title: '', url: '', kind: '' },
            fields: [
              { key: 'icon', label: 'Значок', type: 'text', cls: 'input--emoji' },
              { key: 'title', label: 'Название', type: 'text' },
              { key: 'url', label: 'Адрес (URL)', type: 'text' },
              { key: 'kind', label: 'Группа', type: 'select', optionsFrom: 'resources.kinds' }
            ] }] }
      ]
    },

    specialistSection('psiholog', 'Психолог', '💬', 'педагог-психолог'),
    specialistSection('logoped', 'Логопед', '🗣️', 'школьный логопед'),
    specialistSection('defektolog', 'Дефектолог', '📘', 'школьный дефектолог'),

    {
      id: 'workbooks', label: 'Рабочие тетради', icon: '📗', group: 'Страницы',
      title: 'Рабочие тетради',
      lead: 'Предметы и книги в формате PDF.',
      blocks: [
        { title: 'Заголовки страницы', path: 'workbooks',
          fields: [
            { key: 'title', label: 'Заголовок', type: 'text' },
            { key: 'lead', label: 'Подзаголовок', type: 'textarea' },
            { key: 'note', label: 'Пояснение в рамке', type: 'text' },
            { key: 'maxBooks', label: 'Максимум книг всего', type: 'number', cls: 'input--short' }
          ] },
        { title: 'Предметы и книги', path: 'workbooks',
          countBooks: true,
          fields: [{ key: 'subjects', type: 'list', itemLabel: 'Предмет',
            newItem: { icon: '📗', title: '', books: [] },
            fields: [
              { key: 'icon', label: 'Значок', type: 'text', cls: 'input--emoji' },
              { key: 'title', label: 'Название предмета', type: 'text' },
              { key: 'books', label: 'Книги PDF', type: 'list', itemLabel: 'Книга',
                newItem: { file: '', title: '' },
                fields: [
                  { key: 'file', label: 'PDF-файл', type: 'pdf' },
                  { key: 'title', label: 'Название книги', type: 'text' }
                ] }
            ] }] }
      ]
    },

    {
      id: 'gallery', label: 'Интересные моменты', icon: '📸', group: 'Страницы',
      title: 'Интересные моменты',
      lead: 'Фото и видео. Тип определяется автоматически по загруженному файлу.',
      blocks: [
        { title: 'Заголовки страницы', path: 'gallery',
          fields: [
            { key: 'title', label: 'Заголовок', type: 'text' },
            { key: 'lead', label: 'Подзаголовок', type: 'text' }
          ] },
        { title: 'Материалы', path: 'gallery',
          fields: [{ key: 'items', type: 'list', itemLabel: 'Материал',
            newItem: { kind: 'foto', file: '', title: '' },
            fields: [
              { key: 'file', label: 'Фото или видео', type: 'media' },
              { key: 'title', label: 'Подпись', type: 'text' }
            ] }] }
      ]
    },

    {
      id: 'reviews', label: 'Отзывы родителей', icon: '⭐', group: 'Страницы',
      title: 'Отзывы родителей',
      lead: 'Имя, дата и текст отзыва. На сайте сортируются по дате.',
      blocks: [
        { title: 'Заголовок страницы', path: 'reviews',
          fields: [{ key: 'title', label: 'Заголовок', type: 'text' }] },
        { title: 'Отзывы', path: 'reviews',
          fields: [{ key: 'items', type: 'list', itemLabel: 'Отзыв', titleKey: 'name',
            newItem: { name: '', date: '', text: '', rating: 5 },
            fields: [
              { key: 'name', label: 'Кто оставил отзыв', type: 'text' },
              { key: 'date', label: 'Дата', type: 'date', cls: 'input--short' },
              { key: 'rating', label: 'Звёзд (0–5)', type: 'number', min: 0, max: 5, cls: 'input--short' },
              { key: 'text', label: 'Текст отзыва', type: 'textarea' }
            ] }] }
      ]
    },

    {
      id: 'footer', label: 'Подвал и запись', icon: '📮', group: 'Сайт',
      title: 'Подвал сайта',
      lead: 'Форма записи на консультацию и ссылки на страницы специалистов.',
      blocks: [
        { title: 'Запись на консультацию', path: 'footer',
          fields: [
            { key: 'formTitle', label: 'Заголовок формы', type: 'text' },
            { key: 'formNote', label: 'Пояснение под заголовком', type: 'textarea' },
            { key: 'specialists', label: 'Специалисты в выпадающем списке', type: 'strings',
              placeholder: 'Например: Педагог-психолог' }
          ] },
        { title: 'Ссылки «Мы на связи»', path: 'footer',
          fields: [
            { key: 'contactsTitle', label: 'Заголовок блока', type: 'text' },
            { key: 'links', label: 'Ссылки', type: 'list', itemLabel: 'Ссылка', titleKey: 'label',
              newItem: { icon: '🔗', label: '', url: '', note: '' },
              fields: [
                { key: 'icon', label: 'Значок или буквы', type: 'text', cls: 'input--emoji' },
                { key: 'label', label: 'Название', type: 'text' },
                { key: 'url', label: 'Адрес (URL)', type: 'text' },
                { key: 'note', label: 'Пояснение мелким шрифтом', type: 'text' }
              ] },
            { key: 'bottomNote', label: 'Строка в самом низу', type: 'text' }
          ] }
      ]
    },

    { id: 'media', label: 'Медиатека', icon: '🗂', group: 'Файлы', custom: 'media',
      title: 'Медиатека', lead: 'Все загруженные файлы. Неиспользуемые можно удалить.' }
  ];

  /* ========================== ПОЛЯ ФОРМЫ ========================== */

  function fieldWrap(label, hint) {
    var w = el('div', 'field');
    if (label) w.appendChild(el('label', 'field__label', label));
    return w;
  }

  function addHint(wrap, hint) {
    if (hint) wrap.appendChild(el('p', 'field__hint', hint));
  }

  function textField(spec, path) {
    var wrap = fieldWrap(spec.label, spec.hint);
    var input;
    if (spec.type === 'textarea') {
      input = el('textarea', 'textarea ' + (spec.cls || ''));
    } else {
      input = el('input', 'input ' + (spec.cls || ''));
      input.type = spec.type === 'date' ? 'date' : (spec.type === 'number' ? 'number' : 'text');
      if (spec.min != null) input.min = spec.min;
      if (spec.max != null) input.max = spec.max;
    }
    if (spec.placeholder) input.placeholder = spec.placeholder;
    var value = get(path);
    input.value = (value == null ? '' : value);
    input.addEventListener('input', function () {
      set(path, spec.type === 'number' ? (input.value === '' ? '' : Number(input.value)) : input.value);
      markDirty();
    });
    wrap.appendChild(input);
    addHint(wrap, spec.hint);
    return wrap;
  }

  function selectField(spec, path) {
    var wrap = fieldWrap(spec.label, spec.hint);
    var sel = el('select', 'select');
    var options = [];
    if (spec.optionsFrom) {
      options = (get(spec.optionsFrom) || []).map(function (o) {
        return { value: o.id, label: o.label || o.id };
      });
    } else {
      options = (spec.options || []).slice();
    }
    sel.appendChild(new Option('— не выбрано —', ''));
    options.forEach(function (o) { sel.appendChild(new Option(o.label, o.value)); });
    sel.value = get(path) || '';
    sel.addEventListener('change', function () { set(path, sel.value); markDirty(); });
    wrap.appendChild(sel);
    addHint(wrap, spec.hint);
    return wrap;
  }

  /* ---------------------- поле с файлом ---------------------- */
  var ACCEPT = {
    image: 'image/*',
    video: 'video/*',
    pdf: 'application/pdf',
    media: 'image/*,video/*'
  };

  function mediaField(spec, path, onUploaded) {
    var wrap = fieldWrap(spec.label, spec.hint);
    var box = el('div', 'media');
    var preview = el('div', 'media__preview');
    var side = el('div', 'media__side');
    var name = el('p', 'media__name');
    var tools = el('div', 'media__tools');

    var input = el('input', 'file-input');
    input.type = 'file';
    input.accept = ACCEPT[spec.type] || '*/*';

    var pickBtn = el('button', 'btn btn--sm', 'Загрузить файл');
    pickBtn.type = 'button';
    var clearBtn = el('button', 'btn btn--sm btn--danger', 'Убрать');
    clearBtn.type = 'button';

    function draw() {
      var file = get(path) || '';
      preview.innerHTML = '';
      if (!file) {
        preview.appendChild(el('span', '', 'Файл не выбран'));
        name.textContent = '';
        clearBtn.hidden = true;
        return;
      }
      clearBtn.hidden = false;
      name.textContent = file;
      var src = '/' + file.replace(/^\/+/, '');
      if (isImageFile(file)) {
        var img = el('img'); img.src = src; img.alt = ''; preview.appendChild(img);
      } else if (isVideoFile(file)) {
        var v = el('video'); v.src = src; v.muted = true; v.controls = false; preview.appendChild(v);
      } else {
        var link = el('a', '', '📄 Открыть PDF');
        link.href = src; link.target = '_blank'; link.rel = 'noopener';
        preview.appendChild(link);
      }
    }

    pickBtn.addEventListener('click', function () { input.click(); });

    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;
      var kind = spec.type;
      if (kind === 'media') kind = isVideoFile(file.name) ? 'video' : 'image';

      pickBtn.disabled = true;
      pickBtn.textContent = 'Загружаем…';
      upload(file, kind).then(function (res) {
        set(path, res.file);
        if (onUploaded) onUploaded(res.file);
        markDirty();
        draw();
        toast('Файл загружен: ' + res.file);
      }).catch(function (e) {
        toast(e.message, true);
      }).finally(function () {
        pickBtn.disabled = false;
        pickBtn.textContent = 'Загрузить файл';
        input.value = '';
      });
    });

    clearBtn.addEventListener('click', function () {
      set(path, '');
      markDirty();
      draw();
    });

    tools.appendChild(pickBtn);
    tools.appendChild(clearBtn);
    side.appendChild(name);
    side.appendChild(tools);
    box.appendChild(preview);
    box.appendChild(side);
    wrap.appendChild(box);
    wrap.appendChild(input);
    addHint(wrap, spec.hint);
    draw();
    return wrap;
  }

  /* ---------------------- список строк ---------------------- */
  function stringsField(spec, path, rerender) {
    var wrap = fieldWrap(spec.label, spec.hint);
    var list = el('div', 'list');
    var values = get(path) || [];

    values.forEach(function (value, i) {
      var item = el('div', 'item');
      var bar = el('div', 'item__bar');
      bar.appendChild(el('span', 'item__num', String(i + 1)));
      var tools = el('div', 'item__tools');
      tools.appendChild(moveBtn('↑', i === 0, function () { swap(values, i, i - 1); rerender(); }));
      tools.appendChild(moveBtn('↓', i === values.length - 1, function () { swap(values, i, i + 1); rerender(); }));
      tools.appendChild(moveBtn('✕', false, function () { values.splice(i, 1); rerender(); }, true));
      bar.appendChild(tools);
      item.appendChild(bar);

      var input = spec.multiline ? el('textarea', 'textarea') : el('input', 'input');
      if (!spec.multiline) input.type = 'text';
      if (spec.placeholder) input.placeholder = spec.placeholder;
      input.value = value == null ? '' : value;
      input.addEventListener('input', function () { values[i] = input.value; markDirty(); });
      item.appendChild(input);
      list.appendChild(item);
    });

    if (!values.length) list.appendChild(el('div', 'list__empty', 'Пока пусто'));

    var add = el('button', 'btn btn--ghost btn--sm list__add', '+ Добавить');
    add.type = 'button';
    add.addEventListener('click', function () {
      if (!Array.isArray(get(path))) set(path, []);
      get(path).push('');
      markDirty();
      rerender();
    });

    wrap.appendChild(list);
    wrap.appendChild(add);
    addHint(wrap, spec.hint);
    return wrap;
  }

  function swap(arr, a, b) {
    var t = arr[a]; arr[a] = arr[b]; arr[b] = t;
    markDirty();
  }

  function moveBtn(label, disabled, onClick, danger) {
    var b = el('button', 'icon-btn' + (danger ? ' icon-btn--danger' : ''), label);
    b.type = 'button';
    b.disabled = !!disabled;
    b.title = label === '↑' ? 'Выше' : label === '↓' ? 'Ниже' : 'Удалить';
    b.addEventListener('click', onClick);
    return b;
  }

  /* ---------------------- список объектов ---------------------- */
  function listField(spec, path, rerender) {
    var wrap = fieldWrap(spec.label, null);
    var items = get(path);
    if (!Array.isArray(items)) { items = []; set(path, items); }

    var list = el('div', 'list');

    items.forEach(function (item, i) {
      var card = el('div', 'item');
      var bar = el('div', 'item__bar');
      bar.appendChild(el('span', 'item__num', String(i + 1)));

      var titleKey = spec.titleKey || 'title';
      var caption = item[titleKey] || item.label || item.name || '';
      bar.appendChild(el('span', 'item__name', caption || (spec.itemLabel || 'Элемент')));

      var tools = el('div', 'item__tools');
      tools.appendChild(moveBtn('↑', i === 0, function () { swap(items, i, i - 1); rerender(); }));
      tools.appendChild(moveBtn('↓', i === items.length - 1, function () { swap(items, i, i + 1); rerender(); }));
      tools.appendChild(moveBtn('✕', false, function () {
        if (!confirm('Удалить «' + (caption || spec.itemLabel) + '»? Файлы останутся в медиатеке.')) return;
        items.splice(i, 1);
        markDirty();
        rerender();
      }, true));
      bar.appendChild(tools);
      card.appendChild(bar);

      renderFields(card, spec.fields, path + '.' + i, rerender, item);
      list.appendChild(card);
    });

    if (!items.length) {
      list.appendChild(el('div', 'list__empty', 'Пока пусто — нажмите «Добавить».'));
    }

    var add = el('button', 'btn btn--ghost btn--sm list__add', '+ Добавить ' + ((spec.itemLabel || 'элемент').toLowerCase()));
    add.type = 'button';
    add.addEventListener('click', function () {
      items.push(clone(spec.newItem || {}));
      markDirty();
      rerender();
    });

    wrap.appendChild(list);
    wrap.appendChild(add);
    return wrap;
  }

  /* ---------------------- сборка полей ---------------------- */
  function renderFields(container, fields, basePath, rerender, ownerItem) {
    (fields || []).forEach(function (spec) {
      var path = basePath ? basePath + '.' + spec.key : spec.key;
      var node;

      if (spec.type === 'list') node = listField(spec, path, rerender);
      else if (spec.type === 'strings') node = stringsField(spec, path, rerender);
      else if (spec.type === 'select') node = selectField(spec, path);
      else if (spec.type === 'image' || spec.type === 'video' || spec.type === 'pdf' || spec.type === 'media') {
        node = mediaField(spec, path, function (file) {
          if (ownerItem && 'kind' in ownerItem) {
            ownerItem.kind = isVideoFile(file) ? 'video' : 'foto';
          }
        });
      } else node = textField(spec, path);

      container.appendChild(node);
    });
  }

  /* ========================== МЕДИАТЕКА ========================== */
  function usedFiles() {
    var used = new Set();
    JSON.stringify(data).replace(/"(media\/[^"]+)"/g, function (_, f) { used.add(f); return _; });
    return used;
  }

  function renderMedia(root) {
    var box = el('div', 'block');
    box.appendChild(el('h2', 'block__title', 'Загруженные файлы'));
    box.appendChild(el('p', 'block__hint', 'Файл считается используемым, если на него ссылается какой-нибудь раздел сайта.'));
    var grid = el('div', 'mediagrid');
    box.appendChild(grid);
    root.appendChild(box);

    api('/api/media').then(function (res) {
      var used = usedFiles();
      if (!res.files.length) {
        grid.appendChild(el('p', 'list__empty', 'Файлы ещё не загружались.'));
        return;
      }
      res.files.forEach(function (f) {
        var card = el('div', 'mediacard');
        var thumb = el('div', 'mediacard__thumb');
        var src = '/' + f.file.replace(/^\/+/, '');
        if (isImageFile(f.file)) { var i = el('img'); i.src = src; i.alt = ''; thumb.appendChild(i); }
        else if (isVideoFile(f.file)) { var v = el('video'); v.src = src; v.muted = true; thumb.appendChild(v); }
        else thumb.appendChild(el('span', '', '📄'));
        card.appendChild(thumb);

        var body = el('div', 'mediacard__body');
        var link = el('a', 'mediacard__name', f.file.replace('media/', ''));
        link.href = src; link.target = '_blank'; link.rel = 'noopener';
        body.appendChild(link);

        var meta = el('p', 'mediacard__meta');
        var isUsed = used.has(f.file);
        var tag = el('span', 'tag ' + (isUsed ? 'tag--used' : 'tag--free'), isUsed ? 'используется' : 'не используется');
        meta.appendChild(tag);
        meta.appendChild(document.createTextNode(' ' + bytes(f.size)));
        body.appendChild(meta);

        var del = el('button', 'btn btn--sm btn--danger', 'Удалить файл');
        del.type = 'button';
        del.addEventListener('click', function () {
          if (isUsed && !confirm('Этот файл используется на сайте. Всё равно удалить?')) return;
          if (!isUsed && !confirm('Удалить файл ' + f.file + '?')) return;
          api('/api/delete-media', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file: f.file })
          }).then(function () {
            toast('Файл удалён');
            renderSection();
          }).catch(function (e) { toast(e.message, true); });
        });
        body.appendChild(del);

        card.appendChild(body);
        grid.appendChild(card);
      });
    }).catch(function (e) {
      grid.appendChild(el('p', 'list__empty', 'Не удалось получить список файлов: ' + e.message));
    });
  }

  /* ========================== ОТРИСОВКА ========================== */
  function renderSide() {
    $side.innerHTML = '';
    var groups = {};
    var order = [];
    SECTIONS.forEach(function (s) {
      var g = s.group || 'Разделы';
      if (!groups[g]) { groups[g] = []; order.push(g); }
      groups[g].push(s);
    });

    order.forEach(function (g) {
      var box = el('div', 'side__group');
      box.appendChild(el('p', 'side__caption', g));
      groups[g].forEach(function (s) {
        var b = el('button', 'side__link' + (s.id === active ? ' is-active' : ''));
        b.type = 'button';
        b.appendChild(el('span', 'side__ico', s.icon));
        b.appendChild(el('span', '', s.label));
        b.addEventListener('click', function () {
          active = s.id;
          renderSide();
          renderSection();
          $work.scrollIntoView({ block: 'start' });
        });
        box.appendChild(b);
      });
      $side.appendChild(box);
    });
  }

  function renderSection() {
    var section = SECTIONS.filter(function (s) { return s.id === active; })[0];
    if (!section) return;

    $work.innerHTML = '';
    var head = el('div', 'work__head');
    head.appendChild(el('h1', '', section.title));
    if (section.lead) head.appendChild(el('p', '', section.lead));
    $work.appendChild(head);

    if (section.custom === 'media') { renderMedia($work); return; }

    (section.blocks || []).forEach(function (block) {
      var box = el('div', 'block');
      box.appendChild(el('h2', 'block__title', block.title));
      if (block.hint) box.appendChild(el('p', 'block__hint', block.hint));

      renderFields(box, block.fields, block.path, renderSection);

      if (block.countBooks) {
        var subjects = get('workbooks.subjects') || [];
        var total = subjects.reduce(function (n, s) { return n + ((s.books || []).length); }, 0);
        var max = Number(get('workbooks.maxBooks')) || 0;
        var line = el('p', 'list__limit' + (max && total > max ? ' is-over' : ''),
          'Всего книг: ' + total + (max ? ' из ' + max : ''));
        box.appendChild(line);
      }

      $work.appendChild(box);
    });
  }

  /* =========================== СОХРАНЕНИЕ =========================== */
  function save() {
    $save.disabled = true;
    $state.textContent = 'Сохраняем…';
    $state.className = 'save-state';

    api('/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (res) {
      dirty = false;
      $state.textContent = 'Сохранено в ' + res.savedAt;
      $state.className = 'save-state is-saved';
      toast('Изменения сохранены. Обновите страницу сайта, чтобы увидеть их.');
    }).catch(function (e) {
      $save.disabled = false;
      $state.textContent = 'Не сохранено';
      $state.className = 'save-state is-dirty';
      toast('Ошибка сохранения: ' + e.message, true);
    });
  }

  $save.addEventListener('click', save);

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (dirty) save();
    }
  });

  window.addEventListener('beforeunload', function (e) {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });

  /* ============================ СТАРТ ============================ */
  api('/api/content').then(function (res) {
    data = res.content;
    var nameEl = document.getElementById('site-name');
    if (nameEl) nameEl.textContent = (data.site && data.site.title) || '';
    $state.textContent = 'Всё сохранено';
    $state.className = 'save-state is-saved';
    renderSide();
    renderSection();
  }).catch(function (e) {
    $work.innerHTML = '';
    var p = el('p', 'notice');
    p.textContent = 'Не удалось загрузить контент: ' + e.message;
    $work.appendChild(p);
    $state.textContent = 'Ошибка';
  });
})();
