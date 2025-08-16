import Logger from '../common/logger.js';
import HttpClient from '../common/http-client.js';
import AuthManager from '../auth/auth-manager.js';
import { 
    getFirestore, 
    collection, 
    collectionGroup,
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    getDocs, 
    getDoc,
    query, 
    where, 
    orderBy, 
    onSnapshot, 
    Timestamp 
} from 'firebase/firestore';

/**
 * Word interface - Updated for Dictionary API + Translation API integration
 */
interface Word {
    id: string;
    categoryId: string;
    englishWord: string;
    vietnameseTranslation: string; // Từ API + chỉnh sửa
    britishPronunciation: string; // IPA format: /kæt/
    americanPronunciation: string; // IPA format: /kæt/
    australianPronunciation?: string; // IPA format: /kæt/ (tùy chọn)
    partOfSpeech: string; // noun, verb, adjective, adverb, etc.
    definition: string; // Định nghĩa tiếng Anh
    vietnameseDefinition?: string; // Định nghĩa tiếng Việt (dịch tự động)
    audioUrls: { // Các link âm thanh
        british?: string;
        american?: string;
        australian?: string;
    };
    createdAt: Date;
    updatedAt: Date;
    userId: string;
}

// New: Cambridge Dictionary API (backend) response types
interface CambridgePronunciation {
    pos: string; // part of speech group in which this pron belongs
    lang: string; // e.g. "UK", "US"
    url: string;  // absolute audio URL
    pron: string; // IPA text, e.g. /kæt/
}

interface CambridgeExample {
    id: number;
    text: string;
    translation?: string;
}

interface CambridgeDefinitionBlock {
    id: number;
    pos: string;       // part of speech for this definition
    source?: string;   // data-id from page
    text: string;      // English definition
    translation?: string; // (when present on bilingual pages)
    example: CambridgeExample[];
}

interface CambridgeAPIResponse {
    word: string;
    pos: string[]; // unique parts of speech present on the page
    verbs: { id: number; type: string; text: string; }[]; // from Simple Wiktionary
    pronunciation: CambridgePronunciation[]; // UK/US audio & IPA
    definition: CambridgeDefinitionBlock[];  // list of definitions
}

/**
 * MyMemory Translation API Response interface
 */
interface MyMemoryResponse {
    responseData: {
        translatedText: string; // Văn bản đã dịch
        match: number; // Độ chính xác (0-1)
    };
    quotaFinished: boolean; // Hết quota chưa
    responseStatus: number; // Status code
}

/**
 * Category interface (simplified)
 */
interface Category {
    id: string;
    name: string;
    description?: string;
    icon: string;
    wordCount: number;
}

/**
 * WordsManager handles word CRUD operations with real-time Firestore sync
 * and Dictionary API integration
 */
class WordsManager {
    private logger: Logger;
    private httpClient: HttpClient;
    private authManager: AuthManager;
    private db: any;
    private currentUser: any = null;
    private categoryId: string = '';
    private category: Category | null = null;
    private unsubscribeWords: any = null;
    private words: Word[] = [];
    private filteredWords: Word[] = [];
    private isOnline: boolean = true;
    private audioPlayer: HTMLAudioElement | null = null;

