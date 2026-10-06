# clg.legal

Статичний сайт [Concordis Legal Group](https://clg.legal/) на Hugo.

## Структура

```
assets/
  scss/
    base/           # змінні, reset, типографіка
    components/     # стилі компонентів (header, hero, …)
    pages/          # стилі сторінок з імпортами компонентів
  js/
    components/     # JS компонентів
    pages/          # JS сторінок з імпортами компонентів
content/            # контент (Markdown)
layouts/
  _default/baseof.html
  partials/
static/images/      # зображення
```

## Запуск

Потрібен [Hugo Extended](https://gohugo.io/installation/) (перевір: `hugo version` → має бути `extended`):

```bash
hugo server -D --disableFastRender --ignoreCache
```

**Чому саме так:** SCSS компілюється через Hugo Pipes і кешується в `resources/`. Звичайний `hugo server -D` інколи не перезбирає імпортовані файли (`components/_hero.scss` тощо), а браузер тримає старий CSS.

Якщо зміни все одно не видно:

```bash
rm -rf public resources
hugo server -D --disableFastRender --ignoreCache
```

Потім у браузері: **Ctrl+Shift+R** (жорстке оновлення).

Збірка для продакшену:

```bash
hugo --minify
```

## SEO

Мета-дані задаються у front matter кожної сторінки через блок `seo`:

```yaml
seo:
  title: "..."
  description: "..."
  ogImage: "/images/hero-person.png"
  robots: "index, follow"
```

## Статус

- [x] Header
- [x] Hero (головна)
- [x] Інші секції головної
- [x] Блог
- [x] Decap CMS + Netlify
