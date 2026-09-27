# Блог: дизайн (спека)

Дата: 2026-09-28

## Контекст и цель

Переносим блог со старого WordPress (`clg.legal/blog/`, `clg.legal/category/<cyrillic>/`, посты вида `clg.legal/2025/08/11/<cyrillic-slug>/`) на Hugo. Источники копии — `files-for-cursor/1.html` (лента блога), `2.html`/`3.html` (страницы категорий "Цивільні спори" и "Кримінальне провадження"), `4.html`/`5.html`/`6.html` (сами статьи).

Требования от заказчика (согласовано в обсуждении):
- `/blog/` — лента карточек статей.
- `/category/<slug>/` — та же лента, отфильтрованная по категории. `<slug>` — **латиница**, хотя отображаемое название категории — кириллица (как в WP).
- Статьи на `/blog/<slug>/`, где `<slug>` — то, что редактор задаст при создании файла (в будущем — через Decap CMS). Слаг тоже латиница.
- Front matter статьи: заголовок, изображение, дата, категория, автор (+ что понадобится технически).
- Тело статьи — Markdown (с картинками), плюс возможность вставить форму обратной связи прямо в текст статьи.
- "Пов'язані записи" в конце статьи — 3 последних поста той же категории по дате; если таких нет — блок не показывается.
- На страницах блога/статьи должен быть общий футер сайта (в WP-экспорте он пустой — это WP-специфичная особенность их темы для этого типа страниц, не переносим).
- Дизайн — по образу остальных страниц сайта (partial-per-section, mobile-first SCSS, переиспользование уже существующих компонентов), а не буквальная копия устаревшей вёрстки WP.

Согласованные решения по итогам обсуждения:
1. Каждая статья — **leaf bundle**: `content/blog/<slug>/index.md` + изображения рядом в той же папке. Причина: удобно для Decap CMS (когда подключим) — редактор аплоадит медиа прямо в папку поста.
2. **Одна категория на статью** (не список). Совпадает со всеми присланными примерами; упрощает front matter и логику related posts.
3. **Автор — редактируемое поле** во front matter (`author`), с дефолтным значением `"CONCORDIS LEGAL GROUP"` для существующих постов.
4. Форма внутри статьи — **шорткод `{{< contact-form >}}`** без параметров, компактная карточка (переиспользует уже существующий `contact-panel.html`, созданный для `/contacts/`), а не полноширинная секция с каруселью кейсов.

## Из чего исходим (уже есть в проекте)

- `layouts/partials/contact-panel.html` — параметризованная "карточка формы" (заголовок/lead/соцкнопки WhatsApp-Telegram/форма), уже вынесена при работе над `/contacts/`. Принимает `dict "form" ... "titleId" ... "panelId" ...`. Сейчас id полей формы захардкожены (`cases-name`/`cases-phone`/`cases-person-type`) — это нормально, пока панель встречается на странице максимум один раз. Для шорткода статьи (может встретиться в одной статье дважды, как в `4.html`) партиал дорабатывается: добавляется параметр `idPrefix` (по умолчанию `"cases"`, чтобы существующие вызовы из `cases-cta.html`/`contact-cta.html` не меняли поведение), и все `id`/`for` атрибуты полей строятся как `{{ $idPrefix }}-name` и т.д. Шорткод передаёт уникальный `idPrefix` на каждый вызов (например, через `now.UnixNano` либо счётчик по `.Ordinal`/позиции шорткода).
- `assets/js/components/cases-cta.js` → `initCasesCta()` — инициализация формы по `[data-cases-form]`; инициализация карусели внутри уже no-op'ается, если элементов карусели нет в DOM. Можно звать эту же функцию для формы в шорткоде без изменений.
- `layouts/partials/service-hero.html` / `_service-hero.scss` — референс для нового `page-hero`/`post-hero` (структура: контейнер, breadcrumb, h1, паттерн CSS-переменной для фона).
- `hugo.toml`: `disableKinds = ["taxonomy", "term"]`, `[taxonomies]` — пустой. Это надо поменять (см. ниже) — CLAUDE.md уже фиксирует, что это ожидаемо при подключении блога.
- Меню `Публікації` уже указывает на `/blog/` (`hugo.toml`).

## Конфигурация Hugo

### Таксономия категорий

