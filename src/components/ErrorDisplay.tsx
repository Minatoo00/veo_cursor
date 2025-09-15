'use client';

import { ApiErrorResponse } from '@/types';

interface ErrorDisplayProps {
  error: string | ApiErrorResponse;
  onRetry?: () => void;
  onReset?: () => void;
}

export default function ErrorDisplay({ error, onRetry, onReset }: ErrorDisplayProps) {
  // エラーメッセージとタイプを判定
  const getErrorInfo = (error: string | ApiErrorResponse) => {
    let message: string;
    let details: string | undefined;
    let type: 'file' | 'api' | 'network' | 'json' | 'quota' | 'general' = 'general';

    if (typeof error === 'string') {
      message = error;
    } else {
      message = error.error;
      details = typeof error.details === 'string' ? error.details : undefined;
    }

    // エラータイプの判定
    if (message.includes('2GB') || message.includes('ファイルサイズ')) {
      type = 'file';
    } else if (message.includes('動画ファイル') || message.includes('対応形式')) {
      type = 'file';
    } else if (message.includes('APIキー') || message.includes('認証')) {
      type = 'api';
    } else if (message.includes('容量制限') || message.includes('クォータ') || message.includes('使用量制限')) {
      type = 'quota';
    } else if (message.includes('接続') || message.includes('ネットワーク')) {
      type = 'network';
    } else if (message.includes('JSON') || message.includes('プロンプト生成')) {
      type = 'json';
    }

    return { message, details, type };
  };

  // エラータイプに応じた対処法を提供
  const getSolutionInfo = (type: string) => {
    switch (type) {
      case 'file':
        return {
          icon: '📁',
          title: 'ファイル関連エラー',
          solutions: [
            '動画ファイルのサイズを2GB以下に圧縮してください',
            'MP4、MOV、AVI、MKV、WebM形式のファイルを使用してください',
            'ファイルが破損していないか確認してください'
          ]
        };

      case 'api':
        return {
          icon: '🔑',
          title: 'API認証エラー',
          solutions: [
            '環境変数でAPIキーが正しく設定されているか確認してください',
            'GEMINI_API_KEYとOPENROUTER_API_KEYの値を再確認してください',
            'APIキーの有効期限が切れていないか確認してください'
          ]
        };

      case 'quota':
        return {
          icon: '⏳',
          title: '使用量制限エラー',
          solutions: [
            'しばらく時間をおいてから再試行してください',
            'APIの使用量制限をアカウントで確認してください',
            '別のAPIキーを使用することを検討してください'
          ]
        };

      case 'network':
        return {
          icon: '🌐',
          title: 'ネットワークエラー',
          solutions: [
            'インターネット接続を確認してください',
            'ファイアウォールやプロキシの設定を確認してください',
            'しばらく待ってから再試行してください'
          ]
        };

      case 'json':
        return {
          icon: '🔧',
          title: 'プロンプト生成エラー',
          solutions: [
            '再試行してください（一時的な問題の可能性があります）',
            '動画の内容が複雑すぎる場合は、より単純な動画を試してください',
            'OpenRouterのモデルを変更することを検討してください'
          ]
        };

      default:
        return {
          icon: '⚠️',
          title: '一般的なエラー',
          solutions: [
            'ページを再読み込みしてから再試行してください',
            'しばらく時間をおいてから再試行してください',
            '問題が続く場合は管理者にお問い合わせください'
          ]
        };
    }
  };

  const errorInfo = getErrorInfo(error);
  const solutionInfo = getSolutionInfo(errorInfo.type);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 shadow-sm">
        {/* エラーヘッダー */}
        <div className="flex items-start space-x-3 mb-4">
          <div className="text-2xl">{solutionInfo.icon}</div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-red-900 mb-1">
              {solutionInfo.title}
            </h3>
            <p className="text-red-800">
              {errorInfo.message}
            </p>
            {errorInfo.details && (
              <details className="mt-2">
                <summary className="text-sm text-red-700 cursor-pointer hover:text-red-900">
                  詳細情報を表示
                </summary>
                <pre className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded border overflow-x-auto">
                  {errorInfo.details}
                </pre>
              </details>
            )}
          </div>
        </div>

        {/* 対処法 */}
        <div className="mb-6">
          <h4 className="font-medium text-red-900 mb-3">💡 対処法</h4>
          <ul className="space-y-2">
            {solutionInfo.solutions.map((solution, index) => (
              <li key={index} className="flex items-start space-x-2 text-sm text-red-800">
                <span className="text-red-600 font-bold">•</span>
                <span>{solution}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* アクションボタン */}
        <div className="flex space-x-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              🔄 再試行
            </button>
          )}
          {onReset && (
            <button
              onClick={onReset}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-md transition-colors"
            >
              🔄 最初からやり直し
            </button>
          )}
        </div>

        {/* 追加の注意事項 */}
        <div className="mt-4 pt-4 border-t border-red-200">
          <p className="text-xs text-red-700">
            <strong>注意:</strong> 
            問題が解決しない場合は、ブラウザのコンソール（F12キー）でエラーログを確認するか、
            異なる動画ファイルで試してみてください。
          </p>
        </div>
      </div>
    </div>
  );
}
