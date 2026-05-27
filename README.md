# 勤怠管理システム

## セットアップ手順

### 1. ローカルで動かす

```bash
git clone <このリポジトリ>
cd kintai
npm install
cp .env.local.example .env.local
npm run dev
```

→ http://localhost:3000 で確認

### 2. GitHubにプッシュ

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/<あなたのユーザー名>/kintai.git
git push -u origin main
```

### 3. Vercelにデプロイ

1. https://vercel.com にログイン（GitHubアカウントでOK）
2. 「Add New Project」→ 上記のGitHubリポジトリを選択
3. 「Deploy」ボタンを押す → URLが発行される（例: `https://kintai-xxx.vercel.app`）

### 4. Vercel KVを有効化（データ永続化）

1. Vercelのプロジェクトページ →「Storage」タブ
2. 「Create Database」→「KV」を選択
3. 作成後「Connect to Project」→ 自動で環境変数が追加される

### 5. Slack Appを作成

1. https://api.slack.com/apps で「Create New App」
2. 「From scratch」→ App名を入力、ワークスペースを選択

#### Bot Tokenの取得
- 左メニュー「OAuth & Permissions」
- 「Bot Token Scopes」に以下を追加：
  - `channels:history`
  - `channels:read`
- 「Install to Workspace」→ `Bot User OAuth Token`（xoxb-...）をコピー

#### Signing Secretの取得
- 左メニュー「Basic Information」→「Signing Secret」をコピー

### 6. 環境変数をVercelに設定

Vercelプロジェクト →「Settings」→「Environment Variables」で以下を追加：

| 変数名 | 値 |
|--------|-----|
| `SLACK_BOT_TOKEN` | xoxb-... |
| `SLACK_SIGNING_SECRET` | Signing Secretの値 |
| `TARGET_SLACK_USER_ID` | あなたのSlackユーザーID※ |

※ SlackでプロフィールをクリックしてIDをコピー

### 7. Slack Event Subscriptionsを設定

1. Slack App の左メニュー「Event Subscriptions」→ ON
2. Request URL に入力：
   ```
   https://<あなたのVercel URL>/api/slack
   ```
3. 「Subscribe to bot events」で以下を追加：
   - `message.channels`
4. 「Save Changes」

### 8. BotをSlackチャンネルに招待

Slackで以下のチャンネルにBotを招待：
```
/invite @<あなたのBotの名前>
```
- `#internship_contact`
- `#reflection`

---

## 動作の仕組み

| チャンネル | メッセージ内容 | 登録される内容 |
|-----------|--------------|--------------|
| `#internship_contact` | 「おはようございます！【本日予定しているタスク】」 | 始業時刻（投稿時刻） |
| `#reflection` | 「【一言】」＋ Notionリンク | 終業時刻（投稿時刻） |

休憩時間は自動計算：
- 勤務6〜8時間 → 45分
- 勤務8時間以上 → 1時間
