# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static single-page website listing all Caldecott Medal winners and Honor Books (1938–2026). No build system, no dependencies, no package manager.

## Architecture

- **index.html**: Self-contained page with embedded CSS (in `<style>`), inline JavaScript, and all book data hardcoded in HTML
- **llms.txt**: LLM-friendly summary of site content for AI crawlers
- **sitemap.xml / robots.txt / site.webmanifest**: Standard web metadata files

## Development

No build step. Edit `index.html` directly and open in browser to test.

To serve locally with live reload (optional):

```bash
npx serve .
# or
python -m http.server 8000
```

## Key Patterns

- All book entries are `<article class="card">` elements with consistent structure
- Filter/search is client-side JavaScript embedded in index.html
- CSS uses CSS variables for theming, mobile-first with breakpoints at 600px and 400px
- Amazon affiliate links use consistent URL pattern

## Data Updates

When adding new Caldecott winners:

1. Add new `<article class="card">` to the book grid in index.html
2. Update year range in page title, meta description, and llms.txt
3. Update sitemap.xml lastmod date
