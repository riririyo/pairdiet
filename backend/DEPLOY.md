# PairDiet デプロイ手順書（Cloudflare）

このとおり上から順にコマンドを打てば、**バックエンドAPI**と**Web運営画面（通報→BAN）**が動きます。
ぜんぶ Cloudflare の無料枠でOK。Mac は不要（Windowsで大丈夫）。

デプロイの「実行」は、あなたのCloudflareアカウントの認証が要るので**あなたが打つ**ところです。
コマンドはコピペでOK。詰まったら、エラー文をそのまま私に貼ってください。

---

## 0. 準備（初回だけ）
- Cloudflare の無料アカウントを作る（https://dash.cloudflare.com/sign-up）
- Node.js が入っていること（`node -v` でバージョンが出ればOK）
- ターミナルでこのフォルダ（`pairdiet-backend`）に移動しておく

```
npm install -g wrangler
wrangler login          # ブラウザが開くのでCloudflareを許可
```

---

## 1. データベース(D1)を作る
```
wrangler d1 create pairdiet
```
実行すると `database_id = "..."` という行が出ます。その値をコピーして、
**`wrangler.toml` の `database_id = "REPLACE_AFTER_CREATE"` を、その値に置き換えて保存**してください。

次に、テーブルを作ります（`schema.sql` を流し込む）:
```
wrangler d1 execute pairdiet --remote --file=./schema.sql
```

---

## 2. 写真置き場(R2)を作る
```
wrangler r2 bucket create pairdiet-photos
```

---

## 3. 管理トークンを設定する（運営画面のログイン鍵）
好きな長い文字列を1つ決めます（推測されない20文字以上を推奨。例：パスワード生成ツールで作る）。
```
wrangler secret put ADMIN_TOKEN
```
と打つと入力を求められるので、決めた文字列を貼って Enter。
**この文字列＝運営画面のログイン鍵です。忘れずメモ、他人に見せない。**

---

## 4. APIを公開する
```
wrangler deploy
```
成功すると `https://pairdiet-api.<あなた>.workers.dev` のようなURLが出ます。
**このURLをメモ**してください（アプリと運営画面の両方で使います）。

動作確認：ブラウザでそのURLの末尾に `/health` を付けて開き、`{"ok":true}` が出ればOK。

---

## 5. Web運営画面を公開する（通報→BAN）
`admin/` フォルダを Cloudflare Pages に置くだけ。いちばん簡単なのはドラッグ＆ドロップ版：

1. Cloudflare ダッシュボード → **Workers & Pages** → **Create** → **Pages** → **Upload assets**
2. プロジェクト名を `pairdiet-admin` などにする
3. この `admin` フォルダの中身（`index.html`）をアップロード → **Deploy**
4. `https://pairdiet-admin.pages.dev` のようなURLが出ます

コマンド派なら:
```
wrangler pages deploy admin --project-name pairdiet-admin
```

---

## 6. 運営のやり方（通報を見てBAN）
1. 上の運営画面URL（`...pages.dev`）を開く
2. 「APIのURL」に手順4のURL、「管理トークン」に手順3で決めた文字列を入れて**接続**
3. 「未対応の通報」に通報が並ぶ → 中身を見て
   - 問題があれば **このユーザーをBAN**（マッチング不可になる・関連通報は対応済みに）
   - 問題なければ **問題なし（解決）**
4. 誤BANは「BAN済みユーザー」タブから **BAN解除** で戻せます

※ URLとトークンは「あなたのブラウザにだけ」保存されます。共用PCでは使わないこと。

---

## これで実現すること
- サービス本体は Cloudflare 上で動く → **あなたのPCの電源とは無関係**に稼働
- 運営（BANなど）は**ブラウザの運営画面**からどこでも可能
- PCを初期化しても、GitHubから `git clone` すれば元通り

---

## まだ入っていない機能（次に実装するTODO）
今はMVPの土台まで。以下は未実装（`src/index.ts` の設計に沿って追加していけます）:
- Apple/Google IDトークンの検証（本人確認）
- アプリ内課金(IAP)のレシート検証（¥1,500 / ¥2,000）
- 救済チケット・割引クーポンの付与、3ヶ月満了・更新
- FCMプッシュ通知、チャット配信
- BAN逃れ対策（端末単位の識別。今はアカウントBANのみ＝作り直しで再登録は可能）

## 困ったら
コマンドのエラー文をそのまま私に貼ってください。原因を特定して直します。
