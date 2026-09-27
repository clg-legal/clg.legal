# Блог Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перенести блог с WordPress на Hugo: `/blog/` (лента), `/category/<latin-slug>/` (категории с латинскими URL и кириллическими названиями), `/blog/<latin-slug>/` (статьи с Markdown-телом, картинками из bundle и повторно используемым шорткодом формы), с related posts и общим футером сайта.

**Architecture:** Категории — Hugo taxonomy `category` (front-matter поле `category`, URL-сегмент `category`), с content-страницами `content/category/<slug>/_index.md` для кириллического `.Title`. Статьи — leaf bundles `content/blog/<slug>/index.md` + картинки рядом. Общие визуальные блоки — новые partial-компоненты (`page-hero`, `post-hero`, `post-card`, `pagination`, `related-posts`) в том же стиле, что и остальной сайт (mobile-first SCSS, `respond-up` миксин, `$color-primary`). Форма внутри статьи — шорткод `{{< contact-form >}}`, переиспользующий уже существующий `contact-panel.html` (создан для `/contacts/`).

**Tech Stack:** Hugo Extended 0.148.2, Hugo Pipes (`css.Sass`, `js.Build`), ванильный JS, без npm/тест-раннера.

**Spec:** `docs/superpowers/specs/2026-09-28-blog-design.md`

## Global Constraints

- URL категорий и статей — только латиница (пользовательское требование); отображаемые названия (`.Title`) — кириллица.
- Одна категория на статью (`category: ["<slug>"]` — список из одного элемента, для совместимости с Hugo taxonomy front matter).
- Каждая статья — leaf bundle (`content/blog/<slug>/index.md`), картинки — page resources рядом с `index.md`, не в `/static/`.
- Автор — редактируемое поле `author` во front matter, у существующих постов значение `"CONCORDIS LEGAL GROUP"`.
- Форма в статье — только через шорткод `{{< contact-form >}}` без параметров; должен работать при многократном использовании на одной странице (уникальные `id`/`for`).
- `related-posts.html` не рендерит вообще ничего (ни заголовка, ни пустого блока), если родственных постов нет.
- Не переопределять блок `footer` ни в одном новом layout — общий футер сайта должен появляться на `/blog/`, `/category/<slug>/` и в статьях.
- Никакого image-resize пайплайна в этой итерации — оригинал + `object-fit: cover`.
- Существующие страницы (home, contacts, service-страницы), использующие `cases-cta.html`/`contact-panel.html`/`cases-cta.js`, должны остаться визуально и функционально без изменений (регрессия проверяется build+grep на каждом шаге, где это применимо).
- Нет тестового фреймворка/линтера в проекте (см. `CLAUDE.md`) — "тестами" служат `hugo --minify` без предупреждений и точечные `grep`-проверки собранного `public/`, как это уже делалось в этой сессии для `/contacts/`.

## Review Focus

- **Статья с двумя шорткодами формы на одной странице** — оба экземпляра должны иметь уникальные `id`/`for` (иначе невалидный HTML и второй `<label for>` не будет работать) и оба должны валидироваться JS при сабмите (не только первый).
- **Пост без родственных постов в своей категории** (в этом плане это `kryminalne-provadzhennia-klyuchovi-pozytsii` — единственный в категории `kryminalne-provadzhennya`) — секция "Пов'язані записи" должна отсутствовать в HTML полностью, а не рендериться пустой.
- **Категория без постов** (в процессе миграции, до Task 8, категория `tsyvilni-spory` формально существует, но постов в ней ещё 0) — `/category/tsyvilni-spory/` должна собираться без падения и показывать пустое состояние, а не паниковать на пустом `.Pages`.
- **Статья без картинки** (front matter без `image` или файл не найден через `.Resources.GetMatch`) — `post-hero`/`post-card` не должны падать с ошибкой шаблона; секция рендерится с плейн-фоном/без `<img>`.
- **Повторный вызов существующих партиалов** (`cases-cta.html` на home/service-страницах, `contact-cta.html` на `/contacts/`) после правки `contact-panel.html` (добавление `idPrefix`) — должны рендерить **byte-identical** `id`/`for` атрибуты, что и до правки (дефолт `idPrefix = "cases"`).

---

## Task 1: Таксономия категорий + content-страницы + partial для имени категории

**Files:**
- Modify: `hugo.toml`
- Create: `content/category/tsyvilni-spory/_index.md`
- Create: `content/category/kryminalne-provadzhennya/_index.md`
- Create: `layouts/partials/category-name.html`

**Interfaces:**
- Produces: partial `category-name.html`, вызывается как `{{ partial "category-name.html" $slug }}` (строка-слаг), возвращает кириллическое `.Title` категории или сам слаг, если страница термина не найдена.

- [ ] **Step 1: Поменять `hugo.toml`**

```toml
disableKinds = ["taxonomy"]

[taxonomies]
  category = "category"

[pagination]
  pagerSize = 9
```

Заменить существующие строки:
```toml
disableKinds = ["taxonomy", "term"]

[taxonomies]
```
на блок выше (`disableKinds` теперь без `"term"`, добавлена `[taxonomies] category = "category"` и новый `[pagination]`).

- [ ] **Step 2: Создать content-страницы категорий**

`content/category/tsyvilni-spory/_index.md`:
```yaml
---
title: "Цивільні спори"
seo:
  title: "Цивільні спори – Блог Concordis Legal Group"
  description: "Статті та роз'яснення Concordis Legal Group у категорії «Цивільні спори»."
  robots: "index, follow"
---
```

`content/category/kryminalne-provadzhennya/_index.md`:
```yaml
---
title: "Кримінальне провадження"
seo:
  title: "Кримінальне провадження – Блог Concordis Legal Group"
  description: "Статті та роз'яснення Concordis Legal Group у категорії «Кримінальне провадження»."
  robots: "index, follow"
---
```

- [ ] **Step 3: Создать `layouts/partials/category-name.html`**

```html
{{ $slug := . }}
{{ $term := site.GetPage (printf "/category/%s" $slug) }}
{{ if $term }}{{ $term.Title }}{{ else }}{{ $slug }}{{ end }}
```

- [ ] **Step 4: Собрать и проверить**

```bash
rm -rf public resources
hugo --minify
```
Ожидаем: без предупреждений. Затем:
```bash
test -f public/category/tsyvilni-spory/index.html && echo OK1
test -f public/category/kryminalne-provadzhennya/index.html && echo OK2
grep -o 'Цивільні спори' public/category/tsyvilni-spory/index.html | head -1
```
Ожидаем: `OK1`, `OK2`, и что заголовок термина ("Цивільні спори") где-то встречается в собранном HTML (даже если сейчас это дефолтный layout Hugo, а не наш дизайн — дизайн подключаем в Task 7).

- [ ] **Step 5: Commit**

```bash
git add hugo.toml content/category layouts/partials/category-name.html
git commit -m "feat(blog): add category taxonomy with latin slugs and cyrillic titles"
```

---

## Task 2: `contact-panel.html` — параметр `idPrefix`

**Files:**
- Modify: `layouts/partials/contact-panel.html`

**Interfaces:**
- Consumes: dict-параметры `.form`, `.titleId` (опц., default `"cases-cta-form-title"`), `.panelId` (опц.), **новый** `.idPrefix` (опц., default `"cases"`).
- Produces: рендерит `id`/`for` атрибуты полей формы как `{{ $idPrefix }}-name`, `{{ $idPrefix }}-phone`, `{{ $idPrefix }}-person-type` вместо захардкоженных `cases-name`/`cases-phone`/`cases-person-type`. При дефолтном `idPrefix = "cases"` вывод идентичен текущему.

- [ ] **Step 1: Переписать `layouts/partials/contact-panel.html`**

