# Python 文法メモ

[tools/make_model.py](../tools/make_model.py) に出てくる書き方を例にしたメモ。

## 1. ファイルの動かし方

```
python tools/make_model.py facility-014
```

- `python ファイル名 引数` で実行する。
- 引数（`facility-014`）はプログラムの中で `sys.argv[1]` として受け取れる。
  - `sys.argv[0]` はファイル名、`sys.argv[1]` が1つ目の引数。

## 2. 変数と設定値

```python
AREA_M = 1000
```

- `名前 = 値` で、値に名前を付けて覚えておく。
- 全部大文字の名前は「あとから変えない設定値」の目印（決まりではなく習慣）。

## 3. コメント

```python
# 1行コメント。# から行末までは実行されない
"""
複数行の説明。ファイルや関数の最初に書くことが多い
"""
```

## 4. データの形

| 形 | 書き方 | 例 |
|---|---|---|
| 数字 | そのまま | `1000`、`1.5` |
| 文字列 | `'…'` か `"…"` | `'facility-014'` |
| リスト（順番に並べた箱） | `[ ]` | `[1, 2, 3]` |
| 辞書（名前付きの箱） | `{ キー: 値 }` | `{'name': '魚切ダム', 'lat': 34.4}` |
| 何もない | `None` | データがないとき |

- リストは番号で取り出す：`a[0]`（0から数える）
- 辞書は名前で取り出す：`spot['name']`

## 5. 文字列に値を埋め込む（f文字列）

```python
print(f'{spot["name"]} の模型を作ります')   # → 魚切ダム の模型を作ります
print(f'{width:.0f}m')                     # → 1009m（小数点以下0桁）
```

- 先頭に `f` を付けると、`{ }` の中に変数や式を書ける。

## 6. if 文（条件で分ける）

```python
if spot is None:
    sys.exit('スポットが見つかりません')
```

- `if 条件:` のあと、字下げした行が「条件が合うときだけ」実行される。
- `elif`（そうでなくて〇〇なら）、`else`（どれでもなければ）も使える。

## 7. for 文（繰り返す）

```python
for i in range(3):
    print(i)        # → 0, 1, 2
```

- `range(3)` は 0, 1, 2 を順に出す。
- `for 変数 in リスト:` で、リストの中身を1つずつ取り出せる。

## 8. 関数（処理にまとめて名前を付ける）

```python
def fetch(url):
    ...
    return データ
```

- `def 名前(受け取るもの):` で作り、`名前(値)` で呼び出す。
- `return` で結果を返す。

## 9. import（道具箱を使う）

```python
import math
math.cos(x)
```

- Python に最初から入っている道具箱を読み込む。`pip install` は不要。
- このスクリプトで使っている道具箱：`json` `math` `os` `struct` `sys` `urllib`

## 10. インデント（字下げ）

```python
for j in range(GRID):
    for i in range(GRID):
        idx.extend(...)      # 2つの for の中
    print('1行終わり')        # 外側の for の中だけ
```

- Python では字下げに意味がある。どこまでが if や for の中かを字下げで表す。
- スペース4つが基本。ずれると `IndentationError` になる。

---

## 11. 「.」のあとのやつ（メソッド）★重要

`〇〇.△△()` は「〇〇 の △△ という機能を使う」という意味。

```
parts.append(x)
 ↑      ↑
 誰の   何をする
```

- `()` あり → 何かを**する**（メソッド）
- `()` なし → 何かを**見る**（属性）。例：`e.code` はエラーの番号（404など）を見ている

### append と extend の違い

```python
a = [1, 2]
a.append([3, 4])   # → [1, 2, [3, 4]]   箱ごと1個として入れる
b = [1, 2]
b.extend([3, 4])   # → [1, 2, 3, 4]     中身をばらして入れる
```

