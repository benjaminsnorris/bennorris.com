# Books Section Design

## Overview

Add a Books section to bennorris.com following the same collection pattern as Apps. Each book has a listing entry, a detail page, and password-protected access to the full book HTML content.

## Collection & Listing Page

- New `_books` Jekyll collection in `_config.yml` with `output: true` and `permalink: /:collection/:path/`
- Front matter defaults for `_books`: layout `post`, `read_time: false`, `excerpt_separator: "<!--more-->"`
- `books.md` listing page at `/books/` using the `collection` layout with `entries_layout: grid`
- Add `books.md` to `navigation_pages` in `_data/theme.yml`

## Book Entry Schema

Each book is a markdown file in `_books/` with front matter:

```yaml
title: Book Title
date: YYYY-MM-DD HH:MM:SS-0600
sub_title: Tagline or subtitle
cover_image: /books/book-name/cover.png
book_path: /books/book-name/
```

The body contains a description and press kit info, with `<!--more-->` separating the excerpt.

## Book Detail Pages

Each `_books/book-name.md` renders using the default `post` layout. Content includes:
- Cover image
- Description and press kit material
- A "Read Book" button linking to the password-protected book HTML at `book_path`

## Book HTML Content

Each book's full HTML lives in its own directory at the site root:
- `/books/book-name/index.html` — password gate wrapper
- `/books/book-name/content.html` — actual book HTML
- `/books/book-name/cover.png` — cover image

The gate wrapper loads a shared JS file and, on correct password, loads the book content.

## Password Gate

A client-side JavaScript password gate:
- Shared script at `/assets/js/book-gate.js`
- Shows a simple password form styled to match the site
- On correct password, stores a flag in `localStorage` so re-entry isn't needed per visit
- Loads the book content (via fetch or iframe) once authenticated
- Single shared password across all books, defined in the JS file
- Not cryptographically secure — keeps casual visitors out

## Entry Template Update

Update `_includes/entry.html` to handle book entries:
- If `post.book_path` exists, render a "Read Book" `.btn` styled button (same pattern as the `external_link` CTA added for Bank)

## Navigation

Add `books.md` to `navigation_pages` in `_data/theme.yml` between existing entries.

## File Changes Summary

- `_config.yml` — add `books` collection and front matter defaults
- `_data/theme.yml` — add `books.md` to navigation
- `books.md` — new listing page
- `_books/` — new directory for book entries (user creates per-book .md files)
- `books/` — new directory for book HTML content (user adds per-book directories)
- `_includes/entry.html` — add `book_path` CTA condition
- `assets/js/book-gate.js` — new password gate script
- `books/gate.html` — shared gate wrapper template (or each book's index.html includes it)
