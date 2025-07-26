class DictionaryApp {
    constructor() {
        // App version
        this.version = '2.1.6';
        
        this.initializeElements();
        this.bindEvents();
        this.audioCache = new Map();
        this.initializeTTS();
        
        // Firestore for saved words
        this.savedWords = {};
        this.currentWord = null;
        this.userId = null;
        
        // Wait for Firebase to initialize
        this.initializeFirebase();
        
        console.log(`🚀 English Dictionary App v${this.version} loaded from DictionaryApp.js`);
    }

    async initializeFirebase() {
        // Wait for Firebase to be available
        let attempts = 0;
        while (!window.firebase && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.firebase) {
            console.error('❌ Firebase not available, falling back to memory storage');
            this.renderSavedWords();
            this.updateSavedWordsCount();
            this.showSavedWordsOnLoad();
            return;
        }

        try {
            // Import Firebase Auth functions
            const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js');
            
            // Wait for authentication
            onAuthStateChanged(window.firebase.auth, async (user) => {
                if (user) {
                    this.userId = user.uid;
                    console.log('🔥 Firebase user authenticated:', this.userId);
                    console.log('🔍 User type:', user.isAnonymous ? 'Anonymous' : 'Registered');
                    
                    // Show loading indicator for saved words
                    this.showSavedWordsLoading();
                    
                    // Load saved words from Firestore
                    await this.loadSavedWords();
                    this.renderSavedWords();
                    this.updateSavedWordsCount();
                    
                    // Auto show saved words panel on load
                    this.showSavedWordsOnLoad();
                } else {
                    console.log('🔐 No Firebase user - using local storage only');
                    this.userId = null;
                    
                    // Load from localStorage as fallback
                    this.loadFromLocalStorage();
                    this.renderSavedWords();
                    this.updateSavedWordsCount();
                    this.showSavedWordsOnLoad();
                }
            });
        } catch (error) {
            console.error('Firebase initialization error:', error);
            this.userId = null;
            this.loadFromLocalStorage();
            this.renderSavedWords();
            this.updateSavedWordsCount();
            this.showSavedWordsOnLoad();
        }
    }

    // Load saved words from localStorage when not authenticated
    loadFromLocalStorage() {
        try {
            const savedData = localStorage.getItem('dictionaryAppSavedWords');
            if (savedData) {
                this.savedWords = JSON.parse(savedData);
                console.log(`📱 Loaded ${Object.keys(this.savedWords).length} words from localStorage`);
            } else {
                this.savedWords = {};
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            this.savedWords = {};
        }
    }

    // Save to localStorage when not authenticated
    saveToLocalStorage() {
        try {
            localStorage.setItem('dictionaryAppSavedWords', JSON.stringify(this.savedWords));
            console.log(`📱 Saved ${Object.keys(this.savedWords).length} words to localStorage`);
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    // Firestore methods for persistent data
    async loadSavedWords() {
        if (!window.firebase || !this.userId) {
            console.log('📱 No Firebase available, using localStorage');
            this.loadFromLocalStorage();
            return;
        }

        try {
            console.log('🔄 Loading saved words from Firestore...');
            const { collection, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
            
            const userDocRef = doc(window.firebase.db, 'users', this.userId);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
                const data = userDoc.data();
                this.savedWords = data.savedWords || {};
                console.log(`🔥 Loaded ${Object.keys(this.savedWords).length} saved words from Firestore`);
                
                // Show success message if words were loaded
                if (Object.keys(this.savedWords).length > 0) {
                    this.showTemporaryMessage(`✅ Đã tải ${Object.keys(this.savedWords).length} từ vựng từ Firestore`);
                }
                
                // Also save to localStorage as backup
                this.saveToLocalStorage();
            } else {
                console.log('🔥 No saved words found in Firestore - checking localStorage...');
                
                // Try to load from localStorage and migrate to Firestore
                this.loadFromLocalStorage();
                
                if (Object.keys(this.savedWords).length > 0) {
                    console.log('📱 Found words in localStorage, migrating to Firestore...');
                    await this.saveSavedWords(); // This will save to Firestore
                    this.showTemporaryMessage(`📤 Đã chuyển ${Object.keys(this.savedWords).length} từ vựng lên Firestore`);
                } else {
                    // Initialize empty document
                    this.savedWords = {};
                    await this.saveSavedWords();
                }
            }
        } catch (error) {
            console.error('Error loading saved words from Firestore:', error);
            this.showTemporaryMessage('⚠️ Lỗi khi tải từ vựng từ Firestore, đang dùng dữ liệu cục bộ', 'error');
            
            // Fallback to localStorage
            this.loadFromLocalStorage();
        }
    }

    async saveSavedWords() {
        this.updateSavedWordsCount();
        this.showStorageInfo();

        if (!window.firebase || !this.userId) {
            console.log('📱 No Firebase user, saving to localStorage only');
            this.saveToLocalStorage();
            return;
        }

        try {
            console.log('💾 Saving words to Firestore...');
            const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
            
            const userDocRef = doc(window.firebase.db, 'users', this.userId);
            await setDoc(userDocRef, {
                savedWords: this.savedWords,
                lastUpdated: new Date().toISOString(),
                totalWords: Object.keys(this.savedWords).length
            }, { merge: true });
            
            console.log(`🔥 Saved ${Object.keys(this.savedWords).length} words to Firestore`);
            
            // Also save to localStorage as backup
            this.saveToLocalStorage();
        } catch (error) {
            console.error('Error saving words to Firestore:', error);
            this.showTemporaryMessage('⚠️ Lỗi khi lưu từ vào Firestore! Đã lưu vào thiết bị này.', 'error');
            
            // Fallback to localStorage
            this.saveToLocalStorage();
        }
    }

    updateSavedWordsCount() {
        const count = Object.keys(this.savedWords).length;
        document.getElementById('savedCount').textContent = count;
        
        // Update storage status
        const storageStatus = document.getElementById('storageStatus');
        if (storageStatus) {
            if (this.userId) {
                const user = window.firebase?.auth?.currentUser;
                if (user && !user.isAnonymous) {
                    storageStatus.textContent = '☁️ Đồng bộ với Firestore - Dữ liệu được lưu trữ an toàn';
                } else {
                    storageStatus.textContent = '👤 Tài khoản tạm thời - Dữ liệu có thể bị mất';
                }
            } else {
                storageStatus.textContent = '📱 Chưa đăng nhập - Dữ liệu lưu trên thiết bị này';
            }
        }
    }

    showStorageInfo() {
        try {
            const used = new Blob([JSON.stringify(this.savedWords)]).size;
            const usedKB = (used / 1024).toFixed(1);
            
            if (this.userId) {
                console.log(`📊 Storage used: ${usedKB}KB (Firestore + localStorage backup)`);
            } else {
                console.log(`📊 Storage used: ${usedKB}KB (localStorage only)`);
            }
        } catch (e) {
            console.log('📊 Storage info not available');
        }
    }

    initializeTTS() {
        // Load available voices
        if ('speechSynthesis' in window) {
            // Wait for voices to be loaded
            if (speechSynthesis.getVoices().length === 0) {
                speechSynthesis.addEventListener('voiceschanged', () => {
                    console.log('Available voices:', speechSynthesis.getVoices().map(v => `${v.name} (${v.lang})`));
                });
            } else {
                console.log('Available voices:', speechSynthesis.getVoices().map(v => `${v.name} (${v.lang})`));
            }
        }
    }

    initializeElements() {
        this.wordInput = document.getElementById('wordInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.loading = document.getElementById('loading');
        this.result = document.getElementById('result');
        this.error = document.getElementById('error');
        this.errorMessage = document.getElementById('errorMessage');
        
        // Result elements
        this.wordTitle = document.getElementById('wordTitle');
        this.phoneticUK = document.getElementById('phoneticUK');
        this.phoneticUS = document.getElementById('phoneticUS');
        this.playUK = document.getElementById('playUK');
        this.playUS = document.getElementById('playUS');
        this.meanings = document.getElementById('meanings');
        this.englishMeanings = document.getElementById('englishMeanings');
        this.examples = document.getElementById('examples');

        // Save word elements
        this.saveWordBtn = document.getElementById('saveWordBtn');
        this.toggleSavedWords = document.getElementById('toggleSavedWords');
        this.savedWordsPanel = document.getElementById('savedWordsPanel');
        this.closeSavedPanel = document.getElementById('closeSavedPanel');
        this.savedWordsList = document.getElementById('savedWordsList');
        this.searchSaved = document.getElementById('searchSaved');
        this.exportBtn = document.getElementById('exportBtn');
        this.importBtn = document.getElementById('importBtn');
        this.importFile = document.getElementById('importFile');
        this.clearAllBtn = document.getElementById('clearAllBtn');

        // Debug logging
        console.log('🔍 Elements initialized:', {
            saveWordBtn: !!this.saveWordBtn,
            toggleSavedWords: !!this.toggleSavedWords,
            savedWordsPanel: !!this.savedWordsPanel
        });
    }

    bindEvents() {
        this.searchBtn.addEventListener('click', () => this.searchWord());
        this.wordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchWord();
            }
        });
        
        this.playUK.addEventListener('click', () => this.playAudio('uk'));
        this.playUS.addEventListener('click', () => this.playAudio('us'));

        // Save word events
        console.log('🔍 Binding save word events...');
        if (this.saveWordBtn) {
            this.saveWordBtn.addEventListener('click', () => {
                console.log('🔍 Save word button clicked!');
                this.toggleSaveWord();
            });
            console.log('✅ Save word button event bound');
        } else {
            console.error('❌ saveWordBtn element not found!');
        }
        
        this.toggleSavedWords.addEventListener('click', () => this.toggleSavedWordsPanel());
        this.closeSavedPanel.addEventListener('click', () => this.closeSavedWordsPanel());
        this.searchSaved.addEventListener('input', (e) => this.searchInSavedWords(e.target.value));
        this.exportBtn.addEventListener('click', () => this.exportSavedWords());
        this.importBtn.addEventListener('click', () => this.importFile.click());
        this.importFile.addEventListener('change', (e) => this.importSavedWords(e));
        this.clearAllBtn.addEventListener('click', () => this.clearAllSavedWords());
    }

    async searchWord() {
        const word = this.wordInput.value.trim().toLowerCase();
        if (!word) {
            this.showError('Vui lòng nhập một từ để tra cứu');
            return;
        }

        console.log(`Searching for word: "${word}"`);
        this.showLoading();
        
        try {
            // Test với một từ đơn giản trước
            const testWords = ['hello', 'world', 'computer', 'beautiful'];
            if (!testWords.includes(word)) {
                console.log(`Trying to search for: ${word}`);
            }
            
            const [dictionaryData, vietnameseTranslation] = await Promise.all([
                this.fetchDictionaryData(word),
                this.fetchVietnameseTranslation(word)
            ]);
            
            this.displayResults(word, dictionaryData, vietnameseTranslation);
        } catch (error) {
            console.error('Search error:', error);
            let errorMessage = 'Có lỗi xảy ra khi tra cứu từ điển.';
            
            if (error.message.includes('Không tìm thấy từ')) {
                errorMessage = error.message + '\n\nGợi ý: Hãy thử các từ như "hello", "world", "computer", "beautiful"';
            } else if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
                errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại.';
            }
            
            this.showError(errorMessage);
        }
    }

    async fetchDictionaryData(word) {
        try {
            console.log(`Fetching dictionary data for: ${word}`);
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
            
            if (!response.ok) {
                console.error(`Dictionary API error: ${response.status} ${response.statusText}`);
                if (response.status === 404) {
                    throw new Error(`Không tìm thấy từ "${word}" trong từ điển`);
                } else {
                    throw new Error(`Lỗi API từ điển: ${response.status}`);
                }
            }
            
            const data = await response.json();
            console.log('Dictionary API response:', data);
            return data;
        } catch (error) {
            console.error('Dictionary fetch error:', error);
            throw error;
        }
    }

    async fetchVietnameseTranslation(word) {
        try {
            console.log(`Fetching Vietnamese translation for: ${word}`);
            const response = await fetch(
                `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|vi`
            );
            
            if (!response.ok) {
                console.warn(`Translation API error: ${response.status}`);
                return '';
            }
            
            const data = await response.json();
            console.log('Translation API response:', data);
            return data.responseData?.translatedText || '';
        } catch (error) {
            console.warn('Translation API error:', error);
            return '';
        }
    }

    displayResults(word, dictionaryData, vietnameseTranslation) {
        this.hideAll();
        
        const entry = dictionaryData[0];
        
        // Store current word data for saving
        this.currentWord = {
            word: word,
            phoneticUK: '',
            phoneticUS: '',
            audioUK: '',
            audioUS: '',
            vietnameseTranslation: vietnameseTranslation,
            englishMeanings: entry.meanings || [],
            savedAt: new Date().toISOString()
        };
        
        this.wordTitle.textContent = word;
        
        // Display phonetics
        this.displayPhonetics(entry.phonetics);
        
        // Display Vietnamese translation
        this.displayVietnameseTranslation(vietnameseTranslation);
        
        // Display English meanings
        this.displayEnglishMeanings(entry.meanings);
        
        // Display examples
        this.displayExamples(entry.meanings);
        
        // Update save button state
        this.updateSaveButtonState(word);
        
        this.result.classList.remove('hidden');
    }

    updateSaveButtonState(word) {
        const isWordSaved = this.savedWords.hasOwnProperty(word.toLowerCase());
        this.saveWordBtn.textContent = isWordSaved ? '✅ Đã lưu' : '💾 Lưu từ này';
        this.saveWordBtn.className = isWordSaved ? 'save-btn saved' : 'save-btn';
    }

    // Save word methods
    async toggleSaveWord() {
        console.log('🔍 toggleSaveWord called');
        console.log('🔍 currentWord:', this.currentWord);
        
        if (!this.currentWord) {
            console.log('❌ No current word to save');
            this.showTemporaryMessage('⚠️ Vui lòng tra cứu một từ trước khi lưu!', 'error');
            return;
        }
        
        const word = this.currentWord.word.toLowerCase();
        console.log('🔍 Processing word:', word);
        
        if (this.savedWords[word]) {
            // Remove from saved words
            delete this.savedWords[word];
            await this.saveSavedWords();
            this.renderSavedWords();
            this.updateSaveButtonState(this.currentWord.word);
            console.log(`❌ Removed "${word}" from saved words`);
            this.showTemporaryMessage(`❌ Đã xóa "${word}" khỏi từ đã lưu`);
        } else {
            // Add to saved words
            this.savedWords[word] = this.currentWord;
            await this.saveSavedWords();
            this.renderSavedWords();
            this.updateSaveButtonState(this.currentWord.word);
            console.log(`✅ Added "${word}" to saved words`);
            this.showTemporaryMessage(`✅ Đã lưu từ "${word}" vào Firestore!`);
            
            // Show saved words panel if it's hidden and this is first word
            if (this.savedWordsPanel.classList.contains('hidden') && Object.keys(this.savedWords).length === 1) {
                setTimeout(() => {
                    this.savedWordsPanel.classList.remove('hidden');
                    this.renderSavedWords();
                }, 500);
            }
        }
    }

    toggleSavedWordsPanel() {
        this.savedWordsPanel.classList.toggle('hidden');
        if (!this.savedWordsPanel.classList.contains('hidden')) {
            this.renderSavedWords();
        }
    }

    showSavedWordsOnLoad() {
        // Auto show saved words panel when app loads
        setTimeout(() => {
            if (Object.keys(this.savedWords).length > 0) {
                this.savedWordsPanel.classList.remove('hidden');
                this.renderSavedWords();
                console.log('📖 Auto-opened saved words panel with existing vocabulary');
            } else {
                // Show empty panel for a few seconds to let user know the feature exists
                this.savedWordsPanel.classList.remove('hidden');
                this.renderSavedWords();
                console.log('📖 Showed empty saved words panel to introduce the feature');
                
                // Auto-hide after 3 seconds if no words
                setTimeout(() => {
                    if (Object.keys(this.savedWords).length === 0) {
                        this.savedWordsPanel.classList.add('hidden');
                    }
                }, 3000);
            }
        }, 1000); // Delay to ensure everything is loaded
    }

    showSavedWordsLoading() {
        if (this.savedWordsList) {
            this.savedWordsList.innerHTML = `
                <div class="loading-saved-words">
                    <div class="spinner"></div>
                    <p>🔄 Đang tải từ vựng từ Firestore...</p>
                </div>
            `;
        }
    }

    showTemporaryMessage(message, type = 'success') {
        // Create or update temporary message element
        let messageEl = document.getElementById('temporaryMessage');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'temporaryMessage';
            messageEl.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                color: white;
                font-weight: bold;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s ease;
                max-width: 300px;
                word-wrap: break-word;
            `;
            document.body.appendChild(messageEl);
        }
        
        messageEl.textContent = message;
        messageEl.style.backgroundColor = type === 'error' ? '#f44336' : '#4caf50';
        messageEl.style.opacity = '1';
        
        // Auto hide after 4 seconds
        setTimeout(() => {
            messageEl.style.opacity = '0';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, 4000);
    }

    closeSavedWordsPanel() {
        this.savedWordsPanel.classList.add('hidden');
    }

    renderSavedWords() {
        const words = Object.values(this.savedWords);
        
        if (words.length === 0) {
            this.savedWordsList.innerHTML = `
                <div class="no-saved-words">
                    <div style="text-align: center; padding: 20px;">
                        <div style="font-size: 48px; margin-bottom: 15px;">�</div>
                        <h3 style="margin: 0 0 10px 0; color: #333;">Chưa có từ vựng nào</h3>
                        <p style="margin: 0; color: #666; line-height: 1.5;">
                            Hãy tra cứu và lưu từ vựng để xây dựng<br>
                            kho từ vựng cá nhân của bạn!
                        </p>
                        <div style="margin-top: 15px; padding: 12px; background: #f0f8ff; border-radius: 8px; border-left: 4px solid #2196f3;">
                            <small style="color: #1976d2;">
                                💡 <strong>Mẹo:</strong> Từ vựng sẽ được đồng bộ tự động với Firestore
                            </small>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        // Sort by saved date (newest first)
        words.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

        // Add header with statistics
        let html = `
            <div class="saved-words-header" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #e9ecef;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h3 style="margin: 0; color: #2c3e50;">📖 Từ vựng đã lưu</h3>
                        <small style="color: #6c757d;">Tổng cộng: <strong>${words.length}</strong> từ</small>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 12px; color: #6c757d;">
                            Đồng bộ với Firestore
                        </div>
                        <div style="color: #28a745; font-size: 20px;">☁️</div>
                    </div>
                </div>
            </div>
        `;
        
        words.forEach((wordData, index) => {
            const meaning = wordData.vietnameseTranslation || 
                           (wordData.englishMeanings[0]?.definitions[0]?.definition || 'Không có nghĩa');
            const phonetic = wordData.phoneticUK || wordData.phoneticUS || '';
            const savedDate = new Date(wordData.savedAt).toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            // Add visual indicator for recent words (saved in last 24 hours)
            const isRecent = (new Date() - new Date(wordData.savedAt)) < 24 * 60 * 60 * 1000;
            const recentBadge = isRecent ? '<span style="background: #28a745; color: white; font-size: 10px; padding: 2px 6px; border-radius: 10px; margin-left: 8px;">MỚI</span>' : '';

            html += `
                <div class="saved-word-item" data-word="${wordData.word}" style="border: 1px solid #e9ecef; border-radius: 8px; padding: 15px; margin-bottom: 10px; background: white; transition: all 0.2s ease;">
                    <div class="saved-word-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <div style="flex: 1;">
                            <div class="saved-word-title" onclick="app.lookupSavedWord('${wordData.word}')" 
                                 style="font-size: 18px; font-weight: bold; color: #2c3e50; cursor: pointer; display: inline-block;"
                                 onmouseover="this.style.color='#3498db'" 
                                 onmouseout="this.style.color='#2c3e50'">
                                ${wordData.word}${recentBadge}
                            </div>
                            <div class="saved-word-phonetic" style="color: #6c757d; font-style: italic; margin-top: 2px;">${phonetic}</div>
                        </div>
                        <div class="saved-word-actions" style="display: flex; gap: 5px;">
                            <button class="play-saved-btn" onclick="app.playSavedWord('${wordData.word}')" 
                                    style="background: #17a2b8; color: white; border: none; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;"
                                    title="Phát âm">🔊</button>
                            <button class="lookup-saved-btn" onclick="app.lookupSavedWord('${wordData.word}')" 
                                    style="background: #28a745; color: white; border: none; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;"
                                    title="Tra cứu lại">🔍</button>
                            <button class="delete-saved-btn" onclick="app.deleteSavedWord('${wordData.word}')" 
                                    style="background: #dc3545; color: white; border: none; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;"
                                    title="Xóa từ">🗑️</button>
                        </div>
                    </div>
                    <div class="saved-word-meaning" style="color: #495057; line-height: 1.4; margin-bottom: 8px; background: #f8f9fa; padding: 8px; border-radius: 4px;">
                        ${meaning.length > 150 ? meaning.substring(0, 150) + '...' : meaning}
                    </div>
                    <div class="saved-date" style="font-size: 11px; color: #6c757d; text-align: right;">
                        💾 Đã lưu: ${savedDate}
                    </div>
                </div>
            `;
        });

        this.savedWordsList.innerHTML = html;
        
        // Add hover effects with JavaScript
        this.savedWordsList.querySelectorAll('.saved-word-item').forEach(item => {
            item.addEventListener('mouseenter', function() {
                this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                this.style.transform = 'translateY(-2px)';
            });
            item.addEventListener('mouseleave', function() {
                this.style.boxShadow = 'none';
                this.style.transform = 'translateY(0)';
            });
        });
    }

    searchInSavedWords(query) {
        const items = this.savedWordsList.querySelectorAll('.saved-word-item');
        const searchTerm = query.toLowerCase();

        items.forEach(item => {
            const word = item.dataset.word.toLowerCase();
            const meaning = item.querySelector('.saved-word-meaning').textContent.toLowerCase();
            
            if (word.includes(searchTerm) || meaning.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    lookupSavedWord(word) {
        this.wordInput.value = word;
        this.searchWord();
        this.closeSavedWordsPanel();
    }

    playSavedWord(word) {
        const wordData = this.savedWords[word.toLowerCase()];
        if (!wordData) return;

        // Try to play audio or use TTS
        if (wordData.audioUK || wordData.audioUS) {
            const audioUrl = wordData.audioUK || wordData.audioUS;
            const audio = new Audio(audioUrl);
            audio.play().catch(() => this.useTTSForWord(word));
        } else {
            this.useTTSForWord(word);
        }
    }

    useTTSForWord(word) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'en-US';
            utterance.rate = 0.8;
            speechSynthesis.speak(utterance);
        }
    }

    async deleteSavedWord(word) {
        if (confirm(`🗑️ Xóa từ "${word}" khỏi danh sách đã lưu?\n\nTừ này sẽ được xóa khỏi Firestore và không thể khôi phục.`)) {
            delete this.savedWords[word.toLowerCase()];
            await this.saveSavedWords();
            this.renderSavedWords();
            
            // Update save button if current word is being deleted
            if (this.currentWord && this.currentWord.word.toLowerCase() === word.toLowerCase()) {
                this.updateSaveButtonState(word);
            }
            
            this.showTemporaryMessage(`🗑️ Đã xóa từ "${word}" khỏi Firestore`);
            
            // Auto-hide panel if no words left
            if (Object.keys(this.savedWords).length === 0) {
                setTimeout(() => {
                    this.savedWordsPanel.classList.add('hidden');
                }, 2000);
            }
        }
    }

    exportSavedWords() {
        const dataStr = JSON.stringify(this.savedWords, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `dictionary-saved-words-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        console.log('📥 Exported saved words');
    }

    importSavedWords(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedWords = JSON.parse(e.target.result);
                const importCount = Object.keys(importedWords).length;
                
                if (confirm(`Nhập ${importCount} từ vựng? Điều này sẽ ghi đè dữ liệu hiện tại.`)) {
                    this.savedWords = importedWords;
                    await this.saveSavedWords();
                    this.renderSavedWords();
                    alert(`✅ Đã nhập ${importCount} từ vựng thành công!`);
                }
            } catch (error) {
                alert('❌ File không hợp lệ! Vui lòng chọn file JSON đúng định dạng.');
                console.error('Import error:', error);
            }
        };
        reader.readAsText(file);
        
        // Reset file input
        event.target.value = '';
    }

    async clearAllSavedWords() {
        const count = Object.keys(this.savedWords).length;
        if (count === 0) {
            alert('Không có từ nào để xóa!');
            return;
        }
        
        if (confirm(`Xóa tất cả ${count} từ đã lưu? Hành động này không thể hoàn tác!`)) {
            this.savedWords = {};
            await this.saveSavedWords();
            this.renderSavedWords();
            
            // Update current word save button if exists
            if (this.currentWord) {
                this.updateSaveButtonState(this.currentWord.word);
            }
            
            alert('🗑️ Đã xóa tất cả từ vựng đã lưu!');
        }
    }

    displayPhonetics(phonetics) {
        let ukPhonetic = '';
        let usPhonetic = '';
        let ukAudio = '';
        let usAudio = '';
        let generalAudio = '';
        let generalPhonetic = '';

        // First pass: look for specific UK/US phonetics
        phonetics.forEach(phonetic => {
            if (phonetic.text) {
                if (phonetic.audio) {
                    // Check for UK audio patterns
                    if (phonetic.audio.includes('-uk') || phonetic.audio.includes('_uk') || 
                        phonetic.audio.includes('/uk/') || phonetic.audio.includes('gb')) {
                        ukPhonetic = phonetic.text;
                        ukAudio = phonetic.audio;
                    }
                    // Check for US audio patterns  
                    else if (phonetic.audio.includes('-us') || phonetic.audio.includes('_us') || 
                             phonetic.audio.includes('/us/') || phonetic.audio.includes('american')) {
                        usPhonetic = phonetic.text;
                        usAudio = phonetic.audio;
                    }
                    // Store first general audio as fallback
                    else if (!generalAudio) {
                        generalAudio = phonetic.audio;
                        generalPhonetic = phonetic.text;
                    }
                } else {
                    // Store phonetic text without audio as fallback
                    if (!generalPhonetic) {
                        generalPhonetic = phonetic.text;
                    }
                }
            }
        });

        // Second pass: use fallbacks if we don't have specific UK/US
        if (!ukPhonetic) {
            ukPhonetic = generalPhonetic;
            if (!ukAudio) ukAudio = generalAudio;
        }
        if (!usPhonetic) {
            usPhonetic = generalPhonetic;
            if (!usAudio) usAudio = generalAudio;
        }

        // If still no phonetics, try to use any available
        if (!ukPhonetic && phonetics.length > 0 && phonetics[0].text) {
            ukPhonetic = phonetics[0].text;
            if (phonetics[0].audio) ukAudio = phonetics[0].audio;
        }
        if (!usPhonetic && phonetics.length > 0 && phonetics[0].text) {
            usPhonetic = phonetics[0].text;
            if (phonetics[0].audio) usAudio = phonetics[0].audio;
        }

        this.phoneticUK.textContent = ukPhonetic || 'Không có dữ liệu';
        this.phoneticUS.textContent = usPhonetic || 'Không có dữ liệu';

        // Store audio URLs
        this.audioCache.set('uk', ukAudio);
        this.audioCache.set('us', usAudio);

        // Update current word phonetics data
        if (this.currentWord) {
            this.currentWord.phoneticUK = ukPhonetic || '';
            this.currentWord.phoneticUS = usPhonetic || '';
            this.currentWord.audioUK = ukAudio || '';
            this.currentWord.audioUS = usAudio || '';
        }

        // Enable buttons if we have phonetics (even without audio, we can use TTS)
        this.playUK.disabled = !ukPhonetic;
        this.playUS.disabled = !usPhonetic;

        console.log('Phonetics debug:', {
            ukPhonetic, usPhonetic, ukAudio, usAudio,
            generalAudio, generalPhonetic,
            phoneticsData: phonetics,
            ukButtonDisabled: !ukPhonetic,
            usButtonDisabled: !usPhonetic
        });

        // Update button appearance and tooltips
        if (ukPhonetic) {
            if (ukAudio) {
                this.playUK.title = "Phát âm Anh-Anh (API Audio)";
                this.playUK.style.opacity = "1";
                this.playUK.style.background = "#4facfe";
            } else {
                this.playUK.title = "Phát âm Anh-Anh (Text-to-Speech)";
                this.playUK.style.opacity = "0.8";
                this.playUK.style.background = "#ff9800";
            }
        } else {
            this.playUK.title = "Không có dữ liệu phiên âm";
            this.playUK.style.opacity = "0.3";
        }

        if (usPhonetic) {
            if (usAudio) {
                this.playUS.title = "Phát âm Anh-Mỹ (API Audio)";
                this.playUS.style.opacity = "1";
                this.playUS.style.background = "#4facfe";
            } else {
                this.playUS.title = "Phát âm Anh-Mỹ (Text-to-Speech)";
                this.playUS.style.opacity = "0.8";
                this.playUS.style.background = "#ff9800";
            }
        } else {
            this.playUS.title = "Không có dữ liệu phiên âm";
            this.playUS.style.opacity = "0.3";
        }
    }

    displayVietnameseTranslation(translation) {
        if (translation && translation.toLowerCase() !== this.wordInput.value.trim().toLowerCase()) {
            this.meanings.innerHTML = `
                <div class="meaning-item">
                    <div class="vietnamese-meaning">${translation}</div>
                </div>
            `;
        } else {
            this.meanings.innerHTML = `
                <div class="meaning-item">
                    <div class="vietnamese-meaning">Không tìm thấy bản dịch tiếng Việt</div>
                </div>
            `;
        }
    }

    displayEnglishMeanings(meanings) {
        let html = '';
        
        meanings.forEach(meaning => {
            meaning.definitions.slice(0, 3).forEach((def, index) => {
                html += `
                    <div class="definition-item">
                        <span class="part-of-speech">${meaning.partOfSpeech}</span>
                        <div class="definition">${def.definition}</div>
                        ${def.example ? `<div class="example">"${def.example}"</div>` : ''}
                    </div>
                `;
            });
        });
        
        this.englishMeanings.innerHTML = html || '<p>Không có định nghĩa tiếng Anh</p>';
    }

    displayExamples(meanings) {
        let examples = [];
        
        meanings.forEach(meaning => {
            meaning.definitions.forEach(def => {
                if (def.example && examples.length < 5) {
                    examples.push(def.example);
                }
            });
        });

        if (examples.length > 0) {
            let html = '';
            examples.forEach(example => {
                html += `<div class="example-item">"${example}"</div>`;
            });
            this.examples.innerHTML = html;
        } else {
            this.examples.innerHTML = '<p>Không có ví dụ</p>';
        }
    }

    async playAudio(type) {
        const audioUrl = this.audioCache.get(type);
        const word = this.wordTitle.textContent;
        
        if (audioUrl) {
            // Có file audio từ API
            try {
                console.log(`Playing audio from API: ${audioUrl}`);
                const audio = new Audio(audioUrl);
                await audio.play();
                return;
            } catch (error) {
                console.error('API audio playback error:', error);
                // Fallback to TTS if API audio fails
            }
        }
        
        // Fallback: Sử dụng Web Speech API (Text-to-Speech)
        if ('speechSynthesis' in window) {
            try {
                console.log(`Using TTS for word: ${word} (${type})`);
                const utterance = new SpeechSynthesisUtterance(word);
                
                // Set voice based on type
                const voices = speechSynthesis.getVoices();
                if (type === 'uk') {
                    // Tìm giọng UK
                    const ukVoice = voices.find(voice => 
                        voice.lang.includes('en-GB') || 
                        voice.name.toLowerCase().includes('british') ||
                        voice.name.toLowerCase().includes('uk')
                    );
                    if (ukVoice) utterance.voice = ukVoice;
                    utterance.lang = 'en-GB';
                } else {
                    // Tìm giọng US
                    const usVoice = voices.find(voice => 
                        voice.lang.includes('en-US') || 
                        voice.name.toLowerCase().includes('american') ||
                        voice.name.toLowerCase().includes('us')
                    );
                    if (usVoice) utterance.voice = usVoice;
                    utterance.lang = 'en-US';
                }
                
                utterance.rate = 0.8; // Chậm hơn một chút
                utterance.pitch = 1;
                utterance.volume = 1;
                
                speechSynthesis.speak(utterance);
                
            } catch (error) {
                console.error('TTS error:', error);
                this.showError('Không thể phát âm thanh. Trình duyệt không hỗ trợ.');
            }
        } else {
            console.warn('Speech synthesis not supported');
            this.showError('Trình duyệt không hỗ trợ phát âm thanh.');
        }
    }

    showLoading() {
        this.hideAll();
        this.loading.classList.remove('hidden');
    }

    showError(message) {
        this.hideAll();
        this.errorMessage.textContent = message;
        this.error.classList.remove('hidden');
    }

    hideAll() {
        this.loading.classList.add('hidden');
        this.result.classList.add('hidden');
        this.error.classList.add('hidden');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DictionaryApp(); // Make globally available for saved words buttons
});

// Add some sample words for testing
const sampleWords = ['hello', 'world', 'computer', 'beautiful', 'programming'];
console.log('Suggestion: Try searching for these words:', sampleWords.join(', '));
