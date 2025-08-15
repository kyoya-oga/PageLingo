import type { Translator, TranslationOptions, TextDocument } from '../core/interfaces.js';

class NoopTranslator implements Translator {
  async detect(text: string) {
    // naive: default to 'en' if ASCII-heavy
    const asciiRatio = text.split('').filter((c) => c.charCodeAt(0) < 128).length / Math.max(1, text.length);
    return asciiRatio > 0.9 ? 'en' : 'ja';
  }

  async translate(doc: TextDocument | string, options: TranslationOptions) {
    const content = typeof doc === 'string' ? doc : doc.content;
    return {
      content, // passthrough in demo
      source: options.source ?? (await this.detect(content)),
      target: options.target,
      diagnostics: { warnings: ['Noop translator returns input as-is'], timeMs: 0 },
    };
  }
}

async function runDemo() {
  const translator = new NoopTranslator();
  const result = await translator.translate('Hello world', { target: 'ja' });
  // eslint-disable-next-line no-console
  console.log('[demo]', result);
}

// Only run when executed directly (not imported)
if (process.argv[1] && process.argv[1].includes('/dist/app/main.js')) {
  runDemo().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}

export { NoopTranslator };

