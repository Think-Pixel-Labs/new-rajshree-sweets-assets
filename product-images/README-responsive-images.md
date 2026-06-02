# Product image responsive variants

Each product image set (folder with `1.jpg` / `1.webp`, etc.) gets three WebP tiers:

| Folder   | Width | Quality | Use case                          |
|----------|-------|---------|-----------------------------------|
| `thumb/` | 400px | 76      | Shop grid, kiosk, menu, listings  |
| `card/`  | 640px | 78      | Homepage featured, tablet cards   |
| `detail/`| 1200px| 82      | Hampers gallery, admin preview    |

Example layout:

```
Product Name/
  1.webp          (legacy master — kept for fallback)
  thumb/1.webp
  card/1.webp
  detail/1.webp
  variant-id/
    thumb/1.webp
    ...
```

## Generate / refresh variants

```bash
cd ASSETS/product-images
node generate-responsive-variants.cjs          # skip existing outputs
node generate-responsive-variants.cjs --overwrite  # rebuild all tiers
node generate-responsive-variants.cjs --dry-run
```

Upload the new `thumb/`, `card/`, and `detail/` folders to the assets CDN alongside existing files.
