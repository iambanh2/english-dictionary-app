import Logger from '../common/logger.js';

/**
 * MockData class provides test data for development and debugging
 */
class MockData {
    private static logger = new Logger('MockData');

    /**
     * Get mock user data
     */
    static getUser() {
        this.logger.debug('Providing mock user data');
        return {
            uid: 'mock-user-123',
            displayName: 'Test User',
            email: 'test@example.com',
            photoURL: 'https://via.placeholder.com/40/007bff/white?text=TU',
            emailVerified: true,
            isAnonymous: false
        };
    }

    /**
     * Get mock vocabulary data
     */
    static getVocabulary() {
        this.logger.debug('Providing mock vocabulary data');
        return [
            {
                id: 'word-1',
                word: 'hello',
                meaning: 'xin chào',
                level: 'beginner',
                category: 'greeting',
                examples: [
                    'Hello, how are you?',
                    'Say hello to your friend.'
                ],
                pronunciation: '/həˈləʊ/',
                addedDate: new Date('2025-01-01'),
                lastReviewed: new Date('2025-01-05'),
                reviewCount: 3,
                isFavorite: true
            },
            {
                id: 'word-2',
                word: 'goodbye',
                meaning: 'tạm biệt',
                level: 'beginner',
                category: 'greeting',
                examples: [
                    'Goodbye, see you tomorrow!',
                    'It\'s time to say goodbye.'
                ],
                pronunciation: '/ɡʊdˈbaɪ/',
                addedDate: new Date('2025-01-02'),
                lastReviewed: new Date('2025-01-04'),
                reviewCount: 2,
                isFavorite: false
            },
            {
                id: 'word-3',
                word: 'beautiful',
                meaning: 'đẹp',
                level: 'intermediate',
                category: 'adjective',
                examples: [
                    'She has a beautiful smile.',
                    'The sunset is beautiful tonight.'
                ],
                pronunciation: '/ˈbjuːtɪfʊl/',
                addedDate: new Date('2025-01-03'),
                lastReviewed: null,
                reviewCount: 0,
                isFavorite: true
            },
            {
                id: 'word-4',
                word: 'challenge',
                meaning: 'thử thách',
                level: 'advanced',
                category: 'noun',
                examples: [
                    'Learning English is a challenge.',
                    'He accepted the challenge.'
                ],
                pronunciation: '/ˈtʃælɪndʒ/',
                addedDate: new Date('2025-01-04'),
                lastReviewed: new Date('2025-01-05'),
                reviewCount: 1,
                isFavorite: false
            },
            {
                id: 'word-5',
                word: 'dictionary',
                meaning: 'từ điển',
                level: 'intermediate',
                category: 'noun',
                examples: [
                    'I use a dictionary to learn new words.',
                    'This dictionary has many examples.'
                ],
                pronunciation: '/ˈdɪkʃənri/',
                addedDate: new Date('2025-01-05'),
                lastReviewed: null,
                reviewCount: 0,
                isFavorite: true
            }
        ];
    }

    /**
     * Get mock user statistics
     */
    static getUserStats() {
        this.logger.debug('Providing mock user stats');
        const vocabulary = this.getVocabulary();
        
        return {
            totalWords: vocabulary.length,
            learnedWords: vocabulary.filter(word => word.reviewCount > 0).length,
            favoriteWords: vocabulary.filter(word => word.isFavorite).length,
            beginnerWords: vocabulary.filter(word => word.level === 'beginner').length,
            intermediateWords: vocabulary.filter(word => word.level === 'intermediate').length,
            advancedWords: vocabulary.filter(word => word.level === 'advanced').length,
            recentlyAdded: vocabulary.filter(word => {
                const daysDiff = (new Date().getTime() - word.addedDate.getTime()) / (1000 * 3600 * 24);
                return daysDiff <= 7;
            }).length
        };
    }

    /**
     * Get mock recent activity
     */
    static getRecentActivity() {
        this.logger.debug('Providing mock recent activity');
        return [
            {
                id: 'activity-1',
                type: 'word_added',
                word: 'dictionary',
                timestamp: new Date('2025-01-05T10:30:00'),
                description: 'Added new word: dictionary'
            },
            {
                id: 'activity-2',
                type: 'word_reviewed',
                word: 'hello',
                timestamp: new Date('2025-01-05T09:15:00'),
                description: 'Reviewed word: hello'
            },
            {
                id: 'activity-3',
                type: 'word_favorited',
                word: 'beautiful',
                timestamp: new Date('2025-01-04T16:45:00'),
                description: 'Added to favorites: beautiful'
            },
            {
                id: 'activity-4',
                type: 'word_reviewed',
                word: 'challenge',
                timestamp: new Date('2025-01-04T14:20:00'),
                description: 'Reviewed word: challenge'
            }
        ];
    }

    /**
     * Get mock search results
     */
    static getSearchResults(query: string) {
        this.logger.debug('Providing mock search results', { query });
        const vocabulary = this.getVocabulary();
        
        if (!query) {
            return vocabulary;
        }
        
        const lowercaseQuery = query.toLowerCase();
        return vocabulary.filter(word => 
            word.word.toLowerCase().includes(lowercaseQuery) ||
            word.meaning.toLowerCase().includes(lowercaseQuery) ||
            word.category.toLowerCase().includes(lowercaseQuery)
        );
    }

    /**
     * Get mock error scenarios for testing
     */
    static getErrorScenarios() {
        this.logger.debug('Providing mock error scenarios');
        return {
            networkError: {
                message: 'Network connection failed',
                code: 'NETWORK_ERROR'
            },
            authError: {
                message: 'Authentication failed',
                code: 'AUTH_ERROR'
            },
            permissionError: {
                message: 'Permission denied',
                code: 'PERMISSION_DENIED'
            },
            validationError: {
                message: 'Invalid input data',
                code: 'VALIDATION_ERROR'
            }
        };
    }

    /**
     * Generate random word for testing
     */
    static generateRandomWord() {
        const words = [
            { word: 'example', meaning: 'ví dụ', level: 'beginner' },
            { word: 'fantastic', meaning: 'tuyệt vời', level: 'intermediate' },
            { word: 'sophisticated', meaning: 'tinh vi', level: 'advanced' },
            { word: 'progress', meaning: 'tiến bộ', level: 'intermediate' },
            { word: 'magnificent', meaning: 'tráng lệ', level: 'advanced' }
        ];
        
        const randomIndex = Math.floor(Math.random() * words.length);
        const baseWord = words[randomIndex];
        
        return {
            ...baseWord,
            id: `random-word-${Date.now()}`,
            category: 'random',
            examples: [`Example sentence with ${baseWord.word}.`],
            pronunciation: '/random/',
            addedDate: new Date(),
            lastReviewed: null,
            reviewCount: 0,
            isFavorite: false
        };
    }

    /**
     * Simulate API delay for realistic testing
     */
    static async simulateDelay(ms: number = 1000): Promise<void> {
        this.logger.debug('Simulating API delay', { delay: ms });
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get large dataset for performance testing
     */
    static getLargeDataset(size: number = 1000) {
        this.logger.debug('Generating large dataset', { size });
        const baseWords = this.getVocabulary();
        const largeDataset: any[] = [];
        
        for (let i = 0; i < size; i++) {
            const baseWord = baseWords[i % baseWords.length];
            largeDataset.push({
                ...baseWord,
                id: `large-word-${i}`,
                word: `${baseWord.word}-${i}`,
                addedDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
            });
        }
        
        return largeDataset;
    }
}

export default MockData;
