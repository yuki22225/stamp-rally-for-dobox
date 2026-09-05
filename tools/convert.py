import csv
import json
import os

spots = []

facility_csv = os.path.join('data', 'dobox_raw', '340006_infrastructure_tourism_facility_information_20251027 (2).csv')
with open(facility_csv, encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader):
        if not row['緯度'] or not row['経度']:
            continue
        spots.append({
            'id': f'facility-{i+1:03d}',
            'name': row['施設名称'],
            'category': row['分類'],
            'lat': float(row['緯度']),
            'lng': float(row['経度']),
            'description': row['施設概要'],
            'detail': row['施設の詳細説明'],
            'hp_link': row['HPリンク'],
            'photo': row['写真'],
            'collected': False
        })

out_path = os.path.join('data', 'spots.json')
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(spots, f, ensure_ascii=False, indent=2)

print(f'変換完了: {len(spots)}件 → {out_path}')
