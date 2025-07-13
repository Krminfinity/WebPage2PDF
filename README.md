# WebPage2PDF

WebサイトのURLを入力するだけで、簡単にPDFファイルに変換できるWebアプリケーションです。

## 特徴

- 🌐 **複数URL対応**: カンマ区切りで最大50個のURLを同時に処理
- 📊 **CSVインポート**: CSVファイルからURLを自動抽出
- 📦 **一括ダウンロード**: 複数のPDFファイルをZIP形式で一括ダウンロード
- 📄 **高品質PDF**: PuppeteerによるWebページの完全なPDF変換
- 💻 **レスポンシブUI**: モダンで美しいユーザーインターフェース
- ⚡ **高速処理**: 並行処理による効率的なPDF生成
- 🔒 **安全設計**: 一時ファイルの自動削除機能
- 🔐 **認証対応**: 手動ログインフローによる認証が必要なサイトへの対応
- 👁️ **可視ブラウザモード**: ブラウザの動作を確認しながらPDF生成

WebサイトのURLを入力するだけで、簡単にPDFファイルに変換できるWebアプリケーションです。

## 特徴

- 🌐 **複数URL対応**: カンマ区切りで最大50個のURLを同時に処理
- � **CSVインポート**: CSVファイルからURLを自動抽出
- �📦 **一括ダウンロード**: 複数のPDFファイルをZIP形式で一括ダウンロード
- 📄 **高品質PDF**: PuppeteerによるWebページの完全なPDF変換
- 💻 **レスポンシブUI**: モダンで美しいユーザーインターフェース
- ⚡ **高速処理**: 並行処理による効率的なPDF生成
- 🔒 **安全設計**: 一時ファイルの自動削除機能

## 技術スタック

- **Backend**: Node.js + Express.js
- **PDF生成**: Puppeteer
- **Frontend**: HTML5 + CSS3 + JavaScript + Bootstrap 5
- **アイコン**: Font Awesome

## インストール

1. リポジトリをクローンまたはダウンロード
2. 依存関係をインストール:
   ```bash
   npm install
   ```

## 使用方法

### サーバーの起動

```bash
npm start
```

サーバーは http://localhost:3000 で起動します。

### Webアプリケーションの使用

1. ブラウザで http://localhost:3000 にアクセス
2. URLを直接入力するか、CSVファイルをアップロード
   - 直接入力: `https://example.com, https://google.com, https://github.com`
   - CSV: URLを含む任意形式のCSVファイル（自動検出）
3. 「PDF生成」ボタンをクリック
4. 生成が完了したら、各PDFファイルを個別にダウンロード、または「全てダウンロード (ZIP)」で一括ダウンロード

### 手動ログインモード（認証対応）

認証が必要なサイトの場合、手動ログインモードを使用できます：

1. 「手動ログインモード」ボタンをクリック
2. URLを入力して「手動ログイン開始」をクリック
3. 自動でブラウザが開くので、手動でログイン
4. ログイン完了後、「PDF生成開始」ボタンをクリック
5. PDF生成が自動で実行されます

#### 手動ログインモードの特徴：
- 🖥️ **可視ブラウザ** - ログイン過程を目視で確認
- 🔐 **認証対応** - 複雑なログインフローに対応
- 📊 **セッション管理** - ログイン状態を維持してPDF生成
- 🎯 **精密制御** - ユーザーが完全にログインプロセスを制御

### 既存ブラウザセッションの利用

認証が必要なページ（メルカリ、ログイン必須サイトなど）を処理する場合：

#### 方法1: バッチファイル使用（簡単）
```bash
start-chrome-debug.bat
```

#### 方法2: PowerShellスクリプト使用（推奨）
```bash
powershell -ExecutionPolicy Bypass -File start-chrome-debug.ps1
```

#### 方法3: 手動実行
1. **既存のChromeを完全に終了**
2. **Chromeをデバッグモードで起動**:
   ```bash
   chrome.exe --remote-debugging-port=9222
   ```
3. **通常通りWebサイトにログイン**（メルカリなど）
4. **WebPage2PDFでPDF生成を実行**

#### 特徴：
- 🔑 **現在のユーザーデータを使用** - ログイン情報、ブックマーク、設定がそのまま利用可能
- 🚀 **バックグラウンド処理** - 新しいタブでPDF生成後、自動でタブを閉じる
- 🔄 **既存ブラウザ保持** - PDF生成後もブラウザは開いたまま
- 🛡️ **安全な切断** - 既存ブラウザは閉じずに接続のみ切断

