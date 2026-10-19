"""캡처에 100px 격자와 좌표 눈금을 얹는다. 하이라이트 박스 좌표를 실측할 때 쓴다.

    python grid_overlay.py shots/before-list.png /tmp/grid.png
    python grid_overlay.py shots/before-list.png /tmp/grid.png --crop 0,300,1560,1200

crop 을 주면 그 영역만 잘라 크게 보여준다. 이때 눈금 숫자는 잘려 나가므로
원본 좌표 = 표시 좌표 + crop 의 (x1, y1) 로 환산한다.

읽은 값을 그대로 annotate.py 의 boxes 에 넣으면 된다. 격자 없이 눈대중으로
좌표를 넣으면 거의 항상 한 열이나 한 행씩 밀린다.
"""
import sys
from PIL import Image, ImageDraw, ImageFont

FONT_CANDIDATES = [
    "/System/Library/Fonts/AppleSDGothicNeo.ttc",
    "/Library/Fonts/Arial Unicode.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]


def _font(size=13):
    import os
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


def grid(src, out, crop=None, step=100):
    im = Image.open(src).convert("RGB")
    g = im.copy()
    d = ImageDraw.Draw(g)
    f = _font()
    for x in range(0, im.width, step):
        d.line([(x, 0), (x, im.height)], fill=(255, 0, 0), width=1)
        d.text((x + 2, 2), str(x), fill=(255, 0, 0), font=f)
    for y in range(0, im.height, step):
        d.line([(0, y), (im.width, y)], fill=(0, 0, 255), width=1)
        d.text((2, y + 2), str(y), fill=(0, 0, 255), font=f)
    if crop:
        g = g.crop(crop)
    g.save(out)
    print(f"{out}  (원본 {im.width}x{im.height}"
          + (f", crop {crop} 이므로 원본좌표 = 표시좌표 + ({crop[0]}, {crop[1]})" if crop else "")
          + ")")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    box = None
    if "--crop" in sys.argv:
        box = tuple(int(v) for v in sys.argv[sys.argv.index("--crop") + 1].split(","))
    grid(sys.argv[1], sys.argv[2], box)
