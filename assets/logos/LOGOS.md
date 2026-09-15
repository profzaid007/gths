# Logo Asset Report

Source PDF: `assets/catalogue/catalouges wisdom-1.pdf`
Extraction and sourcing date: 2026-09-14

## Summary

- 34 logo candidates selected from the PDF
- 30 unique brand logos retained in `assets/logos/`
- 1 duplicate removed: `bosch-red.png` (kept the single Bosch SVG)
- 1 brand added by request: **Jindal Star**
- Where possible, extracted JPEGs/PNGs were replaced with transparent SVG or PNG versions sourced from official sites, Wikimedia Commons, CompaniesLogo, Brandlogos.net, WorldVectorLogo, SeekVectorLogo, Logovectordl, or the brand's own website.

## Final Logo Files

| File | Brand | Source | Format | Notes |
|------|-------|--------|--------|-------|
| `3m.svg` | 3M | Wikimedia Commons / logo.wine | SVG | Transparent wordmark |
| `abro.png` | ABRO | Logovectordl.com | PNG | Cropped to remove white background leak |
| `addison.svg` | Addison Cutting Tools | Official: addison.co.in | SVG | High-resolution official logo |
| `anchor-by-panasonic.svg` | Anchor by Panasonic | Logo.wine | SVG | Transparent official logo |
| `apl.png` | APL Stainless Steel Fasteners | Official: aplhome.com | PNG | Transparent official logo |
| `asian-paints.svg` | Asian Paints | Wikimedia Commons | SVG | Transparent vector |
| `berger-paints.svg` | Berger Paints | WorldVectorLogo / manual | SVG | High-resolution transparent vector |
| `bosch.svg` | Bosch | Wikimedia Commons | SVG | Transparent vector |
| `crompton.svg` | Crompton Greaves | Wikimedia Commons | SVG | Transparent vector |
| `dewalt.svg` | DEWALT | Brandlogos.net | SVG | Transparent vector |
| `finolex.png` | Finolex Pipes | Extracted from PDF | PNG | Existing transparent file |
| `groz.svg` | Groz | SeekVectorLogo | SVG | Transparent vector |
| `janatics.png` | Janatics | Brandlogos.net | PNG | High-resolution transparent wordmark |
| `jindal-star.png` | Jindal Star | Official: jindal.com | PNG | Added by request; official brand logo |
| `legrand.svg` | Legrand | logo.wine | SVG | Transparent vector |
| `loctite.svg` | Loctite | Brandlogos.net | SVG | Transparent vector |
| `lt.png` | L&T (Larsen & Toubro) | LogoEPS / manual | PNG | Transparent logo |
| `makita.svg` | Makita | Wikimedia Commons | SVG | Transparent vector |
| `mitutoyo.svg` | Mitutoyo | Wikimedia Commons | SVG | Transparent vector |
| `philips.svg` | Philips | logo.wine | SVG | Transparent vector (legacy shield) |
| `pidilite.png` | Pidilite | CompaniesLogo.com | PNG | Transparent official PNG |
| `polycab.png` | Polycab Wires & Cables | CompaniesLogo.com | PNG | Transparent official PNG |
| `rubinetterie-bresciane.png` | Rubinetterie Bresciane | Official: rubinetteriebresciane.it | PNG | Transparent official logo |
| `saint-gobain.svg` | Saint-Gobain Abrasives | logo.wine | SVG | Transparent vector |
| `schneider-electric.svg` | Schneider Electric | logo.wine | SVG | Transparent vector |
| `stanley.svg` | Stanley | Wikimedia Commons | SVG | Transparent vector |
| `taparia.png` | Taparia Tools | SeekLogo / manual | PNG | Transparent official logo |
| `tohnichi.png` | Tohnichi | Official: en.global-tohnichi.com | PNG | English global brand lockup (replaced Japanese-text version) |
| `unoair.png` | Unoair Pneumatics | Official: unoair.com.tw | PNG | Official wordmark |
| `v-guard.svg` | V-Guard | WorldVectorLogo | SVG | Transparent vector |

## Display Treatment

The Brands page and home-page brand strip use light tiles on the site's bone/light background. Light-colored logos (Anchor, APL, Groz text, etc.) get a subtle dark drop-shadow so they remain visible without changing the tile background.

## Quality Notes

- **Transparent SVG/PNG achieved for:** 3M, Anchor by Panasonic, APL, Asian Paints, Berger Paints, Bosch, Crompton, DEWALT, Legrand, Loctite, L&T, Makita, Mitutoyo, Philips, Pidilite, Polycab, Rubinetterie Bresciane, Saint-Gobain, Schneider Electric, Stanley, Taparia, Tohnichi, V-Guard.
- **White-background leaks removed:** Groz, ABRO (cropped to content bounding box).
- **Replaced low-quality/extracted versions:** Berger (→ SVG), Tohnichi (→ English global lockup), Addison (→ official SVG), Janatics (→ high-res transparent PNG).

## Brands Page Usage

All logos are referenced from `/assets/logos/<file>` on the Brands page. The shared `.brand-logo` class displays them at `max-height: 70px` (desktop) / `max-height: 52px` (mobile) inside dark `.brand-tile` containers.

## Recommended Next Steps

1. Have the client confirm brand usage rights for all logos before public launch.
