export type LanguageCode = string; // e.g., 'en', 'ja', 'es'

export interface TextDocument {
  id: string;
  content: string;
  lang?: LanguageCode;
  meta?: Record<string, unknown>;
}

export interface TranslationOptions {
  source?: LanguageCode;
  target: LanguageCode;
  glossary?: Record<string, string>;
}

export interface TranslationDiagnostics {
  warnings?: string[];
  timeMs?: number;
}

export interface TranslationResult {
  content: string;
  source: LanguageCode;
  target: LanguageCode;
  diagnostics?: TranslationDiagnostics;
}

export interface Translator {
  /** Detect language code for provided text */
  detect(text: string): Promise<LanguageCode>;
  /** Translate a document or raw string into target language */
  translate(
    doc: TextDocument | string,
    options: TranslationOptions
  ): Promise<TranslationResult>;
}

