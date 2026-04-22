# Hướng dẫn nạp danh sách Nhiệm vụ (Mission Pool)

Tôi đã tạo sẵn 15 nhiệm vụ mẫu với các mức độ Dễ, Trung bình, Khó khác nhau. Bạn hãy chạy script này để nạp chúng vào Database của mình:

### 1. Cài đặt thư viện cần thiết (nếu chưa có)
Mở terminal tại thư mục `Backend` và chạy:
```bash
npm install uuid
```

### 2. Chạy script Seeder
Tạo một file tạm tên là `runSeed.js` trong thư mục `Backend` với nội dung:

```javascript
const seed = require('./seedMissions');
const mongoUri = 'mongodb+srv://khongduocdau456:khongduocdau456@wordsrise.kvelvt0.mongodb.net/WordsRise';

seed(mongoUri).then(() => {
    console.log('Xong!');
    process.exit(0);
});
```

Sau đó chạy lệnh:
```bash
node runSeed.js
```

### 3. Kết quả
Sau khi chạy xong, mỗi ngày khi người dùng mở App, Server sẽ tự động chọn ngẫu nhiên 3 nhiệm vụ từ danh sách này để giao cho họ. Bạn có thể thêm bớt nhiệm vụ trong file `seedMissions.js` tùy thích!