```html
{{ $form := .form }}
{{ $titleId := .titleId | default "cases-cta-form-title" }}
{{ $idPrefix := .idPrefix | default "cases" }}
<div class="cases-cta__panel"{{ with .panelId }} id="{{ . }}"{{ end }}>
  <div class="cases-cta__panel-content">
    <h2 class="cases-cta__panel-title" id="{{ $titleId }}">
      {{ range $form.titleLines }}
      <span class="cases-cta__panel-title-line">{{ . }}</span>
      {{ end }}
    </h2>

    <p class="cases-cta__panel-lead">{{ $form.lead }}</p>

    <div class="cases-cta__social">
      <p class="cases-cta__social-text">
        {{ range $form.social.titleLines }}
        <span class="cases-cta__social-text-line">{{ . }}</span>
        {{ end }}
      </p>

      <div class="cases-cta__social-links">
        <a
          class="cases-cta__social-link"
          href="{{ $form.social.whatsappUrl }}"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp"
        >
          <img
            src="{{ $form.social.whatsappIcon | relURL }}"
            width="62"
            height="62"
            alt=""
            decoding="async"
          />
        </a>
        <a
          class="cases-cta__social-link"
          href="{{ $form.social.telegramUrl }}"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Telegram"
        >
          <img
            src="{{ $form.social.telegramIcon | relURL }}"
            width="62"
            height="62"
            alt=""
            decoding="async"
          />
        </a>
      </div>
    </div>
  </div>

  <form
    class="cases-cta__form"
    action="#"
    method="post"
    data-cases-form
    novalidate
  >
    <div class="cases-cta__field">
      <label class="visually-hidden" for="{{ $idPrefix }}-name"
        >{{ $form.namePlaceholder }}</label
      >
      <input
        class="cases-cta__input"
        id="{{ $idPrefix }}-name"
        type="text"
        name="name"
        placeholder="{{ $form.namePlaceholder }}"
        autocomplete="name"
        required
      />
    </div>

    <div class="cases-cta__field cases-cta__field--phone">
      <label class="visually-hidden" for="{{ $idPrefix }}-phone"
        >Номер телефону</label
      >
      <span class="cases-cta__phone-prefix" aria-hidden="true">+38</span>
      <input
        class="cases-cta__input cases-cta__input--phone"
        id="{{ $idPrefix }}-phone"
        type="tel"
        name="phone"
        inputmode="tel"
        autocomplete="tel"
        placeholder="{{ $form.phonePlaceholder }}"
        required
      />
    </div>

    <div class="cases-cta__field">
      <label class="visually-hidden" for="{{ $idPrefix }}-person-type"
        >Тип особи</label
      >
      <select
        class="cases-cta__select"
        id="{{ $idPrefix }}-person-type"
        name="person-type"
        required
      >
        {{ range $form.personTypes }}
        <option value="{{ . }}">{{ . }}</option>
        {{ end }}
      </select>
    </div>

    <label class="cases-cta__checkbox">
      <input type="checkbox" name="agree" value="yes" required />
      <span
        >{{ $form.privacyText }}
        <a href="{{ $form.privacyUrl | relLangURL }}"
          >Політикою конфіденційності</a
        ></span
      >
    </label>

    <button class="cases-cta__submit btn btn--light" type="submit">
      {{ $form.submitText }}
    </button>
  </form>
</div>
```

- [ ] **Step 2: Собрать и сверить регрессию на существующих страницах**

```bash
rm -rf public resources
hugo --minify
grep -o 'cases-name\|cases-phone\|cases-person-type' public/index.html | sort -u
grep -o 'cases-name\|cases-phone\|cases-person-type' public/contacts/index.html | sort -u
grep -o 'cases-name\|cases-phone\|cases-person-type' public/dohovirne-pravo/index.html | sort -u
```
Ожидаем на каждой из трёх страниц вывод ровно: `cases-name`, `cases-person-type`, `cases-phone` (порядок как выведет sort -u) — то есть id не изменились, потому что `idPrefix` по умолчанию `"cases"`.

- [ ] **Step 3: Commit**

```bash
git add layouts/partials/contact-panel.html
git commit -m "refactor(contact-panel): add idPrefix param for multi-instance forms"
```

---

## Task 3: `cases-cta.js` — поддержка нескольких форм на странице

**Files:**
- Modify: `assets/js/components/cases-cta.js`

**Interfaces:**
- Produces: `initCasesForm()` теперь навешивает обработчик `submit` на **каждый** элемент `[data-cases-form]` на странице (было — только на первый найденный).

- [ ] **Step 1: Изменить `initCasesForm` в `assets/js/components/cases-cta.js`**

Заменить:
```js
function initCasesForm() {
  const form = document.querySelector('[data-cases-form]');

  if (!form) {
    return;
  }

  form.addEventListener('submit', (event) => {
```
на:
```js
function initCasesForm() {
  const forms = document.querySelectorAll('[data-cases-form]');

  forms.forEach((form) => {
    form.addEventListener('submit', (event) => {
```
и в конце функции — после `console.info(...)` внутри обработчика и закрытия `});` обработчика — добавить закрывающую скобку `forEach`, убрав старую финальную `}` функции так, чтобы получилось:

```js
function initCasesForm() {
  const forms = document.querySelectorAll('[data-cases-form]');

  forms.forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const nameInput = form.querySelector('input[name="name"]');
      const phoneInput = form.querySelector('input[name="phone"]');
      const personType = form.querySelector('select[name="person-type"]');
      const agreeInput = form.querySelector('input[name="agree"]');

      if (!(nameInput instanceof HTMLInputElement) || !nameInput.value.trim()) {
        nameInput?.focus();
        return;
      }

      if (!(phoneInput instanceof HTMLInputElement) || !phoneInput.value.trim()) {
        phoneInput?.focus();
        return;
      }

      if (!(personType instanceof HTMLSelectElement) || !personType.value) {
        personType?.focus();
        return;
      }

      if (!(agreeInput instanceof HTMLInputElement) || !agreeInput.checked) {
        agreeInput?.focus();
        return;
      }

      console.info('Cases form submitted:', {
        name: nameInput.value.trim(),
        phone: phoneInput.value.trim(),
        personType: personType.value,
      });
    });
  });
}
```

- [ ] **Step 2: Собрать и проверить**

```bash
rm -rf public resources
hugo --minify
grep -o "querySelectorAll('\[data-cases-form\]')" public/js/site.min.*.js
```
Ожидаем совпадение (JS минифицируется, но строка селектора остаётся читаемой внутри бандла).

- [ ] **Step 3: Commit**

```bash
git add assets/js/components/cases-cta.js
git commit -m "fix(cases-cta): support multiple contact forms per page"
```

---

## Task 4: Шорткод формы, hero статьи, тело статьи, layout статьи + первая статья

**Files:**
- Create: `layouts/shortcodes/contact-form.html`
- Create: `assets/scss/components/_article-cta.scss`
- Create: `layouts/partials/post-hero.html`
- Create: `assets/scss/components/_post-hero.scss`
- Create: `assets/scss/components/_post-body.scss`
- Create: `layouts/blog/single.html`
- Create: `assets/scss/pages/blog-post.scss`
- Create: `assets/js/pages/blog-post.js`
- Create: `content/blog/kryminalne-provadzhennia-klyuchovi-pozytsii/index.md`
- Create: `content/blog/kryminalne-provadzhennia-klyuchovi-pozytsii/cover.jpg` (скачать)
- Create: `content/blog/kryminalne-provadzhennia-klyuchovi-pozytsii/image-1.png` (скачать)
- Create: `content/blog/kryminalne-provadzhennia-klyuchovi-pozytsii/image-2.png` (скачать)

