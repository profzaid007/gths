# GTHS — General Tools & Hardware Suppliers

Developer handoff for a static site build for **General Tools & Hardware Suppliers (GTHS)**, a B2B tools and hardware supplier.

---

## 1. Project Overview

GTHS needs a professional, static website that showcases their product range, builds trust with trade buyers, and makes it easy for clients to request a catalogue or quote. The current repository contains a strong single-page landing foundation. The remaining work is to expand it into a multi-section, multi-page static site that fulfills the requirements below.

---

## 2. Requirements

| # | Requirement | What to build |
|---|-------------|---------------|
| 1 | **Logo Revamp** | A refreshed GTHS logo based on the existing badge-style logo. Keep the stencil/industrial feel. Provide SVG and PNG variants. |
| 2 | **Product Catalogue** | Full listing of products with categories, descriptions, specifications, and pricing. Organize under: Hand Tools, Power Tools, Fasteners & Fixings, Storage & Workbenches, Safety & Workwear. |
| 3 | **Gallery Page** | A visual gallery of products in stock, showroom shots, and project/usage images. Use a responsive grid with lightbox. |
| 4 | **Brands Page** | A dedicated page listing partner brands and manufacturers (e.g., Stanley, DeWalt, Bosch, Force, Mitutoyo). Include brand logos and short descriptions. |
| 5 | **Clientele Page** | A portfolio of businesses and industries GTHS has served. Display as a grid or list with logos and names. |
| 6 | **Testimonials Page** | Client reviews and feedback. Include star ratings, quotes, client names, and business names. |
| 7 | **Catalogue Download** | A gated PDF catalogue download. The user must fill out a contact form (name, company, email, phone, industry) before downloading the PDF. |
| 8 | **WhatsApp Button** | A floating WhatsApp button that links to the client's WhatsApp number for quick inquiries. |

---

## 3. Current State

The file `gths.html` is a polished, single-page landing page that already includes:

- **Utility bar:** Free delivery notice, trade login, phone number.
- **Sticky header:** Logo, navigation, search, account, cart, mobile hamburger menu.
- **Hero section:** "Tools That Earn Their Keep" headline with a custom SVG drill illustration.
- **Categories section:** 6 category cards (Hand Tools, Power Tools, Fasteners & Fixings, Storage & Workbenches, Safety & Workwear, Adhesives & Sealants).
- **Bestsellers section:** 5 product cards with ratings, prices, and discounts.
- **Why GTHS section:** Trust message, stats, and verification quote.
- **Brands strip:** 5 brand tiles (currently text-only placeholders).
- **Value props section:** Free delivery, genuine guarantee, trade pricing, real advice.
- **Catalogue Download CTA:** Gated form on the home page for downloading the PDF catalogue.
- **Footer:** Links, newsletter signup, social links.
- **Design system:** Industrial dark theme with red accents, stencil display fonts, brushed metal textures, pegboard and blueprint patterns.
- **Responsive:** Mobile hamburger menu, responsive grid layouts.

---

## 4. Remaining Work

### 4.1 Pages to Add

Convert the single page into a multi-page site. Recommended pages:

1. `index.html` — Home (current landing page, updated). Includes the gated catalogue download form.
2. `pages/products.html` — Product catalogue with category filters and search.
3. `pages/product-detail.html` — Individual product page (template for each product).
4. `pages/gallery.html` — Image gallery.
5. `pages/brands.html` — Partner brands page.
6. `pages/clients.html` — Clientele page.
7. `pages/testimonials.html` — Testimonials page.
8. `pages/about.html` — About GTHS (optional but recommended).
9. `pages/contact.html` — Contact page.

### 4.2 Components to Add

- **WhatsApp floating button:** Fixed bottom-right button linking to the client's WhatsApp number. Use a recognizable WhatsApp icon.
- **Logo files:** Replace the inline logo badge with a proper logo image once the revamp is complete. Keep the fallback text logo as an alt.
- **Real product images:** The current product cards use SVG icons. Replace with actual product photography for production.
- **Real brand logos:** The brands section has text placeholders. Replace with actual brand logo files (e.g., `assets/logos/stanley.svg`).
- **Catalogue PDF:** Place the downloadable catalogue at `assets/catalogue/gths-catalogue.pdf`.
- **Gated download form:** The form lives on `index.html` and collects user info before showing the download link.
- **Breadcrumb navigation:** Add breadcrumbs on inner pages.
- **SEO meta tags:** Add title, description, and Open Graph tags to every page.

### 4.3 Data & Content

You will need the client to provide:

- High-resolution product images (JPEG/PNG, 1:1 or 4:3 ratio).
- Product list with names, descriptions, specifications, prices, and SKUs.
- Brand logos and partner information.
- Client list (business names, logos, industries).
- Testimonials (quotes, names, business names, ratings).
- Catalogue PDF file.
- Any other business details (store hours, GSTIN, etc.).

---

## 5. Design System

Preserve the existing design system. All styles should be consistent with `gths.html`.

### 5.1 Colors

```css
--black-950: #0B0B0C;
--black-900: #131315;
--black-800: #1D1D1F;
--black-700: #2A2A2C;
--steel-500: #6E6E6E;
--steel-300: #9C9C9C;
--bone: #F2F2F2;
--paper: #FFFFFF;
--yellow-300: #F4D03F;
--yellow-500: #F1C40F;
--yellow-700: #B7950B;
--yellow-600: #D4AC0D;
--ink: #121214;
```