    constructor() {
        this.logger = new Logger('WordsManager');
        this.httpClient = new HttpClient({
            timeout: 30000, // 30 seconds
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8'
                // Note: Cache-Control and Pragma headers removed for better CORS proxy compatibility
            }
        });
        this.authManager = new AuthManager();
        this.db = getFirestore();
        this.setupNetworkListener();
        this.audioPlayer = new Audio();
        this.logger.info('WordsManager initialized with HTTP client (CORS proxy fallback)');
    }

    /**
     * Look up word via Cambridge website using HTTP client with CORS proxy fallback
     * Falls back to local API if browser blocks by CORS.
     */
    async lookupWordInDictionary(word: string): Promise<CambridgeAPIResponse | null> {
        const langSlug: 'en' | 'uk' | 'en-tw' | 'en-cn' = (window as any).__DICT_LANG || 'en';
        try {
            const { nation, languagePath } = this.mapCambridgeLang(langSlug);
            const pageUrl = `https://dictionary.cambridge.org/${nation}/dictionary/${languagePath}/${encodeURIComponent(word)}`;
            this.logger.info('Fetching Cambridge page with HTTP client', { pageUrl, langSlug });

            // Try with CORS proxy fallback
            const html = await this.httpClient.getHtmlWithProxy(pageUrl);
            const parsed = this.parseCambridgeHtml(html);

            // Best-effort fetch of verb forms from Simple Wiktionary
            try {
                const verbs = await this.fetchVerbsFromWiktionary(word);
                parsed.verbs = verbs;
            } catch (e: any) {
                this.logger.warn('Fetch verbs failed (non-fatal)', { error: e?.message });
                parsed.verbs = [];
            }

            return parsed;
        } catch (error: any) {
            this.logger.warn('Cambridge fetch failed; trying local API fallback', { 
                error: error?.message,
                isCORSError: this.httpClient.isCORSError(error)
            });
            
            // Fallback to local API if available (optional)
            try {
                const apiBase = (window as any).__API_BASE || '';
                if (apiBase !== null) {
                    const response = await this.httpClient.get(`${apiBase}/api/dictionary/${langSlug}/${encodeURIComponent(word)}`, {
                        headers: { 'Accept': 'application/json' }
                    });
                    const data = response.data;
                    if (!(data && data.error)) return data as CambridgeAPIResponse;
                }
            } catch (fallbackError: any) {
                this.logger.error('Local API fallback also failed', { error: fallbackError?.message });
            }
            throw new Error('Failed to look up word in dictionary');
        }
    }

    // Map our UI language slug to Cambridge path + nation
    private mapCambridgeLang(slug: string): { nation: 'us' | 'uk'; languagePath: string } {
        switch (slug) {
            case 'uk':
                return { nation: 'uk', languagePath: 'english' };
            case 'en-tw':
                return { nation: 'us', languagePath: 'english-chinese-traditional' };
            case 'en-cn':
                return { nation: 'us', languagePath: 'english-chinese-simplified' };
            case 'en':
            default:
                return { nation: 'us', languagePath: 'english' };
        }
    }

    // Fetch raw HTML using HTTP client with CORS proxy fallback
    private async fetchHtml(url: string): Promise<string> {
        return await this.httpClient.getHtmlWithProxy(url);
    }

    // Parse Cambridge HTML into our structured response (jQuery -> DOMParser equivalent)
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
            verbs: [], // optionally filled later
            pronunciation,
            definition,
        };
    }

    // Best-effort verbs scraper from Simple Wiktionary
    private async fetchVerbsFromWiktionary(entry: string): Promise<{ id: number; type: string; text: string }[]> {
        const url = `https://simple.wiktionary.org/wiki/${encodeURIComponent(entry)}`;
        const html = await this.fetchHtml(url);
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

    /**
     * Translate text using MyMemory Translation API with axios
     */
    async translateText(text: string, fromLang: string = 'en', toLang: string = 'vi'): Promise<string> {
        try {
            this.logger.info('Translating text with axios', { text, fromLang, toLang });
            const response = await this.httpClient.get<MyMemoryResponse>(
                `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`
            );
            
            const data = response.data;
            
            if (data.responseStatus === 200 && data.responseData?.translatedText) {
                return data.responseData.translatedText;
            }
            
            throw new Error('Translation failed');
        } catch (error: any) {
            this.logger.error('Translation API failed', { error: error.message, text });
            // Return original text if translation fails
            return text;
        }
    }

    /**
     * Lookup word and translate automatically
     */
    async lookupAndTranslate(word: string): Promise<{
        dictionaryData: CambridgeAPIResponse;
        vietnameseTranslation: string;
        vietnameseDefinition?: string;
    }> {
        // Lookup word in dictionary
        const dictionaryData = await this.lookupWordInDictionary(word);
        if (!dictionaryData) {
            throw new Error('Word not found in dictionary');
        }

        // Take the first definition text if available
        const firstDefinitionText = dictionaryData.definition?.[0]?.text || '';
        
        // Translate word and first definition
        const vietnameseTranslation = await this.translateText(word);
        let vietnameseDefinition: string | undefined;
        if (firstDefinitionText) {
            vietnameseDefinition = await this.translateText(firstDefinitionText);
        }

        return {
            dictionaryData,
            vietnameseTranslation,
            vietnameseDefinition
        };
    }

    /**
     * Categorize pronunciations (UK/US/AU) from Cambridge response
     */
    private categorizePronunciations(prons: CambridgePronunciation[]): {
        british?: { text: string; audio: string };
        american?: { text: string; audio: string };
        australian?: { text: string; audio: string };
    } {
        const pick = (match: RegExp) => prons.find(p => match.test(p.lang || ''));
        const uk = pick(/UK/i) || prons.find(p => /brit|gb/i.test(p.lang || ''));
        const us = pick(/US/i) || prons.find(p => /amer/i.test(p.lang || ''));
        const au = pick(/AU/i) || prons.find(p => /aus/i.test(p.lang || ''));
        
        return {
            british: uk ? { text: uk.pron || '', audio: uk.url || '' } : undefined,
            american: us ? { text: us.pron || '', audio: us.url || '' } : undefined,
            australian: au ? { text: au.pron || '', audio: au.url || '' } : undefined,
        };
    }

    /**
     * Parse Cambridge response to Word data
     */
    private parseDictionaryResponse(
        response: CambridgeAPIResponse, 
        categoryId: string, 
        vietnameseTranslation: string,
        vietnameseDefinition?: string
    ): Partial<Word> {
        const categorized = this.categorizePronunciations(response.pronunciation || []);
        const firstPOS = response.pos?.[0] || response.definition?.[0]?.pos || '';
        const firstDefinition = response.definition?.[0]?.text || '';
        
        return {
            categoryId,
            englishWord: response.word,
            vietnameseTranslation,
            britishPronunciation: categorized.british?.text || '',
            americanPronunciation: categorized.american?.text || '',
            australianPronunciation: categorized.australian?.text || '',
            partOfSpeech: firstPOS,
            definition: firstDefinition,
            vietnameseDefinition: vietnameseDefinition || '',
            audioUrls: {
                british: categorized.british?.audio || '',
                american: categorized.american?.audio || '',
                australian: categorized.australian?.audio || ''
            },
            userId: this.currentUser.uid
        };
    }

    /**
     * Play audio pronunciation with syllable highlighting
     */
    async playAudioPronunciation(audioUrl: string, accent: 'british' | 'american' | 'australian' = 'british'): Promise<void> {
        try {
            if (!audioUrl) {
                this.showError(`No ${accent} audio available for this word`);
                return;
            }
            
            // Get the word and IPA pronunciation being pronounced
            const englishWordInput = document.getElementById('english-word-input') as HTMLInputElement;
            const wordCard = document.querySelector(`[onclick*="${audioUrl}"]`)?.closest('.word-card');
            const currentWord = englishWordInput?.value || wordCard?.querySelector('.english-word')?.textContent || '';
            
            // Get IPA pronunciation based on accent
            let ipaPronunciation = '';
            if (accent === 'british') {
                ipaPronunciation = (document.getElementById('british-pronunciation-input') as HTMLInputElement)?.value ||
                                  wordCard?.querySelector('.uk-pronunciation')?.textContent?.replace('🇬🇧', '').trim() || '';
            } else if (accent === 'american') {
                ipaPronunciation = (document.getElementById('american-pronunciation-input') as HTMLInputElement)?.value ||
                                  wordCard?.querySelector('.us-pronunciation')?.textContent?.replace('🇺🇸', '').trim() || '';
            } else if (accent === 'australian') {
                ipaPronunciation = (document.getElementById('australian-pronunciation-input') as HTMLInputElement)?.value ||
                                  wordCard?.querySelector('.au-pronunciation')?.textContent?.replace('🇦🇺', '').trim() || '';
            }
            
            if (this.audioPlayer) {
                // Show IPA pronunciation breakdown FIRST
                this.showIPABreakdown(currentWord, ipaPronunciation, accent);
                
                // Wait a bit for the modal to fully appear before playing audio
                setTimeout(async () => {
                    try {
                        this.audioPlayer!.src = audioUrl;
                        await this.audioPlayer!.play();
                        this.logger.info('Audio pronunciation played', { audioUrl, accent });
                        this.showSuccess(`🔊 Playing ${accent} pronunciation...`);
                    } catch (playError: any) {
                        this.logger.error('Failed to play audio after showing modal', { error: playError.message });
                        this.fallbackTextToSpeechWithIPA(currentWord, accent);
                    }
                }, 500); // 500ms delay to let modal appear smoothly
            }
        } catch (error: any) {
            this.logger.error('Failed to play audio', { error: error.message, audioUrl, accent });
            // Fallback to text-to-speech with IPA display
            const englishWordInput = document.getElementById('english-word-input') as HTMLInputElement;
            const wordCard = document.querySelector(`[onclick*="${audioUrl}"]`)?.closest('.word-card');
            const currentWord = englishWordInput?.value || wordCard?.querySelector('.english-word')?.textContent || '';
            this.fallbackTextToSpeechWithIPA(currentWord, accent);
        }
    }

    /**
     * Fallback text-to-speech with IPA display
     */
    private fallbackTextToSpeechWithIPA(word: string, accent: 'british' | 'american' | 'australian'): void {
        try {
            if ('speechSynthesis' in window) {
                // Get IPA pronunciation for display
                let ipaPronunciation = '';
                if (accent === 'british') {
                    ipaPronunciation = (document.getElementById('british-pronunciation-input') as HTMLInputElement)?.value || '';
                } else if (accent === 'american') {
                    ipaPronunciation = (document.getElementById('american-pronunciation-input') as HTMLInputElement)?.value || '';
                } else if (accent === 'australian') {
                    ipaPronunciation = (document.getElementById('australian-pronunciation-input') as HTMLInputElement)?.value || '';
                }
                
                // Show IPA breakdown for TTS
                this.showIPABreakdown(word, ipaPronunciation, accent);
                
                const utterance = new SpeechSynthesisUtterance(word);
                
                // Set voice based on accent
                const voices = speechSynthesis.getVoices();
                let selectedVoice;
                
                switch (accent) {
                    case 'british':
                        selectedVoice = voices.find(voice => 
                            voice.lang.includes('en-GB') || voice.name.includes('British')
                        );
                        break;
                    case 'american':
                        selectedVoice = voices.find(voice => 
                            voice.lang.includes('en-US') || voice.name.includes('US')
                        );
                        break;
                    case 'australian':
                        selectedVoice = voices.find(voice => 
                            voice.lang.includes('en-AU') || voice.name.includes('Australian')
                        );
                        break;
                }
                
                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                }
                
                // Slower rate for better comprehension
                utterance.rate = 0.7;
                utterance.pitch = 1.0;
                
                speechSynthesis.speak(utterance);
                this.showSuccess(`🗣️ Using text-to-speech for ${accent} pronunciation`);
            } else {
                this.showError('Text-to-speech not supported in this browser');
            }
        } catch (error: any) {
            this.logger.error('Text-to-speech failed', { error: error.message });
            this.showError('Failed to play pronunciation');
        }
    }

    /**
     * Show IPA pronunciation breakdown with beautiful styling
     */
    private showIPABreakdown(word: string, ipaPronunciation: string, accent: string): void {
        if (!word && !ipaPronunciation) return;
        
        // Break IPA into segments for better visualization
        const ipaSegments = this.breakIPAIntoSegments(ipaPronunciation || word);
        
        // Create or update IPA display
        let ipaDisplay = document.getElementById('ipa-display');
        if (!ipaDisplay) {
            ipaDisplay = document.createElement('div');
            ipaDisplay.id = 'ipa-display';
            ipaDisplay.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(255, 255, 255, 0.98);
                color: #1e293b;
                padding: 30px 40px;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
                z-index: 2000;
                font-size: 28px;
                font-weight: 500;
                text-align: center;
                backdrop-filter: blur(15px);
                border: 2px solid #e2e8f0;
                min-width: 300px;
                font-family: 'Times New Roman', serif;
            `;
            document.body.appendChild(ipaDisplay);
        }
        
        // Display word, IPA and accent info with beautiful white styling
        ipaDisplay.innerHTML = `
            <div style="font-size: 16px; color: #64748b; margin-bottom: 15px; font-weight: 400;">
                ${this.getAccentFlag(accent)} ${accent.toUpperCase()} Pronunciation
            </div>
            <div style="font-size: 22px; color: #374151; margin-bottom: 10px; font-weight: 600;">
                "${word}"
            </div>
            <div id="ipa-text" style="letter-spacing: 3px; margin: 20px 0; font-size: 32px;">
                ${ipaSegments.map((segment, index) => 
                    `<span id="ipa-segment-${index}" style="opacity: 0.4; transition: all 0.4s ease; padding: 0 2px; color: #1e293b;">${segment}</span>`
                ).join('')}
            </div>
            <div style="font-size: 14px; color: #9ca3af; margin-top: 15px; font-weight: 400;">
                🎵 Listen to the pronunciation sounds
            </div>
        `;
        
        // Animate IPA segments
        this.animateIPASegments(ipaSegments);
        
        // Auto-hide after duration
        setTimeout(() => {
            if (ipaDisplay && ipaDisplay.parentNode) {
                ipaDisplay.style.animation = 'fadeOut 0.4s ease';
                setTimeout(() => {
                    if (ipaDisplay && ipaDisplay.parentNode) {
                        ipaDisplay.parentNode.removeChild(ipaDisplay);
                    }
                }, 400);
            }
        }, Math.max(3000, ipaSegments.length * 1000)); // Longer display time
    }

    /**
     * Break IPA pronunciation into meaningful segments
     */
    private breakIPAIntoSegments(ipa: string): string[] {
        if (!ipa) return [];
        
        // Clean up IPA string
        const cleanIPA = ipa.replace(/[\/\[\]]/g, '').trim();
        if (!cleanIPA) return [];
        
        // Split by common IPA boundaries
        const segments: string[] = [];
        let currentSegment = '';
        
        for (let i = 0; i < cleanIPA.length; i++) {
            const char = cleanIPA[i];
            
            // IPA stress markers and syllable boundaries
            if (char === 'ˈ' || char === 'ˌ' || char === '.') {
                if (currentSegment) {
                    segments.push(currentSegment);
                    currentSegment = '';
                }
                if (char !== '.') currentSegment += char; // Include stress markers
            } else if (char === ' ') {
                if (currentSegment) {
                    segments.push(currentSegment);
                    currentSegment = '';
                }
            } else {
                currentSegment += char;
            }
        }
        
        if (currentSegment) {
            segments.push(currentSegment);
        }
        
        return segments.length > 0 ? segments : [cleanIPA];
    }

    /**
     * Animate IPA segments with highlighting
     */
    private animateIPASegments(segments: string[]): void {
        segments.forEach((segment, index) => {
            setTimeout(() => {
                const segmentEl = document.getElementById(`ipa-segment-${index}`);
                if (segmentEl) {
                    // Highlight current segment with blue color for white background
                    segmentEl.style.cssText = `
                        opacity: 1;
                        color: #2563eb;
                        text-shadow: 0 0 15px rgba(37, 99, 235, 0.4);
                        transform: scale(1.2);
                        transition: all 0.4s ease;
                        padding: 0 2px;
                        background: rgba(37, 99, 235, 0.1);
                        border-radius: 4px;
                    `;
                    
                    // Fade previous segments to grey
                    for (let j = 0; j < index; j++) {
                        const prevEl = document.getElementById(`ipa-segment-${j}`);
                        if (prevEl) {
                            prevEl.style.opacity = '0.7';
                            prevEl.style.color = '#6b7280';
                            prevEl.style.transform = 'scale(1)';
                            prevEl.style.textShadow = 'none';
                            prevEl.style.background = 'transparent';
                        }
                    }
                }
            }, index * 800); // 800ms per segment
        });
    }

    /**
     * Get accent flag emoji
     */
    private getAccentFlag(accent: string): string {
        switch (accent) {
            case 'british': return '🇬🇧';
            case 'american': return '🇺🇸';
            case 'australian': return '🇦🇺';
            default: return '🔊';
        }
    }

    /**
     * Initialize words manager
     */
    async initialize(): Promise<void> {
        this.logger.info('Initializing words manager');
        
        try {
            // Get category ID from URL parameters
            this.categoryId = this.getCategoryIdFromURL();
            if (!this.categoryId) {
                throw new Error('Category ID not found in URL');
            }

            // Check authentication
            await this.authManager.waitForAuthState();
            this.currentUser = this.authManager.getCurrentUser();
            
            if (!this.currentUser) {
                throw new Error('User not authenticated');
            }

            // Load category information
            await this.loadCategoryInfo();

            // Setup UI
            this.setupUI();
            this.setupEventListeners();
            
            // Setup real-time words listener
            this.setupWordsListener();
            
            this.logger.info('Words manager initialization complete');
        } catch (error: any) {
            this.logger.error('Failed to initialize words manager', { error: error.message });
            this.showError(error.message);
            
            // Redirect appropriately based on error type
            if (error.message === 'User not authenticated') {
                window.location.href = '/';
            } else if (error.message === 'Category ID not found in URL' || error.message.includes('Category not found')) {
                window.location.href = '/category';
            }
        }
    }

    /**
     * Get category ID from URL parameters
     */
    private getCategoryIdFromURL(): string {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('categoryId') || '';
    }

    /**
     * Load category information
     */
    private async loadCategoryInfo(): Promise<void> {
        try {
            const categoryRef = doc(this.db, 'users', this.currentUser.uid, 'categories', this.categoryId);
            const categoryDoc = await getDoc(categoryRef);
            
            if (!categoryDoc.exists()) {
                throw new Error('Category not found');
            }

            const data = categoryDoc.data();
            this.category = {
                id: categoryDoc.id,
                name: data.name,
                description: data.description || '',
                icon: data.icon || '📚',
                wordCount: data.wordCount || 0
            };

            this.updatePageTitle();
            this.renderCategoryInfo();
        } catch (error: any) {
            this.logger.error('Failed to load category info', { error: error.message });
            throw new Error('Category not found');
        }
    }

    /**
     * Update page title
     */
    private updatePageTitle(): void {
        if (this.category) {
            const pageTitle = document.getElementById('page-title');
            if (pageTitle) {
                pageTitle.textContent = `Words in ${this.category.name}`;
            }
            document.title = `Words in ${this.category.name} - English Dictionary`;
        }
    }

    /**
     * Render category information
     */
    private renderCategoryInfo(): void {
        const categoryInfoContainer = document.getElementById('category-info');
        if (!categoryInfoContainer || !this.category) return;

        categoryInfoContainer.innerHTML = `
            <div class="category-info-icon">${this.category.icon}</div>
            <div class="category-info-details">
                <h2>${this.category.name}</h2>
                ${this.category.description ? `<p class="category-info-description">${this.category.description}</p>` : ''}
                <div class="category-info-stats">
                    <span class="word-count">${this.category.wordCount} words</span>
                </div>
            </div>
        `;
    }

    /**
     * Setup network connectivity listener
     */
    private setupNetworkListener(): void {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.logger.info('Network connection restored');
            this.showSuccess('Connection restored. Syncing data...');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.logger.warn('Network connection lost');
            this.showError('No internet connection. Changes will sync when online.');
        });
    }

    /**
     * Setup UI elements
     */
    private setupUI(): void {
        // Setup user profile in header
        const authSection = document.getElementById('auth-section');
        if (authSection && this.currentUser) {
            const displayName = this.currentUser.displayName || this.currentUser.email?.split('@')[0] || 'User';
            authSection.innerHTML = `
                <div class="user-profile">
                    <span class="user-name">👋 ${displayName}</span>
                    <button class="sign-out-btn" id="signout-btn">Sign Out</button>
                </div>
            `;

            // Setup sign out
            const signOutBtn = document.getElementById('signout-btn');
            if (signOutBtn) {
                signOutBtn.addEventListener('click', async () => {
                    try {
                        await this.authManager.signOut();
                        window.location.href = '/';
                    } catch (error: any) {
                        this.logger.error('Sign out failed', { error: error.message });
                    }
                });
            }
        }
    }

    /**
     * Setup event listeners
     */
    private setupEventListeners(): void {
        // Add word form toggle
        const addBtn = document.getElementById('add-word-btn');
        const addForm = document.getElementById('add-word-form');
        const englishWordInput = document.getElementById('english-word-input') as HTMLInputElement;

        if (addBtn && addForm) {
            addBtn.addEventListener('click', () => {
                addForm.style.display = addForm.style.display === 'none' ? 'block' : 'none';
                if (addForm.style.display === 'block') {
                    englishWordInput?.focus();
                }
            });
        }

        // Print words button
        const printBtn = document.getElementById('print-words-btn');
        if (printBtn) {
            printBtn.addEventListener('click', () => this.printWordsList());
        }

        // Dictionary lookup
        const lookupBtn = document.getElementById('lookup-word-btn');
        if (lookupBtn) {
            lookupBtn.addEventListener('click', () => this.lookupWordFromInput());
        }

        // Play audio pronunciation
        const playAudioBtn = document.getElementById('play-audio-btn');
        if (playAudioBtn) {
            playAudioBtn.addEventListener('click', () => {
                const audioUrl = (window as any).currentAudioUrl;
                if (audioUrl) {
                    this.playAudio(audioUrl);
                }
            });
        }

        // Enter key support for English word input
        if (englishWordInput) {
            englishWordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.lookupWordFromInput();
                }
            });
        }

        // Save word
        const saveBtn = document.getElementById('save-word-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.createWord());
        }

        // Cancel add word
        const cancelBtn = document.getElementById('cancel-word-btn');
        if (cancelBtn && addForm) {
            cancelBtn.addEventListener('click', () => {
                addForm.style.display = 'none';
                this.clearForm();
            });
        }

        // Search
        const searchInput = document.getElementById('search-input') as HTMLInputElement;
        if (searchInput) {
            searchInput.addEventListener('input', () => this.applyFilters());
        }

        // Delete modal
        const deleteModal = document.getElementById('delete-modal');
        const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

        if (cancelDeleteBtn && deleteModal) {
            cancelDeleteBtn.addEventListener('click', () => {
                deleteModal.style.display = 'none';
            });
        }
    }

    /**
     * Lookup word from input field with auto-translation
     */
    async lookupWordFromInput(): Promise<void> {
        const englishWordInput = document.getElementById('english-word-input') as HTMLInputElement;
        const englishWord = englishWordInput?.value.trim();

        if (!englishWord) {
            this.showError('Please enter an English word to look up');
            return;
        }

        if (!this.isOnline) {
            this.showError('No internet connection. Please try again when online.');
            return;
        }

        this.logger.info('Looking up word from input', { englishWord });
        
        this.showLoading(true);
        const lookupBtn = document.getElementById('lookup-word-btn') as HTMLButtonElement;
        if (lookupBtn) {
            lookupBtn.disabled = true;
            lookupBtn.textContent = 'Looking up & translating...';
        }

        try {
            const result = await this.lookupAndTranslate(englishWord);
            
            if (result.dictionaryData) {
                this.populateFormFromDictionary(
                    result.dictionaryData,
                    result.vietnameseTranslation,
                    result.vietnameseDefinition
                );
                this.showSuccess('Word found and translated! 🎉 Please review and save.');
            } else {
                this.showError('Word not found in dictionary. You can still add it manually.');
            }
        } catch (error: any) {
            this.logger.error('Dictionary lookup or translation failed', { error: error.message });
            this.showError('Failed to look up word. You can still add it manually.');
        } finally {
            this.showLoading(false);
            if (lookupBtn) {
                lookupBtn.disabled = false;
                lookupBtn.textContent = '🔍 Look Up & Translate';
            }
        }
    }

    /**
     * Populate form with dictionary data and translations
     */
    private populateFormFromDictionary(
        dictionaryData: CambridgeAPIResponse,
        vietnameseTranslation?: string,
        vietnameseDefinition?: string
    ): void {
        const categorized = this.categorizePronunciations(dictionaryData.pronunciation || []);
        
        // Determine first POS and definition
        const firstPOS = dictionaryData.pos?.[0] || dictionaryData.definition?.[0]?.pos || '';
        const firstDefinition = dictionaryData.definition?.[0]?.text || '';

        // Populate form fields
        const vietnameseTranslationInput = document.getElementById('vietnamese-translation-input') as HTMLInputElement;
        const britishPronunciationInput = document.getElementById('british-pronunciation-input') as HTMLInputElement;
        const americanPronunciationInput = document.getElementById('american-pronunciation-input') as HTMLInputElement;
        const australianPronunciationInput = document.getElementById('australian-pronunciation-input') as HTMLInputElement;
        const partOfSpeechInput = document.getElementById('part-of-speech-input') as HTMLInputElement;
        const definitionInput = document.getElementById('definition-input') as HTMLTextAreaElement;
        const vietnameseDefinitionInput = document.getElementById('vietnamese-definition-input') as HTMLTextAreaElement;

        if (vietnameseTranslationInput) vietnameseTranslationInput.value = vietnameseTranslation || '';
        if (britishPronunciationInput) britishPronunciationInput.value = categorized.british?.text || '';
        if (americanPronunciationInput) americanPronunciationInput.value = categorized.american?.text || '';
        if (australianPronunciationInput) australianPronunciationInput.value = categorized.australian?.text || '';
        if (partOfSpeechInput) partOfSpeechInput.value = firstPOS || '';
        if (definitionInput) definitionInput.value = firstDefinition || '';
        if (vietnameseDefinitionInput) vietnameseDefinitionInput.value = vietnameseDefinition || '';

        // Setup audio buttons (and default play button)
        this.setupAudioButtons(categorized);
    }

    /**
     * Setup audio buttons for different accents
     */
    private setupAudioButtons(categorizedPhonetics: any): void {
        const britishAudioBtn = document.getElementById('british-audio-btn') as HTMLButtonElement;
        const americanAudioBtn = document.getElementById('american-audio-btn') as HTMLButtonElement;
        const australianAudioBtn = document.getElementById('australian-audio-btn') as HTMLButtonElement;
        const defaultPlayBtn = document.getElementById('play-audio-btn') as HTMLButtonElement;

        // British audio
        if (britishAudioBtn) {
            if (categorizedPhonetics.british?.audio) {
                britishAudioBtn.style.display = 'inline-block';
                britishAudioBtn.onclick = () => this.playAudioPronunciation(categorizedPhonetics.british.audio, 'british');
            } else {
                britishAudioBtn.style.display = 'none';
            }
        }

        // American audio
        if (americanAudioBtn) {
            if (categorizedPhonetics.american?.audio) {
                americanAudioBtn.style.display = 'inline-block';
                americanAudioBtn.onclick = () => this.playAudioPronunciation(categorizedPhonetics.american.audio, 'american');
            } else {
                americanAudioBtn.style.display = 'none';
            }
        }

        // Australian audio
        if (australianAudioBtn) {
            if (categorizedPhonetics.australian?.audio) {
                australianAudioBtn.style.display = 'inline-block';
                australianAudioBtn.onclick = () => this.playAudioPronunciation(categorizedPhonetics.australian.audio, 'australian');
            } else {
                australianAudioBtn.style.display = 'none';
            }
        }

        // Store audio URLs and set default play button (prefer UK, then US)
        const defaultAudio = categorizedPhonetics.british?.audio || categorizedPhonetics.american?.audio || '';
        (window as any).currentAudioUrls = {
            british: categorizedPhonetics.british?.audio || '',
            american: categorizedPhonetics.american?.audio || '',
            australian: categorizedPhonetics.australian?.audio || ''
        };
        (window as any).currentAudioUrl = defaultAudio;
        if (defaultPlayBtn) {
            defaultPlayBtn.style.display = defaultAudio ? 'inline-block' : 'none';
        }
    }

    /**
     * Setup real-time words listener
     */
    private setupWordsListener(): void {
        this.logger.info('Setting up real-time words listener');
        this.showLoading(true);

        // Debug authentication
        this.logger.info('Current user details:', { 
            uid: this.currentUser?.uid,
            email: this.currentUser?.email,
            categoryId: this.categoryId 
        });

        try {
            // Simple query for development (no index required)
            const wordsRef = collection(this.db, 'users', this.currentUser.uid, 'words');
            const q = query(
                wordsRef, 
                where('categoryId', '==', this.categoryId)
                // orderBy('createdAt', 'desc')  // Comment out for now to avoid index requirement
            );

            this.logger.info('Query path:', `users/${this.currentUser.uid}/words`);

            // Setup real-time listener
            this.unsubscribeWords = onSnapshot(q, 
                (querySnapshot: any) => {
                    this.logger.info('Words updated from Firestore');
                    const words: Word[] = [];
                    
                    querySnapshot.forEach((doc: any) => {
                        const data = doc.data();
                        words.push({
                            id: doc.id,
                            categoryId: data.categoryId,
                            englishWord: data.englishWord,
                            vietnameseTranslation: data.vietnameseTranslation,
                            britishPronunciation: data.britishPronunciation || '',
                            americanPronunciation: data.americanPronunciation || '',
                            australianPronunciation: data.australianPronunciation || '',
                            partOfSpeech: data.partOfSpeech || '',
                            definition: data.definition || '',
                            vietnameseDefinition: data.vietnameseDefinition || '',
                            audioUrls: data.audioUrls || {
                                british: data.audioUrl || '', // Legacy support
                                american: '',
                                australian: ''
                            },
                            createdAt: data.createdAt?.toDate() || new Date(),
                            updatedAt: data.updatedAt?.toDate() || new Date(),
                            userId: data.userId
                        });
                    });

                    this.words = words;
                    this.applyFilters();
                    this.showLoading(false);
                    this.logger.info('Words rendered successfully', { count: words.length });
                },
                (error: any) => {
                    this.logger.error('Real-time words listener error', { error: error.message });
                    if (error.code === 'failed-precondition' && error.message.includes('index')) {
                        this.logger.error('MISSING INDEX:', error.message);
                        this.showError('Database index required. Creating index automatically...');
                    } else {
                        this.showError('Failed to sync words with server');
                    }
                    this.showLoading(false);
                }
            );
        } catch (error: any) {
            this.logger.error('Failed to setup words listener', { error: error.message });
            this.showError('Failed to load words');
            this.showLoading(false);
        }
    }

    /**
     * Apply search filter to words
     */
    private applyFilters(): void {
        const searchInput = document.getElementById('search-input') as HTMLInputElement;

        let filteredWords = [...this.words];

        // Apply search filter
        if (searchInput?.value.trim()) {
            const searchTerm = searchInput.value.toLowerCase();
            filteredWords = filteredWords.filter(word => 
                word.englishWord.toLowerCase().includes(searchTerm) ||
                word.vietnameseTranslation.toLowerCase().includes(searchTerm) ||
                word.definition?.toLowerCase().includes(searchTerm) ||
                word.partOfSpeech?.toLowerCase().includes(searchTerm)
            );
        }

        this.filteredWords = filteredWords;
        this.renderWords(filteredWords);
    }

    /**
     * Render words in the grid
     */
    private renderWords(words: Word[]): void {
        const grid = document.getElementById('words-grid');
        const emptyState = document.getElementById('empty-state');

        if (!grid || !emptyState) return;

        if (words.length === 0) {
            grid.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        grid.innerHTML = words.map(word => `
            <div class="word-card" data-word-id="${word.id}">
                <div class="word-card-header">
                    <div class="word-actions">
                        <button class="action-btn edit-btn" onclick="wordsManager.editWord('${word.id}')" title="Edit word">
                            ✏️
                        </button>
                        <button class="action-btn delete-btn" onclick="wordsManager.deleteWord('${word.id}', '${word.englishWord}')" title="Delete word">
                            🗑️
                        </button>
                    </div>
                </div>
                <h3 class="english-word">${word.englishWord}</h3>
                <p class="vietnamese-translation">${word.vietnameseTranslation}</p>
                
                <div class="pronunciation-section">
                    ${word.britishPronunciation ? `
                        <span class="pronunciation uk-pronunciation">
                            🇬🇧 ${word.britishPronunciation}
                            ${word.audioUrls?.british ? `<button class="audio-btn-inline" onclick="wordsManager.playAudioPronunciation('${word.audioUrls.british}', 'british')" title="Play British pronunciation">🔊</button>` : ''}
                        </span>
                    ` : ''}
                    ${word.americanPronunciation ? `
                        <span class="pronunciation us-pronunciation">
                            🇺🇸 ${word.americanPronunciation}
                            ${word.audioUrls?.american ? `<button class="audio-btn-inline" onclick="wordsManager.playAudioPronunciation('${word.audioUrls.american}', 'american')" title="Play American pronunciation">🔊</button>` : ''}
                        </span>
                    ` : ''}
                    ${word.australianPronunciation ? `
                        <span class="pronunciation au-pronunciation">
                            �� ${word.australianPronunciation}
                            ${word.audioUrls?.australian ? `<button class="audio-btn-inline" onclick="wordsManager.playAudioPronunciation('${word.audioUrls.australian}', 'australian')" title="Play Australian pronunciation">🔊</button>` : ''}
                        </span>
                    ` : ''}
                </div>
                
                ${word.partOfSpeech ? `<div class="part-of-speech">${word.partOfSpeech}</div>` : ''}
                ${word.definition ? `<p class="definition">${word.definition}</p>` : ''}
                ${word.vietnameseDefinition ? `<p class="vietnamese-definition">🇻🇳 ${word.vietnameseDefinition}</p>` : ''}
                
                <div class="word-meta">
                    <span class="created-date">Added ${this.formatDate(word.createdAt)}</span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Create new word
     */
    async createWord(): Promise<void> {
        const englishWordInput = document.getElementById('english-word-input') as HTMLInputElement;
        const vietnameseInput = document.getElementById('vietnamese-translation-input') as HTMLInputElement;
        const britishPronunciationInput = document.getElementById('british-pronunciation-input') as HTMLInputElement;
        const americanPronunciationInput = document.getElementById('american-pronunciation-input') as HTMLInputElement;
        const australianPronunciationInput = document.getElementById('australian-pronunciation-input') as HTMLInputElement;
        const partOfSpeechInput = document.getElementById('part-of-speech-input') as HTMLInputElement;
        const definitionInput = document.getElementById('definition-input') as HTMLTextAreaElement;
        const vietnameseDefinitionInput = document.getElementById('vietnamese-definition-input') as HTMLTextAreaElement;

        const englishWord = englishWordInput?.value.trim() || '';
        const vietnameseTranslation = vietnameseInput?.value.trim() || '';
        const britishPronunciation = britishPronunciationInput?.value.trim() || '';
        const americanPronunciation = americanPronunciationInput?.value.trim() || '';
        const australianPronunciation = australianPronunciationInput?.value.trim() || '';
        const partOfSpeech = partOfSpeechInput?.value.trim() || '';
        const definition = definitionInput?.value.trim() || '';
        const vietnameseDefinition = vietnameseDefinitionInput?.value.trim() || '';
        const audioUrls = (window as any).currentAudioUrls || { british: '', american: '', australian: '' };

        // Validate input
        if (!this.validateWordData(englishWord, vietnameseTranslation)) {
            return;
        }

        // Check network connection
        if (!this.isOnline) {
            this.showError('No internet connection. Please try again when online.');
            return;
        }

        this.logger.info('Creating word', { englishWord, vietnameseTranslation, partOfSpeech });
        
        // Show loading state
        this.showLoading(true);
        const saveBtn = document.getElementById('save-word-btn') as HTMLButtonElement;
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
        }

        try {
            // Save to Firestore
            const wordsRef = collection(this.db, 'users', this.currentUser.uid, 'words');
            await addDoc(wordsRef, {
                categoryId: this.categoryId,
                englishWord,
                vietnameseTranslation,
                britishPronunciation,
                americanPronunciation,
                australianPronunciation,
                partOfSpeech,
                definition,
                vietnameseDefinition,
                audioUrls,
                createdAt: Timestamp.fromDate(new Date()),
                updatedAt: Timestamp.fromDate(new Date()),
                userId: this.currentUser.uid
            });

            // Update category word count
            await this.updateCategoryWordCount();

            this.showSuccess('Word added successfully!');
            this.clearForm();
            document.getElementById('add-word-form')!.style.display = 'none';

            this.logger.info('Word created successfully', { englishWord, vietnameseTranslation });
        } catch (error: any) {
            this.logger.error('Failed to create word', { error: error.message });
            this.showError('Failed to save word. Please try again.');
        } finally {
            this.showLoading(false);
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Word';
            }
        }
    }

    /**
     * Validate word data
     */
    private validateWordData(englishWord: string, vietnameseTranslation: string): boolean {
        if (!englishWord) {
            this.showError('English word is required');
            return false;
        }

        if (!vietnameseTranslation) {
            this.showError('Vietnamese translation is required');
            return false;
        }

        if (englishWord.length > 100) {
            this.showError('English word must be 100 characters or less');
            return false;
        }

        if (vietnameseTranslation.length > 200) {
            this.showError('Vietnamese translation must be 200 characters or less');
            return false;
        }

        // Check for duplicate words
        if (this.words.some(word => word.englishWord.toLowerCase() === englishWord.toLowerCase())) {
            this.showError('This word already exists in this category');
            return false;
        }

        return true;
    }

    /**
     * Play audio pronunciation
     */
    async playAudio(audioUrl: string): Promise<void> {
        await this.playAudioPronunciation(audioUrl);
    }

    /**
     * Edit word (placeholder for inline editing)
     */
    editWord(wordId: string): void {
        // TODO: Implement inline editing
        this.showError('Inline editing coming soon! Please delete and recreate the word for now.');
    }

    /**
     * Delete word with confirmation
     */
    deleteWord(wordId: string, englishWord: string): void {
        const modal = document.getElementById('delete-modal');
        const message = document.getElementById('delete-message');
        
        if (modal && message) {
            message.textContent = `Are you sure you want to delete "${englishWord}"?`;
            modal.style.display = 'flex';
            
            // Store word ID for deletion
            (modal as any).wordId = wordId;
        }
    }

    /**
     * Confirm deletion
     */
    async confirmDelete(): Promise<void> {
        const modal = document.getElementById('delete-modal');
        const wordId = (modal as any)?.wordId;

        if (!wordId) return;

        modal!.style.display = 'none';
        this.showLoading(true);

        try {
            const wordRef = doc(this.db, 'users', this.currentUser.uid, 'words', wordId);
            await deleteDoc(wordRef);

            // Update category word count
            await this.updateCategoryWordCount();

            this.showSuccess('Word deleted successfully!');
            this.logger.info('Word deleted successfully', { wordId });
        } catch (error: any) {
            this.logger.error('Failed to delete word', { error: error.message });
            this.showError('Failed to delete word');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Update category word count
     */
    private async updateCategoryWordCount(): Promise<void> {
        try {
            const currentWordCount = this.words.length;
            const categoryRef = doc(this.db, 'users', this.currentUser.uid, 'categories', this.categoryId);
            await updateDoc(categoryRef, {
                wordCount: currentWordCount,
                updatedAt: Timestamp.fromDate(new Date())
            });

            // Update local category object
            if (this.category) {
                this.category.wordCount = currentWordCount;
                this.renderCategoryInfo();
            }
        } catch (error: any) {
            this.logger.error('Failed to update category word count', { error: error.message });
        }
    }

    /**
     * Clear add word form
     */
    private clearForm(): void {
        const inputs = [
            'english-word-input',
            'vietnamese-translation-input', 
            'british-pronunciation-input',
            'american-pronunciation-input',
            'australian-pronunciation-input',
            'part-of-speech-input',
            'definition-input',
            'vietnamese-definition-input'
        ];
        
        inputs.forEach(id => {
            const element = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement;
            if (element) element.value = '';
        });

        // Hide audio buttons and clear stored audio URLs
        const audioButtons = [
            'british-audio-btn',
            'american-audio-btn',
            'australian-audio-btn',
            'play-audio-btn'
        ];
        
        audioButtons.forEach(id => {
            const btn = document.getElementById(id) as HTMLButtonElement;
            if (btn) {
                btn.style.display = 'none';
            }
        });
        
        delete (window as any).currentAudioUrl;
        delete (window as any).currentAudioUrls;
    }

    /**
     * Print words list for the current category
     */
    private printWordsList(): void {
        try {
            console.log('Print button clicked!');
            
            // Get current category info
            const categoryName = this.category?.name || 'Unknown Category';
            const categoryDescription = this.category?.description || '';
            
            console.log('Category info:', { categoryName, categoryDescription });
            console.log('Current category object:', this.category);
            console.log('All words:', this.words);
            
            // Filter words based on current search/filter
            const filteredWords = this.getFilteredWords();
            
            console.log('Filtered words:', filteredWords);
            console.log('Filtered words count:', filteredWords.length);
            
            if (filteredWords.length === 0) {
                console.log('No words found - showing alert');
                // Create a simple message for print
                const printContent = `
                    <div style="text-align: center; margin-top: 50px; font-family: Arial, sans-serif;">
                        <h2>📚 ${categoryName} - Word List</h2>
                        <p style="color: #666; font-size: 14pt; margin: 20px 0;">
                            No words available for printing.<br>
                            Please add some words to this category first.
                        </p>
                        <p style="color: #999; font-size: 12pt;">
                            Generated on ${new Date().toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long', 
                                day: 'numeric'
                            })}
                        </p>
                    </div>
                `;
                
                // Create print container
                let printContainer = document.getElementById('print-content');
                if (!printContainer) {
                    printContainer = document.createElement('div');
                    printContainer.id = 'print-content';
                    document.body.appendChild(printContainer);
                }
                
                printContainer.innerHTML = printContent;
                
                // Show preview and ask user
                const proceed = confirm('No words found in this category. Do you still want to print an empty list?');
                if (proceed) {
                    window.print();
                } else {
                    printContainer.remove();
                }
                return;
            }

            // Create print content
            const printContent = this.generatePrintContent(categoryName, categoryDescription, filteredWords);
            
            console.log('Generated print content:', printContent);
            
            // Create or update print container
            let printContainer = document.getElementById('print-content');
            if (!printContainer) {
                printContainer = document.createElement('div');
                printContainer.id = 'print-content';
                document.body.appendChild(printContainer);
                console.log('Created new print container');
            } else {
                console.log('Using existing print container');
            }
            
            printContainer.innerHTML = printContent;
            console.log('Set print container innerHTML');
            
            // Show preview for debugging (temporary - remove after testing)
            const showPreview = confirm(`Found ${filteredWords.length} words to print. Show preview first?`);
            
            if (showPreview) {
                // Debug: Show print content temporarily
                printContainer.style.display = 'block';
                printContainer.style.position = 'fixed';
                printContainer.style.top = '10px';
                printContainer.style.left = '10px';
                printContainer.style.zIndex = '9999';
                printContainer.style.background = 'white';
                printContainer.style.border = '2px solid red';
                printContainer.style.padding = '20px';
                printContainer.style.maxHeight = '400px';
                printContainer.style.overflow = 'auto';
                printContainer.style.width = '80%';
                
                console.log('Made print container visible for debugging');
                
                // Ask user if they want to proceed with print
                setTimeout(() => {
                    const proceed = confirm('Print content is ready. Do you want to print now?');
                    if (proceed) {
                        // Reset styles for print
                        printContainer.style.display = '';
                        printContainer.style.position = '';
                        printContainer.style.top = '';
                        printContainer.style.left = '';
                        printContainer.style.zIndex = '';
                        printContainer.style.background = '';
                        printContainer.style.border = '';
                        printContainer.style.padding = '';
                        printContainer.style.maxHeight = '';
                        printContainer.style.overflow = '';
                        printContainer.style.width = '';
                        
                        // Trigger print
                        window.print();
                    } else {
                        printContainer.remove();
                    }
                }, 1000);
            } else {
                // Direct print
                window.print();
            }
            
            this.logger.info('Print triggered for words list', { 
                categoryName, 
                wordCount: filteredWords.length 
            });
            
        } catch (error: any) {
            console.error('Print error:', error);
            this.logger.error('Failed to print words list', { error: error?.message });
            alert('Failed to generate print list. Please try again.');
        }
    }

    /**
     * Generate HTML content for printing
     */
    private generatePrintContent(categoryName: string, categoryDescription: string, words: Word[]): string {
        const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long', 
            day: 'numeric'
        });

        let html = `
            <div class="print-header">
                <div class="print-title">📚 ${categoryName} - Word List</div>
                <div class="print-subtitle">${categoryDescription}</div>
                <div class="print-subtitle">Generated on ${currentDate} | Total: ${words.length} words</div>
            </div>
            
            <div class="print-word-list">
        `;

        words.forEach((word, index) => {
            // Clean up pronunciations - remove /.../ brackets if present
            const cleanUS = word.americanPronunciation?.replace(/^\/|\/$/g, '') || 'N/A';
            const cleanUK = word.britishPronunciation?.replace(/^\/|\/$/g, '') || 'N/A';
            
            // Part of speech mapping
            const posMapping: { [key: string]: string } = {
                'noun': 'n.',
                'verb': 'v.',
                'adjective': 'adj.',
                'adverb': 'adv.',
                'preposition': 'prep.',
                'conjunction': 'conj.',
                'interjection': 'interj.',
                'pronoun': 'pron.',
                'determiner': 'det.'
            };
            
            const shortPos = posMapping[word.partOfSpeech?.toLowerCase()] || word.partOfSpeech || 'N/A';

            // Use simple div structure instead of list
            html += `
                <div class="print-word-item">
                    <span class="print-word">${index + 1}. ${word.englishWord}</span>
                    <span class="print-pronunciation">🇺🇸 /${cleanUS}/</span>
                    <span class="print-pronunciation">🇬🇧 /${cleanUK}/</span>
                    <span class="print-translation">${word.vietnameseTranslation}</span>
                    <span class="print-pos">(${shortPos})</span>
                </div>
            `;
        });

        html += `
            </div>
        `;

        return html;
    }

    /**
     * Get filtered words based on current search and filter settings
     */
    private getFilteredWords(): Word[] {
        const searchInput = document.getElementById('search-input') as HTMLInputElement;
        const filterSelect = document.getElementById('filter-select') as HTMLSelectElement;
        
        let filteredWords = [...this.words];
        
        // Apply search filter
        if (searchInput?.value?.trim()) {
            const searchTerm = searchInput.value.toLowerCase().trim();
            filteredWords = filteredWords.filter(word => 
                word.englishWord.toLowerCase().includes(searchTerm) ||
                word.vietnameseTranslation.toLowerCase().includes(searchTerm) ||
                word.partOfSpeech.toLowerCase().includes(searchTerm)
            );
        }
        
        // Apply part of speech filter
        if (filterSelect?.value && filterSelect.value !== 'all') {
            filteredWords = filteredWords.filter(word => 
                word.partOfSpeech.toLowerCase() === filterSelect.value.toLowerCase()
            );
        }
        
        // Sort alphabetically by English word
        filteredWords.sort((a, b) => a.englishWord.localeCompare(b.englishWord));
        
        return filteredWords;
    }

    /**
     * Format date for display
     */
    private formatDate(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'today';
        if (diffDays === 1) return 'yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    }

    /**
     * Show loading state
     */
    private showLoading(show: boolean): void {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * Show error message
     */
    private showError(message: string): void {
        this.showNotification(message, 'error');
    }

    /**
     * Show success message
     */
    private showSuccess(message: string): void {
        this.showNotification(message, 'success');
    }

    /**
     * Show notification
     */
    private showNotification(message: string, type: 'success' | 'error'): void {
        const notification = document.createElement('div');
        notification.className = `${type}-notification`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            font-weight: 500;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    /**
     * Cleanup resources and listeners
     */
    destroy(): void {
        this.logger.info('Destroying WordsManager');
        
        // Unsubscribe from real-time listener
        if (this.unsubscribeWords) {
            this.unsubscribeWords();
            this.unsubscribeWords = null;
        }
        
        // Clear arrays
        this.words = [];
        this.filteredWords = [];
        
        this.logger.info('WordsManager destroyed');
    }
}

// Initialize words manager when DOM is loaded
let wordsManager: WordsManager;

document.addEventListener('DOMContentLoaded', async () => {
    wordsManager = new WordsManager();
    // Make wordsManager globally accessible for inline event handlers
    (window as any).wordsManager = wordsManager;
    await wordsManager.initialize();
});

// Cleanup when page unloads
window.addEventListener('beforeunload', () => {
    if (wordsManager) {
        wordsManager.destroy();
    }
});

export default WordsManager;
