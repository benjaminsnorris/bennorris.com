# Books Section Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Books section to bennorris.com with a grid listing page, individual detail pages, and client-side password-protected access to full book HTML content.

**Architecture:** New `_books` Jekyll collection following the same pattern as `_apps`. Book HTML content lives in `/books/<name>/` directories with a shared JS password gate. The entry template gets a `book_path` condition for a "Read Book" button.

**Tech Stack:** Jekyll collections, Liquid templates, vanilla JavaScript (password gate)

---

## Chunk 1: Jekyll Collection & Listing Page

### Task 1: Add books collection to Jekyll config

**Files:**
- Modify: `_config.yml:93-102` (collections block)
- Modify: `_config.yml:104-140` (defaults block)

- [ ] **Step 1: Add books collection**

In `_config.yml`, add `books` to the `collections` block after `apps`:

```yaml
  books:
    output: true
    permalink: /:collection/:path/
```

- [ ] **Step 2: Add front matter defaults for books**

In `_config.yml`, add a new defaults entry after the `_apps` block:

```yaml
  - scope:
      path: "_books"
      type: books
    values:
      layout: post
      read_time: false
      excerpt_separator: "<!--more-->"
```

- [ ] **Step 3: Commit**

```bash
git add _config.yml
git commit -m "Add books collection to Jekyll config"
```

### Task 2: Create books listing page

**Files:**
- Create: `books.md`

- [ ] **Step 1: Create the listing page**

Create `books.md` at the project root:

```yaml
---
title: Books
layout: collection
permalink: /books/
collection: books
inner_class: wide
entries_layout: grid
sort_by: date
sort_order: reverse
---

I have been working on writing a few books. Here they are with more information about each one.
```

- [ ] **Step 2: Commit**

```bash
git add books.md
git commit -m "Add books listing page"
```

### Task 3: Add books to site navigation

**Files:**
- Modify: `_data/theme.yml:32-38`

- [ ] **Step 1: Add books.md to navigation_pages**

Add `books.md` to the `navigation_pages` list. Place it after `shop/index.md`:

```yaml
navigation_pages:
  - archive.md
  - sketchnoting/index.md
  - speaking.md
  - shop/index.md
  - books.md
  - now.md
```

- [ ] **Step 2: Commit**

```bash
git add _data/theme.yml
git commit -m "Add books to site navigation"
```

### Task 4: Add book_path CTA to entry template

**Files:**
- Modify: `_includes/entry.html:68-72`

- [ ] **Step 1: Add book_path condition**

In `_includes/entry.html`, add an `elsif` for `post.book_path` after the `external_link` block (line 72), before `{% endif %}`:

```liquid
  {% elsif post.book_path %}
    <div class="entry-download">
      <a href="{{ post.book_path | relative_url }}" class="btn">Read Book</a>
    </div>
```

The full conditional block should read:

```liquid
  {% if post.app_id %}
    <div class="entry-download">
      <a target="_blank" class="clean" href="https://itunes.apple.com/app/apple-store/id{{ post.app_id }}?mt=8"><img src="https://raw.githubusercontent.com/benjaminsnorris/media.bsn.design/gh-pages/images/app-store-badge.svg" alt="Download on the app store"/></a>
    </div>
  {% elsif post.external_link %}
    <div class="entry-download">
      <a href="{{ post.external_link | relative_url }}" class="btn">Launch App</a>
    </div>
  {% elsif post.book_path %}
    <div class="entry-download">
      <a href="{{ post.book_path | relative_url }}" class="btn">Read Book</a>
    </div>
  {% endif %}
```

- [ ] **Step 2: Commit**

```bash
git add _includes/entry.html
git commit -m "Add Read Book CTA for book entries"
```

## Chunk 2: Password Gate

### Task 5: Create password gate JavaScript

**Files:**
- Create: `assets/js/book-gate.js`

- [ ] **Step 1: Create the gate script**

Create `assets/js/book-gate.js`:

