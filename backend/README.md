# PairDiet バックエンド（Cloudflare Workers + D1 + R2）
匿名2人のマッチング・毎日のペナルティ判定・写真保存・👏・通報ブロック連動。
ロジック核 `src/matching.ts` `src/penalty.ts` は**ユニットテスト17件PASS**：
`node --experimental-strip-types src/selftest.ts`

## デプロイ（君のCloudflareアカウントで／無料枠でOK）
```
npm i -g wrangler
wrangler login
wrangler d1 create pairdiet          # 出たIDを wrangler.toml の database_id に貼る
wrangler d1 execute pairdiet --file=./schema.sql
wrangler r2 bucket create pairdiet-photos
wrangler deploy
```
## 未実装（TODO）
Apple/Google IDトークン検証・IAPレシート検証・救済/割引付与・3ヶ月更新・FCM通知・チャット配信。