- `parts.append({...})`：写真タイル1枚ぶんの部品を「1個のまとまり」として追加
- `pos.extend(vertex(...))`：座標 (x, y, z) の3つの数字をばらして1列に並べる（glb は数字が1列に並んだ形が必要なため）

### 「.」の前に来るものは2種類

**① データ（リスト・文字列など）を操作する**

| 書き方 | 意味 |
|---|---|
| `リスト.append(x)` | 1個追加 |
| `リスト.extend(x)` | ばらして追加 |
| `文字列.split(',')` | `,` で区切ってリストにする（`'1,2,3'` → `['1','2','3']`） |
| `文字列.splitlines()` | 行ごとに分ける |
| `バイト.decode()` | バイト → 文字 |
| `文字.encode()` | 文字 → バイト（`decode` の逆） |
| `辞書.get(キー)` | 辞書から値を取り出す（なければ `None`） |
| `f.write(データ)` | ファイルに書き込む |
| `res.read()` | ネットから受け取った中身を全部読む |

**② 道具箱（import したもの）の道具を使う**

| 書き方 | 意味 |
|---|---|
| `math.radians(x)` | 度 → ラジアン（三角関数はラジアンで計算するため） |
| `math.cos(x)` `math.tan(x)` `math.log(x)` | 三角関数・対数 |
| `math.ceil(x)` | 切り上げ |
| `os.path.join('models', 'a.glb')` | フォルダ名とファイル名をつなぐ → `models\a.glb` |
| `os.makedirs('models', exist_ok=True)` | フォルダを作る（すでにあってもエラーにしない） |
| `os.path.getsize(パス)` | ファイルの大きさ（バイト数） |
| `json.load(f)` | JSONファイル → Python のデータ |
| `json.dumps(データ)` | Python のデータ → JSON の文字列（`s` は string の略） |
| `sys.exit('メッセージ')` | メッセージを出して終了 |
| `urllib.request.Request(url)` | 「このURLにお願いします」という依頼書を作る |
| `urllib.request.urlopen(依頼書)` | 依頼書を送って返事を受け取る |
| `struct.pack('<4sII', ...)` | 数字を決まった形式のバイトに詰める（glb 用。上級者向け） |

- `os.path.join` のように `.` が続くのは「os道具箱 の path引き出し の join」という意味。
- ネットからの取得は、郵便でたとえると「手紙を書く（Request）→ 投函する（urlopen）→ 封筒を開ける（read）」。

### つながっている書き方

```python
body.decode().splitlines()
```

左から順に実行される：`body.decode()` で文字にする → その結果を `.splitlines()` で行ごとに分ける。

### with（ファイルを開く）

```python
with open('a.txt', 'w') as f:
    f.write('こんにちは')
```

- `with` を使うと、処理が終わったら自動でファイルを閉じてくれる。
- `'r'` 読む、`'w'` 書く、`'wb'` バイトで書く。

### 覚える優先度

全部覚えなくてよい。よく使うのは **append / extend / split / get / join / load / write** の7つ。
他は出てきたら、VSCode でマウスを乗せる or 「python ○○」で検索すれば十分。

---

## 12. エラーの読み方

| 見えるもの | 原因 | 対処 |
|---|---|---|
| `Traceback (most recent call last):` から始まる | Python のエラー | **一番下の行**を読む。原因が書いてある |
| `ModuleNotFoundError: No module named 'numpy'` | 道具箱が入っていない | `pip install numpy` |
| `IndentationError` | 字下げがずれている | スペースをそろえる |
| `KeyError: 'name'` | 辞書にそのキーがない | キーの綴りを確認 |
| ブラウザで `ERR_CONNECTION_REFUSED` | **Python ではなく**サーバーが起動していない | `npx http-server -p 8080 -c-1` を別のターミナルで実行 |

- Python のスクリプトが「完成: …」まで表示していれば、スクリプトは成功している。
- サーバーを起動したターミナルは占有されるので、Python を実行するときは「＋」でもう1つターミナルを開く。
