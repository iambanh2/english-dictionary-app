import Logger from '../common/logger.js';
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

/**
 * Dictionary API Response interface
 */
interface DictionaryAPIResponse {
    word: string;
    phonetics: {
        text: string;
        audio: string;
        sourceUrl?: string; // Nguồn âm thanh
    }[];
    meanings: {
        partOfSpeech: string;
        definitions: {
            definition: string;
            example?: string;
        }[];
    }[];
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
        this.authManager = new AuthManager();
        this.db = getFirestore();
        this.setupNetworkListener();
        this.audioPlayer = new Audio();
        this.logger.info('WordsManager initialized');
    }

    /**
     * Look up word in Dictionary API
     */
    async lookupWordInDictionary(word: string): Promise<DictionaryAPIResponse | null> {
        try {
            this.logger.info('Looking up word in dictionary API', { word });
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
            
            if (!response.ok) {
                throw new Error(`Dictionary API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (Array.isArray(data) && data.length > 0) {
                return data[0]; // Return first result
            }
            
            return null;
        } catch (error: any) {
            this.logger.error('Dictionary API lookup failed', { error: error.message, word });
            throw new Error('Failed to look up word in dictionary');
        }
    }

    /**
     * Translate text using MyMemory Translation API
     */
    async translateText(text: string, fromLang: string = 'en', toLang: string = 'vi'): Promise<string> {
        try {
            this.logger.info('Translating text', { text, fromLang, toLang });
            const response = await fetch(
                `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`
            );
            
            if (!response.ok) {
                throw new Error(`Translation API error: ${response.status}`);
            }
            
            const data: MyMemoryResponse = await response.json();
            
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
        dictionaryData: DictionaryAPIResponse;
        vietnameseTranslation: string;
        vietnameseDefinition?: string;
    }> {
        // Lookup word in dictionary
        const dictionaryData = await this.lookupWordInDictionary(word);
        if (!dictionaryData) {
            throw new Error('Word not found in dictionary');
        }

        // Get texts to translate
        const firstMeaning = dictionaryData.meanings[0];
        const firstDefinition = firstMeaning?.definitions[0];
        
        // Translate word meaning
        const vietnameseTranslation = await this.translateText(word);
        
        // Translate definition if available
        let vietnameseDefinition: string | undefined;
        if (firstDefinition?.definition) {
            vietnameseDefinition = await this.translateText(firstDefinition.definition);
        }

        return {
            dictionaryData,
            vietnameseTranslation,
            vietnameseDefinition
        };
    }

    /**
     * Categorize phonetics by accent
     */
    private categorizePhonetics(phonetics: any[]): {
        british?: any;
        american?: any;
        australian?: any;
    } {
        const result: any = {};
        
        // Find British pronunciation (UK, GB, or first with audio)
        result.british = phonetics.find(p => 
            p.text && (p.text.includes('UK') || p.text.includes('GB') || p.audio)
        ) || phonetics[0];
        
        // Find American pronunciation (US)
        result.american = phonetics.find(p => 
            p.text && (p.text.includes('US') || p.text.includes('American'))
        ) || phonetics[1] || phonetics[0];
        
        // Find Australian pronunciation (AU)
        result.australian = phonetics.find(p => 
            p.text && (p.text.includes('AU') || p.text.includes('Australian'))
        );
        
        return result;
    }

    /**
     * Parse Dictionary API response to Word data
     */
    private parseDictionaryResponse(
        response: DictionaryAPIResponse, 
        categoryId: string, 
        vietnameseTranslation: string,
        vietnameseDefinition?: string
    ): Partial<Word> {
        const categorizedPhonetics = this.categorizePhonetics(response.phonetics);
        
        const firstMeaning = response.meanings[0];
        const firstDefinition = firstMeaning?.definitions[0];
        
        return {
            categoryId,
            englishWord: response.word,
            vietnameseTranslation,
            britishPronunciation: categorizedPhonetics.british?.text || '',
            americanPronunciation: categorizedPhonetics.american?.text || '',
            australianPronunciation: categorizedPhonetics.australian?.text || '',
            partOfSpeech: firstMeaning?.partOfSpeech || '',
            definition: firstDefinition?.definition || '',
            vietnameseDefinition: vietnameseDefinition || '',
            audioUrls: {
                british: categorizedPhonetics.british?.audio || '',
                american: categorizedPhonetics.american?.audio || '',
                australian: categorizedPhonetics.australian?.audio || ''
            },
            userId: this.currentUser.uid
        };
    }

    /**
     * Play audio pronunciation by accent
     */
    async playAudioPronunciation(audioUrl: string, accent: 'british' | 'american' | 'australian' = 'british'): Promise<void> {
        try {
            if (!audioUrl) {
                this.showError(`No ${accent} audio available for this word`);
                return;
            }
            
            if (this.audioPlayer) {
                this.audioPlayer.src = audioUrl;
                await this.audioPlayer.play();
                this.logger.info('Audio pronunciation played', { audioUrl, accent });
                this.showSuccess(`🔊 Playing ${accent} pronunciation...`);
            }
        } catch (error: any) {
            this.logger.error('Failed to play audio', { error: error.message, audioUrl, accent });
            // Fallback to text-to-speech
            this.fallbackTextToSpeech(audioUrl, accent);
        }
    }

    /**
     * Fallback text-to-speech when audio fails
     */
    private fallbackTextToSpeech(text: string, accent: 'british' | 'american' | 'australian'): void {
        try {
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                
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

        // Check network connection
        if (!this.isOnline) {
            this.showError('No internet connection. Please try again when online.');
            return;
        }

        this.logger.info('Looking up word from input', { englishWord });
        
        // Show loading state
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
        dictionaryData: DictionaryAPIResponse,
        vietnameseTranslation?: string,
        vietnameseDefinition?: string
    ): void {
        const categorizedPhonetics = this.categorizePhonetics(dictionaryData.phonetics);
        
        // Find first meaning and definition
        const firstMeaning = dictionaryData.meanings[0];
        const firstDefinition = firstMeaning?.definitions[0];

        // Populate form fields
        const vietnameseTranslationInput = document.getElementById('vietnamese-translation-input') as HTMLInputElement;
        const britishPronunciationInput = document.getElementById('british-pronunciation-input') as HTMLInputElement;
        const americanPronunciationInput = document.getElementById('american-pronunciation-input') as HTMLInputElement;
        const australianPronunciationInput = document.getElementById('australian-pronunciation-input') as HTMLInputElement;
        const partOfSpeechInput = document.getElementById('part-of-speech-input') as HTMLInputElement;
        const definitionInput = document.getElementById('definition-input') as HTMLTextAreaElement;
        const vietnameseDefinitionInput = document.getElementById('vietnamese-definition-input') as HTMLTextAreaElement;

        // Populate basic fields (readonly fields from API)
        if (vietnameseTranslationInput) vietnameseTranslationInput.value = vietnameseTranslation || '';
        if (britishPronunciationInput) britishPronunciationInput.value = categorizedPhonetics.british?.text || '';
        if (americanPronunciationInput) americanPronunciationInput.value = categorizedPhonetics.american?.text || '';
        if (australianPronunciationInput) australianPronunciationInput.value = categorizedPhonetics.australian?.text || '';
        if (partOfSpeechInput) partOfSpeechInput.value = firstMeaning?.partOfSpeech || '';
        if (definitionInput) definitionInput.value = firstDefinition?.definition || '';
        if (vietnameseDefinitionInput) vietnameseDefinitionInput.value = vietnameseDefinition || '';

        // Setup audio buttons
        this.setupAudioButtons(categorizedPhonetics);
    }

    /**
     * Setup audio buttons for different accents
     */
    private setupAudioButtons(categorizedPhonetics: any): void {
        const britishAudioBtn = document.getElementById('british-audio-btn') as HTMLButtonElement;
        const americanAudioBtn = document.getElementById('american-audio-btn') as HTMLButtonElement;
        const australianAudioBtn = document.getElementById('australian-audio-btn') as HTMLButtonElement;

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

        // Store audio URLs for legacy support
        (window as any).currentAudioUrls = {
            british: categorizedPhonetics.british?.audio || '',
            american: categorizedPhonetics.american?.audio || '',
            australian: categorizedPhonetics.australian?.audio || ''
        };
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
