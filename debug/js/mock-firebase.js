// Mock Firebase for debug environment
// This replaces real Firebase functionality with simulated behavior

class MockFirebaseApp {
    constructor() {
        this.name = 'mock-firebase-app';
        this.options = {
            apiKey: 'mock-api-key',
            authDomain: 'mock-auth-domain',
            projectId: 'mock-project'
        };
    }
}

class MockFirestore {
    constructor() {
        this.type = 'mock-firestore';
        this.data = new Map();
    }

    collection(path) {
        return new MockCollection(path, this.data);
    }

    doc(path) {
        return new MockDocumentReference(path, 'root', this.data);
    }
}

class MockCollection {
    constructor(path, data) {
        this.path = path;
        this.data = data;
    }

    async get() {
        const docs = this.data.get(this.path) || [];
        return {
            docs: docs.map(doc => new MockDocumentSnapshot(doc.id, doc.data)),
            size: docs.length,
            empty: docs.length === 0
        };
    }

    async add(data) {
        const id = `mock-doc-${Date.now()}`;
        const docs = this.data.get(this.path) || [];
        docs.push({ id, data });
        this.data.set(this.path, docs);
        
        console.log(`Mock Firestore: Added document to ${this.path}`, { id, data });
        return new MockDocumentReference(id, this.path, this.data);
    }

    doc(id) {
        return new MockDocumentReference(id, this.path, this.data);
    }

    where(field, operator, value) {
        return new MockQuery(this.path, this.data, [{ field, operator, value }]);
    }

    orderBy(field, direction = 'asc') {
        return new MockQuery(this.path, this.data, [], [{ field, direction }]);
    }

    limit(count) {
        return new MockQuery(this.path, this.data, [], [], count);
    }
}

class MockDocumentReference {
    constructor(id, collectionPath, data) {
        this.id = id;
        this.path = `${collectionPath}/${id}`;
        this.data = data;
        this.collectionPath = collectionPath;
    }

    async get() {
        const docs = this.data.get(this.collectionPath) || [];
        const doc = docs.find(d => d.id === this.id);
        return new MockDocumentSnapshot(this.id, doc ? doc.data : null);
    }

    async set(data, options = {}) {
        const docs = this.data.get(this.collectionPath) || [];
        const existingIndex = docs.findIndex(d => d.id === this.id);
        
        if (existingIndex >= 0) {
            if (options.merge) {
                docs[existingIndex].data = { ...docs[existingIndex].data, ...data };
            } else {
                docs[existingIndex].data = data;
            }
        } else {
            docs.push({ id: this.id, data });
        }
        
        this.data.set(this.collectionPath, docs);
        console.log(`Mock Firestore: Set document ${this.path}`, data);
    }

    async update(data) {
        const docs = this.data.get(this.collectionPath) || [];
        const existingIndex = docs.findIndex(d => d.id === this.id);
        
        if (existingIndex >= 0) {
            docs[existingIndex].data = { ...docs[existingIndex].data, ...data };
            this.data.set(this.collectionPath, docs);
            console.log(`Mock Firestore: Updated document ${this.path}`, data);
        } else {
            throw new Error(`Document ${this.path} does not exist`);
        }
    }

    async delete() {
        const docs = this.data.get(this.collectionPath) || [];
        const filteredDocs = docs.filter(d => d.id !== this.id);
        this.data.set(this.collectionPath, filteredDocs);
        console.log(`Mock Firestore: Deleted document ${this.path}`);
    }
}

class MockDocumentSnapshot {
    constructor(id, data) {
        this.id = id;
        this._data = data;
        this.exists = data !== null;
    }

    data() {
        return this._data;
    }

    get(field) {
        return this._data ? this._data[field] : undefined;
    }
}

class MockQuery {
    constructor(collectionPath, data, wheres = [], orderBys = [], limitCount = null) {
        this.collectionPath = collectionPath;
        this.data = data;
        this.wheres = wheres;
        this.orderBys = orderBys;
        this.limitCount = limitCount;
    }

    where(field, operator, value) {
        return new MockQuery(
            this.collectionPath,
            this.data,
            [...this.wheres, { field, operator, value }],
            this.orderBys,
            this.limitCount
        );
    }

    orderBy(field, direction = 'asc') {
        return new MockQuery(
            this.collectionPath,
            this.data,
            this.wheres,
            [...this.orderBys, { field, direction }],
            this.limitCount
        );
    }

    limit(count) {
        return new MockQuery(
            this.collectionPath,
            this.data,
            this.wheres,
            this.orderBys,
            count
        );
    }

    async get() {
        let docs = this.data.get(this.collectionPath) || [];

        // Apply where clauses
        docs = docs.filter(doc => {
            return this.wheres.every(where => {
                const fieldValue = doc.data[where.field];
                switch (where.operator) {
                    case '==': return fieldValue === where.value;
                    case '!=': return fieldValue !== where.value;
                    case '>': return fieldValue > where.value;
                    case '>=': return fieldValue >= where.value;
                    case '<': return fieldValue < where.value;
                    case '<=': return fieldValue <= where.value;
                    case 'array-contains': return Array.isArray(fieldValue) && fieldValue.includes(where.value);
                    case 'in': return Array.isArray(where.value) && where.value.includes(fieldValue);
                    default: return true;
                }
            });
        });

        // Apply order by
        this.orderBys.forEach(orderBy => {
            docs.sort((a, b) => {
                const aVal = a.data[orderBy.field];
                const bVal = b.data[orderBy.field];
                const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                return orderBy.direction === 'desc' ? -comparison : comparison;
            });
        });

        // Apply limit
        if (this.limitCount) {
            docs = docs.slice(0, this.limitCount);
        }

        return {
            docs: docs.map(doc => new MockDocumentSnapshot(doc.id, doc.data)),
            size: docs.length,
            empty: docs.length === 0
        };
    }
}

