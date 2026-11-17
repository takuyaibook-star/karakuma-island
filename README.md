# カラくまちゃんアイランド

淡い水彩・絵本調の世界を自由に歩き、畑でにんじんを育てるスマートフォン向け試作です。

**初期マップ：<https://takuyaibook-star.github.io/karakuma-island/?v=6>**

家の右手の畑への道を上へ進むと畑に入ります。畑の下の道を進むと村へ戻ります。直接の畑URLは <https://takuyaibook-star.github.io/karakuma-island/?map=farm&v=6>。マップを移っても同じBGMが流れ続けます。

## 操作・育成

- 画面下半分の好きな位置からスワイプ。指を離すと停止。矢印/WASDでも移動。
- 道をタップすると障害物を避けて移動。
- 畑に近づくと、キャラの足元に耕す/種まき/水やり/収穫のボタンが出る。
- 新規は4マスだけ開墾済み。左下か鞄で道具を持つ/しまう。クワ・じょうろは同時に持てない。
- クワは耕す10回で使い切り。各マスは10回収穫で耕し直し。開墾にはすごいクワを1マス1個使う。試作設定で道具を補充できる。
- 水やりから5秒で芽。芽から2分で育ち中、芽から5分で収穫。ボタンに残り時間を表示。
- 水は3回で空。左の水くみ場に近づき補充する。
- 「鞄」でアイテムボックス。通常とカラフルは別アイテム。種は試作中は使い放題。
- ♪でBGM ON/OFF。初期ON、実操作後に再生。効果音は試作設定で切替。

畑・持ち物・水・装備は端末のブラウザ内に保存します。旧保存をバックアップしてから新形式へ移行します。別の端末とは共有されません。ログイン、共通DB、コイン連携は未実装。枯れる時間も未設定です。正式な道具の入手イベント、種を埋めた共通画像などは[TODO.md](TODO.md)に記録しています。

## 開発を引き継ぐ

画像は採用が確定した素材だけGitHubに保存します。比較案・比較一覧はローカルで管理します。スイカの4色断面は画像/仕様だけを採用し、育成は今回追加していません。

最初に[AGENTS.md](AGENTS.md)、[PROJECT_STATUS.md](PROJECT_STATUS.md)、[TODO.md](TODO.md)を読み、既存ブランチ・remote・未コミット変更・GitHub最新を確認してください。他環境の変更を破棄しないでください。

index.html/shell.mjsが音楽を常駐させ、village.htmlと畑のマップだけを切り替えます。HTML/CSS/標準JavaScript/Canvas 2Dの静的サイト。起動にビルド・npm依存・APIキー・.envは不要です。

```sh
git clone https://github.com/takuyaibook-star/karakuma-island.git
cd karakuma-island
python3 -m http.server 5193 --bind 127.0.0.1
```

<http://127.0.0.1:5193/> で確認します。使われているポートのサーバーを止めず、別ポートを選んでください。file://で直接開かないでください。

```sh
node --test tests/*.test.*
```

Node 20以上。既存の移動15項目に加え起動、旧描画API、成長境界、水、アイテム、保存、経路、装備表示、効果音、収穫演出、マップ接続を確認します。自動テストはiPhone実機の代用ではありません。

## 構成

| ファイル | 役割 |
|---|---|
| index.html / shell.mjs / village.html / walk.mjs | BGM常駐の外枠と初期マップ |
| boot.js | 起動監視・再試行・実画像数の読み込みゲージ |
| model.mjs / terrain.mjs / navigation.mjs | 移動・カメラ・地形・経路 |
| map-links.mjs | 畑への移動と戻り位置 |
| music.mjs | BGM設定・操作後再生・背景復帰 |
| experiments/farming/index.html / view.mjs | 畑の画面・操作・描画 |
| experiments/farming/farm.mjs / scene.mjs | 畑の状態・時間成長・水・地形 |
| experiments/farming/items.mjs / storage.mjs | 別アイテムと専用の端末内保存 |
| experiments/farming/effects.mjs | ローカルSEと収穫演出 |
| experiments/farming/assets/ | 背景/土/作物/水入りと空のじょうろキャラ、生成条件 |
| docs/ | 既存記録。今後の未採用比較画像は保存しない |
| tests/ | 単体・回帰テスト |

保存キーは karakuma-island:farming:v1。他ゲームの保存キーを触らず、未知版/破損データを無断上書きしません。DBバックアップではありません。Supabase接続前には別途バックアップが必要です。

## 公開と素材

GitHub Pagesはmain/rootを配信。資料更新でも配信処理が走ります。コミット保存と本番公開を区別し、内容を確認してから反映してください。_headersはNetlify形式でPagesのヘッダー設定には使われず、CSPはHTMLのmetaです。

背景・キャラクターは本作向けの提供/生成素材。各生成条件と採用状態はassets/READMEとPROJECT_STATUSを参照。港・野菜の未実装案を実装済みと混同しないでください。

BGMはユーザーが用意したMotionElements音源のゲーム用AAC。Stock media provided by MotionElements.com。一律のオープンソース素材ライセンスは付与していません。

## ヘッドレスでの操作確認

インストール済みのPlaywrightとChromeで `node tests/browser-smoke.cjs`。`PLAYWRIGHT_MODULE`と`CHROMIUM_PATH`でインストール済みの場所、`TEST_URL`でローカル確認サーバーを指定できます。確認画像は既定で `/tmp/karakuma-v6-checks` に出力し、GitHubへ保存しません。自動ダウンロードや有料APIの呼び出しはありません。
