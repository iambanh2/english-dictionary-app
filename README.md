# English-Vietnamese Dictionary Web Application

A modern web application for storing and managing English-Vietnamese vocabulary with Firebase backend and TypeScript frontend.

## 🚀 Features

- **Authentication**: Google OAuth via Firebase Auth
- **Personal Dictionary**: Store and manage your vocabulary
- **Search Functionality**: Find words quickly
- **Progress Tracking**: Monitor your learning progress
- **Responsive Design**: Works on desktop and mobile
- **Debug Environment**: Test features without Firebase connection

## 🛠️ Technology Stack

### Backend

- **Firebase App**: Backend service platform
- **Firebase Authentication**: Google OAuth integration
- **Firestore Database**: NoSQL database for vocabulary storage
- **TypeScript**: Type-safe backend logic

### Frontend

- **HTML5**: Modern web structure
- **CSS3**: Responsive styling with animations
- **TypeScript**: Type-safe frontend development
- **ES6 Modules**: Modern JavaScript modules

## 📁 Project Structure

```
english-dictionary-app/
├── html/                 # HTML templates
│   ├── index.html       # Main page
│   ├── signin.html      # Sign-in page
│   └── register.html    # Registration page
├── css/                 # Stylesheets
│   ├── style.css        # Global styles
│   ├── signin.css       # Sign-in styles
│   └── register.css     # Registration styles
├── js/                  # TypeScript source files
│   ├── firebase/        # Firebase configuration
│   ├── auth/           # Authentication logic
│   ├── main/           # Main page controller
│   ├── common/         # Shared utilities
│   └── debug/          # Debug utilities
├── js-compiled/        # Compiled JavaScript (auto-generated)
├── debug/              # Debug environment
│   ├── index.html      # Debug dashboard
│   ├── mock-user.html  # Authenticated user simulation
│   ├── css/           # Debug-specific styles
│   └── js/            # Debug JavaScript
└── requirements/       # Project documentation
```

## 🚦 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Firebase CLI
- Modern web browser

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd english-dictionary-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Build TypeScript**

   ```bash
   npm run build
   ```

4. **Start development server**

   ```bash
   npm run serve
   ```

5. **Access the application**
   - Main app: http://localhost:5000/html/index.html
   - Sign-in: http://localhost:5000/html/signin.html
   - Debug environment: http://localhost:5000/debug/index.html

## 🛠️ Development

### Building the Project

```bash
# Build once
npm run build

# Build and watch for changes
npm run build:watch

# Development mode (build + watch)
npm run dev
```

### Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run build:watch` - Watch mode for development
- `npm run dev` - Development mode
- `npm run serve` - Start Firebase hosting locally
- `npm run deploy` - Deploy to Firebase hosting
- `npm run debug` - Build and open debug environment

### Firebase Tasks (VS Code)

Use VS Code tasks for Firebase operations:

- **Firebase Serve**: Start local development server
- **Firebase Deploy**: Deploy to production
- **Live Reload Dev Server**: Auto-reload on file changes

## 🐛 Debug Environment

The debug environment allows testing without Firebase connection:

### Debug Features

- **Mock Authentication**: Simulate sign-in/sign-out
- **Mock Data**: Test with realistic vocabulary data
- **State Simulation**: Test different app states
- **Error Simulation**: Test error handling
- **Performance Testing**: Test with large datasets

### Debug Pages

1. **Debug Dashboard** (`debug/index.html`)

   - Control panel for testing different states
   - Console output monitoring
   - Mock data management

2. **Mock User Page** (`debug/mock-user.html`)
   - Simulates authenticated user experience
   - Interactive vocabulary management
   - Real-time state changes

### Using Debug Environment

1. **Access Debug Dashboard**

   ```
   http://localhost:5000/debug/index.html
   ```

2. **Test Different States**

   - Click state buttons (Anonymous, Authenticated, Error, Loading)
   - Use control panel to simulate various scenarios
   - Monitor console output in real-time

3. **Mock User Testing**
   ```
   http://localhost:5000/debug/mock-user.html
   ```

## 🏗️ Architecture

### Authentication Flow

1. User clicks "Sign in with Google"
2. Firebase Auth handles OAuth flow
3. App receives user data
4. UI updates based on authentication state

### Data Flow

1. User performs action (add word, search, etc.)
2. TypeScript class handles business logic
3. Firebase operations execute
4. UI updates with new data
5. Logger records all operations

### Error Handling

- All operations wrapped in try-catch
- Comprehensive logging system
- User-friendly error messages
- Graceful fallbacks

## 📝 Coding Standards

### TypeScript Guidelines

- **Class-based Architecture**: All functionality in classes
- **Single Responsibility**: One class, one purpose
- **Mandatory Logging**: Log all significant operations
- **Error Handling**: Try-catch for all async operations
- **Type Safety**: Strict TypeScript configuration

### Code Structure Example

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

### Logging Requirements

- **Debug Level**: Development information
- **Info Level**: General application flow
- **Warn Level**: Potential issues
- **Error Level**: Actual problems
- **Conditional Logic**: Must have else for every if
- **Context Data**: Include relevant data in logs

## 🔧 Configuration

### Firebase Configuration

Update `js/firebase/firebase-config.ts` with your Firebase project settings:

```typescript
export const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
};
```

### TypeScript Configuration

The `tsconfig.json` is configured for:

- ES2020 target
- ES2020 modules
- Strict type checking
- Source maps for debugging

## 🚀 Deployment

### Firebase Hosting

1. **Build the project**

   ```bash
   npm run build
   ```

2. **Deploy to Firebase**

   ```bash
   npm run deploy
   ```

3. **Access your app**
   ```
   https://your-project-id.web.app
   ```

### Deployment Checklist

- [ ] TypeScript compiled successfully
- [ ] Firebase configuration updated
- [ ] Authentication enabled in Firebase Console
- [ ] Firestore rules configured
- [ ] All tests passing
- [ ] Debug mode disabled

## 📚 Future Enhancements

### Planned Features

- [ ] Dictionary search functionality
- [ ] Word management (add/edit/delete)
- [ ] Personal vocabulary lists
- [ ] Study modes and quizzes
- [ ] Progress tracking dashboard
- [ ] Offline capabilities
- [ ] Mobile app (React Native)
- [ ] API integrations (Oxford Dictionary, etc.)

### Technical Improvements

- [ ] Unit testing (Jest)
- [ ] End-to-end testing (Playwright)
- [ ] CI/CD pipeline
- [ ] Performance monitoring
- [ ] SEO optimization
- [ ] PWA features

## 🐛 Troubleshooting

### Common Issues

1. **TypeScript Compilation Errors**

   ```bash
   # Clean and rebuild
   rm -rf js-compiled/
   npm run build
   ```

2. **Firebase Connection Issues**

   - Check Firebase configuration
   - Verify project ID in `.firebaserc`
   - Ensure authentication is enabled

3. **Module Import Errors**

   - Check file paths in imports
   - Ensure files are compiled
   - Verify module resolution

4. **Authentication Not Working**
   - Check Google OAuth settings
   - Verify authorized domains
   - Test in debug environment first

### Debug Tips

- Use debug environment for testing
- Check browser console for errors
- Enable debug mode: `localStorage.setItem('debug-mode', 'true')`
- Use VS Code debugger with source maps

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow coding standards
4. Add tests for new features
5. Submit a pull request

## 📞 Support

For support and questions:

- Check the troubleshooting section
- Use the debug environment for testing
- Review the requirements documentation
- Check Firebase console for backend issues

---

**Happy Coding! 🚀**
