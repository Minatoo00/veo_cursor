/**
 * メインAPIエンドポイント: /api/process
 * POST multipart/form-data で動画ファイルを受け取り、Veo 3 JSONプロンプトを生成
 */

import { NextRequest, NextResponse } from 'next/server';
import { processVideoWithGemini } from '@/lib/gemini';
import { generateJSONWithRetry } from '@/lib/openrouter';
import { createPromptFromTemplate, parseOpenRouterResponse } from '@/lib/template';
import { ProcessResult, ApiErrorResponse } from '@/types';

// ファイルサイズ制限（2GB）
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB in bytes

// サポートされる動画形式
const SUPPORTED_MIME_TYPES = [
  'video/mp4',
  'video/mov',
  'video/avi',
  'video/mkv',
  'video/webm',
  'video/quicktime'
];

/**
 * ファイルバリデーション
 */
function validateFile(file: { size: number; type: string; name?: string | null }): { valid: boolean; error?: string } {
  // ファイルサイズチェック
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'ファイルサイズが2GBを超えています。動画を圧縮してください。'
    };
  }
  
  // MIMEタイプチェック
  if (!file.type || !SUPPORTED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: '動画ファイルをアップロードしてください。対応形式: MP4, MOV, AVI, MKV, WebM'
    };
  }
  
  // ファイル名チェック（基本的な検証）
  if (!file.name) {
    return {
      valid: false,
      error: '有効なファイル名を持つファイルをアップロードしてください。'
    };
  }
  
  return { valid: true };
}

/**
 * POST /api/process
 * メイン処理エンドポイント
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // 1) フォームデータ解析
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: 'ファイルが見つかりません。"file"フィールドに動画をアップロードしてください。' } as ApiErrorResponse,
        { status: 400 }
      );
    }

    const inputFile = file as File;
    const fileName = inputFile.name || 'uploaded_video';
    const fileType = inputFile.type || 'video/mp4';

    // 2) バリデーション
    const validation = validateFile({ size: inputFile.size, type: fileType, name: fileName });
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error! } as ApiErrorResponse,
        { status: 400 }
      );
    }

    // 3) Geminiで動画解析（File/Blobを直接）
    let geminiText: string;
    try {
      const geminiResult = await processVideoWithGemini(
        inputFile,
        fileType,
        fileName
      );
      geminiText = geminiResult.text;
    } catch (error) {
      return NextResponse.json(
        { 
          error: error instanceof Error ? error.message : '動画の解析に失敗しました。再試行してください。'
        } as ApiErrorResponse,
        { status: 502 }
      );
    }
    
    // 4) テンプレートにGeminiテキストを埋め込み
    const promptForOpenRouter = createPromptFromTemplate(geminiText);
    
    // 5) OpenRouterでJSON生成
    let rawJsonContent: string;
    try {
      rawJsonContent = await generateJSONWithRetry(promptForOpenRouter);
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : 'プロンプト生成サービスでエラーが発生しました。再試行してください。'
        } as ApiErrorResponse,
        { status: 502 }
      );
    }
    
    // 6) JSON解析と検証
    const parseResult = parseOpenRouterResponse(rawJsonContent);
    
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'JSONプロンプトの生成に失敗しました。再試行してください。',
          raw: parseResult.raw
        } as ApiErrorResponse,
        { status: 500 }
      );
    }
    
    // 7) 成功レスポンス
    const result: ProcessResult = {
      final: parseResult.data as ProcessResult['final'],
      gemini_text: geminiText
    };
    
    return NextResponse.json(result, { status: 200 });
    
  } catch (error) {
    // 予期しないエラー
    console.error('Unexpected error in /api/process:', error);
    
    return NextResponse.json(
      {
        error: '処理中に予期しないエラーが発生しました。再試行してください。',
        details: error instanceof Error ? error.message : 'Unknown error'
      } as ApiErrorResponse,
      { status: 500 }
    );
  }
}

/**
 * GET /api/process
 * エンドポイントの説明を返す
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: '/api/process',
    method: 'POST',
    description: 'Veo 3動画プロンプト生成API',
    parameters: {
      file: 'video/* (max 2GB)'
    },
    response: {
      final: 'Generated Veo 3 JSON prompt',
      gemini_text: 'Video analysis from Gemini'
    }
  });
}
