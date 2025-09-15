'use client';

import { ProcessState } from '@/types';

interface ProcessStatusProps {
  state: ProcessState;
  fileName?: string;
  onCancel?: () => void;
}

export default function ProcessStatus({ 
  state, 
  fileName,
  onCancel 
}: ProcessStatusProps) {
  // 状態に応じたメッセージとスタイルを定義
  const getStatusInfo = (state: ProcessState) => {
    switch (state) {
      case 'idle':
        return {
          message: '動画ファイルを選択してください',
          description: '',
          progress: 0,
          color: 'gray',
          showProgress: false
        };
      
      case 'uploading':
        return {
          message: 'ファイルをアップロード中...',
          description: 'GCS に動画をアップロードしています',
          progress: 25,
          color: 'blue',
          showProgress: true
        };
      
      case 'gemini':
        return {
          message: '動画を解析中...',
          description: 'Vertex AI（Gemini）が動画の内容を詳細に分析しています',
          progress: 50,
          color: 'blue',
          showProgress: true
        };
      
      case 'openrouter':
        return {
          message: 'プロンプトを生成中...',
          description: 'OpenRouter AIがVeo 3向けのJSONプロンプトを作成しています',
          progress: 75,
          color: 'blue',
          showProgress: true
        };
      
      case 'completed':
        return {
          message: '処理完了！',
          description: 'Veo 3 JSONプロンプトが正常に生成されました',
          progress: 100,
          color: 'green',
          showProgress: true
        };
      
      case 'error':
        return {
          message: 'エラーが発生しました',
          description: '処理中にエラーが発生しました。詳細は下記をご確認ください',
          progress: 0,
          color: 'red',
          showProgress: false
        };
      
      default:
        return {
          message: '不明な状態',
          description: '',
          progress: 0,
          color: 'gray',
          showProgress: false
        };
    }
  };

  const statusInfo = getStatusInfo(state);
  const isProcessing = ['uploading', 'gemini', 'openrouter'].includes(state);

  // プログレスバーの色を決定
  const getProgressColor = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-600';
      case 'green': return 'bg-green-600';
      case 'red': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  // ステータスアイコンを決定
  const getStatusIcon = (state: ProcessState, color: string) => {
    if (state === 'completed') {
      return (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    
    if (state === 'error') {
      return (
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    }
    
    if (isProcessing) {
      return (
        <svg className={`w-6 h-6 text-${color}-600 animate-spin`} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      );
    }
    
    return (
      <svg className={`w-6 h-6 text-${color}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  if (state === 'idle') {
    return null; // idle状態では何も表示しない
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        {/* ヘッダー部分 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getStatusIcon(state, statusInfo.color)}
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {statusInfo.message}
              </h3>
              {fileName && (
                <p className="text-sm text-gray-500 mt-1">
                  ファイル: {fileName}
                </p>
              )}
            </div>
          </div>
          
          {/* キャンセルボタン（処理中のみ表示） */}
          {isProcessing && onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
          )}
        </div>

        {/* 説明文 */}
        {statusInfo.description && (
          <p className="text-sm text-gray-600 mb-4">
            {statusInfo.description}
          </p>
        )}

        {/* プログレスバー */}
        {statusInfo.showProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>進捗</span>
              <span>{statusInfo.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(statusInfo.color)}`}
                style={{ width: `${statusInfo.progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* 処理ステップ表示 */}
        {isProcessing && (
          <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
            <div className={`text-center ${state === 'uploading' ? 'text-blue-600 font-medium' : state === 'gemini' || state === 'openrouter' || state === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className="mb-1">📤</div>
              <div>アップロード</div>
            </div>
            <div className={`text-center ${state === 'gemini' ? 'text-blue-600 font-medium' : state === 'openrouter' || state === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className="mb-1">🤖</div>
              <div>動画解析</div>
            </div>
            <div className={`text-center ${state === 'openrouter' ? 'text-blue-600 font-medium' : state === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className="mb-1">✨</div>
              <div>プロンプト生成</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
