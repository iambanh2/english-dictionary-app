# Trang Quản Lý Từ Vựng - Eng### Danh Sách Từ Vựng

Hiển thị dạng cards với thông tin:

- **Từ tiếng Anh** (to lớn)
- **Nghĩa tiếng Việt**
- **Phiên âm với phát âm**:
  - 🇬🇧 /kæt/ [🔊] (British + Audio)
  - 🇺🇸 /kæt/ [🔊] (American + Audio)
  - 🇦🇺 /kæt/ [🔊] (Australian + Audio, nếu có)
- **Từ loại**: noun, verb, adjective...
- **Định nghĩa**: A small domesticated animal
- **Ví dụ**:
  - 🇬🇧 "The cat is sleeping"
  - 🇻🇳 "Con mèo đang ngủ" (bản dịch)
- **Nút**: [✏️ Sửa] [🗑️ Xóa]nary App

## 📝 Mục Đích

Trang này cho phép người dùng:

- Xem tất cả từ vựng trong 1 chủ đề cụ thể
- Thêm từ mới bằng Dictionary API
- Chỉnh sửa và xóa từ
- Nghe phát âm của từ

## 🎨 Giao Diện

### Header (Đầu trang)

```
← Back to Categories  |  ← Back to Home     [👋 User Name] [Sign Out]
Words in [Tên Chủ Đề]
```

### Thông Tin Chủ Đề

```
📚 [Icon] Animals
"Learn about different animals"
25 words in this category
[➕ Add New Word]
```

### Danh Sách Từ Vựng

Hiển thị dạng cards với thông tin:

- **Từ tiếng Anh** (to lớn)
- **Nghĩa tiếng Việt**
- **Phiên âm**: 🇬🇧 /kæt/ | 🇺🇸 /kæt/
- **Từ loại**: noun, verb, adjective...
- **Định nghĩa**: A small domesticated animal
- **Ví dụ**: "The cat is sleeping"
- **Nút**: [� Nghe] [✏️ Sửa] [🗑️ Xóa]

### Form Thêm Từ Mới

```
[English word...] [🔍 Look Up & Translate]
[Vietnamese translation...] (tự động từ API, có thể chỉnh sửa)
[🇬🇧 British pronunciation...] [🔊] [🇺🇸 American pronunciation...] [🔊]
[🇦🇺 Australian pronunciation...] [🔊] (nếu có từ API)
[Part of speech...]
[Definition...]
[Example sentence...]
[Vietnamese example translation...] (tự động dịch)
[Save Word] [Cancel]
```

## 🔧 Chức Năng Chính

### 1. Xem Danh Sách Từ

- Tải từ vựng theo chủ đề từ URL: `?categoryId=abc123`
- Cập nhật real-time khi có thay đổi
- Tìm kiếm từ trong danh sách
- Hiển thị thông báo khi chưa có từ nào

### 2. Thêm Từ Mới (Dictionary API + Translation API)

```
Bước 1: Nhập từ tiếng Anh → Click "🔍 Look Up"
Bước 2: Gọi Dictionary API → Tự động điền thông tin tiếng Anh
Bước 3: Gọi Translation API → Tự động dịch nghĩa tiếng Việt
Bước 4: Người dùng có thể chỉnh sửa nghĩa tiếng Việt
Bước 5: Click "Save" → Lưu vào database
```

**API sử dụng**:

- **Dictionary API**: https://api.dictionaryapi.dev/api/v2/entries/en/{word}
- **MyMemory Translation API**: https://api.mymemory.translated.net/get?q={text}&langpair=en|vi

### 3. Chỉnh Sửa Từ

- Click nút ✏️ → Chỉnh sửa trực tiếp
- Có thể tra lại Dictionary API
- Lưu hoặc hủy thay đổi

### 4. Xóa Từ

- Click nút 🗑️ → Hiện hộp thoại xác nhận
- Xác nhận → Xóa khỏi database

### 5. Phát Âm Đa Ngôn Ngữ

- **British English**: Click nút 🔊 → Phát âm thanh từ API (ưu tiên)
- **American English**: Click nút 🔊 → Phát âm thanh từ API
- **Australian English**: Click nút 🔊 → Phát âm thanh từ API (nếu có)
- **Fallback**: Nếu không có audio → Dùng Web Speech API hoặc text-to-speech

### 6. Dịch Tự Động

- **Nghĩa từ**: Tự động dịch định nghĩa từ tiếng Anh sang tiếng Việt
- **Ví dụ**: Tự động dịch câu ví dụ từ tiếng Anh sang tiếng Việt
- **Chỉnh sửa**: Người dùng có thể chỉnh sửa bản dịch tự động

## 💾 Cấu Trúc Dữ Liệu

### Đối Tượng Word

```typescript
interface Word {
  id: string; // ID duy nhất
  categoryId: string; // ID chủ đề
  englishWord: string; // Từ tiếng Anh
  vietnameseTranslation: string; // Nghĩa tiếng Việt (từ API + chỉnh sửa)
  britishPronunciation: string; // Phiên âm Anh: /kæt/
  americanPronunciation: string; // Phiên âm Mỹ: /kæt/
  australianPronunciation?: string; // Phiên âm Úc: /kæt/ (tùy chọn)
  partOfSpeech: string; // Từ loại: noun, verb...
  definition: string; // Định nghĩa tiếng Anh
  vietnameseDefinition?: string; // Định nghĩa tiếng Việt (dịch tự động)
  example?: string; // Ví dụ tiếng Anh
  vietnameseExample?: string; // Ví dụ tiếng Việt (dịch tự động)
  audioUrls: {
    // Các link âm thanh
    british?: string;
    american?: string;
    australian?: string;
  };
  createdAt: Date; // Ngày tạo
  updatedAt: Date; // Ngày cập nhật
  userId: string; // ID người dùng
}
```

