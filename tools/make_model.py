"""スポット周辺のミニチュア模型（.glb）を国土地理院のデータから作る。

使い方（プロジェクトのフォルダで実行）:
    python tools/make_model.py facility-014

材料:
    標高 … 地理院タイル dem5a → dem5b → dem（10m）の順に、値がある物を使う
    写真 … 地理院タイル seamlessphoto（全国最新写真）
出力:
    models/<スポットID>.glb
"""
import json
import math
import os
import struct
import sys
import urllib.error
import urllib.request

# ===== 調整用の設定（数字を変えて再実行すると模型が変わる） =====
AREA_M = 1000        # 模型にする範囲（一辺のおおよその長さ、m）
VERT_SCALE = 1.5     # 高さの強調（1.0 = 実物どおり。大きいほど山が高く見える）
BASE_M = 40          # 模型の土台の厚さ（実物の m 換算）
MODEL_SIZE_M = 0.6   # ARで置いたときの模型の幅（m）
PHOTO_ZOOM = 17      # 写真の細かさ（大きいほど精細・ファイルが重い。18 まで）
GRID = 32            # 写真1枚あたりの地面の分割数（大きいほど地形が滑らか）
# ===============================================================

GSI = 'https://cyberjapandata.gsi.go.jp/xyz'
DEM_SOURCES = [('dem5a', 15), ('dem5b', 15), ('dem', 14)]  # (名前, ズーム)
EARTH_CIRCUMFERENCE = 40075016.686

_cache = {}


def fetch(url):
    if url not in _cache:
        req = urllib.request.Request(url, headers={'User-Agent': 'stamp-rally-for-dobox'})
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                _cache[url] = res.read()
        except urllib.error.HTTPError as e:
            if e.code != 404:
                raise
            _cache[url] = None  # 海上などデータがない場所
    return _cache[url]


def latlng_to_pixel(lat, lng, zoom):
    """緯度経度 → そのズームでの世界ピクセル座標"""
    n = 256 * 2 ** zoom
    x = (lng + 180) / 360 * n
    y = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n
    return x, y


_dem_cache = {}


def dem_tile(name, zoom, tx, ty):
    key = (name, zoom, tx, ty)
    if key not in _dem_cache:
        body = fetch(f'{GSI}/{name}/{zoom}/{tx}/{ty}.txt')
        _dem_cache[key] = body and [row.split(',') for row in body.decode().splitlines()]
    return _dem_cache[key]


