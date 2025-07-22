# Ứng Dụng Từ Điển Tiếng Anh

Ứng dụng web tra cứu từ điển tiếng Anh với các tính năng:
- Tra cứu nghĩa tiếng Việt
- Phát âm tiếng Anh-Anh và Anh-Mỹ (IPA)
- Phát âm thanh (audio)
- Định nghĩa và ví dụ tiếng Anh

## Cách sử dụng

1. Mở file `index.html` trong trình duyệt web
2. Nhập từ tiếng Anh cần tra cứu
3. Nhấn "Tra cứu" hoặc Enter
4. Xem kết quả hiển thị gồm:
   - Phiên âm IPA (UK và US)
   - Nghĩa tiếng Việt
   - Định nghĩa tiếng Anh
   - Ví dụ sử dụng
5. Nhấn nút 🔊 để nghe phát âm

## Công nghệ sử dụng

- **HTML5**: Cấu trúc trang web
- **CSS3**: Giao diện responsive và hiện đại
- **JavaScript ES6+**: Logic ứng dụng
- **Free Dictionary API**: Lấy dữ liệu từ điển tiếng Anh
- **MyMemory Translation API**: Dịch sang tiếng Việt

## Các API được sử dụng

1. **Free Dictionary API**: `https://dictionaryapi.dev/`
   - Miễn phí, không cần đăng ký
   - Cung cấp định nghĩa, phát âm, ví dụ

2. **MyMemory Translation API**: `https://mymemory.translated.net/`
   - Miễn phí, có giới hạn 1000 request/ngày
   - Dịch từ tiếng Anh sang tiếng Việt

## Tính năng

### ✅ Đã hoàn thành
- [x] Tra cứu từ tiếng Anh
- [x] Hiển thị phiên âm IPA (UK/US)
- [x] Phát âm thanh
- [x] Nghĩa tiếng Việt
- [x] Định nghĩa tiếng Anh
- [x] Ví dụ sử dụng
- [x] Giao diện responsive
- [x] Loading animation
- [x] Error handling

### 🚀 Có thể mở rộng
- [ ] Lưu lịch sử tìm kiếm
- [ ] Từ yêu thích
- [ ] Chế độ tối (Dark mode)
- [ ] Tìm kiếm gợi ý (Auto-complete)
- [ ] Offline mode với cache

## Cấu trúc file

```
/
├── index.html          # Trang chính
├── style.css          # CSS styling
├── script.js          # JavaScript logic
└── README.md          # Hướng dẫn này
```

## Hướng dẫn chạy

1. **Cách 1**: Mở trực tiếp file `index.html` trong trình duyệt

2. **Cách 2**: Sử dụng Live Server (nếu có VS Code)
   - Cài extension "Live Server"
   - Right-click vào `index.html` → "Open with Live Server"

3. **Cách 3**: Sử dụng Python HTTP Server
   ```bash
   cd /home/tiennd/git/study4
   python3 -m http.server 8000
   ```
   Sau đó truy cập: http://localhost:8000

## Lưu ý

- Cần kết nối internet để sử dụng API
- Một số từ có thể không có bản dịch tiếng Việt
- API miễn phí có thể có giới hạn requests
- Phát âm audio phụ thuộc vào dữ liệu từ API

## Demo từ khóa

Thử tìm kiếm các từ này: `hello`, `world`, `computer`, `beautiful`, `programming`
