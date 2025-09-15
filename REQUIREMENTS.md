以下の仕様で、Veo 3向け「最終完成プロンプト(JSON)」生成Webアプリを実装してください。

## 目的
- ユーザーが動画をアップロード → **Files APIでアップロード** → `file_uri` を Gemini に渡し、**「この動画を可能な限り詳細まで説明して。説明以外は何も出力しないでください」**と指示 → 返却テキストを既定テンプレの `===INPUT===` に埋めて **OpenRouter LLM** に渡す → **LLMの出力JSON**を最終完成プロンプトとして返す。

## 技術選定
- Next.js 15 (App Router) + TypeScript
- UI: Tailwind CSS（最小）
- AI: Google AI Studio（**Gemini 2.5 Flash / 2.5 Pro**）+ **新SDK（@google/genai）**
- LLM整形: OpenRouter Chat Completions API（**response_format で JSON を強制**）
- 環境変数: GEMINI_API_KEY, OPENROUTER_API_KEY, OPENROUTER_MODEL(任意)

## API（サーバ実装）
- `POST /api/process` （`multipart/form-data`, `file=video/*`）

### 処理フロー
1) **Files API へアップロード（必須）**  
   - 新SDKを使用。`ai.files.upload({ file: <path or buffer>, config: { mimeType: req.file.mimetype }})` でアップロードし、`file.uri` と `file.mimeType` を取得。  
   - **注意**: 1ファイル最大 2GB、プロジェクト合計 20GB、保存 48時間。超過や期限切れの例外ハンドリングを実装。

2) **Geminiへ問い合わせ（動画 + テキスト）**  
   - `model`: `"gemini-2.5-flash"`（重め/厳密なら `"gemini-2.5-pro"`）  
   - `contents`: `[ {file_data:{file_uri:file.uri, mime_type:file.mimeType}}, "この動画を可能な限り詳細まで説明して。説明以外は何も出力しないでください" ]`  
   - **返却本文取得**：`const geminiText = res.text.trim()` を使用（新SDK）。

3) **テンプレへ埋め込み → OpenRouter へ JSON 生成要求**  
   - `messages` にテンプレ（`===INPUT===` の直下へ `geminiText` をそのまま挿入済み文字列）を `role: "user"` として投入。  
   - **`response_format`: `{ "type": "json_object" }`** を指定（コードフェンスを使わせない）。  
   - `temperature: 0.2` で安定化。

4) **OpenRouter応答をパース**  
   - `const final = JSON.parse(resp.choices[0].message.content)`  
   - 失敗時は `{ error: "Invalid JSON", raw: resp.choices[0].message.content }` を返す。

5) **HTTPレスポンス**  
   - `200` with `{ final, gemini_text: geminiText }`  
   - エラー時は `4xx/5xx` とし、サイズ超過/形式不正/生成失敗などの具体的メッセージを返却。

## フロント
- D&D/ファイル選択 → `/api/process` へ送信（進捗表示/キャンセル/再試行）
- 結果表示：`final`（JSON 整形表示・コピー/保存ボタン）＋ `gemini_text`（折りたたみ）
- エラー表示：HTTP メッセージ＋対処案内（再アップロード/解像度を下げる等）

## 受け入れ基準
- 一般的なスマホ動画で `gemini_text` を取得でき、`final` が **有効な JSON** として即時返る  
- `final` はテンプレ仕様に準拠  
- 失敗時：UIで具体的メッセージ（例：**2GB超過**、**不正なMIME**、**OpenRouterのJSON不正**）

## OpenRouter に渡すプロンプト・テンプレ
（`===INPUT===` に `geminiText` を埋め込む）

<<BEGIN_TEMPLATE
あなたは動画生成用プロンプトの設計エンジニアです。以下の要件で、Veo 3 互換の安定JSONを生成してください。

【目的】
- 入力（Geminiの説明文）をもとに、題材が「人物・動物・乗り物・プロダクト・風景・現象・抽象・モーショングラフィックス・CG」のいずれでも成立する「安定化済みの最終JSONプロンプト」を返す。
- 方向は FRAME/SCREEN 基準で統一（SCREEN-LEFT/SCREEN-RIGHT）。
- 1クリップ=8秒を基本。要求が長い場合は two_part=true で Part A/B を出力し、Part B は Part A の最終フレームを init_image に指定する方式にする。

