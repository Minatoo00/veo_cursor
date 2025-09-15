# Veo 3動画プロンプト生成Webアプリ

このプロジェクトは、動画をアップロードしてVeo 3向けの最終完成プロンプト（JSON）を生成するWebアプリケーションです。

## 特徴

- 🎬 **動画解析**: Gemini 2.5 Flashで動画内容を詳細分析
- ⚡ **プロンプト生成**: OpenRouterでVeo 3互換のJSONプロンプトを生成
- 📱 **レスポンシブUI**: モバイルファーストのモダンなUI
- 🚀 **ドラッグ&ドロップ**: 直感的なファイルアップロード
- 📋 **コピー機能**: 生成されたJSONを簡単にコピー・保存

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router) + TypeScript
- **UI**: Tailwind CSS
- **AI**: Google AI Studio (Gemini 2.5 Flash/Pro) + 新SDK (@google/genai)
- **LLM整形**: OpenRouter Chat Completions API

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` ファイルを作成し、以下の環境変数を設定してください：

```bash
# Google AI Studio APIキー（必須）
GEMINI_API_KEY=your_gemini_api_key_here

# OpenRouter APIキー（必須）
OPENROUTER_API_KEY=your_openrouter_api_key_here

# OpenRouterモデル（任意、デフォルトはanthropic/claude-3.5-sonnet）
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

#### APIキーの取得方法

**Gemini API Key:**
1. [Google AI Studio](https://makersuite.google.com/app/apikey) にアクセス
2. 「Create API Key」をクリック
3. 生成されたAPIキーをコピー

**OpenRouter API Key:**
1. [OpenRouter](https://openrouter.ai/keys) にアクセス
2. アカウントを作成してログイン
3. 「Create Key」をクリック
4. 生成されたAPIキーをコピー

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

### 4. 本番ビルド

```bash
npm run build
npm run start
```

## 使用方法

1. **動画アップロード**: 対応形式（MP4, MOV, AVI, MKV, WebM）の動画をドラッグ&ドロップまたはファイル選択
2. **自動処理**: 
   - Files APIで動画をアップロード
   - Geminiで動画内容を詳細分析
   - OpenRouterでVeo 3互換のJSONプロンプトを生成
3. **結果取得**: 生成されたJSONプロンプトをコピーまたはダウンロード

## ファイル制限

- **最大ファイルサイズ**: 2GB
- **保存期間**: 48時間（Google Files API制限）
- **対応形式**: video/*（MP4, MOV, AVI, MKV, WebM等）

## プロジェクト構成

```
src/
├── app/
│   ├── api/process/route.ts     # メインAPIエンドポイント
│   ├── page.tsx                 # メインページ
│   └── layout.tsx               # レイアウト
├── components/
│   ├── FileUpload.tsx           # ファイルアップロード
│   ├── ProcessStatus.tsx        # 処理状態表示
│   ├── ResultDisplay.tsx        # 結果表示
│   └── ErrorDisplay.tsx         # エラー表示
├── lib/
│   ├── gemini.ts               # Gemini API統合
│   ├── openrouter.ts           # OpenRouter API統合
│   └── template.ts             # JSONテンプレート処理
└── types/
    └── index.ts                # TypeScript型定義
```

## API仕様

### POST /api/process

動画ファイルをアップロードしてVeo 3 JSONプロンプトを生成します。

**リクエスト:**
- Content-Type: `multipart/form-data`
- Body: `file` (video/*)

**レスポンス (成功):**
```json
{
  "final": { /* Veo 3 JSONプロンプト */ },
  "gemini_text": "動画の詳細分析結果"
}
```

**レスポンス (エラー):**
```json
{
  "error": "エラーメッセージ",
  "details": "詳細情報（オプション）"
}
```

## エラーハンドリング

アプリケーションは以下のエラーケースに対応しています：

- **ファイルサイズ超過**: 2GB制限
- **不正なファイル形式**: 動画ファイル以外
- **API制限**: クォータ制限、48時間制限
- **ネットワークエラー**: 接続問題
- **JSON生成エラー**: プロンプト生成失敗

各エラーには具体的な対処法が表示されます。

## デプロイメント

### Vercel（推奨）

1. プロジェクトをGitHubにプッシュ
2. Vercelでプロジェクトをインポート
3. 環境変数を設定
4. デプロイ

### その他のプラットフォーム

Next.js 15をサポートするプラットフォームであれば利用可能です。環境変数の設定を忘れずに行ってください。

## トラブルシューティング

### よくある問題

1. **APIキーエラー**: 環境変数が正しく設定されているか確認
2. **ファイルアップロードエラー**: ファイルサイズと形式を確認
3. **プロンプト生成エラー**: OpenRouterのクレジット残高を確認

### デバッグ

開発者ツール（F12）のコンソールでエラーログを確認できます。

## ライセンス

MIT License

## 貢献

プルリクエストやイシューの報告を歓迎します。

## サポート

問題が発生した場合は、以下を確認してください：

1. 環境変数の設定
2. APIキーの有効性
3. ファイル形式とサイズ
4. ネットワーク接続

それでも解決しない場合は、GitHubのIssuesで報告してください。