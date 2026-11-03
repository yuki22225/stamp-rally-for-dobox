# DoboXの避難所データを、地図で使うJSONに変換する
import glob
import json

SRC = r'C:\Users\hiroyuki\dobox-infra\data\元データ\02.猫の避難\避難所\340006_shelter_*.json'
FLAGS = {'sedimentDisasterShFlg': '土砂災害', 'floodShFlg': '洪水', 'stormSurgeShFlg': '高潮', 'tsunamiShFlg': '津波', 'earthquakeShFlg': '地震'}

with open(glob.glob(SRC)[0], encoding='utf-8-sig') as f:
    items = json.load(f)['items']

shelters, skipped = [], []
for s in items:
    try:
        lat, lng = float(s['latitude']), float(s['longitude'])
    except (TypeError, ValueError):
        skipped.append(s['name'])
        continue
    if not (33.9 < lat < 35.3 and 131.9 < lng < 133.6):
        skipped.append(s['name'])
        continue
    shelters.append({
        'name': s['name'], 'address': s['address01'], 'city': s['municipalityName'], 'lat': lat, 'lng': lng,
        'capacity': s['capacity'], 'types': [v for k, v in FLAGS.items() if s[k] == '1'],
    })

with open('data/shelters.json', 'w', encoding='utf-8') as f:
    json.dump(shelters, f, ensure_ascii=False, separators=(',', ':'))

print(f'{len(items)}件のうち{len(shelters)}件を変換。除外：{skipped}')
for t in FLAGS.values():
    print(t, sum(t in s['types'] for s in shelters))
print('種類の記載なし', sum(not s['types'] for s in shelters))
