'use client';

import { useState } from 'react';
import { ProcessResult, VeoPrompt } from '@/types';

interface ResultDisplayProps {
  result: ProcessResult;
  onReset?: () => void;
}

export default function ResultDisplay({ result, onReset }: ResultDisplayProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [showGeminiText, setShowGeminiText] = useState(false);

  // JSONを整形して表示
  const formatJSON = (obj: unknown): string => {
    return JSON.stringify(obj, null, 2);
  };

  // クリップボードにコピー
  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000); // 2秒後にリセット
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('クリップボードへのコピーに失敗しました');
    }
  };

  // ファイルとしてダウンロード
  const downloadAsFile = (content: string, filename: string, contentType: string = 'application/json') => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Veo 3プロンプトの主要情報を抽出
  const getPromptSummary = (prompt: VeoPrompt) => {
    return {
      title: prompt.meta?.title || '未設定',
      duration: prompt.meta?.duration || '8s',
      visualMode: prompt.globals?.visual_mode || '未設定',
      environment: prompt.scene?.environment || '未設定'
    };
  };

  if (!result.final) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">結果データが見つかりません。</p>
        </div>
      </div>
    );
  }

  const summary = getPromptSummary(result.final);
  const formattedJSON = formatJSON(result.final);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            🎬 Veo 3 プロンプト生成完了
          </h2>
          {onReset && (
            <button
              onClick={onReset}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
            >
              新しい動画を処理
            </button>
          )}
        </div>

        {/* プロンプト概要 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">タイトル:</span>
            <p className="text-gray-900 mt-1">{summary.title}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">時間:</span>
            <p className="text-gray-900 mt-1">{summary.duration}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">モード:</span>
            <p className="text-gray-900 mt-1">{summary.visualMode}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">環境:</span>
            <p className="text-gray-900 mt-1 truncate" title={summary.environment}>
              {summary.environment}
            </p>
          </div>
        </div>
      </div>

      {/* メイン結果（JSONプロンプト） */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              📋 Veo 3 JSONプロンプト
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => copyToClipboard(formattedJSON, 'json')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  copiedSection === 'json'
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-300'
                }`}
              >
                {copiedSection === 'json' ? '✓ コピー済み' : '📋 コピー'}
              </button>
              <button
                onClick={() => downloadAsFile(formattedJSON, 'veo3-prompt.json')}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-md transition-colors"
              >
                💾 ダウンロード
              </button>
            </div>
          </div>
        </div>
        <div className="p-6">
          <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto text-sm text-gray-800 border">
            <code>{formattedJSON}</code>
          </pre>
        </div>
      </div>

      {/* Geminiテキスト（折りたたみ） */}
      {result.gemini_text && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div
            role="button"
            tabIndex={0}
            aria-expanded={showGeminiText}
            aria-controls="gemini-panel"
            onClick={() => setShowGeminiText(!showGeminiText)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowGeminiText((v) => !v);
              }
            }}
            className="w-full px-6 py-4 text-left border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                🤖 Gemini動画解析結果
              </h3>
              <div className="flex items-center space-x-2">
                {showGeminiText && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(result.gemini_text!, 'gemini');
                    }}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      copiedSection === 'gemini'
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-300'
                    }`}
                  >
                    {copiedSection === 'gemini' ? '✓ コピー済み' : '📋 コピー'}
                  </button>
                )}
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    showGeminiText ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          {showGeminiText && (
            <div id="gemini-panel" className="p-6">
              <div className="bg-gray-50 p-4 rounded-md border">
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {result.gemini_text}
                </p>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => downloadAsFile(result.gemini_text!, 'gemini-analysis.txt', 'text/plain')}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-md transition-colors"
                >
                  💾 テキストダウンロード
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 使用方法の説明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">📖 使用方法</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• 生成されたJSONプロンプトをVeo 3の入力として使用してください</p>
          <p>• プロンプトは8秒の動画生成に最適化されています</p>
          <p>• 必要に応じてJSONの内容を手動で調整することも可能です</p>
        </div>
      </div>
    </div>
  );
}