class MockAuth {
    constructor() {
        this.currentUser = null;
        this.authStateListeners = [];
    }

    onAuthStateChanged(callback) {
        this.authStateListeners.push(callback);
        // Immediately call with current state
        callback(this.currentUser);
        
        // Return unsubscribe function
        return () => {
            const index = this.authStateListeners.indexOf(callback);
            if (index > -1) {
                this.authStateListeners.splice(index, 1);
            }
        };
    }

    async signInWithPopup(provider) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simulate random failure (10% chance)
        if (Math.random() < 0.1) {
            throw new Error('Mock sign-in failed');
        }

        const mockUser = {
            uid: 'mock-user-123',
            email: 'test@example.com',
            displayName: 'Test User',
            photoURL: 'https://via.placeholder.com/40/007bff/white?text=TU',
            emailVerified: true,
            metadata: {
                creationTime: new Date().toISOString(),
                lastSignInTime: new Date().toISOString()
            }
        };

        this.currentUser = mockUser;
        this.notifyAuthStateListeners(mockUser);
        
        console.log('Mock Auth: User signed in', mockUser);
        return { user: mockUser };
    }

    async signOut() {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        this.currentUser = null;
        this.notifyAuthStateListeners(null);
        
        console.log('Mock Auth: User signed out');
    }

    notifyAuthStateListeners(user) {
        this.authStateListeners.forEach(callback => {
            try {
                callback(user);
            } catch (error) {
                console.error('Error in auth state listener:', error);
            }
        });
    }
}

class MockGoogleAuthProvider {
    constructor() {
        this.providerId = 'google.com';
        this.scopes = [];
    }

    addScope(scope) {
        this.scopes.push(scope);
        console.log(`Mock Google Provider: Added scope ${scope}`);
    }

    static credential(idToken, accessToken) {
        return {
            providerId: 'google.com',
            signInMethod: 'google.com',
            idToken,
            accessToken
        };
    }
}

// Create mock Firebase global object
window.mockFirebase = {
    app: new MockFirebaseApp(),
    db: new MockFirestore(),
    auth: new MockAuth(),
    
    // Mock Firebase functions
    async getAuthFunctions() {
        return {
            GoogleAuthProvider: MockGoogleAuthProvider,
            signInWithPopup: (auth, provider) => auth.signInWithPopup(provider),
            signOut: (auth) => auth.signOut(),
            onAuthStateChanged: (auth, callback) => auth.onAuthStateChanged(callback)
        };
    },
    
    async getFirestoreFunctions() {
        return {
            collection: (db, path) => db.collection(path),
            doc: (db, path) => db.doc(path),
            addDoc: (collectionRef, data) => collectionRef.add(data),
            setDoc: (docRef, data, options) => docRef.set(data, options),
            updateDoc: (docRef, data) => docRef.update(data),
            deleteDoc: (docRef) => docRef.delete(),
            getDoc: (docRef) => docRef.get(),
            getDocs: (query) => query.get(),
            query: (collectionRef) => collectionRef,
            where: (field, operator, value) => ({ field, operator, value }),
            orderBy: (field, direction) => ({ field, direction }),
            limit: (count) => ({ count }),
            serverTimestamp: () => new Date(),
            arrayUnion: (...elements) => ({ _type: 'arrayUnion', elements }),
            arrayRemove: (...elements) => ({ _type: 'arrayRemove', elements }),
            increment: (value) => ({ _type: 'increment', value })
        };
    }
};

// Override the real firebase object in debug mode
if (window.location.pathname.includes('/debug/')) {
    window.firebase = window.mockFirebase;
    console.log('🛠️ Mock Firebase activated for debug environment');
    
    // Add some initial test data
    const mockData = {
        users: [
            {
                id: 'mock-user-123',
                data: {
                    email: 'test@example.com',
                    displayName: 'Test User',
                    createdAt: new Date(),
                    preferences: {
                        theme: 'light',
                        language: 'en'
                    }
                }
            }
        ],
        vocabulary: [
            {
                id: 'word-1',
                data: {
                    word: 'hello',
                    meaning: 'xin chào',
                    level: 'beginner',
                    userId: 'mock-user-123',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            },
            {
                id: 'word-2',
                data: {
                    word: 'goodbye',
                    meaning: 'tạm biệt',
                    level: 'beginner',
                    userId: 'mock-user-123',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            }
        ]
    };
    
    // Populate mock data
    Object.keys(mockData).forEach(collection => {
        window.firebase.db.data.set(collection, mockData[collection]);
    });
    
    console.log('🎭 Mock data populated:', Object.keys(mockData));
}

export { MockFirebaseApp, MockFirestore, MockAuth, MockGoogleAuthProvider };