**Interfaces:**
- Consumes: `contact-panel.html` (Task 2, с `idPrefix`), `category-name.html` (Task 1).
- Produces: шорткод `{{< contact-form >}}` (без параметров, уникальный `idPrefix` через `.Ordinal`); `layouts/blog/single.html` — рендерит `post-hero` + `.Content` + `related-posts` (партиал related-posts создаётся в Task 9 — до этого в single.html вызов партиала оборачиваем в `{{ if (templates.Exists "partials/related-posts.html") }}`, чтобы не падать на несуществующем партиале; в Task 9 просто снимаем эту обёртку).

- [ ] **Step 1: Скачать изображения первой статьи**

```bash
mkdir -p content/blog/kryminalne-provadzhennia-klyuchovi-pozytsii
curl -sL -o content/blog/kryminalne-provadzhennia-klyuchovi-pozytsii/cover.jpg \
  "https://clg.legal/wp-content/uploads/2025/11/37aaf90a2bb537e53cbb7cda7164d51426707a57-1536x1024.jpg"
curl -sL -o content/blog/kryminalne-provadzhennia-klyuchovi-pozytsii/image-1.png \
  "https://clg.legal/wp-content/uploads/2025/11/%D0%94%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD-%D0%B1%D0%B5%D0%B7-%D0%BD%D0%B0%D0%B7%D0%B2%D0%B0%D0%BD%D0%B8%D1%8F-53-1024x480.png"
curl -sL -o content/blog/kryminalne-provadzhennia-klyuchovi-pozytsii/image-2.png \
  "https://clg.legal/wp-content/uploads/2025/11/%D0%94%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD-%D0%B1%D0%B5%D0%B7-%D0%BD%D0%B0%D0%B7%D0%B2%D0%B0%D0%BD%D0%B8%D1%8F-54-1024x480.png"
file content/blog/kryminalne-provadzhennia-klyuchovi-pozytsii/*.jpg content/blog/kryminalne-provadzhennia-klyuchovi-pozytsii/*.png
```
Ожидаем: `file` показывает реальные JPEG/PNG (не HTML-страницу ошибки). Если кириллический URL не резолвится — взять URL из `files-for-cursor/6.html` (`src=` атрибуты фигур) и percent-encode вручную тем же способом.

- [ ] **Step 2: Создать `layouts/shortcodes/contact-form.html`**

```html
{{ $idPrefix := printf "contact-form-%d" .Ordinal }}
{{ $form := dict
  "titleLines" (slice "Залишились питання?")
  "lead" "Отримайте безкоштовну консультацію юриста Concordis Legal Group."
  "namePlaceholder" "Введіть імʼя"
  "phonePlaceholder" "(000) 000-00-00"
  "personTypes" (slice "Фізична / юридична особа" "Фізична особа" "Юридична особа")
  "privacyText" "Я погоджуюсь з"
  "privacyUrl" "/privacy-policy/"
  "submitText" "Отримати консультацію"
  "social" (dict
    "titleLines" (slice "Напишіть юристу безпосередньо" "у WhatsApp або Telegram")
    "whatsappUrl" "https://wa.me/380501055115"
    "telegramUrl" "https://t.me/"
    "whatsappIcon" "/images/social-whatsapp.jpg"
    "telegramIcon" "/images/social-telegram.jpg"
  )
}}
<div class="article-cta">
  {{ partial "contact-panel.html" (dict "form" $form "titleId" (printf "%s-title" $idPrefix) "idPrefix" $idPrefix) }}
</div>
```

- [ ] **Step 3: Создать `assets/scss/components/_article-cta.scss`**

```scss
@import "../base/variables";

.article-cta {
  margin-block: 32px;

  .cases-cta__panel {
    max-width: 100%;
    flex-direction: column;
  }
}
```

- [ ] **Step 4: Создать `layouts/partials/post-hero.html`**

```html
{{ $image := .Resources.GetMatch (.Params.image | default "") }}
{{ $bgURL := "" }}
{{ with $image }}{{ $bgURL = .RelPermalink }}{{ end }}
{{ $categorySlug := "" }}
{{ with .Params.category }}{{ with index . 0 }}{{ $categorySlug = . }}{{ end }}{{ end }}
<section class="post-hero" style="--post-hero-bg: url('{{ $bgURL }}')">
  <div class="post-hero__media" aria-hidden="true"></div>
  <div class="post-hero__container">
    <nav class="post-hero__breadcrumb" aria-label="Breadcrumb">
      <a class="post-hero__breadcrumb-link" href="{{ "/" | relLangURL }}">Головна</a>
      <span class="post-hero__breadcrumb-separator" aria-hidden="true">/</span>
      <a class="post-hero__breadcrumb-link" href="{{ "/blog/" | relLangURL }}">Блог</a>
    </nav>
    <h1 class="post-hero__title">{{ .Title }}</h1>
    <ul class="post-hero__meta">
      {{ with $categorySlug }}
      <li class="post-hero__meta-item post-hero__meta-item--category">{{ partial "category-name.html" . }}</li>
      {{ end }}
      <li class="post-hero__meta-item">{{ .Date.Format "02.01.2006" }}</li>
      {{ with .Params.author }}<li class="post-hero__meta-item">{{ . }}</li>{{ end }}
    </ul>
  </div>
</section>
```

- [ ] **Step 5: Создать `assets/scss/components/_post-hero.scss`**

```scss
@import "../base/variables";

.post-hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  min-height: 320px;
  display: flex;
  align-items: flex-end;
  color: $color-white;
  background-color: $color-primary;

  @include respond-up($breakpoint-md) {
    min-height: 420px;
  }
}

.post-hero__media {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image: var(--post-hero-bg);
  background-position: center center;
  background-repeat: no-repeat;
  background-size: cover;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(11, 11, 11, 0.15) 0%, rgba(11, 11, 11, 0.75) 100%);
  }
}

.post-hero__container {
  position: relative;
  z-index: 1;
  @include container;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-block: 32px;
  margin-top: 80px;

  @include respond-up($breakpoint-md) {
    padding-block: 48px;
  }

  @include respond-up($breakpoint-xl) {
    margin-top: 77px;
  }
}

.post-hero__breadcrumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  line-height: 1.4;
}

.post-hero__breadcrumb-link {
  color: $color-white;
  text-decoration: none;
  opacity: 0.85;

  &:hover {
    opacity: 1;
  }
}

.post-hero__breadcrumb-separator {
  color: $color-white;
}

.post-hero__title {
  max-width: 900px;
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;

  @include respond-up($breakpoint-lg) {
    font-size: 42px;
  }
}

.post-hero__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.post-hero__meta-item {
  color: rgba(255, 255, 255, 0.85);

  &--category {
    padding: 4px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.15);
    color: $color-white;
  }
}
```

- [ ] **Step 6: Создать `assets/scss/components/_post-body.scss`**

```scss
@import "../base/variables";

.post-body {
  padding-block: 32px 56px;

  @include respond-up($breakpoint-lg) {
    padding-block: 56px 80px;
  }
}

.post-body__container {
  @include container;
  max-width: 820px;

  h2,
  h3 {
    margin-top: 40px;
    margin-bottom: 16px;
    font-weight: 700;
    line-height: 1.3;
  }

  h2 {
    font-size: 22px;

    @include respond-up($breakpoint-lg) {
      font-size: 28px;
    }
  }

  h3 {
    font-size: 19px;

    @include respond-up($breakpoint-lg) {
      font-size: 22px;
    }
  }

  p {
    margin-bottom: 16px;
    font-size: 15px;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.9);

    @include respond-up($breakpoint-md) {
      font-size: 16px;
    }
  }

  ul {
    margin: 0 0 16px;
    padding-left: 20px;
    list-style: disc;

    @include respond-up($breakpoint-md) {
      padding-left: 24px;
    }
  }

  ol {
    margin: 0 0 16px;
    padding-left: 20px;
    list-style: decimal;

    @include respond-up($breakpoint-md) {
      padding-left: 24px;
    }
  }

  li {
    margin-bottom: 8px;
    font-size: 15px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.9);

    @include respond-up($breakpoint-md) {
      font-size: 16px;
    }
  }

  hr {
    margin-block: 32px;
    border: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.15);
  }

  img {
    width: 100%;
    height: auto;
    border-radius: 16px;
    margin-block: 24px;
  }

  a {
    color: $color-white;
    text-decoration: underline;
  }

  strong {
    color: $color-white;
  }
}
```

