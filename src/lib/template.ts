/**
 * Veo 3 JSONプロンプトテンプレート処理ライブラリ
 * REQUIREMENTS.mdのテンプレート仕様に基づいてプロンプトを生成
 */

// テンプレート文字列（REQUIREMENTS.mdから取得）
const TEMPLATE = `あなたは動画生成用プロンプトの設計エンジニアです。以下の要件で、Veo 3 互換の安定JSONを生成してください。

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
- **出力は厳格な JSON のみ。コードブロック（\`\`\`）は使わない。**

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
`;

/**
 * Geminiの説明文をテンプレートに埋め込んでOpenRouter用のプロンプトを生成
 * @param geminiText Geminiから取得した動画説明文
 * @returns OpenRouterに送信するプロンプト文字列
 */
export function createPromptFromTemplate(geminiText: string): string {
  // ===INPUT=== の直下にgeminiTextを挿入
  return TEMPLATE + geminiText.trim();
}

/**
 * OpenRouterからの応答JSONを検証・清浄化
 * @param rawContent OpenRouterからの生の応答文字列
 * @returns 解析済みのJSONオブジェクトまたはエラー情報
 */
export function parseOpenRouterResponse(rawContent: string): { 
  success: boolean; 
  data?: unknown; 
  error?: string; 
  raw?: string; 
} {
  try {
    // コードブロック（```）が含まれている場合は除去
    let cleanContent = rawContent.trim();
    
    // ```json で始まり ``` で終わる場合の処理
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // JSON解析を試行
    const parsed = JSON.parse(cleanContent);
    
    // 基本的な構造検証
    if (typeof parsed === 'object' && parsed !== null) {
      // Veo 3プロンプトの必須フィールドをチェック
      const requiredFields = ['version', 'engine_hint', 'meta', 'globals', 'subject', 'scene', 'action', 'audio', 'timeline', 'technical'];
      const missingFields = requiredFields.filter(field => !(field in parsed));
      
      if (missingFields.length > 0) {
        return {
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`,
          raw: rawContent
        };
      }
      
      return {
        success: true,
        data: parsed
      };
    } else {
      return {
        success: false,
        error: 'Parsed content is not a valid object',
        raw: rawContent
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `JSON parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      raw: rawContent
    };
  }
}
