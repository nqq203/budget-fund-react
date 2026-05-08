# Quản lý quỹ thu chi cá nhân

Project ReactJS dùng Ant Design, lưu dữ liệu trực tiếp bằng `localStorage` trên trình duyệt của người dùng.

## Tính năng

- Tạo nhiều quỹ: Quỹ ăn, Quỹ đi chơi, Quỹ tiền xăng...
- Mỗi quỹ có số tiền ban đầu, mô tả và màu nhận diện.
- Ghi khoản chi theo ngày để trừ tiền khỏi quỹ.
- Ghi khoản thu / nạp thêm để cộng thêm vào quỹ.
- Xem tổng ban đầu, tổng thu thêm, tổng đã chi và tổng còn lại của tất cả quỹ.
- Xem chi tiết từng quỹ, lịch sử giao dịch và tổng hợp thu/chi theo ngày.
- Tự động lưu vào `localStorage`, reload trang không mất dữ liệu.
- Có xuất / nhập dữ liệu JSON để sao lưu thủ công.
- Responsive cho desktop, laptop, tablet và mobile.

## Cài đặt

```bash
npm install
npm run dev
```

Sau đó mở đường dẫn local mà Vite hiển thị, thường là:

```bash
http://localhost:5173
```

## Build production

```bash
npm run build
npm run preview
```

## Lưu ý về dữ liệu

Dữ liệu chỉ nằm trong `localStorage` của trình duyệt hiện tại. Nếu mở trên thiết bị khác hoặc trình duyệt khác thì sẽ không có dữ liệu cũ, trừ khi bạn xuất JSON rồi nhập lại.