- [ ] **Step 7: Создать `layouts/blog/single.html`**

```html
{{ define "main" }}
  {{ partial "post-hero.html" . }}
  <article class="post-body">
    <div class="post-body__container">
      {{ .Content }}
    </div>
  </article>
  {{ if templates.Exists "partials/related-posts.html" }}
    {{ partial "related-posts.html" . }}
  {{ end }}
{{ end }}
```

- [ ] **Step 8: Создать `assets/scss/pages/blog-post.scss`**

```scss
@import "components/post-hero";
@import "components/post-body";
@import "components/cases-cta";
@import "components/article-cta";
```

(Импорты `post-card`/`related-posts` добавляются позже, в Task 9, — эти компоненты появятся только там.)

- [ ] **Step 9: Создать `assets/js/pages/blog-post.js`**

```js
import { initCasesCta } from '../components/cases-cta.js';

document.addEventListener('DOMContentLoaded', () => {
  initCasesCta();
});
```

- [ ] **Step 10: Создать первую статью `content/blog/kryminalne-provadzhennia-klyuchovi-pozytsii/index.md`**

```yaml
---
title: "Кримінальне провадження: ключові правові позиції для ефективного захисту"
description: "Кримінальне провадження створює для особи правові ризики, які неможливо нівелювати самостійно. Розповідаємо, як діяти на кожному етапі — від допиту до вироку."
image: "cover.jpg"
date: 2025-08-11
category: ["kryminalne-provadzhennya"]
author: "CONCORDIS LEGAL GROUP"
seo:
  title: "Кримінальне провадження: ключові правові позиції – Concordis Legal Group"
  description: "Кримінальне провадження створює для особи правові ризики, які неможливо нівелювати самостійно. Розповідаємо, як діяти на кожному етапі — від допиту до вироку."
  robots: "index, follow"
styles:
  - pages/blog-post
scripts:
  - pages/blog-post
bodyClass: "page-blog-post"
---

Кримінальне провадження створює для особи правові ризики, які неможливо нівелювати самостійно. Будь-яка дія слідства повинна отримувати правову оцінку захисника, оскільки саме на початкових етапах формуються докази, що надалі визначають результат справи. Неправильна поведінка, необачні пояснення чи підписання документів без консультації адвоката часто стають причиною необґрунтованого обвинувачення.

![](image-1.png)

## Пояснення та допити: право на мовчання є ключовим

Особа не зобов'язана надавати показання, які можуть бути використані проти неї (ст. 63 Конституції України). Будь-які комунікації зі слідством до прибуття адвоката створюють процесуальні ризики. Завдання захисту — забезпечити контроль за фіксацією допиту, перевірити відповідність питань нормам КПК та унеможливити тиск.

## Обшук та виїмка: процесуальний порядок захищає особу

Обшук є найбільш інтенсивним втручанням у приватне життя. Захисник перевіряє наявність ухвали, її процесуальну обґрунтованість, межі дозволених дій, фіксує будь-які порушення. Належність і допустимість доказів, вилучених у ході обшуку, часто стає визначальним елементом подальшої стратегії захисту.

## Процесуальні документи: жодних підписів без правової оцінки

Підозра, протокол, пояснення або угода з прокурором потребують аналізу адвоката. Будь-який документ може створити для особи невигідні правові наслідки. Правильна тактика передбачає фіксацію заперечень, подання клопотань та оскарження незаконних рішень.

![](image-2.png)

## Побудова лінії захисту: доказова стратегія

Ефективний захист спирається на:

- перевірку доказів на предмет допустимості;
- встановлення процесуальних порушень під час їх отримання;
- ініціювання слідчих дій на користь клієнта;
- подання клопотань та скарг, передбачених КПК;
- формування послідовної правової позиції, здатної витримати судовий контроль.

## Перевага раннього залучення адвоката

Підключення захисника на стадії досудового розслідування дозволяє мінімізувати ризики, заблокувати незаконні дії та забезпечити належний баланс між правами особи і повноваженнями слідства. У більшості випадків саме своєчасна правова реакція запобігає пред'явленню підозри або призводить до закриття провадження.

{{< contact-form >}}
```

- [ ] **Step 11: Собрать и проверить**

```bash
rm -rf public resources
hugo --minify
test -f public/blog/kryminalne-provadzhennia-klyuchovi-pozytsii/index.html && echo OK
grep -o 'post-hero__title\|Кримінальне провадження\|cases-cta__panel\|contact-form-0-name\|article-cta' public/blog/kryminalne-provadzhennia-klyuchovi-pozytsii/index.html | sort -u
```
Ожидаем `OK` и в списке: `Кримінальне провадження`, `article-cta`, `cases-cta__panel`, `contact-form-0-name`, `post-hero__title` (id формы содержит `contact-form-0-` — первый и единственный шорткод на странице, `.Ordinal` = 0).

- [ ] **Step 12: Commit**

```bash
git add layouts/shortcodes layouts/blog/single.html layouts/partials/post-hero.html \
  assets/scss/components/_article-cta.scss assets/scss/components/_post-hero.scss \
  assets/scss/components/_post-body.scss assets/scss/pages/blog-post.scss assets/js/pages/blog-post.js \
  content/blog/kryminalne-provadzhennia-klyuchovi-pozytsii
git commit -m "feat(blog): add post single layout, contact-form shortcode, first migrated article"
```

---

## Task 5: Карточка статьи + лёгкий хиро списков + лента блога

**Files:**
- Create: `layouts/partials/post-card.html`
- Create: `assets/scss/components/_post-card.scss`
- Create: `layouts/partials/page-hero.html`
- Create: `assets/scss/components/_page-hero.scss`
- Create: `layouts/blog/list.html`
- Create: `content/blog/_index.md`
- Create: `assets/scss/pages/blog.scss`

**Interfaces:**
- Consumes: `category-name.html` (Task 1), page resources (`.Resources.GetMatch`).
- Produces: `.post-grid` CSS-класс (сетка карточек, переиспользуется в Task 7 для категорий и в Task 9 для related-posts); partial `post-card.html`, вызывается как `{{ partial "post-card.html" $page }}`.

- [ ] **Step 1: Создать `layouts/partials/post-card.html`**

```html
{{ $image := .Resources.GetMatch (.Params.image | default "") }}
{{ $categorySlug := "" }}
{{ with .Params.category }}{{ with index . 0 }}{{ $categorySlug = . }}{{ end }}{{ end }}
<article class="post-card">
  <a class="post-card__link" href="{{ .RelPermalink }}" aria-label="{{ .Title }}">
    <div class="post-card__media">
      {{ with $image }}
      <img class="post-card__image" src="{{ .RelPermalink }}" alt="" loading="lazy" decoding="async" />
      {{ end }}
    </div>
    <div class="post-card__body">
      {{ with $categorySlug }}
      <span class="post-card__category">{{ partial "category-name.html" . }}</span>
      {{ end }}
      <h3 class="post-card__title">{{ .Title }}</h3>
      <p class="post-card__excerpt">{{ .Params.description | default .Summary }}</p>
      <div class="post-card__meta">
        <span class="post-card__date">{{ .Date.Format "02.01.2006" }}</span>
        {{ with .Params.author }}<span class="post-card__author">{{ . }}</span>{{ end }}
      </div>
    </div>
  </a>
</article>
```

- [ ] **Step 2: Создать `assets/scss/components/_post-card.scss`**

