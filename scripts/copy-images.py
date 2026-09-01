import os
import shutil

src = "/mnt/c/Users/Emmanuel.Chukwudi.HLA-HQ-IT-EC/.cursor/projects/wsl-localhost-Ubuntu-24-04-home-emmanuelchukwudi-hearth/assets"
dst = "/home/emmanuelchukwudi/hearth/public/products"
os.makedirs(dst, exist_ok=True)

names = ["mug", "napkins", "skillet", "board", "bowl", "candles", "soap", "throw"]
for name in names:
    source = os.path.join(src, f"{name}.jpg")
    target = os.path.join(dst, f"{name}.jpg")
    if os.path.isfile(source):
        shutil.copy2(source, target)
        print(f"copied {name} ({os.path.getsize(target)} bytes)")
    else:
        print(f"missing {source}")
