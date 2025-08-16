import Logger from '../common/logger.js';
import HttpClient from '../common/http-client.js';

// Interfaces tương tự như trong words.ts
interface CambridgePronunciation {
    pos: string;
    lang: string;
    url: string;
    pron: string;
}

interface CambridgeExample {
    id: number;
    text: string;
    translation?: string;
}

interface CambridgeDefinitionBlock {
    id: number;
    pos: string;
    source?: string;
    text: string;
    translation?: string;
    example: CambridgeExample[];
}

interface CambridgeAPIResponse {
    word: string;
    pos: string[];
    verbs: { id: number; type: string; text: string; }[];
    pronunciation: CambridgePronunciation[];
    definition: CambridgeDefinitionBlock[];
}

interface MyMemoryResponse {
    responseData: {
        translatedText: string;
        match: number;
    };
    quotaFinished: boolean;
    responseStatus: number;
}

class HttpClientTest {
    private logger: Logger;
    private httpClient: HttpClient;

    constructor() {
        this.logger = new Logger('HttpClientTest');
        this.httpClient = new HttpClient({
            timeout: 30000,
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        this.setupEventListeners();
        this.setupNetworkListener();
    }

    private setupEventListeners(): void {
        // CORS Test
        document.getElementById('cors-test-btn')?.addEventListener('click', () => {
            this.testCORSAccess();
        });

        // Dictionary Lookup
        document.getElementById('lookup-btn')?.addEventListener('click', () => {
            this.testDictionaryLookup('en');
        });

        document.getElementById('lookup-uk-btn')?.addEventListener('click', () => {
            this.testDictionaryLookup('uk');
        });

        document.getElementById('lookup-us-btn')?.addEventListener('click', () => {
            this.testDictionaryLookup('en');
        });

        // Translation Test
        document.getElementById('translate-btn')?.addEventListener('click', () => {
            this.testTranslation();
        });

        // Verb Forms Test
        document.getElementById('verb-btn')?.addEventListener('click', () => {
            this.testVerbForms();
        });

        // Enter key support
        document.getElementById('word-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.testDictionaryLookup('en');
            }
        });

        document.getElementById('translation-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.testTranslation();
            }
        });

        document.getElementById('verb-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.testVerbForms();
            }
        });
    }

    private setupNetworkListener(): void {
        const indicator = document.getElementById('status-indicator');
        const status = document.getElementById('network-status');

        const updateStatus = (online: boolean) => {
            if (indicator && status) {
                if (online) {
                    indicator.className = 'status-indicator status-online';
                    status.textContent = 'Online - Ready to test';
                } else {
                    indicator.className = 'status-indicator status-offline';
                    status.textContent = 'Offline - Tests may fail';
                }
            }
        };

        window.addEventListener('online', () => updateStatus(true));
        window.addEventListener('offline', () => updateStatus(false));
        updateStatus(navigator.onLine);
    }

    private async testCORSAccess(): Promise<void> {
        const btn = document.getElementById('cors-test-btn') as HTMLButtonElement;
        const results = document.getElementById('cors-results')!;
        
        btn.disabled = true;
        btn.textContent = 'Testing CORS...';
        results.style.display = 'block';
        results.textContent = 'Testing CORS access to Cambridge Dictionary...\n';

        const testUrls = [
            'https://dictionary.cambridge.org/us/dictionary/english/hello',
            'https://dictionary.cambridge.org/uk/dictionary/english/hello',
            'https://simple.wiktionary.org/wiki/hello',
            'https://api.mymemory.translated.net/get?q=hello&langpair=en|vi'
        ];

        for (const url of testUrls) {
            try {
                const accessible = await this.httpClient.testCORS(url);
                const status = accessible ? '✅ ACCESSIBLE' : '❌ CORS BLOCKED';
                const className = accessible ? 'success' : 'error';
                results.innerHTML += `<span class="${className}">${status}: ${url}</span>\n`;
            } catch (error: any) {
                results.innerHTML += `<span class="error">❌ ERROR: ${url} - ${error.message}</span>\n`;
            }
        }

        btn.disabled = false;
        btn.textContent = 'Test CORS Access';
    }

    private async testDictionaryLookup(langSlug: 'en' | 'uk'): Promise<void> {
        const wordInput = document.getElementById('word-input') as HTMLInputElement;
        const btn = document.getElementById('lookup-btn') as HTMLButtonElement;
        const results = document.getElementById('lookup-results')!;
        
        const word = wordInput.value.trim();
        if (!word) {
            alert('Please enter a word to lookup');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Looking up...';
        results.style.display = 'block';
        results.textContent = `Looking up "${word}" in Cambridge Dictionary (${langSlug})...\n\n`;

        try {
            const response = await this.lookupWordInCambridge(word, langSlug);
            
            results.innerHTML += `<span class="success">✅ SUCCESS: Word found!</span>\n\n`;
            results.innerHTML += `<span class="info">📝 PARSED DATA:</span>\n`;
            results.innerHTML += `Word: ${response.word}\n`;
            results.innerHTML += `Parts of Speech: ${response.pos.join(', ')}\n`;
            results.innerHTML += `Pronunciations: ${response.pronunciation.length} found\n`;
            results.innerHTML += `Definitions: ${response.definition.length} found\n`;
            results.innerHTML += `Verb Forms: ${response.verbs.length} found\n\n`;

            if (response.pronunciation.length > 0) {
                results.innerHTML += `<span class="info">🔊 PRONUNCIATIONS:</span>\n`;
                response.pronunciation.forEach(p => {
                    results.innerHTML += `  ${p.lang}: ${p.pron} (${p.url})\n`;
                });
                results.innerHTML += '\n';
            }

            if (response.definition.length > 0) {
                results.innerHTML += `<span class="info">📚 DEFINITIONS:</span>\n`;
                response.definition.slice(0, 3).forEach((def, i) => {
                    results.innerHTML += `  ${i + 1}. [${def.pos}] ${def.text}\n`;
                    if (def.example.length > 0) {
                        results.innerHTML += `     Example: ${def.example[0].text}\n`;
                    }
                });
            }

        } catch (error: any) {
            results.innerHTML += `<span class="error">❌ FAILED: ${error.message}</span>\n`;
            if (this.httpClient.isCORSError(error)) {
                results.innerHTML += `<span class="warning">⚠️  This is a CORS error. Cambridge blocks direct browser access.</span>\n`;
                results.innerHTML += `<span class="info">💡 Solution: Use backend API proxy or browser extension.</span>\n`;
            }
        } finally {
            btn.disabled = false;
            btn.textContent = '🔍 Lookup Word';
        }
    }

    private async testTranslation(): Promise<void> {
        const textInput = document.getElementById('translation-input') as HTMLInputElement;
        const btn = document.getElementById('translate-btn') as HTMLButtonElement;
        const results = document.getElementById('translation-results')!;
        
        const text = textInput.value.trim();
        if (!text) {
            alert('Please enter text to translate');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Translating...';
        results.style.display = 'block';
        results.textContent = `Translating "${text}" to Vietnamese...\n\n`;

        try {
            const translation = await this.translateText(text);
            
            results.innerHTML += `<span class="success">✅ SUCCESS: Translation completed!</span>\n\n`;
            results.innerHTML += `<span class="info">Original:</span> ${text}\n`;
            results.innerHTML += `<span class="info">Vietnamese:</span> ${translation}\n`;

        } catch (error: any) {
            results.innerHTML += `<span class="error">❌ FAILED: ${error.message}</span>\n`;
        } finally {
            btn.disabled = false;
            btn.textContent = '🔄 Translate to Vietnamese';
        }
    }

    private async testVerbForms(): Promise<void> {
        const verbInput = document.getElementById('verb-input') as HTMLInputElement;
        const btn = document.getElementById('verb-btn') as HTMLButtonElement;
        const results = document.getElementById('verb-results')!;
        
        const verb = verbInput.value.trim();
        if (!verb) {
            alert('Please enter a verb');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Getting forms...';
        results.style.display = 'block';
        results.textContent = `Getting verb forms for "${verb}" from Simple Wiktionary...\n\n`;

        try {
            const verbs = await this.fetchVerbsFromWiktionary(verb);
            
            if (verbs.length > 0) {
                results.innerHTML += `<span class="success">✅ SUCCESS: Found ${verbs.length} verb forms!</span>\n\n`;
                results.innerHTML += `<span class="info">📝 VERB FORMS:</span>\n`;
                verbs.forEach(v => {
                    results.innerHTML += `  ${v.type}: ${v.text}\n`;
                });
            } else {
                results.innerHTML += `<span class="warning">⚠️  No verb forms found for "${verb}"</span>\n`;
            }

        } catch (error: any) {
            results.innerHTML += `<span class="error">❌ FAILED: ${error.message}</span>\n`;
            if (this.httpClient.isCORSError(error)) {
                results.innerHTML += `<span class="warning">⚠️  This is a CORS error.</span>\n`;
            }
        } finally {
            btn.disabled = false;
            btn.textContent = '📝 Get Verb Forms';
        }
    }

    // Cambridge Dictionary lookup logic với CORS proxy
    private async lookupWordInCambridge(word: string, langSlug: 'en' | 'uk'): Promise<CambridgeAPIResponse> {
        const { nation, languagePath } = this.mapCambridgeLang(langSlug);
        const pageUrl = `https://dictionary.cambridge.org/${nation}/dictionary/${languagePath}/${encodeURIComponent(word)}`;
        
        const html = await this.httpClient.getHtmlWithProxy(pageUrl);
        const parsed = this.parseCambridgeHtml(html);

        // Try to get verb forms
        try {
            const verbs = await this.fetchVerbsFromWiktionary(word);
            parsed.verbs = verbs;
        } catch (e: any) {
            this.logger.warn('Fetch verbs failed', { error: e?.message });
            parsed.verbs = [];
        }

        return parsed;
    }

    private mapCambridgeLang(slug: string): { nation: 'us' | 'uk'; languagePath: string } {
        switch (slug) {
            case 'uk':
                return { nation: 'uk', languagePath: 'english' };
            case 'en':
            default:
                return { nation: 'us', languagePath: 'english' };
        }
    }

    private parseCambridgeHtml(html: string): CambridgeAPIResponse {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const siteurl = 'https://dictionary.cambridge.org';

        const word = doc.querySelector('.hw.dhw')?.textContent?.trim() || '';
        if (!word) throw new Error('word not found');

        // POS list
        const posSet = new Set<string>();
        doc.querySelectorAll('.pos.dpos').forEach(el => {
            const t = el.textContent?.trim();
            if (t) posSet.add(t);
        });
        const pos = Array.from(posSet);

        // Pronunciations
        const pronunciation: CambridgePronunciation[] = [];
        doc.querySelectorAll('.pos-header.dpos-h').forEach(section => {
            const pText = (section.querySelector('.dpos-g')?.textContent || '').trim();
            section.querySelectorAll('.dpron-i').forEach(node => {
                const lang = (node.querySelector('.region.dreg')?.textContent || '').trim();
                const source = node.querySelector('audio source') as HTMLSourceElement | null;
                const audioSrc = source?.getAttribute('src') || '';
                const pron = (node.querySelector('.pron.dpron')?.textContent || '').trim();
                if (audioSrc && pron) {
                    const url = audioSrc.startsWith('http') ? audioSrc : siteurl + audioSrc;
                    pronunciation.push({ pos: pText, lang, url, pron });
                }
            });
        });

        // Definitions
        const definition: CambridgeDefinitionBlock[] = [];
        doc.querySelectorAll('.def-block.ddef_block').forEach((block, index) => {
            const el = block as HTMLElement;
            const entryEl = el.closest('.pr.entry-body__el') as HTMLElement | null;
            const defPOS = (entryEl?.querySelector('.pos.dpos')?.textContent || '').trim();
            const dictEl = el.closest('.pr.dictionary') as HTMLElement | null;
            const source = dictEl?.getAttribute('data-id') || undefined;
            const text = (el.querySelector('.def.ddef_d.db')?.textContent || '').trim();
            const translation = (el.querySelector('.def-body.ddef_b > span.trans.dtrans')?.textContent || '').trim();

            const example: CambridgeExample[] = [];
            el.querySelectorAll('.def-body.ddef_b > .examp.dexamp').forEach((ex, i) => {
                const exEl = ex as HTMLElement;
                const eText = (exEl.querySelector('.eg.deg')?.textContent || '').trim();
                const eTrans = (exEl.querySelector('.trans.dtrans')?.textContent || '').trim();
                example.push({ id: i, text: eText, translation: eTrans || undefined });
            });

            definition.push({ id: index, pos: defPOS, source, text, translation: translation || undefined, example });
        });

        return {
            word,
            pos,
            verbs: [],
            pronunciation,
            definition,
        };
    }

    private async fetchVerbsFromWiktionary(entry: string): Promise<{ id: number; type: string; text: string }[]> {
        const url = `https://simple.wiktionary.org/wiki/${encodeURIComponent(entry)}`;
        const html = await this.httpClient.getHtmlWithProxy(url);
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const verbs: { id: number; type: string; text: string }[] = [];
        const cells = Array.from(doc.querySelectorAll('.inflection-table tr td')) as HTMLElement[];
        let id = 0;
        for (const cell of cells) {
            const p = cell.querySelector('p');
            if (!p) continue;
            const pText = (p.textContent || '').trim();
            if (pText.includes('\n')) {
                const parts = pText.split('\n').map(s => s.trim()).filter(Boolean);
                if (parts.length >= 2) {
                    const type = parts[0];
                    const text = parts[1];
                    if (type && text) verbs.push({ id: id++, type, text });
                }
            } else {
                const htmlParts = (p.innerHTML || '').split('<br>');
                if (htmlParts.length >= 2) {
                    const typeTmp = htmlParts[0];
                    const textTmp = htmlParts[1];
                    const tmpDiv1 = document.createElement('div'); tmpDiv1.innerHTML = typeTmp; const type = tmpDiv1.textContent?.trim() || '';
                    const tmpDiv2 = document.createElement('div'); tmpDiv2.innerHTML = textTmp; const text = tmpDiv2.textContent?.trim() || '';
                    if (type && text) verbs.push({ id: id++, type, text });
                }
            }
        }
        return verbs;
    }

    private async translateText(text: string, fromLang: string = 'en', toLang: string = 'vi'): Promise<string> {
        const response = await this.httpClient.get<MyMemoryResponse>(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`
        );
        
        const data = response.data;
        
        if (data.responseStatus === 200 && data.responseData?.translatedText) {
            return data.responseData.translatedText;
        }
        
        throw new Error('Translation failed');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new HttpClientTest();
});

export default HttpClientTest;
