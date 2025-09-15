'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadFileInfo } from '@/types';

interface FileUploadProps {
  onFileSelect: (file: UploadFileInfo) => void;
  disabled?: boolean;
  acceptedTypes?: string;
}

export default function FileUpload({ 
  onFileSelect, 
  disabled = false,
  acceptedTypes = "video/*"
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ファイルバリデーション
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // サイズチェック（2GB制限）
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'ファイルサイズが2GBを超えています。動画を圧縮してください。'
      };
    }

    // 動画ファイルかチェック
    if (!file.type.startsWith('video/')) {
      return {
        valid: false,
        error: '動画ファイルを選択してください。対応形式: MP4, MOV, AVI, MKV, WebM'
      };
    }

    return { valid: true };
  };

  // ファイル処理の共通ロジック
  const handleFile = (file: File) => {
    if (disabled) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    const fileInfo: UploadFileInfo = {
      name: file.name,
      size: file.size,
      type: file.type,
      file
    };

    onFileSelect(fileInfo);
  };

  // ドラッグ&ドロップ処理
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]); // 最初のファイルのみ処理
    }
  };

  // ファイル選択処理
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  // ファイル選択ダイアログを開く
  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };


  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* ドラッグ&ドロップエリア */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${isDragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled 
            ? 'opacity-50 cursor-not-allowed bg-gray-50' 
            : 'cursor-pointer hover:bg-gray-50'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        {/* アップロードアイコン */}
        <div className="flex flex-col items-center space-y-4">
          <svg 
            className={`w-12 h-12 ${disabled ? 'text-gray-400' : 'text-gray-500'}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
            />
          </svg>

          {/* メインメッセージ */}
          <div>
            <p className={`text-lg font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
              {disabled ? '処理中...' : '動画ファイルをドラッグ&ドロップ'}
            </p>
            <p className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
              または <span className="text-blue-600 underline">クリックして選択</span>
            </p>
          </div>

          {/* ファイル制限情報 */}
          <div className={`text-xs ${disabled ? 'text-gray-400' : 'text-gray-500'} space-y-1`}>
            <p>対応形式: MP4, MOV, AVI, MKV, WebM</p>
            <p>最大サイズ: 2GB</p>
          </div>
        </div>

        {/* 隠しファイル入力 */}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes}
          onChange={handleFileSelect}
          disabled={disabled}
          className="hidden"
        />
      </div>

      {/* 追加情報 */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          動画はGemini AIで解析され、Veo 3向けのJSONプロンプトが生成されます
        </p>
      </div>
    </div>
  );
}
