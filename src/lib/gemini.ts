/**
 * Gemini API統合ライブラリ
 * Google AI Studio (Gemini 2.5 Flash/Pro) + 新SDK (@google/genai) を使用
 */

import { GoogleGenAI, FileState } from '@google/genai';
import { GeminiResponse } from '@/types';

// 環境変数の検証
function validateEnvironment(): void {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }
}

/** Utility: delay */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * アップロード後にファイルがACTIVEになるまでポーリング
 */
async function waitForFileActive(
  client: GoogleGenAI,
  name: string,
  timeoutMs: number = 60_000,
  intervalMs: number = 1_000
): Promise<{ uri: string; mimeType: string }> {
  const start = Date.now();
  while (true) {
    const file = await client.files.get({ name });
    if (file.state === FileState.ACTIVE) {
      return { uri: file.uri!, mimeType: file.mimeType! };
    }
    if (file.state === FileState.FAILED) {
      const message = (file.error && (file.error as { message?: string }).message) || 'File processing failed';
      throw new Error(message);
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error('ファイルの処理に時間がかかっています。しばらくしてから再試行してください。');
    }
    await sleep(intervalMs);
  }
}

/**
 * ファイルをGoogle Files APIにアップロード（新SDK使用）
 * @param fileSource アップロードするファイルのパス（string）または Blob/File
 * @param mimeType ファイルのMIMEタイプ
 * @param displayName 表示名（オプション）
 * @returns アップロード結果（uri と mimeType を含む）
 */