```toml
disableKinds = ["taxonomy"]   # оставляем term-страницы, но не создаём общий /category/ список всех категорий

[taxonomies]
  category = "category"        # front-matter поле "category", URL-сегмент "category" (единственное число)

[pagination]
  pagerSize = 9
```

Front matter поле статьи: `category: ["<slug>"]` (список из одного элемента — формат, совместимый с Hugo taxonomy front matter; в шаблонах читаем первый элемент).

### Категории как content-страницы (для кириллического названия и латинского slug)

```
content/category/tsyvilni-spory/_index.md         title: "Цивільні спори"
content/category/kryminalne-provadzhennya/_index.md  title: "Кримінальне провадження"
```

Эти файлы дают заголовок термину и делают `/category/<slug>/` реальной, управляемой страницей (можно задать `seo`, при желании — вступительный текст).

## Модель контента

### `content/blog/_index.md`

```yaml
title: "Блог"
layout: blog
seo: { ... }
```

### `content/blog/<slug>/index.md` (leaf bundle)

```yaml
title: "..."
description: "..."          # эксцерпт карточки + SEO fallback (как на остальных страницах через head.html)
image: "cover.jpg"          # имя файла ресурса bundle'а (не абсолютный путь!)
date: 2025-12-06
category: ["tsyvilni-spory"]
author: "CONCORDIS LEGAL GROUP"
seo: { ... }                # необязателен, есть fallback как везде
styles: [pages/blog-post]
scripts: [pages/blog-post]
bodyClass: "page-blog-post"
---
Markdown-тело статьи. Изображения — обычный markdown `![]()`,
файлы лежат в той же папке bundle'а. Форма — `{{< contact-form >}}`
в любом месте текста (можно несколько раз, как в оригинале).
```

`image` резолвится в шаблонах через `.Resources.GetMatch $.Params.image` (page resource), а не как статический `/images/...` URL — картинка физически лежит в bundle'е поста.

### Категорийная term-страница

`content/category/<slug>/_index.md`: только `title` (кириллица) + опционально `seo`.

## Layouts / Partials (новое)

| Файл | Назначение |
|---|---|
| `layouts/blog/list.html` | `/blog/`: `page-hero` (заголовок "Блог", без картинки) + пагинированная сетка `post-card` по всем постам секции `blog`, отсортированным по дате. |
| `layouts/category/term.html` | `/category/<slug>/`: `page-hero` (заголовок = `.Title` термина, лейбл "Категорія") + пагинированная сетка `post-card` по `.Pages` термина. |
| `layouts/blog/single.html` | Статья: `post-hero` → `.Content` (рендер Markdown, с уже поддерживаемым шорткодом) → `related-posts`. |
| `layouts/partials/page-hero.html` | Лёгкий текстовый хиро: контейнер, опциональный лейбл (напр. "Категорія"), `h1`. Фон — заливка `$color-primary`, без картинки. Параметры через `.Params`/явную передачу title. |
| `layouts/partials/post-hero.html` | Полноэкранный хиро статьи: фон = `image` статьи (через page resource), `h1` = заголовок, мета-строка (категория-пилюля + дата + автор). |
| `layouts/partials/post-card.html` | Карточка статьи: картинка 16:9 (`object-fit: cover`), пилюля категории, заголовок, эксцерпт (`.Params.description` или `.Summary`), мета (дата + автор). Вся карточка — один `<a>`, без отдельной кнопки "читати далі". Переиспользуется в списках и в related-posts. |
| `layouts/partials/related-posts.html` | 3 последних поста той же категории (кроме текущего), сортировка по дате убыв. Пусто → партиал ничего не рендерит (проверка `len`). |
| `layouts/partials/pagination.html` | Постраничная навигация (prev/next + номера) для `blog/list.html` и `category/term.html`. |
| `layouts/shortcodes/contact-form.html` | `{{< contact-form >}}`: рендерит `contact-panel.html` с захардкоженными данными (заголовок/lead под контекст статьи, соцсети/приватность из тех же значений, что и на `/contacts/`), в компактной обёртке по ширине текста. |

`layouts/_default/baseof.html` не трогаем — футер (`site-footer.html`) отрисуется сам, т.к. новые layouts не переопределяют блок `footer`.

## Логика related posts (`related-posts.html`)

