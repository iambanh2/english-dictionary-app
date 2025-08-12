# Main Page Requirements - English Dictionary App

## Overview

Trang chủ là điểm khởi đầu của ứng dụng từ điển tiếng Anh - tiếng Việt. Nội dung và chức năng của trang sẽ thay đổi dựa trên trạng thái đăng nhập của người dùng.

## Page States & Layouts

### 1. 🔒 Anonymous User (Chưa đăng nhập)

#### Header Section

- **Logo**: "📚 English Dictionary" ở bên trái
- **Authentication Buttons** (góc trên bên phải):
  - "Đăng nhập" button (primary style) → Navigate to `/signin`
  - "Đăng ký" button (secondary style) → Navigate to `/register`

#### Main Content Area

- **Hero Section**:

  - Title: "Welcome to English Dictionary"
  - Subtitle: "Build your vocabulary, track your progress, and master English"
  - Call-to-Action: "Get Started" button → Navigate to `/signin`

- **Features Preview**:
  - Personal Dictionary: "Build your personal vocabulary collection"
  - Smart Search: "Quickly find words in your collection"
  - Progress Tracking: "Monitor your learning progress"

#### Restrictions

- ❌ Không hiển thị dictionary functionality
- ❌ Không có search features
- ❌ Chỉ có thể xem landing page content

### 2. ✅ Authenticated User (Đã đăng nhập qua Firebase Auth)

#### Header Section

- **Logo**: "📚 English Dictionary" ở bên trái
- **User Profile** (góc trên bên phải):
  - User name với emoji: "👋 [Display Name]"
  - "Sign Out" button

#### Main Content Area

##### Dashboard Overview

```
Welcome back, [User Name]! 👋
Continue building your vocabulary and track your learning progress.
```

##### Your Progress Cards

- **Total Words**:

  - Icon: 📊
  - Value: số từ trong collection
  - Label: "Words in your collection"

- **Learned**:

  - Icon: ✅
  - Value: số từ đã học
  - Label: "Words mastered"

- **Favorites**:
  - Icon: ⭐
  - Value: số từ yêu thích
  - Label: "Favorite words"

##### Quick Actions Section

- **Add New Word**:

  - Icon: 📝
  - Description: "Add a new word to your personal dictionary"
  - Action: Click → Navigate to Add Word page

- **My Categories**:

  - Icon: 📚
  - Description: "Browse and manage your word categories"
  - Action: Click → Navigate to `/category` (Category.md)

- **Practice**:
  - Icon: 🎯
  - Description: "Test your knowledge with vocabulary exercises"
  - Action: Click → Navigate to Practice page

##### Search Dictionary

- **Search Input**: "Search for a word or phrase..."
- **Search Button**: Trigger search functionality

## User Interactions & Navigation Flow

### Authentication Flow

```
Landing Page (Anonymous)
→ Click "Đăng nhập"
→ Navigate to /signin
→ User signs in successfully
→ Redirect back to / (Main page)
→ Now shows Authenticated content
```

### Category Navigation

```
Main Page (Authenticated)
→ Click "My Categories" in Quick Actions
→ Navigate to /category
→ User can manage categories
→ Click "Back to Home"
→ Return to Main Page
```

### Word Management Flow

```
Main Page → "Add New Word" → Add Word page
Main Page → "Search Dictionary" → Search results
Main Page → "Practice" → Practice/Quiz page
```

## Technical Implementation

### File Structure

- **HTML**: `html/index.html`
- **CSS**: `css/style-new.css` (modern design)
- **TypeScript**: `js/main/index.ts`

### Core Classes

```typescript
class MainPageController {
  private authManager: AuthManager;
  private logger: Logger;
  private signOut: SignOut;

  // Main methods
  async initialize(): Promise<void>;
  private setupAuthStateListener(): void;
  private renderAnonymousContent(): void;
  private renderAuthenticatedContent(user: any): void;
  private renderAuthenticatedMainContent(user: any): void;
}
```

### Authentication State Management

```typescript
// Listen for auth state changes
this.authManager.onAuthStateChanged((user) => {
  if (user) {
    this.renderAuthenticatedContent(user);
  } else {
    this.renderAnonymousContent();
  }
});
```

### Data Integration

- **Firebase Auth**: User authentication state
- **Firestore**: User's vocabulary data, categories, progress
- **Real-time Updates**: Listen for data changes

## UI/UX Design Requirements

### Design System

- **Colors**: Modern gradient backgrounds, glass-morphism effects
- **Typography**: Inter font family, clear hierarchy
- **Components**: Card-based layouts, smooth transitions
- **Responsive**: Mobile-first design

### Interactive Elements

- **Hover Effects**: Buttons và cards có hover animations
- **Loading States**: Spinner khi đang load data
- **Error Handling**: User-friendly error messages
- **Success Feedback**: Confirmation messages cho user actions

### Accessibility

- **ARIA Labels**: Proper accessibility labels
- **Keyboard Navigation**: Support keyboard shortcuts
- **Screen Reader**: Compatible với screen readers

## Data Structure & Firebase Integration

### User Progress Data

```typescript
interface UserProgress {
  totalWords: number;
  learnedWords: number;
  favoriteWords: number;
  categoriesCount: number;
  lastActive: Date;
}
```

### Firestore Collections

```
users/{userId}/
├── profile/
├── categories/
├── words/
└── progress/
```

## Future Features (Roadmap)

- 🔮 **Advanced Search**: Filter by category, date
- 🎮 **Gamification**: Points, badges, streaks
- 📱 **Mobile App**: React Native version
- 🌙 **Dark Mode**: Theme switching
- 🔄 **Offline Mode**: PWA capabilities
- 📊 **Analytics**: Detailed learning analytics

## Technical Notes

- **Authentication**: Firebase Auth (Google OAuth + Email/Password)
- **Database**: Firestore for user data
- **Hosting**: Firebase Hosting với clean URLs
- **Build System**: TypeScript compilation với npm scripts