```javascript
(function () {
  var PASSWORD = "CHANGE_ME";
  var STORAGE_KEY = "book-access-granted";

  function isAuthenticated() {
    return localStorage.getItem(STORAGE_KEY) === PASSWORD;
  }

  function showGate() {
    var container = document.getElementById("book-gate");
    container.innerHTML =
      '<div class="gate-box">' +
      "<h2>This book is password-protected</h2>" +
      "<p>Enter the password to continue reading.</p>" +
      '<form id="gate-form">' +
      '<input type="password" id="gate-password" placeholder="Password" autocomplete="off" />' +
      '<button type="submit" class="gate-btn">Submit</button>' +
      '<p id="gate-error" style="display:none;color:#c0392b;margin-top:0.5em;">Incorrect password.</p>' +
      "</form>" +
      "</div>";

    document.getElementById("gate-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var input = document.getElementById("gate-password").value;
      if (input === PASSWORD) {
        localStorage.setItem(STORAGE_KEY, PASSWORD);
        loadContent();
      } else {
        document.getElementById("gate-error").style.display = "block";
      }
    });
  }

  function loadContent() {
    var container = document.getElementById("book-gate");
    var contentPath = container.getAttribute("data-content");
    var xhr = new XMLHttpRequest();
    xhr.open("GET", contentPath, true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        container.innerHTML = xhr.responseText;
      } else {
        container.innerHTML = "<p>Unable to load book content.</p>";
      }
    };
    xhr.onerror = function () {
      container.innerHTML = "<p>Unable to load book content.</p>";
    };
    xhr.send();
  }

  if (isAuthenticated()) {
    loadContent();
  } else {
    showGate();
  }
})();
```

- [ ] **Step 2: Commit**

```bash
git add assets/js/book-gate.js
git commit -m "Add client-side password gate for books"
```

### Task 6: Create gate page template

**Files:**
- Create: `_layouts/book-gate.html`

- [ ] **Step 1: Create the layout**

Create `_layouts/book-gate.html`. This is a standalone HTML page (not using Jekyll's `default` layout) so it works for raw HTML book directories:

```html
---
---
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ page.title | default: "Book" }} — Ben Norris</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #333;
      background: #f9f9f9;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
    }
    .gate-box {
      background: #fff;
      padding: 2.5rem;
      border-radius: 0.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      max-width: 400px;
      width: 100%;
      text-align: center;
    }
    .gate-box h2 {
      margin-bottom: 0.5rem;
    }
    .gate-box p {
      margin-bottom: 1.5rem;
      color: #666;
    }
    #gate-password {
      width: 100%;
      padding: 0.6rem 0.8rem;
      border: 1px solid #ccc;
      border-radius: 0.25em;
      font-size: 1rem;
      margin-bottom: 1rem;
    }
    .gate-btn {
      display: inline-block;
      padding: 0.5em 1.5em;
      border: none;
      border-radius: 0.25em;
      background-color: #00838a;
      color: #fff;
      font-size: 1rem;
      font-weight: bold;
      cursor: pointer;
      transition: background-color 0.3s;
    }
    .gate-btn:hover {
      background-color: #009aa3;
    }
  </style>
</head>
<body>
  <div id="book-gate" data-content="{{ page.content_path }}"></div>
  <script src="/assets/js/book-gate.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add _layouts/book-gate.html
git commit -m "Add book gate layout template"
```

## Chunk 3: Example Book Entry & Directory

### Task 7: Create the _books directory and a placeholder entry

**Files:**
- Create: `_books/.gitkeep`

- [ ] **Step 1: Create the _books directory**

```bash
mkdir -p _books
touch _books/.gitkeep
```

- [ ] **Step 2: Create the books content directory**

```bash
mkdir -p books
```

- [ ] **Step 3: Commit**

```bash
git add _books/.gitkeep
git commit -m "Add empty _books collection directory"
```

### Task 8: Create an example book entry for reference

**Files:**
- Create: `_books/_example-book.md.template` (not processed by Jekyll due to underscore/extension)

- [ ] **Step 1: Create the example template**

Create `_books/EXAMPLE.md` as a reference (this will show up in the collection but can be removed later — or prefix with underscore to hide):

Actually, just document the schema in the plan. The user will create real entries. No example file needed.

**Book entry schema for reference:**

```yaml
---
title:          "Book Title"
date:           2026-01-01 12:00:00-0600
sub_title:      "A subtitle or tagline"
app_image:      /books/book-name/cover.png
book_path:      /books/book-name/
---

A short description of the book that appears in the grid listing.

<!--more-->

## Press Kit

Extended description, press materials, author notes, etc.
```

**Book content directory structure:**

```
books/
  book-name/
    index.html    <- uses book-gate layout (or raw HTML with gate script)
    content.html  <- actual book HTML (fetched by gate.js)
    cover.png     <- cover image
```

**Gate page (`books/book-name/index.html`):**

```html
---
title: "Book Title"
layout: book-gate
content_path: /books/book-name/content.html
---
```

This is a minimal front matter file that tells Jekyll to use the `book-gate` layout and points to the content file.

- [ ] **Step 2: Commit directory**

```bash
git add _books/.gitkeep
git commit -m "Add books collection and content directories"
```

---

**Plan complete.** Tasks 1-6 set up all the infrastructure. Task 7 creates the directories. You'll add your actual book entries and HTML content as you're ready.
