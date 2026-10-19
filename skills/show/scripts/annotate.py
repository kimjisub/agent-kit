"""캡처에 하이라이트 박스와 번호를 그린다.

박스에는 번호 배지만 얹고, 설명 문구는 이미지 위에 덧댄 흰 띠(범례)에 모아
둔다. 화면 요소를 라벨이 가리는 일이 없다.

    from annotate import annotate, RED, GREEN
    annotate('shots/before-list.png', 'anno/list-before.png',
             boxes=[(70, 376, 208, 1020, '시스템 ID')],
             crop=(30, 312, 1545, 1210), color=RED, scale=1.05)

좌표는 crop 을 적용하기 전 원본 기준이다. 눈대중으로 넣으면 한 열씩 밀리므로
grid_overlay.py 로 격자를 얹어 읽은 값을 쓴다.
"""
from PIL import Image, ImageDraw, ImageFont
import os

RED = (194, 58, 48)      # 개선 전, 문제 지점
GREEN = (34, 105, 74)    # 개선 후, 신규
BLUE = (29, 78, 216)     # 중립 강조

FONT_CANDIDATES = [
    "/System/Library/Fonts/AppleSDGothicNeo.ttc",
    "/Library/Fonts/Arial Unicode.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
]


def _font(size):
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


def annotate(src, out, boxes, crop=None, color=RED, scale=1):
    """boxes: [(x1, y1, x2, y2, '설명'), ...]  좌표는 crop 적용 전 원본 기준.

    박스가 하나뿐이면 범례와 박스가 1대1로 자명하므로 번호를 붙이지 않는다.
    """
    im = Image.open(src).convert("RGB")
    if crop:
        im = im.crop(crop)
        ox, oy = crop[0], crop[1]
    else:
        ox = oy = 0
    if scale != 1:
        im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)

    w = max(3, int(3 * scale))
    f = _font(int(22 * scale))
    fb = _font(int(19 * scale))
    pad = int(8 * scale)
    gap = int(26 * scale)

    # 1) 범례 줄바꿈 계산
    probe = ImageDraw.Draw(im)
    single = len(boxes) == 1
    items = []
    for i, b in enumerate(boxes, 1):
        text = b[4] if single else (f"{i}. {b[4]}" if b[4] else str(i))
        tb = probe.textbbox((0, 0), text, font=f)
        items.append((text, tb[2] - tb[0], tb[3] - tb[1]))
    line_h = max(h for _, _, h in items) + pad * 2
    lines, cur, cur_w = [], [], 0
    for it in items:
        add = it[1] + (gap if cur else 0)
        if cur and cur_w + add > im.width:
            lines.append(cur)
            cur, cur_w = [it], it[1]
        else:
            cur.append(it)
            cur_w += add
    if cur:
        lines.append(cur)
    top = len(lines) * line_h + int(10 * scale)

    # 2) 위쪽에 흰 띠를 덧댄 캔버스
    canvas = Image.new("RGB", (im.width, im.height + top), (255, 255, 255))
    canvas.paste(im, (0, top))
    d = ImageDraw.Draw(canvas, "RGBA")

    # 3) 범례
    y = int(2 * scale)
    for line in lines:
        x = 0
        for text, tw, th in line:
            d.rectangle([x, y, x + tw + pad * 2, y + line_h - int(4 * scale)], fill=color)
            d.text((x + pad, y + pad - int(3 * scale)), text, fill=(255, 255, 255), font=f)
            x += tw + pad * 2 + gap
        y += line_h

    # 4) 박스와 번호 배지
    for i, (x1, y1, x2, y2, _label) in enumerate(boxes, 1):
        X1, Y1 = int((x1 - ox) * scale), int((y1 - oy) * scale) + top
        X2, Y2 = int((x2 - ox) * scale), int((y2 - oy) * scale) + top
        d.rectangle([X1, Y1, X2, Y2], outline=color, width=w)
        if single:
            continue
        n = str(i)
        tb = d.textbbox((0, 0), n, font=fb)
        nw, nh = tb[2] - tb[0], tb[3] - tb[1]
        bw = max(nw, nh) + int(9 * scale)
        # 배지는 박스 위쪽 바깥 오른쪽 끝에. 자리가 없으면 박스 안쪽으로 넣는다.
        bx, by = X2 - bw, Y1 - bw - int(2 * scale)
        if by < top:
            by = Y1 + int(2 * scale)
        d.rectangle([bx, by, bx + bw, by + bw], fill=color)
        d.text((bx + (bw - nw) / 2, by + (bw - nh) / 2 - int(2 * scale)), n,
               fill=(255, 255, 255), font=fb)

    canvas.save(out, optimize=True)
    return canvas.size
