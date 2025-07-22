class DictionaryApp {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.audioCache = new Map();
        this.initializeTTS();
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
        this.wordTitle.textContent = word;
        
        // Display phonetics
        this.displayPhonetics(entry.phonetics);
        
        // Display Vietnamese translation
        this.displayVietnameseTranslation(vietnameseTranslation);
        
        // Display English meanings
        this.displayEnglishMeanings(entry.meanings);
        
        // Display examples
        this.displayExamples(entry.meanings);
        
        this.result.classList.remove('hidden');
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
    new DictionaryApp();
});

// Add some sample words for testing
const sampleWords = ['hello', 'world', 'computer', 'beautiful', 'programming'];
console.log('Suggestion: Try searching for these words:', sampleWords.join(', '));
