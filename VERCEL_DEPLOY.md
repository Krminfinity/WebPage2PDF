# Vercelデプロイ手順

## 🚀 クイックデプロイ

### 方法1: Vercel Web UI（推奨）

1. **Vercelアカウント作成**
   - [vercel.com](https://vercel.com) にアクセス
   - "Sign up" をクリック
   - GitHubアカウントでサインアップ

2. **プロジェクトインポート**
   - ダッシュボードで "New Project" をクリック
   - GitHubリポジトリ `WebPage2PDF` を選択
   - "Import" をクリック

3. **自動設定**
   - Framework Preset: `Other`
   - Build Command: `npm run vercel-build`
   - Output Directory: `public`
   - Install Command: `npm install`

4. **デプロイ実行**
   - "Deploy" をクリック
   - 数分でデプロイ完了
   - 自動でURLが生成される

### 方法2: Vercel CLI

```bash
# 1. Vercel CLIインストール
npm i -g vercel

# 2. ログイン
vercel login

# 3. デプロイ
vercel

# 4. 本番デプロイ
vercel --prod
```

## ⚙️ 設定内容

### 自動設定される項目
- **Node.js環境**: 自動検出
- **Build Command**: `npm run vercel-build`
- **Start Command**: `npm start`
- **Environment Variables**: `.env.production`から自動設定

### Puppeteer最適化
- ヘッドレスモード強制
- Chrome引数最適化
- メモリ使用量削減
- 実行時間最適化

## 🌐 デプロイ後の確認

### アクセスURL
デプロイ完了後、以下のようなURLでアクセス可能：
```
https://webpage2pdf-username.vercel.app
```

### 機能テスト
1. **基本PDF生成**
   ```
   https://example.com, https://google.com
   ```

2. **CSVアップロード**
   - テスト用CSVファイルをアップロード

3. **レスポンシブ確認**
   - モバイル/デスクトップ表示

## ⚠️ 制限事項

### Vercel制限
- **実行時間**: 最大30秒（Hobby plan）
- **メモリ**: 1GB
- **ファイルサイズ**: 50MB
- **同時実行**: 1000リクエスト/分

### 対応策
- 大量URL処理時の分割
- タイムアウト設定
- エラーハンドリング強化

## 🔧 トラブルシューティング

### よくある問題

1. **Puppeteerエラー**
   ```
   Error: Failed to launch chrome!
   ```
   **解決策**: vercel.jsonの設定確認

2. **タイムアウトエラー**
   ```
   Function execution timed out
   ```
   **解決策**: URL数を減らして再試行

3. **メモリエラー**
   ```
   JavaScript heap out of memory
   ```
   **解決策**: 処理の分割またはPro planへアップグレード

### デバッグ方法
1. Vercelダッシュボードでログ確認
2. `vercel logs` コマンドでリアルタイムログ
3. 環境変数の設定確認

## 📊 モニタリング

### Vercel Analytics
- アクセス数
- エラー率
- 応答時間
- 地域別利用状況

### カスタムドメイン設定
1. ドメイン購入
2. Vercelダッシュボードで設定
3. DNS設定更新
4. SSL証明書自動発行

## 🚀 本番運用のベストプラクティス

1. **環境変数の適切な設定**
2. **エラーログの監視**
3. **パフォーマンスの定期チェック**
4. **セキュリティアップデートの適用**
5. **ユーザーフィードバックの収集**
