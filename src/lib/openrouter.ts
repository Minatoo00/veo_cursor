/**
 * OpenRouter API統合ライブラリ
 * Chat Completions APIでresponse_formatによるJSON強制生成を実行
 */

import { OpenRouterRequest, OpenRouterResponse } from '@/types';

// 環境変数の検証
function validateEnvironment(): void {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY environment variable is required');
  }
}

/**
 * OpenRouter APIのベースURL
 */
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * デフォルトモデル（環境変数で上書き可能）
 */
const DEFAULT_MODEL = 'anthropic/claude-3.5-sonnet';

/**
 * OpenRouter APIでJSON生成を実行
 * @param prompt プロンプト文字列（テンプレート + Geminiテキスト）
 * @param model 使用するモデル（オプション）
 * @returns 生成されたJSON文字列
 */
export async function generateJSONWithOpenRouter(
  prompt: string,
  model?: string
): Promise<string> {
  validateEnvironment();
  
  const selectedModel = model || process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  
  const requestBody: OpenRouterRequest = {
    model: selectedModel,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    response_format: {
      type: 'json_object'
    },
    temperature: 0.2 // 安定化のため低温度設定
  };
  
  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Veo 3 Prompt Generator'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      // HTTPステータスエラーの詳細化
      const errorText = await response.text();
      
      switch (response.status) {
        case 401:
          throw new Error('OpenRouter APIキーが無効です。環境変数を確認してください。');
        case 402:
          throw new Error('OpenRouter APIクレジットが不足しています。アカウントを確認してください。');
        case 429:
          throw new Error('API使用量制限に達しています。しばらく待ってから再試行してください。');
        case 400:
          throw new Error(`リクエストが無効です: ${errorText}`);
        case 500:
        case 502:
        case 503:
          throw new Error('OpenRouterサーバーでエラーが発生しました。再試行してください。');
        default:
          throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
      }
    }
    
    const data: OpenRouterResponse = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('OpenRouterから有効な応答が返されませんでした');
    }
    
    const content = data.choices[0].message.content;
    
    if (!content) {
      throw new Error('OpenRouterから空の応答が返されました');
    }
    
    return content;
    
  } catch (error) {
    // ネットワークエラーやその他のエラー
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('OpenRouterへの接続に失敗しました。ネットワーク接続を確認してください。');
    }
    
    // 既に処理済みのエラーはそのまま再スロー
    if (error instanceof Error && error.message.includes('OpenRouter')) {
      throw error;
    }
    
    throw new Error(`プロンプト生成でエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * OpenRouter APIの利用可能モデル一覧を取得（オプション機能）
 * @returns モデル一覧
 */
export async function getAvailableModels(): Promise<unknown[]> {
  validateEnvironment();
  
  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data || [];
    
  } catch (error) {
    console.warn('Failed to fetch available models:', error);
    return [];
  }
}

/**
 * プロンプト生成の統合関数
 * エラーハンドリングとリトライ機能を含む
 * @param prompt プロンプト文字列
 * @param model 使用するモデル（オプション）
 * @param maxRetries 最大リトライ回数（デフォルト: 2）
 * @returns 生成されたJSON文字列
 */
export async function generateJSONWithRetry(
  prompt: string,
  model?: string,
  maxRetries: number = 2
): Promise<string> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await generateJSONWithOpenRouter(prompt, model);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // リトライ不可能なエラーは即座に終了
      if (
        lastError.message.includes('APIキーが無効') ||
        lastError.message.includes('クレジットが不足') ||
        lastError.message.includes('リクエストが無効')
      ) {
        throw lastError;
      }
      
      // 最後の試行でなければ短時間待機
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  
  throw lastError!;
}
