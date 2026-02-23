# v0 フロントエンド開発指示書

## プロジェクト概要
AI名刺解析・テンプレート編集アプリのフロントエンドをv0で開発

## 技術要件
- **フレームワーク**: React (Next.js推奨)
- **UIライブラリ**: shadcn/ui + TailwindCSS
- **状態管理**: Zustand または React Query
- **WebSocket**: Socket.io-client
- **ファイルアップロード**: react-dropzone
- **PDF表示**: react-pdf

## 必須ページ・コンポーネント

### 1. メインページ (/)
- ファイルアップロードエリア（ドラッグ＆ドロップ対応）
- Front Side / Back Side アップロード
- 解析開始ボタン
- ローディング状態

### 2. テンプレートエディタ (/editor)
- リアルタイムプレビュー（左側）
- フィールド編集フォーム（右側）
- 名前、役職、メール、電話などの編集
- PDFエクスポートボタン

### 3. API連携要件

#### ファイル解析API
```
POST /api/v1/files/analyze
Content-Type: multipart/form-data

Body:
- file: UploadFile (必須)
- overrides: string (JSON形式のフィールド上書き、任意)

Response:
{
  "mime_type": "image/jpeg",
  "result": {
    "extracted_text": " extracted text...",
    "card_fields": {
      "company": "会社名",
      "name": "山田 太郎", 
      "title": "営業部長",
      "email": "taro@example.co.jp",
      "phone": "03-1234-5678",
      "address": "東京都...",
      "website": "https://example.com"
    },
    "logos": [],
    "metadata": {}
  }
}
```

#### PDFエクスポートAPI
```
POST /api/v1/pdf/export
Content-Type: application/json

Body:
{
  "result": AnalysisResult,
  "width_mm": 91,
  "height_mm": 55
}

Response: PDF binary data
```

#### WebSocketリアルタイムプレビュー
```
WS: /api/v1/preview/ws

Message format:
{
  "type": "preview",
  "payload": {
    "template": TemplateDefinition,
    "values": {"name": "新しい名前"}
  }
}
```

### 4. デザイン要件

#### カラーテーマ
- Primary: Blue-600
- Secondary: Gray-50/100
- Accent: Green-500 (成功状態)
- Error: Red-500

#### レイアウト
- モバイルファースト対応
- サイドバー（デスクトップのみ）
- レスポンシブグリッド

#### コンポーネント
- FileUploadCard: ドラッグ＆ドロップアップロード
- BusinessCardPreview: 名刺プレビュー
- FieldEditor: フィールド編集フォーム
- ExportButton: PDFエクスポートボタン

### 5. 状態管理

#### Zustand Store構造
```typescript
interface AppState {
  // ファイル状態
  frontFile: File | null
  backFile: File | null
  analysisResult: AnalysisResult | null
  
  // 編集状態
  fieldValues: Record<string, string>
  isEditing: boolean
  
  // UI状態
  isLoading: boolean
  error: string | null
  
  // アクション
  setFrontFile: (file: File) => void
  setBackFile: (file: File) => void
  analyzeFiles: () => Promise<void>
  updateFieldValue: (key: string, value: string) => void
  exportPDF: () => Promise<void>
}
```

### 6. WebSocket統合

#### リアルタイムプレビュー実装
```typescript
const usePreviewWebSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null)
  
  useEffect(() => {
    const ws = new WebSocket(WS_URL)
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      if (message.type === 'preview') {
        // プレビュー更新処理
      }
    }
    setSocket(ws)
    return () => ws.close()
  }, [])
  
  const sendPreviewUpdate = (template: TemplateDefinition, values: Record<string, string>) => {
    socket?.send(JSON.stringify({
      type: 'preview',
      payload: { template, values }
    }))
  }
  
  return { sendPreviewUpdate }
}
```

### 7. エラーハンドリング

#### エラー種別
- ファイル形式エラー (415)
- 解析エラー (400)
- API接続エラー
- WebSocket切断エラー

#### トースト通知
- react-hot-toast 使用
- エラー、成功、ローディング状態を表示

### 8. パフォーマンス要件

#### 最適化
- 画像プレビューのリサイズ
- PDF生成の進捗表示
- WebSocketの再接続ロジック
- ファイルサイズ制限 (10MB)

#### キャッシュ戦略
- React QueryでAPIレスポンスをキャッシュ
- 画像はDataURLまたはBlob URLで管理

### 9. アクセシビリティ

#### 必須要件
- キーボードナビゲーション対応
- スクリーンリーダー対応
- 高コントラストモード対応
- フォームのバリデーションメッセージ

### 10. デプロイ設定

#### 環境変数
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

#### ビルド設定
- 静的エクスポート対応
- 画像最適化 (next/image)
- Bundleサイズ最適化

## 開発手順

1. **セットアップ**
   ```bash
   npx create-next-app@latest ai-meishi-frontend --typescript --tailwind --eslint
   cd ai-meishi-frontend
   npm install @radix-ui/react-* lucide-react zustand react-hot-toast react-dropzone react-pdf socket.io-client
   ```

2. **コンポーネント開発**
   - FileUploadCardコンポーネント
   - BusinessCardPreviewコンポーネント
   - FieldEditorコンポーネント

3. **ページ実装**
   - index.tsx (アップロードページ)
   - editor.tsx (編集ページ)

4. **API連携**
   - ファイルアップロード機能
   - WebSocketリアルタイムプレビュー
   - PDFエクスポート機能

5. **テスト**
   - コンポーネント単体テスト
   - API連携テスト
   - E2Eテスト

## 納品物
- 完全なReactアプリケーション
- 型定義ファイル
- コンポーネントライブラリ
- README.md（セットアップ手順）
- デプロイ用Dockerfile
