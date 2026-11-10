#!/usr/bin/env python3
"""실제 지도(OpenStreetMap 타일) 위에 핀과 라벨을 얹은 SVG 조각을 만든다. 표준 라이브러리만 쓴다.

선만 그린 지도로는 받는 사람이 어디인지 못 알아본다. 타일을 받아 data URI 로 SVG 안에 넣으므로
페이지는 바깥으로 요청하지 않고(받는 것은 만들 때 한 번), 핀과 라벨은 SVG 글자라 render 의 겹침 검사와 번들 글꼴을 탄다.

사용
  python3 osm-map.py [--center <경도,위도>] [--zoom <3~18>] --size <폭x높이> \
      [--pin "<경도,위도,라벨>"]... [--route "<경도,위도;경도,위도;...>"] -o map.svg
  - --center 와 --zoom 을 빼면 핀과 길이 모두 들어오는 중심과 가장 큰 zoom(17 까지, 가장자리 여백 120px)을 고른다
  - 핀마다 화면 좌표를 한 줄씩 낸다(PIN 라벨 x y). 라벨이 겹치면 그 좌표로 원본에서 자리를 옮긴다
  - 결과는 <svg class="ve-svg" viewBox="0 0 폭 높이"> 하나다. 원본의 <figure><div class="frame"> 안에 그대로 넣는다
  - 오른쪽 아래에 「© OpenStreetMap」 을 남긴다. 지우지 않는다(타일 사용 조건)

환경변수
  SHOW_OSM_UA     타일 서버에 보낼 User-Agent(기본 show-osm-map/1.0). 타일 정책상 비우지 않는다
  SHOW_OSM_CACHE  타일 캐시 폴더(기본 ~/.cache/show/osm). 같은 타일은 다시 받지 않는다

주의
  - 새로 받는 타일 사이에 1초를 쉰다(타일 서버 사용 정책). 큰 지도와 높은 zoom 은 타일 수가 늘어 느려진다
  - 타일 하나는 20~60KB 라 1280x720 지도 한 장이 1MB 안팎이 된다. 이미지 출구(PNG)에는 문제없고, 512KB 제한이 있는 곳에는 크기를 줄인다
"""
import argparse, base64, math, os, sys, time, urllib.request
from xml.sax.saxutils import escape

T = 256


def tile_xy(lon, lat, z):
    n = 2 ** z
    return (lon + 180) / 360 * n, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n


def fetch(z, x, y, cache, ua, last):
    p = os.path.join(cache, f'{z}_{x}_{y}.png')
    if not os.path.exists(p):
        wait = 1.0 - (time.time() - last[0])
        if wait > 0:
            time.sleep(wait)
        req = urllib.request.Request(f'https://tile.openstreetmap.org/{z}/{x}/{y}.png', headers={'User-Agent': ua})
        data = urllib.request.urlopen(req, timeout=30).read()
        last[0] = time.time()
        with open(p + '.tmp', 'wb') as f:
            f.write(data)
        os.replace(p + '.tmp', p)
    with open(p, 'rb') as f:
        return base64.b64encode(f.read()).decode()


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--center')
    ap.add_argument('--zoom', type=int)
    ap.add_argument('--size', default='1280x720')
    ap.add_argument('--pin', action='append', default=[])
    ap.add_argument('--route', action='append', default=[])
    ap.add_argument('-o', '--out', required=True)
    a = ap.parse_args()
    W, H = map(int, a.size.lower().split('x'))
    pts = [tuple(map(float, p.split(',')[:2])) for p in a.pin] + [tuple(map(float, q.split(','))) for r in a.route for q in r.split(';') if q.strip()]
    if a.center:
        lon, lat = map(float, a.center.split(','))
    elif pts:  # 핀과 길의 가운데
        lon = (min(p[0] for p in pts) + max(p[0] for p in pts)) / 2
        lat = (min(p[1] for p in pts) + max(p[1] for p in pts)) / 2
    else:
        sys.exit('--center 나 --pin 이 있어야 한다')
    z = a.zoom
    if z is None:  # 모두 들어오는 가장 큰 zoom
        z = 3
        for cand in range(17, 2, -1):
            xs = [tile_xy(p[0], p[1], cand) for p in pts] or [tile_xy(lon, lat, cand)]
            cx_, cy_ = tile_xy(lon, lat, cand)
            if all(abs(x - cx_) * T <= W / 2 - 120 and abs(y - cy_) * T <= H / 2 - 120 for x, y in xs):
                z = cand
                break
    if not 3 <= z <= 18:
        sys.exit('zoom 은 3~18')
    cache = os.path.expanduser(os.environ.get('SHOW_OSM_CACHE', '~/.cache/show/osm'))
    os.makedirs(cache, exist_ok=True)
    ua = os.environ.get('SHOW_OSM_UA', 'show-osm-map/1.0')
    cx, cy = tile_xy(lon, lat, z)
    x0, y0 = cx - W / 2 / T, cy - H / 2 / T          # 왼쪽 위(타일 단위)
    n = 2 ** z
    last = [0.0]
    parts = [f'<svg class="ve-svg" viewBox="0 0 {W} {H}" role="img" aria-label="지도">',
             f'<clipPath id="osm-clip"><rect width="{W}" height="{H}"/></clipPath><g clip-path="url(#osm-clip)">']
    count = 0
    for tx in range(math.floor(x0), math.floor(x0 + W / T) + 1):
        for ty in range(math.floor(y0), math.floor(y0 + H / T) + 1):
            if not 0 <= ty < n:
                continue
            b64 = fetch(z, tx % n, ty, cache, ua, last)
            parts.append(f'<image href="data:image/png;base64,{b64}" x="{(tx - x0) * T:.1f}" y="{(ty - y0) * T:.1f}" width="{T}" height="{T}"/>')
            count += 1
    parts.append('</g>')

    def px(lo, la):
        x, y = tile_xy(lo, la, z)
        return (x - x0) * T, (y - y0) * T

    for r in a.route:
        pts = [px(*map(float, p.split(','))) for p in r.split(';') if p.strip()]
        d = ' '.join(f'{x:.1f},{y:.1f}' for x, y in pts)
        parts.append(f'<polyline points="{d}" fill="none" stroke="var(--accent, #1d4ed8)" stroke-width="6" stroke-linejoin="round" stroke-linecap="round" opacity="0.85"/>')
    for p in a.pin:
        lo, la, *label = p.split(',')
        label = ','.join(label).strip()
        x, y = px(float(lo), float(la))
        inside = 0 <= x <= W and 0 <= y <= H
        print(f'PIN {label or "-"} {x:.0f} {y:.0f}{"" if inside else "  (지도 밖)"}')
        parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="11" fill="var(--accent, #1d4ed8)" stroke="#fff" stroke-width="4"/>')
        if label:
            parts.append(f'<text x="{x + 18:.1f}" y="{y + 8:.1f}" font-size="26" font-weight="700" fill="#111" stroke="#fff" stroke-width="7" paint-order="stroke">{escape(label)}</text>')
    parts.append(f'<text x="{W - 10}" y="{H - 10}" text-anchor="end" font-size="20" fill="#333" stroke="#fff" stroke-width="5" paint-order="stroke">© OpenStreetMap</text>')
    parts.append('</svg>')
    with open(a.out, 'w', encoding='utf-8') as f:
        f.write('\n'.join(parts))
    print(f'SVG {a.out}  zoom {z}  타일 {count}개  {os.path.getsize(a.out) // 1024}KB')


if __name__ == '__main__':
    main()
