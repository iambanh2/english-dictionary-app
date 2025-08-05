# Main Page Requirements - English Dictionary App

## Overview

Trang chủ là điểm khởi đầu của ứng dụng từ điển tiếng Anh - tiếng Việt, hiển thị nội dung khác nhau tùy thuộc vào trạng thái đăng nhập của người dùng.

## User States & UI Behavior

### 1. Anonymous User (Chưa đăng nhập)

#### Header Section

- **Authentication Buttons**:
  - Vị trí: Góc trên bên phải
  - Buttons: "Đăng nhập" và "Đăng ký"
  - Style: Primary button cho "Đăng nhập", Secondary button cho "Đăng ký"
  - Khi ấn vào nút đăng nhập thì sẽ chuyển qua page signin. Page signin được làm theo yêu cầu của file signin.md

#### Main Content Area

- **Welcome Section**:
  - Hiển thị text "Welcome to English Dictionary"
  - Subtitle: "Sign in to start building your vocabulary"
  - Optional: Brief description về tính năng của app
- **Call-to-Action**: Button "Get Started" dẫn đến trang đăng nhập
- **Features Preview** (Optional):
  - Showcase các tính năng chính sẽ có sau khi đăng nhập
  - Screenshots hoặc icons minh họa

#### Restrictions

- Không hiển thị dictionary features
- Không có search functionality
- Chỉ có thể xem landing page content

### 2. Authenticated User (Đã đăng nhập qua Firebase Auth)

#### Header Section

- **User Profile Area** (Góc trên bên phải):
  - Avatar từ Google account
  - Display name từ Google profile
  - Dropdown menu với options:
    - "Profile Settings"
    - "Sign Out"

#### Main Content Area

- **Dashboard Overview**:
  - Welcome message với tên user: "Welcome back, [User Name]!"
  - Quick stats: Số từ đã học, từ yêu thích, etc.
- **Quick Actions**:
  - "Add New Word" button
  - "Search Dictionary" input field
  - "My Vocabulary" link
- **Recent Activity**:
  - Danh sách từ vừa thêm gần đây
  - Từ đã search gần đây

## Page Components Structure

### HTML Structure (`html/index.html`)

```html
<!DOCTYPE html>
<html>
  <head>
    <title>English Dictionary</title>
    <link rel="stylesheet" href="../css/style.css" />
  </head>
  <body>
    <header class="main-header">
      <div class="logo">English Dictionary</div>
      <div id="auth-section">
        <!-- Dynamic content based on auth state -->
      </div>
    </header>

    <main id="main-content">
      <!-- Dynamic content based on auth state -->
    </main>

    <script src="../js/main/index.js"></script>
  </body>
</html>
```

### CSS Requirements (`css/style.css`)

- **Responsive design**: Mobile-first approach
- **Theme colors**: Định nghĩa color scheme nhất quán
- **Typography**: Font family và sizes hierarchy
- **Component styles**: Button styles, card layouts, etc.

### TypeScript Implementation (`js/main/index.ts`)

#### Class Structure

```typescript
class MainPageController {
  private authManager: AuthManager;
  private logger: Logger;

  constructor() {
    this.authManager = new AuthManager();
    this.logger = new Logger("MainPageController");
  }

  async initialize(): Promise<void> {
    // Check auth state and render appropriate content
  }

  private renderAnonymousContent(): void {
    // Render content for non-authenticated users
  }

  private renderAuthenticatedContent(user: User): void {
    // Render content for authenticated users
  }
}
```

## Authentication Flow Integration

### Initial Page Load

1. Check Firebase Auth state
2. If authenticated:
   - Load user profile
   - Render authenticated UI
   - Initialize dictionary features
3. If not authenticated:
   - Render anonymous UI
   - Setup sign-in event listeners

### Auth State Changes

- Listen for Firebase auth state changes
- Dynamically update UI without page refresh
- Handle sign-in/sign-out transitions smoothly

## Future Enhancements (Post-Authentication)

- Dictionary search functionality
- Word management (add/edit/delete)
- Personal vocabulary lists
- Study modes and quizzes
- Progress tracking
- Offline capabilities

## Technical Notes

- File location: `html/index.html`
- CSS file: `css/style.css`
- TypeScript: `js/main/index.ts`
- Dependencies: Firebase Auth, Logger utility