## API エンドポイント

### POST /upload-csv
CSVファイルからURLを抽出します。

**リクエスト:** multipart/form-data形式でCSVファイルをアップロード

**レスポンス:**
```json
{
  "message": "CSVファイルから5個のURLを抽出しました",
  "urls": [
    "https://example.com",
    "https://google.com"
  ],
  "count": 2
}
```

### POST /generate-pdf
複数のWebページをPDFに変換します。

**リクエスト:**
```json
{
  "urls": "https://example.com, https://google.com"
}
```

**レスポンス:**
```json
{
  "message": "PDF生成が完了しました",
  "results": [
    {
      "url": "https://example.com",
      "success": true,
      "filename": "https___example_com_1641234567890.pdf",
      "downloadUrl": "/download/https___example_com_1641234567890.pdf"
    }
  ]
}
```

### POST /download-batch
複数のPDFファイルをZIP形式で一括ダウンロードします。

**リクエスト:**
```json
{
  "filenames": ["file1.pdf", "file2.pdf", "file3.pdf"]
}
```

**レスポンス:** ZIPファイルのバイナリデータ

### POST /prepare-login
手動ログインモードを開始します。

**リクエスト:**
```json
{
  "urls": "https://example.com, https://mercari.com"
}
```

**レスポンス:**
```json
{
  "message": "ログインページを開きました。ログイン完了後に「PDF生成開始」ボタンをクリックしてください。",
  "sessionId": "1641234567890",
  "loginUrl": "https://example.com",
  "totalUrls": 2,
  "usingExistingBrowser": false
}
```

### POST /start-pdf-generation
手動ログイン完了後にPDF生成を開始します。

**リクエスト:**
```json
{
  "sessionId": "1641234567890"
}
```

**レスポンス:**
```json
{
  "message": "PDF生成が完了しました",
  "results": [
    {
      "url": "https://example.com",
      "success": true,
      "filename": "https___example_com_1641234567890.pdf",
      "downloadUrl": "/download/https___example_com_1641234567890.pdf",
      "actualUrl": "https://example.com",
      "pageTitle": "Example Page",
      "usingExistingBrowser": false,
      "tabInfo": "ログインタブで実行"
    }
  ],
  "successCount": 1,
  "totalCount": 1
}
```

### GET /download/:filename
生成されたPDFファイルをダウンロードします。

### GET /health
サーバーのヘルスチェックを行います。

## 設定

### 環境変数

- `PORT`: サーバーのポート番号（デフォルト: 3000）

### PDF設定

サーバーコードの以下の部分でPDFの設定を変更できます：

```javascript
await page.pdf({
    path: filepath,
    format: 'A4',           // ページサイズ
    printBackground: true,  // 背景を印刷
    margin: {              // マージン設定
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
    }
});
```

## 制限事項

- 同時処理可能なURL数: 最大50個
- CSVファイルサイズ制限: 5MBまで
- PDFファイルは生成後60秒で自動削除
- ZIPファイルは生成後120秒で自動削除
- アップロードされたCSVファイルは処理後即座に削除
- JavaScript重要なサイトは完全にレンダリングされない場合があります
- 一部のサイトでアクセス制限がある場合があります

## トラブルシューティング

### よくある問題

1. **PDFが生成されない**
   - URLが正しいか確認
   - サイトがアクセス可能か確認
   - ファイアウォールの設定を確認

2. **文字化けが発生する**
   - サイトの文字エンコーディングが原因の可能性
   - 日本語フォントが不足している可能性

3. **メモリ不足エラー**
   - 同時処理するURL数を減らす
   - サーバーのメモリを増やす

## 開発

### 開発環境での実行

```bash
npm run dev
```

### ファイル構成

```
WebPage2PDF/
├── server.js              # メインサーバーファイル
├── package.json           # Node.js設定
├── README.md              # このファイル
├── public/                # 静的ファイル
│   ├── index.html         # メインページ
│   ├── style.css          # スタイルシート
│   └── script.js          # クライアントサイドJS
├── downloads/             # 一時PDFファイル（自動生成）
└── .github/
    └── copilot-instructions.md
```

## ライセンス

ISC

## 貢献

プルリクエストやイシューの報告を歓迎します。

## ライセンス

MIT License

## 作者

WebPage2PDF - Simple & Fast PDF Conversion Service
