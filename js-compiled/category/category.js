import Logger from '../common/logger.js';
import AuthManager from '../auth/auth-manager.js';
import { getFirestore, collection, doc, addDoc, updateDoc, getDocs, query, where, orderBy, onSnapshot, Timestamp, writeBatch } from 'firebase/firestore';
/**
 * CategoryManager handles category CRUD operations with real-time Firestore sync
 */
class CategoryManager {
    constructor() {
        this.currentUser = null;
        this.unsubscribeCategories = null;
        this.categories = [];
        this.isOnline = true;
        this.logger = new Logger('CategoryManager');
        this.authManager = new AuthManager();
        this.db = getFirestore();
        this.setupNetworkListener();
        this.logger.info('CategoryManager initialized');
    }
    /**
     * Initialize category manager
     */
    async initialize() {
        this.logger.info('Initializing category manager');
        try {
            // Check authentication
            await this.authManager.waitForAuthState();
            this.currentUser = this.authManager.getCurrentUser();
            if (!this.currentUser) {
                throw new Error('User not authenticated');
            }
            // Setup UI
            this.setupUI();
            this.setupEventListeners();
            // Setup real-time categories listener
            this.setupCategoriesListener();
            this.logger.info('Category manager initialization complete');
        }
        catch (error) {
            this.logger.error('Failed to initialize category manager', { error: error.message });
            this.showError('Failed to initialize categories');
            // Redirect to home if not authenticated
            if (error.message === 'User not authenticated') {
                window.location.href = '/';
            }
        }
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
        // Add category button
        const addBtn = document.getElementById('add-category-btn');
        const addForm = document.getElementById('add-category-form');
        const createBtn = document.getElementById('create-category-btn');
        const cancelBtn = document.getElementById('cancel-category-btn');
        const nameInput = document.getElementById('category-name-input');
        if (addBtn && addForm) {
            addBtn.addEventListener('click', () => {
                addForm.style.display = addForm.style.display === 'none' ? 'block' : 'none';
                if (addForm.style.display === 'block') {
                    nameInput?.focus();
                }
            });
        }
        if (createBtn && nameInput) {
            createBtn.addEventListener('click', () => this.createCategory());
            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.createCategory();
                }
            });
        }
        if (cancelBtn && addForm) {
            cancelBtn.addEventListener('click', () => {
                addForm.style.display = 'none';
                this.clearForm();
            });
        }
        // Delete modal
        const deleteModal = document.getElementById('delete-modal');
        const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
        if (cancelDeleteBtn && deleteModal) {
            cancelDeleteBtn.addEventListener('click', () => {
                deleteModal.style.display = 'none';
            });
        }
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => this.confirmDelete());
        }
    }
    /**
     * Setup real-time categories listener
     */
    setupCategoriesListener() {
        this.logger.info('Setting up real-time categories listener');
        this.showLoading(true);
        try {
            const categoriesRef = collection(this.db, 'users', this.currentUser.uid, 'categories');
            const q = query(categoriesRef, orderBy('updatedAt', 'desc'));
            // Setup real-time listener
            this.unsubscribeCategories = onSnapshot(q, (querySnapshot) => {
                this.logger.info('Categories updated from Firestore');
                const categories = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    categories.push({
                        id: doc.id,
                        name: data.name,
                        description: data.description || '',
                        icon: data.icon || '📚',
                        wordCount: data.wordCount || 0,
                        createdAt: data.createdAt?.toDate() || new Date(),
                        updatedAt: data.updatedAt?.toDate() || new Date(),
                        userId: data.userId
                    });
                });
                this.categories = categories;
                this.renderCategories(categories);
                this.showLoading(false);
                this.logger.info('Categories rendered successfully', { count: categories.length });
            }, (error) => {
                this.logger.error('Real-time categories listener error', { error: error.message });
                this.showError('Failed to sync categories with server');
                this.showLoading(false);
            });
        }
        catch (error) {
            this.logger.error('Failed to setup categories listener', { error: error.message });
            this.showError('Failed to load categories');
            this.showLoading(false);
        }
    }
    /**
     * Load categories from Firestore (fallback method)
     */
    async loadCategories() {
        this.logger.info('Loading categories (fallback)');
        this.showLoading(true);
        try {
            const categoriesRef = collection(this.db, 'users', this.currentUser.uid, 'categories');
            const q = query(categoriesRef, orderBy('updatedAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const categories = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                categories.push({
                    id: doc.id,
                    name: data.name,
                    description: data.description || '',
                    icon: data.icon || '📚',
                    wordCount: data.wordCount || 0,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    updatedAt: data.updatedAt?.toDate() || new Date(),
                    userId: data.userId
                });
            });
            this.categories = categories;
            this.renderCategories(categories);
            this.logger.info('Categories loaded successfully', { count: categories.length });
        }
        catch (error) {
            this.logger.error('Failed to load categories', { error: error.message });
            this.showError('Failed to load categories');
        }
        finally {
            this.showLoading(false);
        }
    }
    /**
     * Render categories in the grid
     */
    renderCategories(categories) {
        const grid = document.getElementById('categories-grid');
        const emptyState = document.getElementById('empty-state');
        if (!grid || !emptyState)
            return;
        if (categories.length === 0) {
            grid.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        emptyState.style.display = 'none';
        grid.innerHTML = categories.map(category => `
            <div class="category-card" data-category-id="${category.id}">
                <div class="category-card-header">
                    <div class="category-icon">${category.icon}</div>
                    <div class="category-actions">
                        <button class="action-btn edit-btn" onclick="categoryManager.editCategory('${category.id}')">
                            ✏️
                        </button>
                        <button class="action-btn delete-btn" onclick="categoryManager.deleteCategory('${category.id}', '${category.name}')">
                            🗑️
                        </button>
                    </div>
                </div>
                <h3 class="category-name" id="name-${category.id}">${category.name}</h3>
                ${category.description ? `<p class="category-description" id="description-${category.id}">${category.description}</p>` : ''}
                <div class="category-stats">
                    <span class="word-count">${category.wordCount} words</span>
                    <span class="last-updated">Updated ${this.formatDate(category.updatedAt)}</span>
                </div>
            </div>
        `).join('');
        // Add click listeners to cards (excluding action buttons)
        categories.forEach(category => {
            const card = document.querySelector(`[data-category-id="${category.id}"]`);
            if (card) {
                card.addEventListener('click', (e) => {
                    // Don't navigate if clicking on action buttons
                    if (!e.target?.closest('.category-actions')) {
                        this.navigateToCategory(category.id);
                    }
                });
            }
        });
    }
    /**
     * Create new category with optimistic updates
     */
    async createCategory() {
        const nameInput = document.getElementById('category-name-input');
        const descriptionInput = document.getElementById('category-description-input');
        const iconSelect = document.getElementById('category-icon-select');
        if (!nameInput || !iconSelect)
            return;
        const name = nameInput.value.trim();
        const description = descriptionInput?.value.trim() || '';
        const icon = iconSelect.value;
        // Client-side validation
        if (!this.validateCategoryData(name, description)) {
            return;
        }
        // Check network connection
        if (!this.isOnline) {
            this.showError('No internet connection. Please try again when online.');
            return;
        }
        this.logger.info('Creating category', { name, description, icon });
        // Show loading state
        this.showLoading(true);
        const createBtn = document.getElementById('create-category-btn');
        if (createBtn) {
            createBtn.disabled = true;
            createBtn.textContent = 'Creating...';
        }
        // Optimistic update - create temporary category object
        const tempCategory = {
            id: 'temp-' + Date.now(),
            name,
            description,
            icon,
            wordCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            userId: this.currentUser.uid
        };
        try {
            // Add optimistically to UI
            const updatedCategories = [tempCategory, ...this.categories];
            this.renderCategories(updatedCategories);
            // Save to Firestore
            const categoriesRef = collection(this.db, 'users', this.currentUser.uid, 'categories');
            const docRef = await addDoc(categoriesRef, {
                name,
                description,
                icon,
                wordCount: 0,
                createdAt: Timestamp.fromDate(new Date()),
                updatedAt: Timestamp.fromDate(new Date()),
                userId: this.currentUser.uid
            });
            this.showSuccess('Category created successfully!');
            this.clearForm();
            document.getElementById('add-category-form').style.display = 'none';
            this.logger.info('Category created successfully', { id: docRef.id, name, description });
        }
        catch (error) {
            this.logger.error('Failed to create category', { error: error.message });
            // Revert optimistic update
            this.renderCategories(this.categories);
            // Show appropriate error message
            if (error.code === 'permission-denied') {
                this.showError('Permission denied. Please check your authentication.');
            }
            else if (error.code === 'unavailable') {
                this.showError('Service temporarily unavailable. Please try again later.');
            }
            else {
                this.showError('Failed to sync with server, please try again');
            }
        }
        finally {
            this.showLoading(false);
            if (createBtn) {
                createBtn.disabled = false;
                createBtn.textContent = 'Create';
            }
        }
    }
    /**
     * Validate category data
     */
    validateCategoryData(name, description) {
        if (!name) {
            this.showError('Category name is required');
            return false;
        }
        if (name.length > 50) {
            this.showError('Category name must be 50 characters or less');
            return false;
        }
        if (description && description.length > 200) {
            this.showError('Description must be 200 characters or less');
            return false;
        }
        // Check for duplicate names
        if (this.categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
            this.showError('A category with this name already exists');
            return false;
        }
        return true;
    }
    /**
     * Edit category inline
     */
    editCategory(categoryId) {
        const nameElement = document.getElementById(`name-${categoryId}`);
        const descriptionElement = document.getElementById(`description-${categoryId}`);
        if (!nameElement)
            return;
        const currentName = nameElement.textContent || '';
        const currentDescription = descriptionElement?.textContent || '';
        // Edit name
        nameElement.innerHTML = `
            <input type="text" 
                   class="category-name-edit" 
                   value="${currentName}" 
                   id="edit-name-input-${categoryId}"
                   placeholder="Category name"
                   >
        `;
        // Edit description
        if (descriptionElement) {
            descriptionElement.innerHTML = `
                <input type="text" 
                       class="category-description-edit" 
                       value="${currentDescription}" 
                       id="edit-description-input-${categoryId}"
                       placeholder="Category description (optional)"
                       >
            `;
        }
        else {
            // Create description element if it doesn't exist
            const statsElement = nameElement.nextElementSibling?.nextElementSibling || nameElement.nextElementSibling;
            if (statsElement) {
                const descriptionDiv = document.createElement('p');
                descriptionDiv.className = 'category-description';
                descriptionDiv.id = `description-${categoryId}`;
                descriptionDiv.innerHTML = `
                    <input type="text" 
                           class="category-description-edit" 
                           value=""
                           id="edit-description-input-${categoryId}"
                           placeholder="Category description (optional)"
                           >
                `;
                statsElement.parentNode?.insertBefore(descriptionDiv, statsElement);
            }
        }
        // Add save/cancel buttons
        const cardElement = nameElement.closest('.category-card');
        if (cardElement) {
            let actionsDiv = cardElement.querySelector('.edit-actions');
            if (!actionsDiv) {
                actionsDiv = document.createElement('div');
                actionsDiv.className = 'edit-actions';
                actionsDiv.innerHTML = `
                    <button class="save-btn" onclick="categoryManager.saveCategory('${categoryId}')">Save</button>
                    <button class="cancel-btn" onclick="categoryManager.cancelEdit('${categoryId}', '${currentName}', '${currentDescription}')">Cancel</button>
                `;
                cardElement.appendChild(actionsDiv);
            }
        }
        const nameInput = document.getElementById(`edit-name-input-${categoryId}`);
        if (nameInput) {
            nameInput.focus();
            nameInput.select();
        }
    }
    /**
     * Save edited category with optimistic updates
     */
    async saveCategory(categoryId) {
        const nameInput = document.getElementById(`edit-name-input-${categoryId}`);
        const descriptionInput = document.getElementById(`edit-description-input-${categoryId}`);
        if (!nameInput)
            return;
        const newName = nameInput.value.trim();
        const newDescription = descriptionInput?.value.trim() || '';
        // Find original category
        const originalCategory = this.categories.find(cat => cat.id === categoryId);
        if (!originalCategory) {
            this.showError('Category not found');
            return;
        }
        // Validate changes
        if (!this.validateCategoryUpdate(categoryId, newName, newDescription)) {
            return;
        }
        // Check network connection
        if (!this.isOnline) {
            this.showError('No internet connection. Changes will sync when online.');
            return;
        }
        this.logger.info('Updating category', { categoryId, newName, newDescription });
        // Show loading state
        const saveBtn = document.querySelector(`[onclick="categoryManager.saveCategory('${categoryId}')"]`);
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
        }
        try {
            // Optimistically update UI first
            const nameElement = document.getElementById(`name-${categoryId}`);
            const descriptionElement = document.getElementById(`description-${categoryId}`);
            if (nameElement)
                nameElement.textContent = newName;
            if (descriptionElement && newDescription) {
                descriptionElement.textContent = newDescription;
            }
            else if (!newDescription && descriptionElement) {
                descriptionElement.remove();
            }
            // Remove edit UI
            this.removeEditUI(categoryId);
            // Update Firestore
            const categoryRef = doc(this.db, 'users', this.currentUser.uid, 'categories', categoryId);
            await updateDoc(categoryRef, {
                name: newName,
                description: newDescription,
                updatedAt: Timestamp.fromDate(new Date())
            });
            this.showSuccess('Category updated successfully!');
            this.logger.info('Category updated successfully', { categoryId, newName, newDescription });
        }
        catch (error) {
            this.logger.error('Failed to update category', { error: error.message });
            // Revert optimistic changes
            this.cancelEdit(categoryId, originalCategory.name, originalCategory.description);
            // Show appropriate error message
            if (error.code === 'permission-denied') {
                this.showError('Permission denied. Please check your authentication.');
            }
            else if (error.code === 'not-found') {
                this.showError('Category no longer exists.');
            }
            else {
                this.showError('Failed to sync with server, please try again');
            }
        }
        finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save';
            }
        }
    }
    /**
     * Validate category update
     */
    validateCategoryUpdate(categoryId, name, description) {
        if (!name) {
            this.showError('Category name cannot be empty');
            return false;
        }
        if (name.length > 50) {
            this.showError('Category name must be 50 characters or less');
            return false;
        }
        if (description && description.length > 200) {
            this.showError('Description must be 200 characters or less');
            return false;
        }
        // Check for duplicate names (excluding current category)
        if (this.categories.some(cat => cat.id !== categoryId && cat.name.toLowerCase() === name.toLowerCase())) {
            this.showError('A category with this name already exists');
            return false;
        }
        return true;
    }
    /**
     * Remove edit UI elements
     */
    removeEditUI(categoryId) {
        const cardElement = document.querySelector(`[data-category-id="${categoryId}"]`);
        const actionsDiv = cardElement?.querySelector('.edit-actions');
        if (actionsDiv) {
            actionsDiv.remove();
        }
    }
    /**
     * Cancel edit
     */
    cancelEdit(categoryId, originalName, originalDescription = '') {
        const nameElement = document.getElementById(`name-${categoryId}`);
        const descriptionElement = document.getElementById(`description-${categoryId}`);
        if (nameElement) {
            nameElement.textContent = originalName;
        }
        if (descriptionElement) {
            if (originalDescription) {
                descriptionElement.textContent = originalDescription;
            }
            else {
                descriptionElement.remove();
            }
        }
        // Remove edit actions
        const cardElement = nameElement?.closest('.category-card');
        const actionsDiv = cardElement?.querySelector('.edit-actions');
        if (actionsDiv) {
            actionsDiv.remove();
        }
    }
    /**
     * Delete category with confirmation
     */
    deleteCategory(categoryId, categoryName) {
        const modal = document.getElementById('delete-modal');
        const message = document.getElementById('delete-message');
        if (modal && message) {
            message.textContent = `Are you sure you want to delete "${categoryName}"? This will also delete all words in this category.`;
            modal.style.display = 'flex';
            // Store category ID for deletion
            modal.categoryId = categoryId;
        }
    }
    /**
     * Confirm deletion with batch operation
     */
    async confirmDelete() {
        const modal = document.getElementById('delete-modal');
        const categoryId = modal?.categoryId;
        if (!categoryId)
            return;
        // Find the category to delete
        const categoryToDelete = this.categories.find(cat => cat.id === categoryId);
        if (!categoryToDelete) {
            this.showError('Category not found');
            return;
        }
        // Check network connection
        if (!this.isOnline) {
            this.showError('No internet connection. Please try again when online.');
            return;
        }
        modal.style.display = 'none';
        this.showLoading(true);
        // Show progress message
        this.showInfo('Deleting category and all associated words...');
        try {
            // Start batch operation
            const batch = writeBatch(this.db);
            // Delete the category document
            const categoryRef = doc(this.db, 'users', this.currentUser.uid, 'categories', categoryId);
            batch.delete(categoryRef);
            // Delete all words in this category
            const wordsRef = collection(this.db, 'users', this.currentUser.uid, 'words');
            const wordsQuery = query(wordsRef, where('categoryId', '==', categoryId));
            const wordsSnapshot = await getDocs(wordsQuery);
            let wordCount = 0;
            wordsSnapshot.forEach((doc) => {
                batch.delete(doc.ref);
                wordCount++;
            });
            // Optimistically remove from UI
            const updatedCategories = this.categories.filter(cat => cat.id !== categoryId);
            this.renderCategories(updatedCategories);
            // Commit batch operation
            await batch.commit();
            this.showSuccess(`Category and ${wordCount} words deleted successfully!`);
            this.logger.info('Category and words deleted successfully', {
                categoryId,
                categoryName: categoryToDelete.name,
                wordsDeleted: wordCount
            });
        }
        catch (error) {
            this.logger.error('Failed to delete category', { error: error.message });
            // Revert optimistic change
            this.renderCategories(this.categories);
            // Show appropriate error message
            if (error.code === 'permission-denied') {
                this.showError('Permission denied. Please check your authentication.');
            }
            else if (error.code === 'not-found') {
                this.showError('Category no longer exists.');
            }
            else {
                this.showError('Failed to delete category. Please try again.');
            }
        }
        finally {
            this.showLoading(false);
        }
    }
    /**
     * Show info message
     */
    showInfo(message) {
        // Create info notification element
        const notification = document.createElement('div');
        notification.className = 'info-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #3498db;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
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
     * Navigate to words management page for specific category
     */
    navigateToCategory(categoryId) {
        const category = this.categories.find(cat => cat.id === categoryId);
        this.logger.info('Navigating to words page', { categoryId, categoryName: category?.name });
        // Navigate to words page with category ID parameter
        window.location.href = `/words?categoryId=${categoryId}`;
    }
    /**
     * Clear add category form
     */
    clearForm() {
        const nameInput = document.getElementById('category-name-input');
        const descriptionInput = document.getElementById('category-description-input');
        const iconSelect = document.getElementById('category-icon-select');
        if (nameInput)
            nameInput.value = '';
        if (descriptionInput)
            descriptionInput.value = '';
        if (iconSelect)
            iconSelect.selectedIndex = 0;
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
        const errorEl = document.getElementById('error-notification');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            setTimeout(() => {
                errorEl.style.display = 'none';
            }, 5000);
        }
    }
    /**
     * Show success message
     */
    showSuccess(message) {
        const successEl = document.getElementById('success-notification');
        if (successEl) {
            successEl.textContent = message;
            successEl.style.display = 'block';
            setTimeout(() => {
                successEl.style.display = 'none';
            }, 3000);
        }
    }
    /**
     * Cleanup resources and listeners
     */
    destroy() {
        this.logger.info('Destroying CategoryManager');
        // Unsubscribe from real-time listener
        if (this.unsubscribeCategories) {
            this.unsubscribeCategories();
            this.unsubscribeCategories = null;
        }
        // Clear categories array
        this.categories = [];
        this.logger.info('CategoryManager destroyed');
    }
}
// Initialize category manager when DOM is loaded
let categoryManager;
document.addEventListener('DOMContentLoaded', async () => {
    categoryManager = new CategoryManager();
    // Make categoryManager globally accessible for inline event handlers
    window.categoryManager = categoryManager;
    await categoryManager.initialize();
});
// Cleanup when page unloads
window.addEventListener('beforeunload', () => {
    if (categoryManager) {
        categoryManager.destroy();
    }
});
export default CategoryManager;
//# sourceMappingURL=category.js.map