```scss
@import "../base/variables";

.post-grid {
  @include container;
  display: grid;
  gap: 24px;
  padding-block: 32px;
  grid-template-columns: 1fr;

  @include respond-up($breakpoint-md) {
    grid-template-columns: repeat(2, 1fr);
  }

  @include respond-up($breakpoint-lg) {
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
    padding-block: 56px;
  }
}

.post-grid--empty {
  padding-block: 56px;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
}

.post-card {
  height: 100%;
}

.post-card__link {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: inherit;
  text-decoration: none;
  border-radius: 20px;
  overflow: hidden;
  background: $color-white;
  box-shadow: 0 1px 2px rgba(11, 11, 11, 0.08);
  transition: transform $transition-base, box-shadow $transition-base;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgba(11, 11, 11, 0.12);
  }
}

.post-card__media {
  position: relative;
  aspect-ratio: 16 / 9;
  background-color: $color-primary;
  overflow: hidden;
}

.post-card__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.post-card__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1 1 auto;
  padding: 20px;
}

.post-card__category {
  align-self: flex-start;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(22, 50, 44, 0.08);
  color: $color-primary;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.post-card__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
  color: $color-black-lite;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-card__excerpt {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(11, 11, 11, 0.65);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1 1 auto;
}

.post-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: auto;
  padding-top: 8px;
  font-size: 12px;
  color: rgba(11, 11, 11, 0.5);
  border-top: 1px solid rgba(11, 11, 11, 0.08);
}
```

- [ ] **Step 3: Создать `layouts/partials/page-hero.html`**

```html
{{ $title := .title }}
{{ $label := .label }}
<section class="page-hero">
  <div class="page-hero__container">
    <nav class="page-hero__breadcrumb" aria-label="Breadcrumb">
      <a class="page-hero__breadcrumb-link" href="{{ "/" | relLangURL }}">Головна</a>
      <span class="page-hero__breadcrumb-separator" aria-hidden="true">/</span>
      <span class="page-hero__breadcrumb-current">{{ $title }}</span>
    </nav>
    {{ with $label }}<p class="page-hero__label">{{ . }}</p>{{ end }}
    <h1 class="page-hero__title">{{ $title }}</h1>
  </div>
</section>
```

- [ ] **Step 4: Создать `assets/scss/components/_page-hero.scss`**

```scss
@import "../base/variables";

.page-hero {
  background-color: $color-primary;
  color: $color-white;
  padding-block: 32px;

  @include respond-up($breakpoint-lg) {
    padding-block: 56px;
  }
}

.page-hero__container {
  @include container;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 80px;

  @include respond-up($breakpoint-xl) {
    margin-top: 77px;
  }
}

.page-hero__breadcrumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  line-height: 1.4;
}

.page-hero__breadcrumb-link {
  color: $color-white;
  text-decoration: none;
  opacity: 0.85;

  &:hover {
    opacity: 1;
  }
}

.page-hero__breadcrumb-separator,
.page-hero__breadcrumb-current {
  color: $color-white;
}

.page-hero__label {
  margin: 8px 0 0;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.65);
}

.page-hero__title {
  margin: 4px 0 0;
  font-size: 26px;
  font-weight: 400;
  line-height: 1.15;

  @include respond-up($breakpoint-lg) {
    font-size: 40px;
  }
}
```

- [ ] **Step 5: Создать `layouts/blog/list.html`**

```html
{{ define "main" }}
  {{ partial "page-hero.html" (dict "title" "Блог") }}
  {{ $pages := where site.RegularPages "Section" "blog" }}
  {{ $pages = $pages.ByDate.Reverse }}
  {{ if $pages }}
    <div class="post-grid">
      {{ range $pages }}
        {{ partial "post-card.html" . }}
      {{ end }}
    </div>
  {{ else }}
    <p class="post-grid post-grid--empty">Поки що немає публікацій.</p>
  {{ end }}
{{ end }}
```

- [ ] **Step 6: Создать `content/blog/_index.md`**

```yaml
---
title: "Блог"
layout: blog
seo:
  title: "Блог – Concordis Legal Group"
  description: "Публікації Concordis Legal Group: аналітика, роз'яснення законодавства та практичні поради від адвокатів."
  robots: "index, follow"
styles:
  - pages/blog
scripts: []
bodyClass: "page-blog"
---
```

- [ ] **Step 7: Создать `assets/scss/pages/blog.scss`**

```scss
@import "components/page-hero";
@import "components/post-card";
```

- [ ] **Step 8: Собрать и проверить**

```bash
rm -rf public resources
hugo --minify
test -f public/blog/index.html && echo OK
grep -o 'page-hero__title\|post-card__title\|Кримінальне провадження' public/blog/index.html | sort -u
```
Ожидаем `OK` и в выводе: `Кримінальне провадження` (единственный пока пост), `page-hero__title`, `post-card__title`.

- [ ] **Step 9: Commit**

```bash
git add layouts/partials/post-card.html layouts/partials/page-hero.html \
  assets/scss/components/_post-card.scss assets/scss/components/_page-hero.scss \
  layouts/blog/list.html content/blog/_index.md assets/scss/pages/blog.scss
git commit -m "feat(blog): add blog index list with post cards"
```

---

## Task 6: Пагинация

**Files:**
- Create: `layouts/partials/pagination.html`
- Create: `assets/scss/components/_pagination.scss`
- Modify: `layouts/blog/list.html`
- Modify: `assets/scss/pages/blog.scss`

**Interfaces:**
- Produces: `pagination.html`, вызывается как `{{ partial "pagination.html" . }}` в контексте страницы-списка (использует `.Paginator`/`.Paginate`).

- [ ] **Step 1: Создать `layouts/partials/pagination.html`**

```html
{{ $paginator := .Paginator }}
{{ if gt $paginator.TotalPages 1 }}
<nav class="pagination" aria-label="Пагінація">
  {{ if $paginator.HasPrev }}
  <a class="pagination__link pagination__link--prev" href="{{ $paginator.Prev.URL }}" aria-label="Попередня сторінка">←</a>
  {{ end }}

  <ul class="pagination__list">
    {{ range $paginator.Pagers }}
    <li class="pagination__item">
      <a
        class="pagination__page{{ if eq . $paginator }} is-active{{ end }}"
        href="{{ .URL }}"
      >{{ .PageNumber }}</a>
    </li>
    {{ end }}
  </ul>

  {{ if $paginator.HasNext }}
  <a class="pagination__link pagination__link--next" href="{{ $paginator.Next.URL }}" aria-label="Наступна сторінка">→</a>
  {{ end }}
</nav>
{{ end }}
```

- [ ] **Step 2: Создать `assets/scss/components/_pagination.scss`**

```scss
@import "../base/variables";

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding-block: 24px 56px;
}

.pagination__list {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pagination__link,
.pagination__page {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  padding-inline: 8px;
  border-radius: 10px;
  color: $color-white;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  transition: background-color $transition-base;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
}

.pagination__page.is-active {
  background: $color-primary;
  color: $color-white;
}
```

- [ ] **Step 3: Переписать `layouts/blog/list.html`, использовав `.Paginate`**

```html
{{ define "main" }}
  {{ partial "page-hero.html" (dict "title" "Блог") }}
  {{ $pages := (where site.RegularPages "Section" "blog").ByDate.Reverse }}
  {{ $paginator := .Paginate $pages }}
  {{ if $paginator.Pages }}
    <div class="post-grid">
      {{ range $paginator.Pages }}
        {{ partial "post-card.html" . }}
      {{ end }}
    </div>
  {{ else }}
    <p class="post-grid post-grid--empty">Поки що немає публікацій.</p>
  {{ end }}
  {{ partial "pagination.html" . }}
{{ end }}
```

- [ ] **Step 4: Добавить импорт в `assets/scss/pages/blog.scss`**

```scss
@import "components/page-hero";
@import "components/post-card";
@import "components/pagination";
```

