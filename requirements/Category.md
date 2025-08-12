# Category Management Page - English Dictionary App

## Overview

Trang Category cho phép người dùng quản lý### 6. Navigation

- **Back to Home**: Click "← Back to Home" → navigate về trang chủ (/)
- **To Words Page**: Click category card → navigate to Words page (/words?categoryId=[id])
- **Navigation Flow**:
  ````
  Main Page (/)
  ↓ Click "My Categories"
  Category Page (/category)
  ↓ Click category card
  Words Page (/words?categoryId=[id])
  ↓ Click "← Back to Categories"
  Category Page (/category)
  ↓ Click "← Back to Home"
  Main Page (/)
  ``` tổ chức từ vựng theo các chủ đề khác nhau. Đây là nơi người dùng có thể tạo, chỉnh sửa, xóa các category và điều hướng vào từng category để quản lý từ vựng.
  ````

## Page Structure

### Header Section

- **Title**: "My Categories"
- **Navigation**:
  - Back button "← Back to Home" (navigate về trang chủ)
  - User profile (avatar, tên, sign out button) ở góc phải

### Main Content Area

#### Categories Grid/List Display

- **Layout**: Grid layout hiển thị các category cards
- **Category Card Components**:
  - Category icon/image
  - Category name (có thể edit inline)
  - Category description (optional, có thể edit inline)
  - Word count: "X words"
  - Last updated: "Updated 2 days ago"
  - Actions: Edit, Delete buttons

#### Add New Category Section

- **Add Button**: "➕ Add New Category" button nổi bật
- **Quick Add Form**:
  - Category name input field
  - Category description input field (optional)
  - Category icon/color picker
  - "Create" và "Cancel" buttons

## User Interactions & Functions

### 1. View Categories

- Hiển thị tất cả categories của user
- Show preview information (số từ, ngày cập nhật cuối)
- Responsive grid layout
- **Real-time Updates**: Listen for Firestore changes (onSnapshot)
- **Loading State**: Show skeleton/spinner while fetching data
- **Error State**: Show error message if fetch fails
- **Empty State**: Show helpful message when no categories exist

### 2. Add New Category

```
User clicks "Add New Category"
→ Show inline form hoặc modal
→ User nhập tên category
→ User nhập description (optional)
→ Chọn icon/màu (optional)
→ Click "Create"
→ Validate data client-side
→ Show loading state
→ Save to Firestore (addDoc)
→ If success: Update UI + show success message
→ If error: Show error message + revert UI
→ Category mới được tạo và hiển thị
```

### 3. Edit Category

```
User clicks edit icon trên category card
→ Category name và description becomes editable
→ User có thể thay đổi tên, description, icon, màu
→ Click "Save" hoặc Enter để lưu
→ Validate changes client-side
→ Show loading state
→ Update Firestore (updateDoc)
→ If success: Update UI + show success message
→ If error: Revert to original values + show error
→ Click "Cancel" hoặc Esc để hủy (revert changes)
```

### 4. Delete Category

```
User clicks delete icon
→ Show confirmation dialog: "Delete category '[Name]'? This will also delete all words in this category."
→ User confirms hoặc cancels
→ If confirm:
  → Show loading state
  → Delete from Firestore (deleteDoc)
  → Delete all words in category (batch operation)
  → If success: Remove from UI + show success message
  → If error: Show error message + keep in UI
→ Nếu cancel: Close dialog, no changes
```

### 5. Navigate to Category Detail

```
User clicks vào category card (không phải edit/delete buttons)
→ Navigate đến Words Management page
→ URL: /words?categoryId=[category-id]
→ Show tất cả words trong category đó
→ Page title: "Words in [Category Name]"
→ Must have "← Back to Categories" button
→ Must have "← Back to Home" button in header
```

### 6. Navigation

- **Back to Home**: Click "← Back to Home" → navigate về trang chủ (/)

## Data Structure

### Category Object

```typescript
interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}
```

## Technical Implementation

### Files Structure

- **HTML**: `html/category.html`
- **CSS**: `css/category.css`
- **TypeScript**: `js/category/category.ts`
- **Firebase**: Store categories in Firestore collection `categories`

### Firestore Structure

```
users/{userId}/categories/{categoryId}
{
  name: "Animals",
  description: "Words related to animals and pets",
  icon: "🐶",
  color: "#blue",
  wordCount: 15,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Key Functions

```typescript
class CategoryManager {
  async getCategories(): Promise<Category[]>;
  async createCategory(
    name: string,
    description?: string,
    icon?: string
  ): Promise<Category>;
  async updateCategory(id: string, updates: Partial<Category>): Promise<void>;
  async deleteCategory(id: string): Promise<void>;
  async getCategoryWordCount(categoryId: string): Promise<number>;
}
```

### Firestore Synchronization Requirements

#### Real-time Data Sync

- **Load Categories**: Tự động sync với Firestore khi page load và khi có thay đổi từ nguồn khác
- **Create Category**: Lưu ngay lập tức vào Firestore và update UI real-time
- **Update Category**: Sync changes với Firestore và reflect changes trong UI
- **Delete Category**: Remove từ Firestore và update UI ngay lập tức

#### Data Consistency

- **Optimistic Updates**: UI update trước, sau đó sync với Firestore
- **Error Handling**: Nếu Firestore operation fails, revert UI changes và show error
- **Loading States**: Show loading indicators khi đang sync với Firestore
- **Offline Support**: Cache data locally và sync khi có network connection

#### Firestore Operations

```typescript
// Create - Add new document to Firestore
await addDoc(collection(db, "users", userId, "categories"), categoryData);

// Read - Listen for real-time changes
onSnapshot(query(categoriesRef, orderBy("updatedAt", "desc")), (snapshot) => {
  // Update UI with latest data
});

// Update - Update specific fields
await updateDoc(doc(db, "users", userId, "categories", categoryId), updates);

// Delete - Remove document from Firestore
await deleteDoc(doc(db, "users", userId, "categories", categoryId));
```

## UI/UX Requirements

### Design Principles

- **Clean & Intuitive**: Dễ sử dụng, không phức tạp
- **Visual Feedback**: Loading states, success/error messages
- **Responsive**: Hoạt động tốt trên mobile và desktop

### Color & Style

- Consistent với main app theme
- Category cards có hover effects
- Icon và color coding cho easy recognition

### Error Handling

- Network errors: "Unable to load categories"
- Validation errors: "Category name is required"
- Delete confirmation: "Are you sure?"
- **Firestore Sync Errors**: "Failed to sync with server, please try again"
- **Connection Errors**: "No internet connection, changes will sync when online"

### Data Validation & Security

#### Client-side Validation

- Category name: Required, max 50 characters
- Description: Optional, max 200 characters
- Icon: Must be valid emoji or predefined icon

#### Firestore Security Rules

```javascript
// Allow users to only access their own categories
match /users/{userId}/categories/{categoryId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
  allow create: if request.auth != null &&
                request.auth.uid == userId &&
                validateCategoryData(request.resource.data);
}
```

#### Performance Optimization

- **Pagination**: Load categories in batches if user has many categories
- **Caching**: Cache frequently accessed data
- **Debouncing**: Debounce search/filter operations
- **Lazy Loading**: Load category details only when needed

## Future Enhancements

- Drag & drop để reorder categories
- Search/filter categories
- Export category data
- Share categories với users khác
- **Real-time Collaboration**: Multiple users can collaborate on shared categories
- **Version History**: Track changes and allow rollback
- **Bulk Operations**: Select multiple categories for batch operations
- **Category Templates**: Pre-defined category templates for common topics
