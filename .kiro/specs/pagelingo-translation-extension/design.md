# 設計文書

## 概要

PageLingoは、ブラウザ拡張機能として実装され、Chrome MV3とSafari Web Extensionの両方をサポートします。ビューポートベースの遅延翻訳、二段階品質システム（Fast/Quality+）、および選択範囲の手動再翻訳機能を提供します。

## アーキテクチャ

### 全体構成

```mermaid
graph TB
    subgraph "Browser Extension"
        CS[Content Script]
        BG[Background/Service Worker]
        PU[Popup UI]
        OP[Options Page]
    end
    
    subgraph "Translation Engine"
        TP[Translation Provider]
        QA[Quality Analyzer]
        GL[Glossary Manager]
    end
    
    subgraph "External Services"
        GPT4[GPT-5-mini (Fast)]
        GPT5[GPT-5 (Quality+)]
    end
    
    CS --> BG
    BG --> TP
    TP --> GPT4
    TP --> GPT5
    BG --> QA
    BG --> GL
    PU --> BG
    OP --> BG
```

### コンポーネント間通信

- **Content Script ↔ Background**: chrome.runtime.sendMessage/onMessage
- **Popup/Options ↔ Background**: chrome.runtime.sendMessage/onMessage
- **Background ↔ Translation API**: HTTP/HTTPS requests
- **Safari Native ↔ Extension**: Native messaging (iOS/macOS)

## コンポーネントと インターフェース

### 1. Content Script

**責任:**
- DOM からのテキスト抽出
- ビューポート監視と遅延翻訳
- テキストノードの置換
- ユーザー選択の処理

**主要クラス:**

```typescript
class TextExtractor {
  extractVisibleText(): TextSegment[]
  createTextSegments(elements: Element[]): TextSegment[]
  excludeNonTranslatableElements(element: Element): boolean
}

class ViewportManager {
  setupIntersectionObserver(): void
  onElementEnterViewport(entries: IntersectionObserverEntry[]): void
  queueTranslation(segments: TextSegment[]): void
}

class TextReplacer {
  replaceTextNodes(segments: TranslatedSegment[]): void
  preserveHtmlStructure(node: Node): void
  createTemporaryHighlight(range: Range): void
}

class SelectionHandler {
  setupContextMenu(): void
  handleSelectionRetranslation(): void
  getSelectedTextSegments(): TextSegment[]
}
```

### 2. Background/Service Worker

**責任:**
- 翻訳リクエストの管理
- 品質分析と自動アップグレード
- レート制限とエラーハンドリング
- 設定とキャッシュの管理

**主要クラス:**

```typescript
class TranslationManager {
  translateBatch(segments: TextSegment[], mode: TranslationMode): Promise<TranslatedSegment[]>
  queueRequest(request: TranslationRequest): void
  processQueue(): void
  cancelPendingRequests(tabId: number): void
}

class QualityAnalyzer {
  analyzeTranslationQuality(original: string, translated: string): QualityScore
  shouldUpgradeToQuality(score: QualityScore): boolean
  checkLengthRatio(original: string, translated: string): number
  validatePreservedElements(original: string, translated: string): boolean
}

class RateLimiter {
  canMakeRequest(domain: string): boolean
  recordRequest(domain: string): void
  getBackoffDelay(domain: string): number
}
```

### 3. Translation Provider

**責任:**
- LLM API との通信
- プロンプト管理
- レスポンス解析

**インターフェース:**

```typescript
interface TranslationProvider {
  translateBatch(texts: string[], targetLang: string, mode: TranslationMode): Promise<string[]>
  validateResponse(response: any): boolean
  formatPrompt(texts: string[], targetLang: string, glossary?: GlossaryEntry[]): string
}

class OpenAIProvider implements TranslationProvider {
  private getModel(mode: TranslationMode): string
  private getTemperature(mode: TranslationMode): number
  private getEffortLevel(mode: TranslationMode): string
}
```

### 4. UI Components

**Popup UI:**
- 言語選択ドロップダウン
- Fast/Quality+ モード切り替え
- 翻訳開始/停止ボタン
- 現在のページ状態表示

**Options Page:**
- API プロバイダー設定
- 用語集管理
- サイト別設定
- キャッシュ管理

## データモデル

### 基本データ構造

```typescript
interface TextSegment {
  id: string
  text: string
  nodePath: number[]  // DOM node path
  startOffset: number
  endOffset: number
  element: Element
  priority: number    // viewport priority
}

interface TranslatedSegment extends TextSegment {
  translatedText: string
  mode: TranslationMode
  qualityScore?: QualityScore
  timestamp: number
}

interface QualityScore {
  lengthRatio: number
  punctuationScore: number
  numberPreservation: number
  urlPreservation: number
  glossaryCompliance: number
  overall: number
}

interface GlossaryEntry {
  source: string
  target: string
  caseSensitive: boolean
  regex?: string
}

type TranslationMode = 'fast' | 'quality'

interface TranslationRequest {
  id: string
  tabId: number
  segments: TextSegment[]
  targetLang: string
  mode: TranslationMode
  priority: number
}
```

### ストレージスキーマ