- [ ] **Step 5: Собрать и проверить**

```bash
rm -rf public resources
hugo --minify
```
Ожидаем: без предупреждений (при 1 посте пагинация не должна рендериться — `TotalPages` = 1, значит `<nav class="pagination">` в HTML быть не должно):
```bash
grep -c 'class="pagination"' public/blog/index.html
```
Ожидаем `0`.

- [ ] **Step 6: Commit**

```bash
git add layouts/partials/pagination.html assets/scss/components/_pagination.scss \
  layouts/blog/list.html assets/scss/pages/blog.scss
git commit -m "feat(blog): add pagination to blog index"
```

---

## Task 7: Страница категории

**Files:**
- Create: `layouts/category/term.html`
- Modify: `assets/scss/pages/blog.scss` (без изменений по факту — уже переиспользует те же компоненты; шаг подтверждает это сборкой)

**Interfaces:**
- Consumes: `page-hero.html`, `post-card.html`, `pagination.html` — без изменений интерфейсов.
- Produces: `/category/<slug>/` — рабочая страница с тем же визуальным языком, что `/blog/`.

- [ ] **Step 1: Создать `layouts/category/term.html`**

```html
{{ define "main" }}
  {{ partial "page-hero.html" (dict "title" .Title "label" "Категорія") }}
  {{ $pages := .Pages.ByDate.Reverse }}
  {{ $paginator := .Paginate $pages }}
  {{ if $paginator.Pages }}
    <div class="post-grid">
      {{ range $paginator.Pages }}
        {{ partial "post-card.html" . }}
      {{ end }}
    </div>
  {{ else }}
    <p class="post-grid post-grid--empty">У цій категорії поки що немає публікацій.</p>
  {{ end }}
  {{ partial "pagination.html" . }}
{{ end }}
```

Категорийные content-страницы (`content/category/<slug>/_index.md`) не задают `styles`/`scripts` — им нужен тот же `pages/blog.scss`/`.js`, что и `/blog/`. Добавить в front matter обоих файлов из Task 1:

`content/category/tsyvilni-spory/_index.md` и `content/category/kryminalne-provadzhennya/_index.md` — дописать в front matter (после `seo:` блока):
```yaml
styles:
  - pages/blog
bodyClass: "page-blog"
```

- [ ] **Step 2: Собрать и проверить**

```bash
rm -rf public resources
hugo --minify
grep -o 'page-hero__label\|Категорія\|Кримінальне провадження' public/category/kryminalne-provadzhennya/index.html | sort -u
grep -c 'post-grid--empty' public/category/tsyvilni-spory/index.html
```
Ожидаем: первая команда покажет `Категорія`, `Кримінальне провадження`, `page-hero__label` (пост уже смигрирован в Task 4 и относится к этой категории); вторая — `1` (категория `tsyvilni-spory` пока пустая, до Task 8).

- [ ] **Step 3: Commit**

```bash
git add layouts/category/term.html content/category
git commit -m "feat(blog): add category term page layout"
```

---

## Task 8: Миграция двух оставшихся статей

**Files:**
- Create: `content/blog/advokat-u-kyievi-yurydychna-konsultatsiia/index.md`
- Create: `content/blog/advokat-u-kyievi-yurydychna-konsultatsiia/cover.jpg`
- Create: `content/blog/tsyvilni-spory-yak-zakhystyty-prava/index.md`
- Create: `content/blog/tsyvilni-spory-yak-zakhystyty-prava/cover.png`
- Create: `content/blog/tsyvilni-spory-yak-zakhystyty-prava/image-1.png`
- Create: `content/blog/tsyvilni-spory-yak-zakhystyty-prava/image-2.png`

**Interfaces:**
- Consumes: всё из Task 4–7 без изменений (шорткод, layouts, партиалы).

- [ ] **Step 1: Скачать изображения**

```bash
mkdir -p content/blog/advokat-u-kyievi-yurydychna-konsultatsiia
curl -sL -o content/blog/advokat-u-kyievi-yurydychna-konsultatsiia/cover.jpg \
  "https://clg.legal/wp-content/uploads/2025/11/6f7f29ed11b37856cbe0a9f05157eee263ef5ef0-1-1536x1024.jpg"

mkdir -p content/blog/tsyvilni-spory-yak-zakhystyty-prava
curl -sL -o content/blog/tsyvilni-spory-yak-zakhystyty-prava/cover.png \
  "https://clg.legal/wp-content/uploads/2025/11/66b38b4f785007d6fcf510006f8a51b388a8e6a4-1536x417.png"
curl -sL -o content/blog/tsyvilni-spory-yak-zakhystyty-prava/image-1.png \
  "https://clg.legal/wp-content/uploads/2025/12/%D0%94%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD-%D0%B1%D0%B5%D0%B7-%D0%BD%D0%B0%D0%B7%D0%B2%D0%B0%D0%BD%D0%B8%D1%8F-55-1024x480.png"
curl -sL -o content/blog/tsyvilni-spory-yak-zakhystyty-prava/image-2.png \
  "https://clg.legal/wp-content/uploads/2025/12/%D0%94%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD-%D0%B1%D0%B5%D0%B7-%D0%BD%D0%B0%D0%B7%D0%B2%D0%B0%D0%BD%D0%B8%D1%8F-56-1024x480.png"
file content/blog/advokat-u-kyievi-yurydychna-konsultatsiia/cover.jpg \
    content/blog/tsyvilni-spory-yak-zakhystyty-prava/*.png
```
Ожидаем реальные изображения (если percent-encoding кириллицы не сработал у конкретного curl/сервера — взять точный `src=` URL из `files-for-cursor/4.html` / `5.html`, они уже в правильной кодировке браузера).

- [ ] **Step 2: Создать `content/blog/advokat-u-kyievi-yurydychna-konsultatsiia/index.md`**

(эта статья содержит шорткод формы **дважды** — проверяем уникальность id из Task 2/3)

