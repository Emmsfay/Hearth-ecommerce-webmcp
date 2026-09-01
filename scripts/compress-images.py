from pathlib import Path

try:
    from PIL import Image
except ImportError:
    raise SystemExit("NO_PIL")

src_dir = Path("/home/emmanuelchukwudi/hearth/public/products")
for path in sorted(src_dir.glob("*.jpg")):
    img = Image.open(path).convert("RGB")
    img.thumbnail((1200, 1200))
    img.save(path, "JPEG", quality=78, optimize=True, progressive=True)
    print(f"{path.name} {path.stat().st_size}")