```
{{ $category := index .Params.category 0 }}
{{ $related := first 3 (where (where (where site.RegularPages "Section" "blog") ".File.Path" "ne" .File.Path) "Params.category" "intersect" (slice $category)) }}
```//псевдокод, в реализации — через `where ... "Params.category" "in" ...` либо ручной range+append с проверкой пересечения и `ne .Permalink`, отсортировано по `.Date` (`.ByDate.Reverse`), `first 3`.

Если `len $related` = 0 — партиал не выводит секцию вообще (ни заголовка "Пов'язані записи", ни пустого контейнера).

## SCSS/JS (новое)

```
assets/scss/components/_page-hero.scss
assets/scss/components/_post-hero.scss
assets/scss/components/_post-card.scss
assets/scss/components/_pagination.scss
assets/scss/pages/blog.scss        (список + категория)
assets/scss/pages/blog-post.scss   (статья)

assets/js/pages/blog.js            (если понадобится — пагинация статична, скорее всего JS не нужен)
assets/js/pages/blog-post.js       (initCasesCta() — для формы-шорткода)
```

`assets/js/components/cases-cta.js`: `initCasesForm()` сейчас берёт форму через `document.querySelector('[data-cases-form]')` (единственную). Так как в статье шорткод `{{< contact-form >}}` может встретиться несколько раз, меняем на `document.querySelectorAll('[data-cases-form]')` и вешаем обработчик на каждую — без изменения поведения на страницах, где форма одна (home, service, contacts).

Все — mobile-first, `respond-up($breakpoint-md/lg/xl)`, переиспользование `$color-primary` и т.д. из `base/_variables.scss`, как во всех остальных компонентах.

## Миграция контента (3 существующих статьи)

Источники: `files-for-cursor/4.html`, `5.html` (категория "Цивільні спори"), `6.html` (категория "Кримінальне провадження").

| Slug | Заголовок | Категория |
|---|---|---|
| `advokat-u-kyievi-yurydychna-konsultatsiia` (пример) | Адвокат у Києві: юридична консультація та правовий супровід від Concordis Legal Group | tsyvilni-spory |
| `tsyvilni-spory-yak-efektyvno-zakhystyty-svoi-prava` (пример) | Цивільні спори: як ефективно захистити свої права в рамках цивільного права | tsyvilni-spory |
| `kryminalne-provadzhennia-klyuchovi-pravovi-pozytsii` (пример) | Кримінальне провадження: ключові правові позиції для ефективного захисту | kryminalne-provadzhennya |

Точные финальные slug'и подбираются при реализации (транслитерация заголовка, без диакритики, разумной длины). Изображения статей и карточек скачиваются из `files-for-cursor/*.html` (те же URL, что уже используются в CSS фонов на сайте — по аналогии с тем, как ранее переносили фон hero `/contacts/`) и кладутся в bundle каждого поста. Текст тела конвертируется из HTML-контента статьи в Markdown с сохранением структуры (заголовки h2, параграфы, списки, разделители), форма CF7 из тела заменяется на `{{< contact-form >}}` на том же месте (в статье 4.html форма встречается дважды в теле — сохраняем оба вхождения).

## Вне рамок (сознательно не делаем сейчас)

- Никакого image-processing пайплайна (resize/responsive srcset) для картинок статей — используем оригинал с `object-fit: cover`. Можно добавить позже.
- Decap CMS не подключаем в этой задаче — просто делаем content-структуру (leaf bundles), совместимую с ней на будущее.
- RSS/comments feed из WP не переносим.
- Общая страница `/category/` со списком всех категорий не создаётся (не нужна, в меню/дизайне не фигурирует).

## Проверка

- `hugo --minify` без предупреждений.
- `/blog/`, `/category/tsyvilni-spory/`, `/category/kryminalne-provadzhennya/`, и 3 URL статей рендерятся, футер и хедер присутствуют.
- Карточка на `/blog/` и хиро статьи используют одно и то же изображение.
- Статья без "родственников" (единственная в своей категории) не показывает секцию related posts — проверить на одном из постов, если распределение категорий это позволяет (иначе — вручную унести один пост во временную категорию для проверки и вернуть обратно, либо проверить логику через отдельный тестовый пост).
- Шорткод формы работает (валидация полей через уже существующий `initCasesForm`, срабатывает на каждый `[data-cases-form]` на странице — `querySelectorAll`, а не единственный `querySelector`, если сейчас используется последний — проверить и поправить при необходимости), рендерится дважды в одной статье (как в `4.html`) без конфликтов `id`/`for` благодаря `idPrefix`.