```yaml
---
title: "Адвокат у Києві: юридична консультація та правовий супровід від Concordis Legal Group"
description: "Concordis Legal Group — це команда адвокатів та юристів у Києві, які працюють там, де потрібний результат, а не формальність."
image: "cover.jpg"
date: 2025-12-06
category: ["tsyvilni-spory"]
author: "CONCORDIS LEGAL GROUP"
seo:
  title: "Адвокат у Києві: юридична консультація – Concordis Legal Group"
  description: "Concordis Legal Group — це команда адвокатів та юристів у Києві. Юридичні послуги фізичним та юридичним особам у цивільних, господарських, кримінальних, податкових та адміністративних справах."
  robots: "index, follow"
styles:
  - pages/blog-post
scripts:
  - pages/blog-post
bodyClass: "page-blog-post"
---

Concordis Legal Group — це команда адвокатів та юристів у Києві, які працюють там, де потрібний результат, а не формальність. Ми надаємо комплексні юридичні послуги фізичним та юридичним особам у цивільних, господарських, кримінальних, податкових та адміністративних справах.

Наші адвокати забезпечують повний юридичний супровід, стратегічний аналіз ситуації та реальні рішення, спрямовані на ефективний захист прав, інтересів і репутації клієнтів.

{{< contact-form >}}

## Професійна юридична консультація в Києві

Юридична консультація — це перший і один із найважливіших етапів у вирішенні правової проблеми. Фахівці Concordis Legal Group проводять детальну оцінку ситуації, формують правову позицію, розробляють варіанти дій і пропонують оптимальну стратегію вирішення питання.

**Наші консультації включають:**

- аналіз документів і фактичних обставин;
- визначення ризиків та перспектив;
- формування правового алгоритму;
- підготовку клієнта до подальших процесуальних дій.

## Основні юридичні послуги Concordis Legal Group у Києві

Ми надаємо повний спектр юридичних послуг для бізнесу та приватних клієнтів.

### 1. Адвокат у кримінальних справах

Наші кримінальні адвокати забезпечують захист прав і свобод клієнтів на всіх стадіях процесу:

- досудове розслідування;
- слідчі дії (допит, обшук, виїмка);
- захист у суді;
- апеляція та касація;
- повернення майна, знятого арешту;
- супровід у справах щодо економічних та службових злочинів.

Ми працюємо швидко, конфіденційно та результативно.

---

### 2. Цивільні справи та цивільні спори

Юристи Concordis Legal Group представляють інтереси клієнтів у цивільних спорах будь-якої складності:

- боргові та договірні спори;
- спори щодо власності;
- спадкові конфлікти;
- сімейні справи;
- відшкодування шкоди;
- спори з недобросовісними контрагентами.

Ми формуємо правову позицію, збираємо докази і забезпечуємо ефективне представництво у суді.

---

### 3. Господарські спори та юридичний супровід бізнесу

Адвокати з господарського права допомагають бізнесу:

- вирішувати спори між компаніями;
- супроводжувати договори та угоди;
- захищати інтереси в арбітражних процесах;
- проводити претензійну роботу;
- розробляти внутрішню юридичну документацію.

Ми працюємо з малим, середнім та великим бізнесом.

---

### 4. Податкові спори та податковий супровід

Податкові юристи Concordis Legal Group:

- супроводжують перевірки;
- оскаржують дії та рішення податкових органів;
- оптимізують структуру оподаткування;
- консультують бізнес щодо податкових ризиків;
- представляють інтереси в адміністративних та судових процесах.

---

### 5. Міграційні послуги

Ми допомагаємо іноземцям та українцям із питаннями міграційного права:

- посвідка на тимчасове або постійне проживання;
- дозволи на роботу;
- легалізація документів;
- оскарження рішень ДМС;
- супровід під час подання документів.

---

### 6. IT-право та юридична підтримка цифрового бізнесу

Наші юристи працюють у сфері ІТ:

- розробляють договори (NDA, MSA, SAAS, SLA, Contractor Agreement);
- супроводжують ІТ-компанії;
- вирішують спори щодо інтелектуальної власності;
- надають юридичний супровід продуктовим та аутсорс-компаніям;
- консультують з питань кібербезпеки та цифрових прав.

---

## Ціни на юридичні послуги та консультації адвоката

Вартість послуг формується індивідуально та залежить від:

- складності справи;
- обсягу юридичної роботи;
- кваліфікації залучених фахівців;
- терміновості;
- процесуальних ризиків.

Ми гарантуємо прозоре ціноутворення та відсутність прихованих платежів.

{{< contact-form >}}
```

- [ ] **Step 3: Создать `content/blog/tsyvilni-spory-yak-zakhystyty-prava/index.md`**

```yaml
---
title: "Цивільні спори: як ефективно захистити свої права в рамках цивільного права"
description: "Цивільні спори — це одна з найбільш поширених категорій правових конфліктів в Україні. Розповідаємо, як правильний підхід визначає результат справи."
image: "cover.png"
date: 2025-12-06
category: ["tsyvilni-spory"]
author: "CONCORDIS LEGAL GROUP"
seo:
  title: "Цивільні спори: як ефективно захистити свої права – Concordis Legal Group"
  description: "Цивільні спори — це одна з найбільш поширених категорій правових конфліктів в Україні. Правильний підхід до вирішення цивільного спору визначає результат справи."
  robots: "index, follow"
styles:
  - pages/blog-post
scripts:
  - pages/blog-post
bodyClass: "page-blog-post"
---

Цивільні спори — це одна з найбільш поширених категорій правових конфліктів в Україні. Вони охоплюють договірні відносини, спори щодо майна, боргові зобов'язання, спадкові питання, відшкодування шкоди, конфлікти між фізичними та юридичними особами. Правильний підхід до вирішення цивільного спору визначає не лише результат, а й швидкість та ефективність захисту прав.

## Що таке цивільний спір і чому важливо діяти правильно

Цивільний спір виникає тоді, коли одна зі сторін порушує права іншої особи або не виконує своїх зобов'язань. Найпоширеніші категорії цивільних спорів:

- спори щодо договорів;
- боргові та кредитні зобов'язання;
- захист права власності;
- спадкові спори;
- спори з відшкодування шкоди;
- сімейні та майнові конфлікти.

Кожен із цих спорів потребує детального аналізу, правильної кваліфікації та побудови юридично бездоганної позиції.

![](image-1.png)

## Чому юридичний супровід у цивільному спорі критично важливий

Юрист із цивільних справ оцінює докази, аналізує законодавство, формує правову позицію та представляє інтереси клієнта в суді. Головні завдання адвоката у цивільних спорах:

- визначення правової природи конфлікту;
- аналіз доказової бази;
- розробка стратегії захисту;
- підготовка позову або відзиву;
- представництво в суді;
- супровід виконання рішення.

Без професійного підходу сторони часто допускають процесуальні помилки, які впливають на результат справи.

## Досудове врегулювання цивільних спорів

Однією з ключових переваг цивільного процесу є можливість досудового вирішення конфлікту. У ряді випадків цього достатньо для захисту прав клієнта.

Ефективні інструменти досудового врегулювання:

- юридично грамотно складена претензія;
- переговори з контрагентом;
- медіація;
- підготовка мирової угоди.

Це дозволяє заощадити час, кошти та знизити ризики подальшого спору в суді.

## Судовий розгляд цивільних спорів

Якщо спору не вдалося уникнути, ключову роль відіграє стратегія представництва. Адвокат забезпечує:

- подання позову та процесуальних документів;
- участь у засіданнях;
- правильне подання доказів;
- заперечення проти позиції опонента;
- клопотання, витребування доказів, забезпечення позову.

Від якості цих дій залежить, чи буде рішення суду на користь клієнта.

![](image-2.png)

## Виконання рішення суду — завершальний етап захисту прав

Навіть вигране судове рішення має бути виконане. Тому юридичний супровід включає:

- відкриття виконавчого провадження;
- взаємодію з приватними та державними виконавцями;
- контроль за стягненням;
- оскарження незаконних дій виконавця.

Без контролю адвоката рішення може залишитися лише документом без реального результату.

---

## Concordis Legal Group — професійний захист у цивільних спорах

Наша команда представляє інтереси клієнтів у справах будь-якої складності. Ми працюємо в межах цивільного права системно та результативно: аналізуємо ситуацію, формуємо стратегію, збираємо докази та забезпечуємо повний юридичний супровід до моменту фактичного виконання рішення суду.

Ми захищаємо права, майно, інтереси та репутацію наших клієнтів — у досудовому порядку, у суді та на етапі виконання рішення.

{{< contact-form >}}
```

- [ ] **Step 4: Собрать и проверить**

```bash
rm -rf public resources
hugo --minify
grep -o 'contact-form-0-name\|contact-form-1-name' public/blog/advokat-u-kyievi-yurydychna-konsultatsiia/index.html | sort -u
grep -c 'post-card__title' public/blog/index.html
grep -c 'post-card__title' public/category/tsyvilni-spory/index.html
```
Ожидаем: первая команда — оба `contact-form-0-name` и `contact-form-1-name` присутствуют (два шорткода — два уникальных id); вторая — `3` (все три статьи в ленте); третья — `2` (обе статьи `tsyvilni-spory`).

- [ ] **Step 5: Commit**

```bash
git add content/blog/advokat-u-kyievi-yurydychna-konsultatsiia content/blog/tsyvilni-spory-yak-zakhystyty-prava
git commit -m "feat(blog): migrate remaining two articles"
```

---

## Task 9: Related posts

**Files:**
- Create: `layouts/partials/related-posts.html`
- Create: `assets/scss/components/_related-posts.scss`
- Modify: `layouts/blog/single.html`
- Modify: `assets/scss/pages/blog-post.scss`