### 5.2 Typography

- **Headings/Display:** `Big Shoulders Display` (weights 600–900).
- **Stencil accents:** `Big Shoulders Stencil Display` (weights 700, 900).
- **Body text:** `Inter` (weights 400–800).
- **Mono/labels:** `JetBrains Mono` (weights 400–600).

### 5.3 Textures

- `tex-brushed` — Dark brushed metal background.
- `tex-pegboard` — Light pegboard grid background.
- `tex-blueprint` — Blueprint grid with red accent background.
- `tex-diamond` — Diamond plate metal overlay.
- `noise-overlay` — Global subtle noise overlay.

### 5.4 Components

- Buttons: `.btn`, `.btn-solid`, `.btn-outline`, `.btn-dark`.
- Cards: `.cat-card`, `.prod-card`, `.brand-tile`, `.value-item`.
- Forms: `.trade-form`, `.footer-news-form`.
- Icons: inline SVG, stroke-based, yellow accent color.

### 5.5 Layout

- Container max-width: `1240px`.
- Section padding: `104px` vertical.
- Border radius: `6px` for cards, `4px` for buttons.

---

## 6. File Structure

```
/
├── index.html              (home page + gated catalogue download form)
├── pages/
│   ├── products.html
│   ├── product-detail.html
│   ├── gallery.html
│   ├── brands.html
│   ├── clients.html
│   ├── testimonials.html
│   ├── about.html
│   └── contact.html
├── css/
│   └── styles.css          (shared styles)
├── js/
│   └── main.js             (shared scripts)
├── assets/
│   ├── images/
│   │   ├── products/       (product photos)
│   │   ├── gallery/        (gallery images)
│   │   ├── clients/        (client logos)
│   │   └── hero/           (hero images if needed)
│   ├── logos/
│   │   ├── gths-logo.svg   (revamped logo)
│   │   └── gths-logo.png
│   └── catalogue/
│       └── gths-catalogue.pdf
├── gths.html               (original single-page reference)
└── README.md
```

---

## 7. Development Checklist

### Phase 1: Setup & Cleanup
- [x] Extract inline CSS from `gths.html` into `css/styles.css`.
- [x] Extract inline JS from `gths.html` into `js/main.js`.
- [ ] Set up a shared HTML template/head snippet for all pages.
- [x] Add SEO meta tags to all pages.
- [ ] Set up a local development server (e.g., `npx serve` or `python3 -m http.server`).

### Phase 2: Logo & Branding
- [ ] Design and export the revamped GTHS logo.
- [ ] Replace the inline badge logo in the header and footer with the new logo.
- [ ] Add favicon.

### Phase 3: Product Catalogue
- [ ] Build `pages/products.html` with category filters and search.
- [ ] Create product data structure (JSON or hardcoded HTML cards).
- [x] Build `pages/product-detail.html` template.
- [ ] Add representative products across all categories.

### Phase 4: Gallery
- [x] Build `pages/gallery.html` with a responsive grid.
- [ ] Add lightbox behavior (e.g., using a lightweight library or custom JS).
- [ ] Add alt text and captions.

### Phase 5: Brands, Clients, Testimonials
- [x] Build `pages/brands.html` with partner brand logos.
- [x] Build `pages/clients.html` with clientele list.
- [x] Build `pages/testimonials.html` with reviews and ratings.

### Phase 6: Download & WhatsApp
- [x] Add gated catalogue download form to `index.html`.
- [x] Add form validation and download trigger.
- [x] Add floating WhatsApp button to all pages.

### Phase 7: Polish & QA
- [ ] Test responsive layout on mobile, tablet, and desktop.
- [x] Test all links and navigation.
- [ ] Test form submissions (trade CTA, newsletter, download, contact).
- [x] Validate HTML parses cleanly.
- [ ] Validate CSS.
- [ ] Optimize images (compress, use WebP where appropriate).
- [ ] Add lazy loading to images.
- [ ] Test reduced-motion preferences.
- [ ] Test accessibility (keyboard navigation, alt text, ARIA labels).

### Phase 8: Launch
- [ ] Deploy to client hosting.
- [ ] Verify download link and WhatsApp number.
- [ ] Submit site to search engines (optional).

---

## 8. Important Notes

- **Static site only:** This is a static HTML/CSS/JS project. No backend or database is required.
- **Forms:** Form submissions can be handled via a form backend service (e.g., Formspree, Netlify Forms, Google Forms) or by the client later. Document which approach is used.
- **Images:** The current SVG product illustrations are placeholders. Production must use real product photos.
- **Brand logos:** Use official brand logos. Ensure usage is permitted.
- **Hosting and domain:** Not included in the project fee. The client must arrange these separately.
- **Phone / WhatsApp:** Replace placeholder numbers with the client's actual numbers before launch.
- **Currency:** All prices are in Indian Rupees (`₹`).

---

## 9. Timeline

Phases:
1. Discovery & Planning
2. Design & Layout
3. Content & Images
4. Testing & Review
5. Launch
6. Support SLA

---

## 10. Quick Start

To view the current site locally:

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js
npx serve .
```

Then open `http://localhost:8000/index.html`.

---

## 11. Deliverables

- [ ] Fully functional static website with all required pages (placeholder pages created).
- [x] Source code (this repository).
- [ ] Revamped GTHS logo files.
- [ ] Catalogue PDF placed in `assets/catalogue/`.
- [ ] Deployment to client hosting.
- [x] Handoff documentation (this README).

---
