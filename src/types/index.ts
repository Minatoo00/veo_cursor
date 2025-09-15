// 処理状態の型定義
export type ProcessState = 'idle' | 'uploading' | 'gemini' | 'openrouter' | 'completed' | 'error';

// API処理結果の型定義
export interface ProcessResult {
  final?: VeoPrompt;
  gemini_text?: string;
  error?: string;
  raw?: string; // デバッグ用
}

// Veo 3 JSONプロンプトの型定義
export interface VeoPrompt {
  version: "t2v-universal-1.0";
  engine_hint: "veo-3";
  meta: {
    title: string;
    duration: "8s";
    aspect_ratio: "16:9";
    fps: 24;
    language: "en";
    notes: string[];
  };
  globals: {
    style_tags: string[];
    visual_mode: string;
    safety: {
      allow_text: boolean;
      allow_logos: boolean;
    };
  };
  subject: {
    agents: unknown[];
    key_elements: unknown[];
    phenomena: unknown[];
  };
  scene: {
    environment: string;
    camera: {
      shot_type: string;
      position: string;
      lens: string;
      focus: string;
      movement: string;
      framing: string;
    };
    lighting: string;
    mood: string;
  };
  action: {
    overall: string;
  };
  audio: {
    mode: string;
    ambient: string[];
    cues: unknown[];
  };
  timeline: {
    events: unknown[];
    notes: unknown[];
  };
  technical: {
    constraints: {
      allowed_exits: unknown[];
      forbid_reentry_after_exit: unknown[];
      priority_action_by: number;
    };
    negatives: string[];
    quality_controls: string[];
  };
}

// APIエラーレスポンスの型定義
export interface ApiErrorResponse {
  error: string;
  details?: unknown;
}

// ファイルアップロード情報の型定義
export interface UploadFileInfo {
  name: string;
  size: number;
  type: string;
  file: File;
}

// Gemini APIレスポンスの型定義
export interface GeminiResponse {
  text: string;
}

// OpenRouter APIリクエストの型定義
export interface OpenRouterRequest {
  model: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  response_format: {
    type: 'json_object';
  };
  temperature: number;
}

// OpenRouter APIレスポンスの型定義
export interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}
