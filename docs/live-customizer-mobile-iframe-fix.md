# Live customizer mobile iframe fix

This patch is for the Shopify customizer section at:

`shopify-theme/sections/dtf-customizer-page.liquid`

## Problem

On mobile live view, the DTF Designer Pro iframe can be shorter than the app content. This causes the bottom of the customizer, including Upload Artwork / Add to Cart areas, to be clipped and can make the footer appear too high.

## Safe fix

Update the customizer iframe wrapper so mobile gets a taller default height and visible vertical overflow while still hiding horizontal overflow.

### CSS changes

In `.dtf-customizer-page`:

```css
width: 100%;
box-sizing: border-box;
overflow: visible;
```

In `.dtf-customizer-page__frame-wrap`:

```css
overflow: visible;
background: #0b0b0f;
```

In `.dtf-customizer-page__iframe`:

```css
max-width: 100%;
background: #0b0b0f;
```

In the mobile media query:

```css
#shopify-section-{{ section.id }} .dtf-customizer-page {
  max-width: 100%;
  padding: var(--mobile-padding);
  min-height: var(--mobile-min-height);
  border-radius: 0;
  overflow-x: hidden;
  overflow-y: visible;
}

#shopify-section-{{ section.id }} .dtf-customizer-page__frame-wrap,
#shopify-section-{{ section.id }} .dtf-customizer-page__iframe {
  min-height: var(--mobile-min-height);
  height: var(--mobile-min-height);
  border-radius: 0;
}
```

### Default height changes

Change desktop height default:

```json
{ "type": "range", "id": "desktop_height", "label": "Desktop height", "min": 700, "max": 1800, "step": 20, "default": 1500, "unit": "px" }
```

Change mobile height default:

```json
{ "type": "range", "id": "mobile_height", "label": "Mobile height", "min": 900, "max": 2400, "step": 20, "default": 1900, "unit": "px" }
```

### iframe attributes

Use eager loading and allow clipboard/fullscreen:

```liquid
allow="clipboard-read; clipboard-write; fullscreen"
loading="eager"
```

## QA checklist

After applying:

1. Open `/pages/customizer` on iPhone/mobile live view.
2. Confirm the canvas is centered and not pushed right.
3. Confirm Upload Artwork is visible.
4. Confirm Add to Cart / preview area is not clipped.
5. Confirm footer starts below the full customizer, not inside it.
6. Confirm desktop still shows the full customizer without extra horizontal overflow.