**Interfaces:**
- Produces: `related-posts.html`, вызывается как `{{ partial "related-posts.html" . }}` в контексте статьи (`.` = текущая страница поста). Ничего не рендерит, если найдено 0 родственных постов.

- [ ] **Step 1: Создать `layouts/partials/related-posts.html`**

```html
{{ $categorySlug := "" }}
{{ with .Params.category }}{{ with index . 0 }}{{ $categorySlug = . }}{{ end }}{{ end }}
{{ $related := slice }}
{{ if $categorySlug }}
  {{ $candidates := where site.RegularPages "Section" "blog" }}
  {{ $candidates = where $candidates "Permalink" "ne" .Permalink }}
  {{ range $candidates.ByDate.Reverse }}
    {{ $ownSlug := "" }}
    {{ with .Params.category }}{{ with index . 0 }}{{ $ownSlug = . }}{{ end }}{{ end }}
    {{ if eq $ownSlug $categorySlug }}
      {{ $related = $related | append . }}
    {{ end }}
  {{ end }}
  {{ $related = first 3 $related }}
{{ end }}
{{ if $related }}
<section class="related-posts">
  <h2 class="related-posts__title">Пов'язані записи</h2>
  <div class="post-grid">
    {{ range $related }}
      {{ partial "post-card.html" . }}
    {{ end }}
  </div>
</section>
{{ end }}
```

- [ ] **Step 2: Создать `assets/scss/components/_related-posts.scss`**

```scss
@import "../base/variables";

.related-posts {
  padding-top: 24px;
}

.related-posts__title {
  @include container;
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 700;
  color: $color-white;

  @include respond-up($breakpoint-lg) {
    font-size: 28px;
  }
}
```

- [ ] **Step 3: Убрать временную защиту в `layouts/blog/single.html`**

Заменить:
```html
  {{ if templates.Exists "partials/related-posts.html" }}
    {{ partial "related-posts.html" . }}
  {{ end }}
```
на:
```html
  {{ partial "related-posts.html" . }}
```

- [ ] **Step 4: Добавить импорты в `assets/scss/pages/blog-post.scss`**

```scss
@import "components/post-hero";
@import "components/post-body";
@import "components/cases-cta";
@import "components/article-cta";
@import "components/post-card";
@import "components/related-posts";
```

- [ ] **Step 5: Собрать и проверить оба состояния (пусто / есть связанные)**

```bash
rm -rf public resources
hugo --minify
```

Пост без родственников (`kryminalne-provadzhennya` — единственный в категории):
```bash
grep -c 'related-posts' public/blog/kryminalne-provadzhennia-klyuchovi-pozytsii/index.html
```
Ожидаем `0`.

Пост с родственником (два поста `tsyvilni-spory`, каждый видит другой):
```bash
grep -o 'related-posts__title\|Цивільні спори: як ефективно' public/blog/advokat-u-kyievi-yurydychna-konsultatsiia/index.html | sort -u
grep -o 'related-posts__title\|Адвокат у Києві' public/blog/tsyvilni-spory-yak-zakhystyty-prava/index.html | sort -u
```
Ожидаем: первая — заголовок и вторую статью в списке; вторая — заголовок и первую статью в списке.

- [ ] **Step 6: Commit**

```bash
git add layouts/partials/related-posts.html assets/scss/components/_related-posts.scss \
  layouts/blog/single.html assets/scss/pages/blog-post.scss
git commit -m "feat(blog): add related posts (same category, latest 3, hidden when empty)"
```

---

## Task 10: Финальная сквозная проверка

**Files:** нет новых/изменённых файлов — только верификация.

- [ ] **Step 1: Полная чистая сборка**

```bash
cd /home/nekrasov/Work/clg-legal/clg.legal
rm -rf public resources
hugo --minify
```
Ожидаем: без единого предупреждения (`warnf`), сборка отрабатывает.

- [ ] **Step 2: Проверить, что футер есть на всех новых страницах**

```bash
for p in public/blog/index.html public/category/tsyvilni-spory/index.html public/category/kryminalne-provadzhennya/index.html \
         public/blog/kryminalne-provadzhennia-klyuchovi-pozytsii/index.html \
         public/blog/advokat-u-kyievi-yurydychna-konsultatsiia/index.html \
         public/blog/tsyvilni-spory-yak-zakhystyty-prava/index.html; do
  echo "=== $p ==="
  grep -c 'site-footer' "$p"
done
```
Ожидаем `1` (или больше) на каждой странице.

- [ ] **Step 3: Проверить, что меню "Публікації" ведёт на живую страницу**

```bash
grep -o 'href="/blog/"' public/index.html | head -1
```
Ожидаем совпадение (уже было в `hugo.toml`, но подтверждаем, что `/blog/` реально существует после сборки).

- [ ] **Step 4: Проверить, что картинка карточки и картинка хиро статьи — один и тот же файл**

```bash
grep -o 'post-card__image" src="[^"]*"' public/blog/index.html | grep -A0 'kryminalne\|kryminal'
grep -o -- '--post-hero-bg: url([^)]*)' public/blog/kryminalne-provadzhennia-klyuchovi-pozytsii/index.html
```
Ожидаем, что оба пути указывают на `.../kryminalne-provadzhennia-klyuchovi-pozytsii/cover.jpg`.

- [ ] **Step 5: Проверить деградацию `post-hero`/`post-card` без картинки**

Ни одна из 3 реальных статей не проверяет случай отсутствующего `image`. Создать временный пост без картинки, собрать, убедиться, что нет паники шаблона, затем удалить:

```bash
mkdir -p content/blog/temp-no-image-check
cat > content/blog/temp-no-image-check/index.md <<'EOF'
---
title: "Тимчасова перевірка без картинки"
description: "Службовий пост для перевірки деградації без зображення."
date: 2025-01-01
category: ["tsyvilni-spory"]
author: "CONCORDIS LEGAL GROUP"
---

Текст без картинки.
EOF
rm -rf public resources
hugo --minify
echo "exit code: $?"
grep -c 'post-hero__title' public/blog/temp-no-image-check/index.html
grep -c 'post-card__title' public/blog/index.html
rm -rf content/blog/temp-no-image-check
```
Ожидаем: `hugo --minify` завершается без ошибки шаблона (не паникует на `.Resources.GetMatch` с пустым/отсутствующим файлом), `post-hero__title` найден `1` раз (хиро отрендерился, просто без фонового изображения), `post-card__title` найден 4 раза (3 реальных поста + временный, пока он существовал). После — временный пост удалён, финальную сборку из Step 1 пересобрать заново.

```bash
rm -rf public resources
hugo --minify
```

- [ ] **Step 6: Проверить регрессию по всему сайту (список уже существующих страниц)**

```bash
for p in public/index.html public/contacts/index.html public/dohovirne-pravo/index.html; do
  echo "=== $p ==="
  grep -c 'cases-cta__panel' "$p"
done
```
Ожидаем `1` на каждой (панель формы по-прежнему рендерится ровно один раз на этих страницах — регрессии от Task 2/3 нет).

- [ ] **Step 7: Локальный dev-сервер (ручная визуальная проверка адаптива)**

```bash
rm -rf public resources
hugo server -D --disableFastRender --ignoreCache
```
Открыть `/blog/`, `/category/tsyvilni-spory/`, `/category/kryminalne-provadzhennya/`, обе-три статьи — на мобильной и десктопной ширине, убедиться, что сетка карточек, хиро статьи и форма-шорткод выглядят опрятно (это ручной шаг — автоматической браузерной проверки в этой среде нет, см. заметку в CLAUDE.md о запуске dev-сервера).

- [ ] **Step 8: Итоговый коммит (если после ручной проверки понадобились правки)**

```bash
git add -A
git status
```
Закоммитить только если Step 7 потребовал правок; в остальном плане уже закоммичено по задачам.