```typescript
interface StorageSchema {
  // User preferences
  defaultTargetLang: string
  defaultMode: TranslationMode
  autoTranslate: boolean
  
  // Site-specific settings
  siteSettings: Record<string, SiteSettings>
  
  // Glossary
  glossary: GlossaryEntry[]
  
  // Cache
  translationCache: Record<string, CachedTranslation>
  
  // API settings (Safari only - others use proxy)
  apiSettings?: {
    provider: string
    endpoint: string
  }
}

interface SiteSettings {
  enabled: boolean
  targetLang: string
  mode: TranslationMode
  excludeSelectors: string[]
}

interface CachedTranslation {
  original: string
  translated: string
  targetLang: string
  mode: TranslationMode
  timestamp: number
  hash: string
}
```

## エラーハンドリング

### エラー分類と対応

```typescript
enum ErrorType {
  NETWORK_ERROR = 'network_error',
  API_ERROR = 'api_error',
  RATE_LIMIT = 'rate_limit',
  INVALID_RESPONSE = 'invalid_response',
  DOM_ERROR = 'dom_error',
  PERMISSION_ERROR = 'permission_error'
}

class ErrorHandler {
  handleError(error: TranslationError): ErrorResponse
  shouldRetry(error: TranslationError): boolean
  getBackoffDelay(attemptCount: number): number
  reportError(error: TranslationError): void
}

interface ErrorResponse {
  shouldRetry: boolean
  delay?: number
  fallbackAction?: string
  userMessage?: string
}
```

### 復旧戦略

1. **ネットワークエラー**: 指数バックオフで最大3回再試行
2. **API エラー**: エラーコードに応じて再試行またはスキップ
3. **レート制限**: 指定された遅延後に再試行
4. **無効なレスポンス**: Quality+ モードで1回再試行
5. **DOM エラー**: 該当セグメントをスキップして続行

## テスト戦略

### 単体テスト

```typescript
// Text extraction tests
describe('TextExtractor', () => {
  test('should extract visible text only')
  test('should exclude non-translatable elements')
  test('should preserve text node paths')
  test('should handle dynamic content')
})

// Quality analysis tests
describe('QualityAnalyzer', () => {
  test('should detect length ratio issues')
  test('should validate number preservation')
  test('should check glossary compliance')
  test('should calculate overall quality score')
})

// Translation provider tests
describe('OpenAIProvider', () => {
  test('should format prompts correctly')
  test('should handle API responses')
  test('should validate JSON structure')
  test('should handle rate limits')
})
```

### 統合テスト

```typescript
// End-to-end translation flow
describe('Translation Flow', () => {
  test('should translate viewport content first')
  test('should handle scroll-based lazy translation')
  test('should upgrade to quality mode when needed')
  test('should handle selection retranslation')
})

// Cross-browser compatibility
describe('Browser Compatibility', () => {
  test('should work in Chrome MV3')
  test('should work in Safari Web Extension')
  test('should handle iOS Safari specifics')
})
```

### パフォーマンステスト

- **メモリ使用量**: 大きなページでのメモリリーク検出
- **翻訳速度**: バッチサイズと並列処理の最適化
- **DOM 操作**: テキスト置換のパフォーマンス測定
- **API レスポンス時間**: 異なるモードでの応答時間比較

## セキュリティ考慮事項

### データ保護

1. **API キー管理**:
   - Chrome: 自前プロキシサーバー推奨
   - Safari: Keychain での暗号化保存

2. **コンテンツ送信最小化**:
   - ビューポート優先の段階的送信
   - 機密情報の自動検出と除外
   - 不要な属性の除去

3. **権限管理**:
   - 最小権限の原則
   - optional_host_permissions の活用
   - ユーザー同意の明示的取得

### プライバシー保護

```typescript
class PrivacyManager {
  sanitizeContent(text: string): string
  detectSensitiveInfo(text: string): boolean
  getUserConsent(domain: string): Promise<boolean>
  logDataTransmission(domain: string, dataSize: number): void
}
```

## プラットフォーム固有の実装

### Chrome MV3

```json
{
  "manifest_version": 3,
  "name": "PageLingo",
  "permissions": ["contextMenus", "storage", "scripting"],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "css": ["content.css"]
  }],
  "commands": {
    "retranslate_selection": {
      "suggested_key": {"default": "Alt+Shift+R"}
    }
  }
}
```

### Safari Web Extension

```swift
// iOS Container App
class SafariExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        // Handle native messaging
    }
    
    func storeAPIKey(_ key: String) {
        // Store in Keychain
    }
}
```

## パフォーマンス最適化

### ビューポート最適化

```typescript
class ViewportOptimizer {
  private intersectionObserver: IntersectionObserver
  private translationQueue: Map<string, TextSegment[]>
  
  setupLazyTranslation(): void {
    this.intersectionObserver = new IntersectionObserver(
      this.handleIntersection.bind(this),
      { rootMargin: '100px' } // Pre-load slightly ahead
    )
  }
  
  prioritizeViewportContent(segments: TextSegment[]): TextSegment[] {
    return segments.sort((a, b) => b.priority - a.priority)
  }
}
```

### キャッシュ戦略

```typescript
class TranslationCache {
  private cache: Map<string, CachedTranslation>
  private maxSize: number = 1000
  
  generateKey(text: string, targetLang: string, mode: TranslationMode): string {
    return `${this.hash(text)}_${targetLang}_${mode}`
  }
  
  get(key: string): CachedTranslation | null
  set(key: string, translation: CachedTranslation): void
  cleanup(): void // LRU eviction
}
```