# English-Vietnamese Dictionary Web Application

## Mô tả dự án

Website lưu trữ và quản lý từ vựng tiếng Anh - tiếng Việt với các tính năng tìm kiếm, thêm, sửa, xóa từ vựng.

## Technical Requirements

### 1. Technology Stack

#### Backend

- **Firebase App**: Sử dụng Firebase làm backend service
- **Firebase Authentication**: Xác thực người dùng qua Google OAuth
- **Firestore Database**: Lưu trữ dữ liệu từ vựng và thông tin người dùng
- **TypeScript**: Ngôn ngữ lập trình chính

#### Frontend

- **HTML5**: Cấu trúc trang web
- **CSS3**: Styling và responsive design
- **TypeScript**: Logic xử lý phía client

### 2. Project Structure

```
project/
├── html/              # HTML templates
│   ├── index.html
│   ├── signin.html
├── css/               # Stylesheets organized by page
│   ├── style.css      # Global styles
│   ├── signin.css     # Sign-in page styles
├── js/                # TypeScript source files organized by feature
│   ├── firebase/      # Firebase configuration
│   │   ├── firebase-config.ts
│   │   └── firebase-init.ts
│   ├── auth/          # Authentication related
│   │   ├── signin.ts
│   │   ├── signout.ts
│   ├── dictionary/    # Dictionary features
│   │   ├── word-manager.ts
│   │   └── search.ts
│   ├── common/        # Shared utilities
│   │   └── logger.ts
│   └── debug/         # Debug and testing utilities
│       ├── mock-data.ts
│       ├── test-auth.ts
│       └── debug-helper.ts
├── debug/             # Debug environment for frontend testing
│   ├── index.html     # Debug version of main page
│   ├── mock-user.html # Test with mock authenticated user
│   ├── css/           # Debug-specific styles
│   │   └── debug.css
│   └── js/            # Debug JavaScript files
│       ├── mock-firebase.js
│       └── debug-main.js
```

### 3. Frontend Development Standards

#### Code Organization

- **Class-based Architecture**: Tất cả TypeScript files phải được viết theo pattern class
- **Single Responsibility**: Mỗi class chỉ đảm nhận một chức năng cụ thể
- **File Naming**: Sử dụng kebab-case cho tên file (ví dụ: `word-manager.ts`)

#### Logging Requirements

- **Mandatory Logger Class**: Phải có class `Logger` riêng biệt để quản lý logs
- **Log Levels**: Hỗ trợ các level: `debug`, `info`, `warn`, `error`
- **Usage**: Sử dụng logger trong tất cả các operations quan trọng

#### Coding Standards

- **Conditional Logic**:
  - Bắt buộc phải có `else` khi có `if`
  - Mỗi nhánh `if/else` phải có log tương ứng
  - Log phải mô tả rõ ràng logic flow
- **Error Handling**:
  - Sử dụng try-catch cho tất cả async operations
  - Log error details và context
- **Type Safety**: Sử dụng strict TypeScript configuration

#### Example Code Structure

```typescript
class WordManager {
  private logger: Logger;

  constructor() {
    this.logger = new Logger("WordManager");
  }

  async addWord(word: string, meaning: string): Promise<boolean> {
    this.logger.info("Adding new word", { word, meaning });

    try {
      if (await this.wordExists(word)) {
        this.logger.warn("Word already exists", { word });
        return false;
      } else {
        this.logger.info("Word is new, proceeding to add", { word });
        // Add word logic
        return true;
      }
    } catch (error) {
      this.logger.error("Failed to add word", { word, error });
      return false;
    }
  }
}
```

### 4. Development Workflow

- Sử dụng Firebase CLI cho development và deployment
- Code phải compile thành JavaScript trước khi chạy
- Tuân thủ ESLint và Prettier configuration

### 5. Debug Environment

#### Purpose

Thư mục `debug/` được tạo để test các tính năng frontend mà không cần kết nối thật với Firebase, sử dụng mock data và điều kiện giả định.

#### Debug Structure

- **debug/index.html**: Trang debug chính với mock authentication states
- **debug/mock-user.html**: Test UI với user đã đăng nhập giả
- **debug/css/debug.css**: Styles riêng cho debug environment
- **debug/js/**: JavaScript files cho debug functionality

#### Mock Data Requirements

```typescript
// js/debug/mock-data.ts
class MockData {
  static getUser() {
    return {
      uid: "mock-user-123",
      displayName: "Test User",
      email: "test@example.com",
      photoURL: "https://via.placeholder.com/40",
    };
  }

  static getVocabulary() {
    return [
      { word: "hello", meaning: "xin chào", level: "beginner" },
      { word: "goodbye", meaning: "tạm biệt", level: "beginner" },
    ];
  }
}

// js/debug/test-auth.ts
class MockAuth {
  private isAuthenticated: boolean = false;

  signIn(): void {
    this.isAuthenticated = true;
    // Trigger UI update
  }

  signOut(): void {
    this.isAuthenticated = false;
    // Trigger UI update
  }

  getCurrentUser() {
    return this.isAuthenticated ? MockData.getUser() : null;
  }
}
```

#### Debug Features

- **Authentication Toggle**: Buttons để switch giữa authenticated/unauthenticated states
- **Mock Data Display**: Hiển thị data giả để test UI components
- **State Simulation**: Simulate các trạng thái khác nhau của app
- **Error Simulation**: Test error handling với mock errors
- **Performance Testing**: Test với large datasets giả

#### Usage Guidelines

- Debug environment chỉ dùng cho development
- Không deploy debug files lên production
- Sử dụng debug để test UI logic trước khi integrate với Firebase
- Mock data phải realistic và cover edge cases