export async function uploadVideoToGemini(
  fileSource: string | Blob | File,
  mimeType: string,
  displayName?: string
): Promise<{ uri: string; mimeType: string; name?: string }> {
  validateEnvironment();
  
  try {
    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    
    const uploaded = await client.files.upload({
      file: fileSource,
      config: {
        mimeType,
        displayName: displayName || 'uploaded_video'
      }
    });

    const name: string | undefined = (uploaded as { name?: string }).name;

    // ACTIVEになるまで待機
    const { uri, mimeType: activeMime } = name
      ? await waitForFileActive(client, name)
      : { uri: uploaded.uri!, mimeType: uploaded.mimeType! };
    
    return {
      uri,
      mimeType: activeMime,
      name
    };
  } catch (error) {
    // エラーメッセージを詳細化
    if (error instanceof Error) {
      if (error.message.includes('quota') || error.message.includes('limit')) {
        throw new Error('アップロード容量制限に達しています。しばらく待ってから再試行してください。');
      }
      if (error.message.includes('expired')) {
        throw new Error('ファイルの保存期限が切れています。動画を再アップロードしてください。');
      }
      if (error.message.includes('size')) {
        throw new Error('ファイルサイズが2GBを超えています。動画を圧縮してください。');
      }
    }
    
    throw new Error(`ファイルアップロードに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Geminiに動画解析を依頼（新SDK使用）
 * @param fileUri Files APIから取得したfile.uri
 * @param fileMimeType Files APIから取得したfile.mimeType
 * @param model 使用するモデル（デフォルト: gemini-2.5-flash）
 * @returns 動画の詳細説明文
 */
export async function analyzeVideoWithGemini(
  fileUri: string, 
  fileMimeType: string,
  model: string = 'gemini-2.5-flash'
): Promise<GeminiResponse> {
  validateEnvironment();
  
  try {
    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    
    // プロンプト（REQUIREMENTS.mdの仕様通り）
    const prompt = "この動画を可能な限り詳細まで説明して。説明以外は何も出力しないでください";
    
    // 新SDKでの動画ファイルデータと共にリクエスト
    const result = await client.models.generateContent({
      model,
      contents: [
        {
          parts: [
            { text: prompt },
            {
              fileData: {
                fileUri: fileUri,
                mimeType: fileMimeType
              }
            }
          ]
        }
      ]
    });
    
    const text = result.text?.trim();
    
    if (!text) {
      throw new Error('Geminiから空の応答が返されました');
    }
    
    return { text };
    
  } catch (error) {
    // エラーメッセージを詳細化
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('Gemini APIキーが無効です。環境変数を確認してください。');
      }
      if (error.message.includes('quota') || error.message.includes('rate')) {
        throw new Error('API使用量制限に達しています。しばらく待ってから再試行してください。');
      }
      if (error.message.includes('format') || error.message.includes('mime')) {
        throw new Error('動画形式がサポートされていません。MP4、MOV、AVI等の形式をお試しください。');
      }
      if (error.message.toLowerCase().includes('overloaded') || error.message.toLowerCase().includes('unavailable')) {
        throw new Error('サービスが混雑しています。しばらくしてから再試行してください。');
      }
    }
    
    throw new Error(`動画の解析に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function isTransientGeminiError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const m = error.message.toLowerCase();
  return (
    m.includes('unavailable') ||
    m.includes('overloaded') ||
    m.includes('try again') ||
    m.includes('internal') ||
    m.includes('timeout') ||
    m.includes('503') ||
    m.includes('500')
  );
}

/**
 * リトライ & モデルフォールバック付きの解析
 */
export async function analyzeVideoWithRetry(
  fileUri: string,
  fileMimeType: string,
  models: string[] = ['gemini-2.5-flash', 'gemini-2.5-pro'],
  maxRetriesPerModel: number = 2
): Promise<GeminiResponse> {
  let lastError: Error = new Error('unknown');
  for (const model of models) {
    for (let attempt = 0; attempt <= maxRetriesPerModel; attempt++) {
      try {
        return await analyzeVideoWithGemini(fileUri, fileMimeType, model);
      } catch (e) {
        const err = e instanceof Error ? e : new Error('unknown');
        lastError = err;
        if (!isTransientGeminiError(err) || attempt === maxRetriesPerModel) break;
        await sleep(1000 * Math.pow(2, attempt));
      }
    }
  }
  throw lastError;
}

/**
 * アップロードしたファイルを削除（オプション）（新SDK使用）
 * @param nameOrUri 削除するファイルのname（推奨）またはURI
 */
export async function deleteGeminiFile(nameOrUri: string): Promise<void> {
  validateEnvironment();
  
  try {
    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    // nameが 'files/xxx' 形式であることが期待値。URIが渡ってきた場合はベストエフォートで抽出。
    const name = nameOrUri.startsWith('files/')
      ? nameOrUri
      : (nameOrUri.includes('/files/') ? `files/${nameOrUri.split('/files/')[1]}` : nameOrUri);
    if (name) {
      await client.files.delete({ name });
    }
  } catch (error) {
    // 削除エラーは非致命的なのでログ出力のみ
    console.warn('Failed to delete Gemini file:', error);
  }
}

/**
 * 動画ファイル処理の統合関数
 * アップロード → 解析 → クリーンアップの全工程を実行
 * @param fileSource 動画ファイルのパス または Blob/File
 * @param mimeType ファイルのMIMEタイプ
 * @param displayName 表示名（オプション）
 * @param model 使用するモデル（オプション）
 * @param cleanup ファイル削除を行うか（デフォルト: false）
 * @returns 動画の詳細説明文
 */
export async function processVideoWithGemini(
  fileSource: string | Blob | File,
  mimeType: string,
  displayName?: string,
  model?: string,
  cleanup: boolean = false
): Promise<GeminiResponse> {
  let fileNameOrUri: string | undefined;
  
  try {
    // 1. ファイルアップロード
    const uploadResult = await uploadVideoToGemini(fileSource, mimeType, displayName);
    fileNameOrUri = uploadResult.name || uploadResult.uri;
    
    // 2. 動画解析（リトライ＆フォールバック付き）
    const analysisResult = await analyzeVideoWithRetry(uploadResult.uri, uploadResult.mimeType, model ? [model] : undefined);
    
    // 3. クリーンアップ（オプション）
    if (cleanup && fileNameOrUri) {
      await deleteGeminiFile(fileNameOrUri);
    }
    
    return analysisResult;
    
  } catch (error) {
    // エラー時もクリーンアップを試行
    if (cleanup && fileNameOrUri) {
      await deleteGeminiFile(fileNameOrUri);
    }
    
    throw error;
  }
}
