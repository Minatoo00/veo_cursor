'use client';

import { useState } from 'react';
import FileUpload from '@/components/FileUpload';
import ProcessStatus from '@/components/ProcessStatus';
import ResultDisplay from '@/components/ResultDisplay';
import ErrorDisplay from '@/components/ErrorDisplay';
import { ProcessState, ProcessResult, UploadFileInfo, ApiErrorResponse } from '@/types';

export default function Home() {
  const [processState, setProcessState] = useState<ProcessState>('idle');
  const [currentFile, setCurrentFile] = useState<UploadFileInfo | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [error, setError] = useState<string | ApiErrorResponse | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // ファイル選択時の処理
  const handleFileSelect = async (fileInfo: UploadFileInfo) => {
    setCurrentFile(fileInfo);
    setResult(null);
    setError(null);
    await processVideo(fileInfo);
  };

  // 動画処理のメイン関数
  const processVideo = async (fileInfo: UploadFileInfo) => {
    const controller = new AbortController();
    setAbortController(controller);

    try {
      // FormDataを作成
      const formData = new FormData();
      formData.append('file', fileInfo.file);

      // XMLHttpRequest でアップロード完了時に状態を進める
      setProcessState('uploading');

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let advancedToOpenRouter = false;

        const cleanup = () => {
          controller.signal.removeEventListener('abort', onAbortSignal);
        };

        const onAbortSignal = () => {
          xhr.abort();
        };

        controller.signal.addEventListener('abort', onAbortSignal);

        xhr.open('POST', '/api/process');
        xhr.responseType = 'json';

        // アップロード完了 → Vertex フェーズに遷移
        xhr.upload.onload = () => setProcessState('gemini');

        // サーバーからレスポンスボディを受信し始めたら OpenRouter フェーズへ
        xhr.onreadystatechange = () => {
          if (!advancedToOpenRouter && xhr.readyState === XMLHttpRequest.LOADING) {
            advancedToOpenRouter = true;
            setProcessState('openrouter');
          }
        };

        xhr.onload = () => {
          cleanup();
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = xhr.response as ProcessResult;
            setResult(data);
            setProcessState('completed');
            resolve();
          } else {
            const errorPayload = (xhr.response as ApiErrorResponse) ?? { error: 'サーバーエラーが発生しました' };
            reject(new Error(JSON.stringify(errorPayload)));
          }
        };

        xhr.onerror = () => {
          cleanup();
          reject(new Error('ネットワークエラーが発生しました'));
        };

        xhr.onabort = () => {
          cleanup();
          setProcessState('idle');
          setCurrentFile(null);
          resolve();
        };

        xhr.send(formData);
      });

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          // キャンセルされた場合
          setProcessState('idle');
          setCurrentFile(null);
          return;
        }

        // JSONエラーレスポンスの場合
        try {
          const errorData = JSON.parse(error.message);
          setError(errorData);
        } catch {
          // 通常のエラーメッセージの場合
          setError(error.message);
        }
      } else {
        setError('予期しないエラーが発生しました');
      }
      
      setProcessState('error');
    } finally {
      setAbortController(null);
    }
  };

  // 処理をキャンセル
  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  // 再試行
  const handleRetry = () => {
    if (currentFile) {
      setError(null);
      processVideo(currentFile);
    }
  };

  // リセット（最初からやり直し）
  const handleReset = () => {
    setProcessState('idle');
    setCurrentFile(null);
    setResult(null);
    setError(null);
    if (abortController) {
      abortController.abort();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              🎬 Veo 3 プロンプト生成ツール
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              動画をアップロードして、Veo 3向けの最適化されたJSONプロンプトを生成
            </p>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* ファイルアップロード */}
          {processState === 'idle' && (
            <FileUpload
              onFileSelect={handleFileSelect}
              disabled={processState !== 'idle'}
            />
          )}

          {/* 処理状態表示 */}
          {processState !== 'idle' && processState !== 'error' && (
            <ProcessStatus
              state={processState}
              fileName={currentFile?.name}
              onCancel={handleCancel}
            />
          )}

          {/* エラー表示 */}
          {processState === 'error' && error && (
            <ErrorDisplay
              error={error}
              onRetry={handleRetry}
              onReset={handleReset}
            />
          )}

          {/* 結果表示 */}
          {processState === 'completed' && result && (
            <ResultDisplay
              result={result}
              onReset={handleReset}
            />
          )}
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500 space-y-2">
            <p>
              このツールは <strong>Vertex AI（Gemini）</strong> で動画を解析し、
              <strong>OpenRouter</strong> でVeo 3互換のJSONプロンプトを生成します。
            </p>
            <p>
              対応形式: MP4, MOV, AVI, MKV, WebM（最大2GB）
            </p>
            <div className="flex justify-center space-x-6 mt-4">
              <span className="flex items-center space-x-1">
                <span>🤖</span>
                <span>Gemini AI</span>
              </span>
              <span className="flex items-center space-x-1">
                <span>⚡</span>
                <span>OpenRouter</span>
              </span>
              <span className="flex items-center space-x-1">
                <span>🎬</span>
                <span>Veo 3 Compatible</span>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