def elevation(px, py):
    """写真ズームのピクセル座標 (px, py) の標高（m）。どのデータにもなければ 0（海）"""
    for name, zoom in DEM_SOURCES:
        f = 2 ** (PHOTO_ZOOM - zoom)
        gx, gy = int(px / f), int(py / f)
        tile = dem_tile(name, zoom, gx // 256, gy // 256)
        if tile is None:
            continue
        value = tile[gy % 256][gx % 256]
        if value != 'e':
            return float(value)
    return 0.0


def build(spot):
    lat0 = spot['lat']
    m_per_px = EARTH_CIRCUMFERENCE / (256 * 2 ** PHOTO_ZOOM) * math.cos(math.radians(lat0))
    n_tiles = max(1, math.ceil(AREA_M / (m_per_px * 256)))

    # スポットが中央付近に来るように、写真タイルの範囲を決める
    cx, cy = latlng_to_pixel(lat0, spot['lng'], PHOTO_ZOOM)
    tx0 = round(cx / 256 - n_tiles / 2)
    ty0 = round(cy / 256 - n_tiles / 2)
    origin_x = (tx0 + n_tiles / 2) * 256
    origin_y = (ty0 + n_tiles / 2) * 256

    # 格子点ごとの標高
    size = n_tiles * GRID + 1
    step = 256 / GRID
    print(f'標高を取得中…（{size}×{size}点）')
    heights = [[elevation(tx0 * 256 + i * step, ty0 * 256 + j * step) for i in range(size)] for j in range(size)]
    low = min(min(row) for row in heights)

    def vertex(i, j):
        x = (tx0 * 256 + i * step - origin_x) * m_per_px
        z = (ty0 * 256 + j * step - origin_y) * m_per_px
        y = (heights[j][i] - low) * VERT_SCALE + BASE_M
        return x, y, z

    # 地面：写真タイル1枚ごとに1パーツ
    parts = []
    for ty in range(n_tiles):
        for tx in range(n_tiles):
            url = f'{GSI}/seamlessphoto/{PHOTO_ZOOM}/{tx0 + tx}/{ty0 + ty}.jpg'
            print(f'写真を取得中… {url}')
            jpg = fetch(url)
            if jpg is None:
                sys.exit(f'写真がありません: {url}（PHOTO_ZOOM を下げてみてください）')
            pos, uv, idx = [], [], []
            for j in range(GRID + 1):
                for i in range(GRID + 1):
                    pos.extend(vertex(tx * GRID + i, ty * GRID + j))
                    uv.extend((i / GRID, j / GRID))
            for j in range(GRID):
                for i in range(GRID):
                    a = j * (GRID + 1) + i
                    b, c, d = a + 1, a + GRID + 1, a + GRID + 2
                    idx.extend((a, c, b, b, c, d))
            parts.append({'pos': pos, 'uv': uv, 'idx': idx, 'jpg': jpg})

    # 土台：外周の側面と底面
    edge = ([(i, 0) for i in range(size)] + [(size - 1, j) for j in range(1, size)]
            + [(i, size - 1) for i in range(size - 2, -1, -1)] + [(0, j) for j in range(size - 2, 0, -1)])
    pos, idx = [], []
    for k, (i, j) in enumerate(edge):
        x, y, z = vertex(i, j)
        pos.extend((x, y, z, x, 0.0, z))
        a, b = 2 * k, 2 * ((k + 1) % len(edge))
        idx.extend((a, b, a + 1, b, b + 1, a + 1))
    # 底面（外周の下端をつなぐ扇形）
    for k in range(1, len(edge) - 1):
        idx.extend((1, 2 * k + 3, 2 * k + 1))
    parts.append({'pos': pos, 'idx': idx})

    width = n_tiles * 256 * m_per_px
    return parts, MODEL_SIZE_M / width, width


def write_glb(parts, scale, path):
    blob = bytearray()
    views, accessors = [], []

    def add_view(data, target=None):
        while len(blob) % 4:
            blob.append(0)
        view = {'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(data)}
        if target:
            view['target'] = target
        blob.extend(data)
        views.append(view)
        return len(views) - 1

    def add_accessor(values, comp, kind, target):
        n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[kind]
        fmt = {5126: 'f', 5125: 'I'}[comp]
        acc = {'bufferView': add_view(struct.pack(f'<{len(values)}{fmt}', *values), target),
               'componentType': comp, 'count': len(values) // n, 'type': kind}
        if kind == 'VEC3':
            acc['min'] = [min(values[k::3]) for k in range(3)]
            acc['max'] = [max(values[k::3]) for k in range(3)]
        accessors.append(acc)
        return len(accessors) - 1

    unlit = {'KHR_materials_unlit': {}}
    images, textures, materials, primitives = [], [], [], []
    for part in parts:
        prim = {'attributes': {'POSITION': add_accessor(part['pos'], 5126, 'VEC3', 34962)},
                'indices': add_accessor(part['idx'], 5125, 'SCALAR', 34963),
                'material': len(materials)}
        if 'jpg' in part:
            prim['attributes']['TEXCOORD_0'] = add_accessor(part['uv'], 5126, 'VEC2', 34962)
            images.append({'bufferView': add_view(part['jpg']), 'mimeType': 'image/jpeg'})
            textures.append({'source': len(images) - 1, 'sampler': 0})
            materials.append({'pbrMetallicRoughness': {'baseColorTexture': {'index': len(textures) - 1},
                                                       'metallicFactor': 0, 'roughnessFactor': 1},
                              'extensions': unlit})
        else:
            materials.append({'pbrMetallicRoughness': {'baseColorFactor': [0.45, 0.36, 0.27, 1],
                                                       'metallicFactor': 0, 'roughnessFactor': 1},
                              'doubleSided': True, 'extensions': unlit})
        primitives.append(prim)

    while len(blob) % 4:
        blob.append(0)
    gltf = {
        'asset': {'version': '2.0', 'generator': 'stamp-rally-for-dobox tools/make_model.py',
                  'copyright': '出典：国土地理院（標高タイル・シームレス空中写真）'},
        'extensionsUsed': ['KHR_materials_unlit'],
        'scene': 0,
        'scenes': [{'nodes': [0]}],
        'nodes': [{'mesh': 0, 'scale': [scale] * 3}],
        'meshes': [{'primitives': primitives}],
        'materials': materials,
        'textures': textures,
        'images': images,
        'samplers': [{'magFilter': 9729, 'minFilter': 9729, 'wrapS': 33071, 'wrapT': 33071}],
        'accessors': accessors,
        'bufferViews': views,
        'buffers': [{'byteLength': len(blob)}],
    }
    js = json.dumps(gltf, ensure_ascii=False).encode()
    js += b' ' * (-len(js) % 4)
    with open(path, 'wb') as f:
        f.write(struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(blob)))
        f.write(struct.pack('<I4s', len(js), b'JSON') + js)
        f.write(struct.pack('<I4s', len(blob), b'BIN\0') + blob)


def main():
    if len(sys.argv) != 2:
        sys.exit('使い方: python tools/make_model.py <スポットID>（例: facility-014）')
    with open(os.path.join('data', 'spots.json'), encoding='utf-8') as f:
        spots = {s['id']: s for s in json.load(f)}
    spot = spots.get(sys.argv[1])
    if spot is None:
        sys.exit(f'スポットが見つかりません: {sys.argv[1]}')

    print(f'{spot["name"]} の模型を作ります')
    parts, scale, width = build(spot)
    os.makedirs('models', exist_ok=True)
    out_path = os.path.join('models', f'{spot["id"]}.glb')
    write_glb(parts, scale, out_path)
    print(f'完成: {out_path}（範囲 約{width:.0f}m四方、{os.path.getsize(out_path) / 1e6:.1f}MB）')


if __name__ == '__main__':
    main()