【厳守ルール】
- カメラ既定: locked-off / lens 18–24mm / hyperfocal / wide。入力が明確に handheld/dolly/pan_tilt/virtual-camera を指す場合のみ変更。
- 重要な視覚変化（priority_action）は t≈5.2s までに完了。その後 0.6–1.0s の still hold を入れる。
- 肯定で二度言い切る（例: RISES / CONTINUES TO RISE）。Negative は最小限（extra elements / additional vehicles / pan-tilt-zoom / unintended text / watermarks）。
- allowed_exits と forbid_reentry_after_exit を必ず設定。人に限らず任意の可動エージェントに適用。
- audio_cues は 2〜5 点に圧縮。オフスクリーン方向の音は方向錨として記述。無音や音楽主体の指定も可。
- events は 3〜5 個に要約。冗長な微動作は "notes" に回す。非ヒト題材では状態変化語彙で記述。
- 方向語は SCREEN-LEFT/RIGHT/CENTER/（OFF-SCREEN-LEFT/RIGHT）で記述。
- **出力は厳格な JSON のみ。コードブロック（```）は使わない。**

【出力仕様】
単一 JSON のみを返す。

【アクション語彙（参考）】
ARRIVE / ENTER FRAME / EXIT / DEPART / PASS / APPROACH / REVEAL / CONCEAL /
RISE / FALL / ROTATE / SPIN / SCALE / MORPH / BLOOM / MELT / EMIT / FLOW /
IGNITE / EXTINGUISH / GLINT / FLICKER / BRIGHTEN / DIM / COALESCE / DISSIPATE /
OPEN / CLOSE / SETTLE / DRIFT / ACCELERATE / DECELERATE

【ベーステンプレ（マッピングはあなたが自動で反映）】
{
  "version": "t2v-universal-1.0",
  "engine_hint": "veo-3",
  "meta": {
    "title": "<短いログライン（題材非依存）>",
    "duration": "8s",
    "aspect_ratio": "16:9",
    "fps": 24,
    "language": "en",
    "notes": [
      "Locked-off unless input explicitly requests motion (incl. virtual camera).",
      "Directions use FRAME/SCREEN coordinates: SCREEN-LEFT/SCREEN-RIGHT.",
      "Priority action by 5.2s, then still hold."
    ]
  },
  "globals": {
    "style_tags": ["<入力のstyle_tags or defaults>", "neutral-cool", "slightly-desaturated", "photoreal"],
    "visual_mode": "<live_action|macro|time_lapse|mograph|3d_cgi|cel|stop_motion>",
    "safety": { "allow_text": false, "allow_logos": false }
  },
  "subject": {
    "agents": [],
    "key_elements": [],
    "phenomena": []
  },
  "scene": {
    "environment": "<location/time_of_day or virtual/abstract>",
    "camera": {
      "shot_type": "wide",
      "position": "describe in plain words (height/distance if available)",
      "lens": "18–24mm (or from input if reliable)",
      "focus": "hyperfocal, deep focus",
      "movement": "locked-off|handheld|dolly|pan_tilt|virtual-camera (from input)",
      "framing": "use SCREEN-LEFT/RIGHT to place main subjects"
    },
    "lighting": "describe key light qualities or 'neutral'",
    "mood": "<derived or neutral>"
  },
  "action": {
    "overall": "ONE continuous shot (8s). Summarize key beats in one sentence using SCREEN coordinates. Avoid anthropomorphic phrasing for non-human subjects."
  },
  "audio": {
    "mode": "diegetic|music|silence",
    "ambient": ["distant traffic","light wind"],
    "cues": []
  },
  "timeline": {
    "events": [],
    "notes": []
  },
  "technical": {
    "constraints": {
      "allowed_exits": [],
      "forbid_reentry_after_exit": [],
      "priority_action_by": 5.2
    },
    "negatives": ["no extra elements","no unintended text","no watermarks","no additional vehicles","no pan/tilt/zoom/crop"],
    "quality_controls": ["consistent color temperature","no exposure pumping","temporal consistency of textures"]
  }
}

===INPUT===
（ここに Gemini の説明文 `geminiText` を埋め込む）
<<END_TEMPLATE


