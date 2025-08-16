import Logger from '../common/logger.js';
import HttpClient from '../common/http-client.js';
import AuthManager from '../auth/auth-manager.js';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, getDoc, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
/**
 * WordsManager handles word CRUD operations with real-time Firestore sync
 * and Dictionary API integration
 */
class WordsManager {
    constructor() {
        this.currentUser = null;
        this.categoryId = '';
        this.category = null;
        this.unsubscribeWords = null;
        this.words = [];
        this.filteredWords = [];
        this.isOnline = true;
        this.audioPlayer = null;
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
    async lookupWordInDictionary(word) {
        const langSlug = window.__DICT_LANG || 'en';
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
            }
            catch (e) {
                this.logger.warn('Fetch verbs failed (non-fatal)', { error: e?.message });
                parsed.verbs = [];
            }
            return parsed;
        }
        catch (error) {
            this.logger.warn('Cambridge fetch failed; trying local API fallback', {
                error: error?.message,
                isCORSError: this.httpClient.isCORSError(error)
            });
            // Fallback to local API if available (optional)
            try {
                const apiBase = window.__API_BASE || '';
                if (apiBase !== null) {
                    const response = await this.httpClient.get(`${apiBase}/api/dictionary/${langSlug}/${encodeURIComponent(word)}`, {
                        headers: { 'Accept': 'application/json' }
                    });
                    const data = response.data;
                    if (!(data && data.error))
                        return data;
                }
            }
            catch (fallbackError) {
                this.logger.error('Local API fallback also failed', { error: fallbackError?.message });
            }
            throw new Error('Failed to look up word in dictionary');
        }
    }
    // Map our UI language slug to Cambridge path + nation
    mapCambridgeLang(slug) {
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
    async fetchHtml(url) {
        return await this.httpClient.getHtmlWithProxy(url);
    }
    // Parse Cambridge HTML into our structured response (jQuery -> DOMParser equivalent)
    parseCambridgeHtml(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const siteurl = 'https://dictionary.cambridge.org';
        const word = doc.querySelector('.hw.dhw')?.textContent?.trim() || '';
        if (!word)
            throw new Error('word not found');
        // POS list
        const posSet = new Set();
        doc.querySelectorAll('.pos.dpos').forEach(el => {
            const t = el.textContent?.trim();
            if (t)
                posSet.add(t);
        });
        const pos = Array.from(posSet);
        // Pronunciations
        const pronunciation = [];
        doc.querySelectorAll('.pos-header.dpos-h').forEach(section => {
            const pText = (section.querySelector('.dpos-g')?.textContent || '').trim();
            section.querySelectorAll('.dpron-i').forEach(node => {
                const lang = (node.querySelector('.region.dreg')?.textContent || '').trim();
                const source = node.querySelector('audio source');
                const audioSrc = source?.getAttribute('src') || '';
                const pron = (node.querySelector('.pron.dpron')?.textContent || '').trim();
                if (audioSrc && pron) {
                    const url = audioSrc.startsWith('http') ? audioSrc : siteurl + audioSrc;
                    pronunciation.push({ pos: pText, lang, url, pron });
                }
            });
        });
        // Definitions
        const definition = [];
        doc.querySelectorAll('.def-block.ddef_block').forEach((block, index) => {
            const el = block;
            const entryEl = el.closest('.pr.entry-body__el');
            const defPOS = (entryEl?.querySelector('.pos.dpos')?.textContent || '').trim();
            const dictEl = el.closest('.pr.dictionary');
            const source = dictEl?.getAttribute('data-id') || undefined;
            const text = (el.querySelector('.def.ddef_d.db')?.textContent || '').trim();
            const translation = (el.querySelector('.def-body.ddef_b > span.trans.dtrans')?.textContent || '').trim();
            const example = [];
            el.querySelectorAll('.def-body.ddef_b > .examp.dexamp').forEach((ex, i) => {
                const exEl = ex;
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
    async fetchVerbsFromWiktionary(entry) {
        const url = `https://simple.wiktionary.org/wiki/${encodeURIComponent(entry)}`;
        const html = await this.fetchHtml(url);
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const verbs = [];
        const cells = Array.from(doc.querySelectorAll('.inflection-table tr td'));
        let id = 0;
        for (const cell of cells) {
            const p = cell.querySelector('p');
            if (!p)
                continue;
            const pText = (p.textContent || '').trim();
            if (pText.includes('\n')) {
                const parts = pText.split('\n').map(s => s.trim()).filter(Boolean);
                if (parts.length >= 2) {
                    const type = parts[0];
                    const text = parts[1];
                    if (type && text)
                        verbs.push({ id: id++, type, text });
                }
            }
            else {
                const htmlParts = (p.innerHTML || '').split('<br>');
                if (htmlParts.length >= 2) {
                    const typeTmp = htmlParts[0];
                    const textTmp = htmlParts[1];
                    const tmpDiv1 = document.createElement('div');
                    tmpDiv1.innerHTML = typeTmp;
                    const type = tmpDiv1.textContent?.trim() || '';
                    const tmpDiv2 = document.createElement('div');
                    tmpDiv2.innerHTML = textTmp;
                    const text = tmpDiv2.textContent?.trim() || '';
                    if (type && text)
                        verbs.push({ id: id++, type, text });
                }
            }
        }
        return verbs;
    }
    /**
     * Translate text using MyMemory Translation API with axios
     */
    async translateText(text, fromLang = 'en', toLang = 'vi') {
        try {
            this.logger.info('Translating text with axios', { text, fromLang, toLang });
            const response = await this.httpClient.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`);
            const data = response.data;
            if (data.responseStatus === 200 && data.responseData?.translatedText) {
                return data.responseData.translatedText;
            }
            throw new Error('Translation failed');
        }
        catch (error) {
            this.logger.error('Translation API failed', { error: error.message, text });
            // Return original text if translation fails
            return text;
        }
    }
    /**
     * Lookup word and translate automatically
     */
    async lookupAndTranslate(word) {
        // Lookup word in dictionary
        const dictionaryData = await this.lookupWordInDictionary(word);
        if (!dictionaryData) {
            throw new Error('Word not found in dictionary');
        }
        // Take the first definition text if available
        const firstDefinitionText = dictionaryData.definition?.[0]?.text || '';
        // Translate word and first definition
        const vietnameseTranslation = await this.translateText(word);
        let vietnameseDefinition;
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
    categorizePronunciations(prons) {
        const pick = (match) => prons.find(p => match.test(p.lang || ''));
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
    parseDictionaryResponse(response, categoryId, vietnameseTranslation, vietnameseDefinition) {
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
     * Play audio pronunciation by accent
     */
    async playAudioPronunciation(audioUrl, accent = 'british') {
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
        }
        catch (error) {
            this.logger.error('Failed to play audio', { error: error.message, audioUrl, accent });
            // Fallback to text-to-speech
            this.fallbackTextToSpeech(audioUrl, accent);
        }
    }
    /**
     * Fallback text-to-speech when audio fails
     */
    fallbackTextToSpeech(text, accent) {
        try {
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                // Set voice based on accent
                const voices = speechSynthesis.getVoices();
                let selectedVoice;
                switch (accent) {
                    case 'british':
                        selectedVoice = voices.find(voice => voice.lang.includes('en-GB') || voice.name.includes('British'));
                        break;
                    case 'american':
                        selectedVoice = voices.find(voice => voice.lang.includes('en-US') || voice.name.includes('US'));
                        break;
                    case 'australian':
                        selectedVoice = voices.find(voice => voice.lang.includes('en-AU') || voice.name.includes('Australian'));
                        break;
                }
                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                }
                speechSynthesis.speak(utterance);
                this.showSuccess(`🗣️ Using text-to-speech for ${accent} pronunciation`);
            }
            else {
                this.showError('Text-to-speech not supported in this browser');
            }
        }
        catch (error) {
            this.logger.error('Text-to-speech failed', { error: error.message });
            this.showError('Failed to play pronunciation');
        }
    }
    /**
     * Initialize words manager
     */
    async initialize() {
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
        }
        catch (error) {
            this.logger.error('Failed to initialize words manager', { error: error.message });
            this.showError(error.message);
            // Redirect appropriately based on error type
            if (error.message === 'User not authenticated') {
                window.location.href = '/';
            }
            else if (error.message === 'Category ID not found in URL' || error.message.includes('Category not found')) {
                window.location.href = '/category';
            }
        }
    }
    /**
     * Get category ID from URL parameters
     */
    getCategoryIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('categoryId') || '';
    }
    /**
     * Load category information
     */
    async loadCategoryInfo() {
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
        }
        catch (error) {
            this.logger.error('Failed to load category info', { error: error.message });
            throw new Error('Category not found');
        }
    }
    /**
     * Update page title
     */
    updatePageTitle() {
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
    renderCategoryInfo() {
        const categoryInfoContainer = document.getElementById('category-info');
        if (!categoryInfoContainer || !this.category)
            return;
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
    setupNetworkListener() {
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
    setupUI() {
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
                    }
                    catch (error) {
                        this.logger.error('Sign out failed', { error: error.message });
                    }
                });
            }
        }
    }
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Add word form toggle
        const addBtn = document.getElementById('add-word-btn');
        const addForm = document.getElementById('add-word-form');
        const englishWordInput = document.getElementById('english-word-input');
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
                const audioUrl = window.currentAudioUrl;
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
        const searchInput = document.getElementById('search-input');
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
    async lookupWordFromInput() {
        const englishWordInput = document.getElementById('english-word-input');
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
        const lookupBtn = document.getElementById('lookup-word-btn');
        if (lookupBtn) {
            lookupBtn.disabled = true;
            lookupBtn.textContent = 'Looking up & translating...';
        }
        try {
            const result = await this.lookupAndTranslate(englishWord);
            if (result.dictionaryData) {
                this.populateFormFromDictionary(result.dictionaryData, result.vietnameseTranslation, result.vietnameseDefinition);
                this.showSuccess('Word found and translated! 🎉 Please review and save.');
            }
            else {
                this.showError('Word not found in dictionary. You can still add it manually.');
            }
        }
        catch (error) {
            this.logger.error('Dictionary lookup or translation failed', { error: error.message });
            this.showError('Failed to look up word. You can still add it manually.');
        }
        finally {
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
    populateFormFromDictionary(dictionaryData, vietnameseTranslation, vietnameseDefinition) {
        const categorized = this.categorizePronunciations(dictionaryData.pronunciation || []);
        // Determine first POS and definition
        const firstPOS = dictionaryData.pos?.[0] || dictionaryData.definition?.[0]?.pos || '';
        const firstDefinition = dictionaryData.definition?.[0]?.text || '';
        // Populate form fields
        const vietnameseTranslationInput = document.getElementById('vietnamese-translation-input');
        const britishPronunciationInput = document.getElementById('british-pronunciation-input');
        const americanPronunciationInput = document.getElementById('american-pronunciation-input');
        const australianPronunciationInput = document.getElementById('australian-pronunciation-input');
        const partOfSpeechInput = document.getElementById('part-of-speech-input');
        const definitionInput = document.getElementById('definition-input');
        const vietnameseDefinitionInput = document.getElementById('vietnamese-definition-input');
        if (vietnameseTranslationInput)
            vietnameseTranslationInput.value = vietnameseTranslation || '';
        if (britishPronunciationInput)
            britishPronunciationInput.value = categorized.british?.text || '';
        if (americanPronunciationInput)
            americanPronunciationInput.value = categorized.american?.text || '';
        if (australianPronunciationInput)
            australianPronunciationInput.value = categorized.australian?.text || '';
        if (partOfSpeechInput)
            partOfSpeechInput.value = firstPOS || '';
        if (definitionInput)
            definitionInput.value = firstDefinition || '';
        if (vietnameseDefinitionInput)
            vietnameseDefinitionInput.value = vietnameseDefinition || '';
        // Setup audio buttons (and default play button)
        this.setupAudioButtons(categorized);
    }
    /**
     * Setup audio buttons for different accents
     */
    setupAudioButtons(categorizedPhonetics) {
        const britishAudioBtn = document.getElementById('british-audio-btn');
        const americanAudioBtn = document.getElementById('american-audio-btn');
        const australianAudioBtn = document.getElementById('australian-audio-btn');
        const defaultPlayBtn = document.getElementById('play-audio-btn');
        // British audio
        if (britishAudioBtn) {
            if (categorizedPhonetics.british?.audio) {
                britishAudioBtn.style.display = 'inline-block';
                britishAudioBtn.onclick = () => this.playAudioPronunciation(categorizedPhonetics.british.audio, 'british');
            }
            else {
                britishAudioBtn.style.display = 'none';
            }
        }
        // American audio
        if (americanAudioBtn) {
            if (categorizedPhonetics.american?.audio) {
                americanAudioBtn.style.display = 'inline-block';
                americanAudioBtn.onclick = () => this.playAudioPronunciation(categorizedPhonetics.american.audio, 'american');
            }
            else {
                americanAudioBtn.style.display = 'none';
            }
        }
        // Australian audio
        if (australianAudioBtn) {
            if (categorizedPhonetics.australian?.audio) {
                australianAudioBtn.style.display = 'inline-block';
                australianAudioBtn.onclick = () => this.playAudioPronunciation(categorizedPhonetics.australian.audio, 'australian');
            }
            else {
                australianAudioBtn.style.display = 'none';
            }
        }
        // Store audio URLs and set default play button (prefer UK, then US)
        const defaultAudio = categorizedPhonetics.british?.audio || categorizedPhonetics.american?.audio || '';
        window.currentAudioUrls = {
            british: categorizedPhonetics.british?.audio || '',
            american: categorizedPhonetics.american?.audio || '',
            australian: categorizedPhonetics.australian?.audio || ''
        };
        window.currentAudioUrl = defaultAudio;
        if (defaultPlayBtn) {
            defaultPlayBtn.style.display = defaultAudio ? 'inline-block' : 'none';
        }
    }
    /**
     * Setup real-time words listener
     */
    setupWordsListener() {
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
            const q = query(wordsRef, where('categoryId', '==', this.categoryId)
            // orderBy('createdAt', 'desc')  // Comment out for now to avoid index requirement
            );
            this.logger.info('Query path:', `users/${this.currentUser.uid}/words`);
            // Setup real-time listener
            this.unsubscribeWords = onSnapshot(q, (querySnapshot) => {
                this.logger.info('Words updated from Firestore');
                const words = [];
                querySnapshot.forEach((doc) => {
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
            }, (error) => {
                this.logger.error('Real-time words listener error', { error: error.message });
                if (error.code === 'failed-precondition' && error.message.includes('index')) {
                    this.logger.error('MISSING INDEX:', error.message);
                    this.showError('Database index required. Creating index automatically...');
                }
                else {
                    this.showError('Failed to sync words with server');
                }
                this.showLoading(false);
            });
        }
        catch (error) {
            this.logger.error('Failed to setup words listener', { error: error.message });
            this.showError('Failed to load words');
            this.showLoading(false);
        }
    }
    /**
     * Apply search filter to words
     */
    applyFilters() {
        const searchInput = document.getElementById('search-input');
        let filteredWords = [...this.words];
        // Apply search filter
        if (searchInput?.value.trim()) {
            const searchTerm = searchInput.value.toLowerCase();
            filteredWords = filteredWords.filter(word => word.englishWord.toLowerCase().includes(searchTerm) ||
                word.vietnameseTranslation.toLowerCase().includes(searchTerm) ||
                word.definition?.toLowerCase().includes(searchTerm) ||
                word.partOfSpeech?.toLowerCase().includes(searchTerm));
        }
        this.filteredWords = filteredWords;
        this.renderWords(filteredWords);
    }
    /**
     * Render words in the grid
     */
    renderWords(words) {
        const grid = document.getElementById('words-grid');
        const emptyState = document.getElementById('empty-state');
        if (!grid || !emptyState)
            return;
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
    async createWord() {
        const englishWordInput = document.getElementById('english-word-input');
        const vietnameseInput = document.getElementById('vietnamese-translation-input');
        const britishPronunciationInput = document.getElementById('british-pronunciation-input');
        const americanPronunciationInput = document.getElementById('american-pronunciation-input');
        const australianPronunciationInput = document.getElementById('australian-pronunciation-input');
        const partOfSpeechInput = document.getElementById('part-of-speech-input');
        const definitionInput = document.getElementById('definition-input');
        const vietnameseDefinitionInput = document.getElementById('vietnamese-definition-input');
        const englishWord = englishWordInput?.value.trim() || '';
        const vietnameseTranslation = vietnameseInput?.value.trim() || '';
        const britishPronunciation = britishPronunciationInput?.value.trim() || '';
        const americanPronunciation = americanPronunciationInput?.value.trim() || '';
        const australianPronunciation = australianPronunciationInput?.value.trim() || '';
        const partOfSpeech = partOfSpeechInput?.value.trim() || '';
        const definition = definitionInput?.value.trim() || '';
        const vietnameseDefinition = vietnameseDefinitionInput?.value.trim() || '';
        const audioUrls = window.currentAudioUrls || { british: '', american: '', australian: '' };
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
        const saveBtn = document.getElementById('save-word-btn');
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
            document.getElementById('add-word-form').style.display = 'none';
            this.logger.info('Word created successfully', { englishWord, vietnameseTranslation });
        }
        catch (error) {
            this.logger.error('Failed to create word', { error: error.message });
            this.showError('Failed to save word. Please try again.');
        }
        finally {
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
    validateWordData(englishWord, vietnameseTranslation) {
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
    async playAudio(audioUrl) {
        await this.playAudioPronunciation(audioUrl);
    }
    /**
     * Edit word (placeholder for inline editing)
     */
    editWord(wordId) {
        // TODO: Implement inline editing
        this.showError('Inline editing coming soon! Please delete and recreate the word for now.');
    }
    /**
     * Delete word with confirmation
     */
    deleteWord(wordId, englishWord) {
        const modal = document.getElementById('delete-modal');
        const message = document.getElementById('delete-message');
        if (modal && message) {
            message.textContent = `Are you sure you want to delete "${englishWord}"?`;
            modal.style.display = 'flex';
            // Store word ID for deletion
            modal.wordId = wordId;
        }
    }
    /**
     * Confirm deletion
     */
    async confirmDelete() {
        const modal = document.getElementById('delete-modal');
        const wordId = modal?.wordId;
        if (!wordId)
            return;
        modal.style.display = 'none';
        this.showLoading(true);
        try {
            const wordRef = doc(this.db, 'users', this.currentUser.uid, 'words', wordId);
            await deleteDoc(wordRef);
            // Update category word count
            await this.updateCategoryWordCount();
            this.showSuccess('Word deleted successfully!');
            this.logger.info('Word deleted successfully', { wordId });
        }
        catch (error) {
            this.logger.error('Failed to delete word', { error: error.message });
            this.showError('Failed to delete word');
        }
        finally {
            this.showLoading(false);
        }
    }
    /**
     * Update category word count
     */
    async updateCategoryWordCount() {
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
        }
        catch (error) {
            this.logger.error('Failed to update category word count', { error: error.message });
        }
    }
    /**
     * Clear add word form
     */
    clearForm() {
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
            const element = document.getElementById(id);
            if (element)
                element.value = '';
        });
        // Hide audio buttons and clear stored audio URLs
        const audioButtons = [
            'british-audio-btn',
            'american-audio-btn',
            'australian-audio-btn',
            'play-audio-btn'
        ];
        audioButtons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.style.display = 'none';
            }
        });
        delete window.currentAudioUrl;
        delete window.currentAudioUrls;
    }
    /**
     * Format date for display
     */
    formatDate(date) {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 0)
            return 'today';
        if (diffDays === 1)
            return 'yesterday';
        if (diffDays < 7)
            return `${diffDays} days ago`;
        return date.toLocaleDateString();
    }
    /**
     * Show loading state
     */
    showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = show ? 'flex' : 'none';
        }
    }
    /**
     * Show error message
     */
    showError(message) {
        this.showNotification(message, 'error');
    }
    /**
     * Show success message
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    /**
     * Show notification
     */
    showNotification(message, type) {
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
    destroy() {
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
let wordsManager;
document.addEventListener('DOMContentLoaded', async () => {
    wordsManager = new WordsManager();
    // Make wordsManager globally accessible for inline event handlers
    window.wordsManager = wordsManager;
    await wordsManager.initialize();
});
// Cleanup when page unloads
window.addEventListener('beforeunload', () => {
    if (wordsManager) {
        wordsManager.destroy();
    }
});
export default WordsManager;
//# sourceMappingURL=words.js.map