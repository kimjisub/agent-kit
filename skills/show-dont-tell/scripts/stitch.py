"""shot.mjs 가 나눠 찍은 조각을 한 장으로 잇고, 원하면 잘라 낸다.

    python3 stitch.py <조각 폴더> <출력 폴더>
    python3 stitch.py <조각 폴더> <출력 폴더> --crop crops.json

<name>__steps.json 이 있는 것은 조각을 스크롤 위치대로 붙여 <name>.png 로, 조각이 아닌 png 는
그대로 복사한다. crops.json 은 {"이름": [x1, y1, x2, y2]} 이고 이은 뒤 원본 좌표로 자른다
(사이드바를 빼고 본문만 싣거나, 긴 화면에서 논점 구간만 남길 때). 잘린 좌표가 이미지 밖이면
이미지 끝까지만 자른다.

출력은 파일마다 한 줄 "이름 (폭, 높이)". 이은 결과는 반드시 Read 로 열어 이음매를 본다 -
고정 요소를 못 풀었으면 같은 머리줄이 조각마다 반복된다.
"""
import glob
import json
import os
import shutil
import sys

from PIL import Image


def stitch(src, out, crops):
    os.makedirs(out, exist_ok=True)
    done = set()
    for meta_path in sorted(glob.glob(f"{src}/*__steps.json")):
        name = os.path.basename(meta_path)[: -len("__steps.json")]
        meta = json.load(open(meta_path))
        parts = [Image.open(f"{src}/{name}__{i}.png").convert("RGB") for i in range(len(meta["steps"]))]
        scale = parts[0].height / meta["h"]
        height = int(min(meta["steps"][-1] + meta["h"], meta["sh"]) * scale)
        canvas = Image.new("RGB", (parts[0].width, height))
        for top, part in zip(meta["steps"], parts):
            canvas.paste(part, (0, int(top * scale)))
        save(canvas, name, out, crops)
        done.add(name)
    for path in sorted(glob.glob(f"{src}/*.png")):
        name = os.path.basename(path)[:-4]
        if "__" in name or name in done:
            continue
        save(Image.open(path).convert("RGB"), name, out, crops)


def save(img, name, out, crops):
    if name in crops:
        x1, y1, x2, y2 = crops[name]
        img = img.crop((x1, y1, min(x2, img.width), min(y2, img.height)))
    img.save(f"{out}/{name}.png", optimize=True)
    print(name, img.size)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    crops = {}
    if "--crop" in sys.argv:
        crops = json.load(open(sys.argv[sys.argv.index("--crop") + 1]))
    stitch(sys.argv[1], sys.argv[2], crops)