### Phản Hồi Dictionary API

```typescript
interface DictionaryAPIResponse {
  word: string;
  phonetics: {
    text: string; // Phiên âm IPA
    audio: string; // Link âm thanh
    sourceUrl?: string; // Nguồn âm thanh
  }[];
  meanings: {
    partOfSpeech: string;
    definitions: {
      definition: string;
      example?: string;
    }[];
  }[];
}
```

### Phản Hồi MyMemory Translation API

```typescript
interface MyMemoryResponse {
  responseData: {
    translatedText: string; // Văn bản đã dịch
    match: number; // Độ chính xác (0-1)
  };
  quotaFinished: boolean; // Hết quota chưa
  responseStatus: number; // Status code
}
```

## � API Integration

### Dictionary API

- **URL**: https://api.dictionaryapi.dev/api/v2/entries/en/{word}
- **Method**: GET
- **Rate Limit**: Không giới hạn (miễn phí)
- **Response**: JSON với phonetics, meanings, definitions, examples

### MyMemory Translation API

- **URL**: https://api.mymemory.translated.net/get
- **Method**: GET
- **Parameters**:
  - `q`: Text cần dịch
  - `langpair`: Cặp ngôn ngữ (ví dụ: en|vi)
- **Rate Limit**: 1000 requests/ngày (miễn phí)
- **Response**: JSON với translatedText

### Audio Processing

- **Ưu tiên**: Sử dụng audio URL từ Dictionary API
- **Fallback**: Web Speech API (speechSynthesis)
- **Format**: MP3, WAV, OGG
- **Caching**: Lưu cache audio để tăng tốc độ

## �🔧 Kỹ Thuật

### Files

- **HTML**: `html/words.html`
- **CSS**: `css/words.css`
- **TypeScript**: `js/words/words.ts`

### URL

- **Định dạng**: `/words?categoryId=abc123`

### Database (Firestore)

```
users/{userId}/words/{wordId} = {
  categoryId: "abc123",
  englishWord: "cat",
  vietnameseTranslation: "con mèo",
  britishPronunciation: "/kæt/",
  americanPronunciation: "/kæt/",
  australianPronunciation: "/kæt/",
  partOfSpeech: "noun",
  definition: "A small domesticated animal",
  vietnameseDefinition: "Một loài động vật nhỏ được thuần hóa",
  example: "The cat is sleeping",
  vietnameseExample: "Con mèo đang ngủ",
  audioUrls: {
    british: "https://audio-uk.mp3",
    american: "https://audio-us.mp3",
    australian: "https://audio-au.mp3"
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Chức Năng TypeScript Chính

```typescript
class WordsManager {
  // Lấy từ vựng theo chủ đề
  async getWordsByCategory(categoryId: string): Promise<Word[]>;

  // Tra từ điển
  async lookupWordInDictionary(word: string): Promise<DictionaryAPIResponse>;

  // Dịch văn bản
  async translateText(
    text: string,
    fromLang: string = "en",
    toLang: string = "vi"
  ): Promise<string>;

  // Tra từ và dịch tự động
  async lookupAndTranslate(word: string): Promise<{
    dictionaryData: DictionaryAPIResponse;
    vietnameseTranslation: string;
    vietnameseDefinition?: string;
    vietnameseExample?: string;
  }>;

  // Thêm từ mới
  async createWord(wordData: Partial<Word>): Promise<Word>;

  // Cập nhật từ
  async updateWord(id: string, updates: Partial<Word>): Promise<void>;

  // Xóa từ
  async deleteWord(id: string): Promise<void>;

  // Phát âm thanh theo accent
  async playAudioPronunciation(
    audioUrl: string,
    accent: "british" | "american" | "australian"
  ): Promise<void>;

  // Cập nhật số lượng từ trong chủ đề
  async updateCategoryWordCount(categoryId: string): Promise<void>;

  // Phân loại phonetics theo accent
  private categorizePhonetics(phonetics: any[]): {
    british?: any;
    american?: any;
    australian?: any;
  };
}
```

## ✅ Kiểm Tra Dữ Liệu

### Validation

- **Từ tiếng Anh**: Bắt buộc, tối đa 100 ký tự
- **Nghĩa tiếng Việt**: Tự động từ API, có thể chỉnh sửa, tối đa 200 ký tự
- **Phiên âm**: Tùy chọn, tối đa 50 ký tự mỗi loại
- **Định nghĩa**: Tùy chọn, tối đa 500 ký tự
- **Ví dụ**: Tùy chọn, tối đa 300 ký tự
- **Bản dịch**: Tự động từ API, có thể chỉnh sửa

### Security Rules (Firestore)

```javascript
// Chỉ cho phép người dùng truy cập từ vựng của chính họ
match /users/{userId}/words/{wordId} {
  allow read, write: if request.auth != null &&
                    request.auth.uid == userId;
}
```

## 🚀 Tính Năng Tương Lai

- Import từ vựng từ file Excel/CSV
- Quiz/flashcard để học từ
- Theo dõi tiến độ học
- Xuất dữ liệu ra file
- Chế độ offline
- Hỗ trợ thêm ngôn ngữ khác (Trung, Nhật, Hàn...)
- Tích hợp AI để gợi ý từ vựng liên quan
- Phân tích độ khó của từ vựng
- Chế độ học theo cấp độ (beginner, intermediate, advanced)
