import { VertexAI } from '@google-cloud/vertexai';
import { Storage } from '@google-cloud/storage';

function assertEnv(name: string): void {
  if (!process.env[name]) throw new Error(`${name} is required`);
}

function sanitize(name: string): string {
  return (name || 'video').replace(/[^\w.\-]/g, '_');
}

/** ローカル動画を GCS に保存し、gs:// を返す */
export async function uploadLocalVideoToGCS(file: File): Promise<{ gsUri: string; mimeType: string }> {
  assertEnv('GCS_BUCKET');
  const bucketName = process.env.GCS_BUCKET!;
  const storage = new Storage(); // ADC を利用

  const dest = `uploads/${Date.now()}_${sanitize(file.name || 'video')}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await storage.bucket(bucketName).file(dest).save(buffer, {
    contentType: file.type || 'video/mp4',
    resumable: false,
  });

  return { gsUri: `gs://${bucketName}/${dest}`, mimeType: file.type || 'video/mp4' };
}

/** Vertex の Gemini で動画解析（gs:// を直接渡す） */
export async function analyzeVideoWithVertex(gsUri: string, mimeType: string, model?: string): Promise<string> {
  assertEnv('GOOGLE_CLOUD_PROJECT');
  const project = process.env.GOOGLE_CLOUD_PROJECT!;
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
  const modelName = model || 'gemini-2.5-flash';

  const vertex = new VertexAI({ project, location });
  const generativeModel = vertex.getGenerativeModel({ model: modelName });

  const prompt = 'この動画を可能な限り詳細まで説明して。説明以外は何も出力しないでください';

  const result = await generativeModel.generateContent({
    contents: [{
      role: 'user',
      parts: [
        { text: prompt },
        { fileData: { fileUri: gsUri, mimeType } },
      ],
    }],
  });

  // Vertexのレスポンスは Promise になっているので await してからテキスト抽出
  const response = await (result as any).response;

  // 1) 推奨: text() ヘルパー
  let text: string | undefined;
  if (typeof response?.text === 'function') {
    const maybeText = response.text();
    if (typeof maybeText === 'string') {
      text = maybeText.trim();
    }
  }

  // 2) フォールバック: candidates → parts[].text を結合
  if (!text || text.length === 0) {
    try {
      const parts = (response?.candidates?.[0]?.content?.parts ?? []) as Array<{ text?: string }>;
      const joined = parts.map(p => p?.text || '').join('\n').trim();
      if (joined) text = joined;
    } catch {}
  }

  if (!text || text.length === 0) {
    const finishReason = (response as any)?.candidates?.[0]?.finishReason;
    const safetyBlocked = Boolean((response as any)?.promptFeedback?.safetyRatings?.some((r: any) => r?.blocked));
    const details = {
      finishReason: finishReason || 'unknown',
      safetyBlocked,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
    };
    console.warn('Vertex empty response details:', details);
    throw new Error(`Vertex Geminiから空の応答が返されました (finish=${details.finishReason}, safetyBlocked=${details.safetyBlocked}, location=${details.location})`);
  }
  return text;
}

/** 統合：アップロード → 解析 → 説明テキスト返却 */
export async function processVideoWithVertex(file: File, model?: string): Promise<string> {
  const { gsUri, mimeType } = await uploadLocalVideoToGCS(file);
  return analyzeVideoWithVertex(gsUri, mimeType, model);
}


