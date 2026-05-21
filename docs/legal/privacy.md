# CHÍNH SÁCH BẢO MẬT

Cập nhật lần cuối: **Ngày 12 tháng 03 năm 2026**

Chính sách Bảo mật này mô tả cách thức **Công ty Titops DX4U** (đơn vị chủ quản, phát triển và vận hành nền tảng Vielora, sau đây gọi chung là "Titops DX4U" hoặc "chúng tôi") thu thập, sử dụng, lưu trữ và chia sẻ thông tin cá nhân của bạn khi bạn sử dụng nền tảng tạo chatbot AI Vielora, bao gồm bảng điều khiển quản trị (Dashboard) và mã nhúng hộp thoại trò chuyện (Widget) trên các trang web.

Chính sách này được xây dựng tuân thủ theo **Nghị định 13/2023/NĐ-CP** về Bảo vệ dữ liệu cá nhân của Chính phủ nước Cộng hòa Xã hội Chủ nghĩa Việt Nam.

_(Lưu ý pháp lý: Mọi trách nhiệm, cam kết và quy định xử lý dữ liệu gắn với nền tảng "Vielora" trong văn bản này đều do pháp nhân chủ quản là Công ty Titops DX4U trực tiếp thực thi và chịu trách nhiệm)._

## 1. Vai trò của Titops DX4U trong việc xử lý dữ liệu

Trong mô hình dịch vụ của nền tảng Vielora, trách nhiệm pháp lý của chúng tôi được phân định rõ như sau:

- **Đối với Chủ tài khoản (Khách hàng đăng ký nền tảng Vielora):** Chúng tôi hoạt động với tư cách là **"Bên Kiểm soát và Xử lý dữ liệu"**. Chúng tôi quyết định việc thu thập thông tin tài khoản và thanh toán của bạn để cung cấp dịch vụ.
- **Đối với Người dùng cuối (Khách truy cập chat qua Widget):** Khách hàng của Vielora (chủ website) là "Bên Kiểm soát dữ liệu". Titops DX4U chỉ đóng vai trò là **"Bên Xử lý dữ liệu"**. Chúng tôi chỉ xử lý dữ liệu cuộc trò chuyện thay mặt và theo cấu hình của chủ website. Chủ website có trách nhiệm thông báo và xin phép người dùng cuối của họ.

## 2. Các loại dữ liệu chúng tôi thu thập

### 2.1. Dữ liệu từ Chủ tài khoản (Khách hàng B2B)

- **Thông tin định danh:** Họ tên, địa chỉ email thông qua hệ thống Supabase Auth.
- **Dữ liệu thanh toán:** Lịch sử giao dịch, gói dịch vụ (subscriptions). Quá trình thanh toán thực tế được mã hóa và xử lý trực tiếp bởi đối tác payOS. Chúng tôi không lưu trữ số thẻ tín dụng hoặc thông tin ngân hàng gốc của bạn.
- **Dữ liệu truy vấn cho Bot (Knowledge Base):** Các đường dẫn URL, nội dung mã HTML được cào (scraped content), hoặc nội dung văn bản bạn chủ động cung cấp để làm cơ sở tri thức cho chatbot.

### 2.2. Dữ liệu từ Người dùng cuối (Thông qua Chat Widget)

- **Định danh thiết bị:** Chúng tôi sử dụng FingerprintJS để tạo mã định danh duy nhất nhằm mục đích quản lý giới hạn tin nhắn và nhận diện các cuộc hội thoại cũ.
- **Dữ liệu cuộc trò chuyện:** Nội dung các tin nhắn được gửi qua Widget và các câu trả lời do AI tạo ra.
- **Dữ liệu kỹ thuật:** Địa chỉ IP truy cập, tên miền website nơi widget được nhúng nhằm mục đích bảo mật chống DDoS và xác thực CORS.
- **Dữ liệu từ plugin WordPress Vielora Chatbot:** Khi chủ website nhập Bot ID và kích hoạt plugin, website sẽ tải mã widget từ `https://vielora.vn/widget.js`. Plugin truyền Bot ID đã cấu hình để Vielora xác định đúng chatbot cần hiển thị. Khi khách truy cập tương tác với widget, nội dung tin nhắn, thông tin kỹ thuật và dữ liệu nhận diện cuộc hội thoại có thể được gửi về hệ thống Vielora để xử lý phản hồi chatbot.

## 3. Mục đích sử dụng dữ liệu

Chúng tôi xử lý dữ liệu cá nhân của bạn để:

1. Cung cấp, duy trì và cải thiện hiệu suất của mô hình tìm kiếm ngữ nghĩa.
2. Quản lý tính phí tín dụng dựa trên số lượng trang được lập chỉ mục và số tin nhắn đã xử lý.
3. Ngăn chặn lạm dụng, gian lận, tấn công lưu lượng (DDoS).
4. Cung cấp báo cáo thống kê cho chủ website trong Dashboard.

## 4. Cam kết bảo mật về Trí tuệ Nhân tạo

Chúng tôi hiểu sự lo ngại của bạn về việc dữ liệu bị đem đi huấn luyện AI. Titops DX4U cam kết rõ ràng:

- Dữ liệu tri thức và lịch sử trò chuyện của bạn **chỉ được sử dụng để cung cấp ngữ cảnh** phục vụ việc trả lời câu hỏi trực tiếp.
- Chúng tôi **TUYỆT ĐỐI KHÔNG** sử dụng dữ liệu kinh doanh của bạn để huấn luyện các mô hình ngôn ngữ lớn nền tảng của chúng tôi hoặc của Google.

## 5. Chia sẻ dữ liệu với Bên thứ ba

Để cung cấp dịch vụ liền mạch, chúng tôi có sử dụng hạ tầng của các đối tác công nghệ đáng tin cậy. Các đối tác này bị ràng buộc bởi các thỏa thuận bảo mật nghiêm ngặt:

- **Google (Google Gemini):** Dữ liệu văn bản cào được và tin nhắn chat được gửi qua API của Google để tạo Vector Embeddings (gemini-embedding-001) và tạo câu trả lời (gemini-2.5-flash-lite).
- **Supabase:** Hạ tầng cơ sở dữ liệu (PostgreSQL) và dịch vụ lưu trữ (Storage) chứa toàn bộ dữ liệu ứng dụng.
- **payOS:** Cổng thanh toán nội địa xử lý các giao dịch mua gói dịch vụ và Tín dụng.

Chúng tôi không bán hoặc cho thuê dữ liệu cá nhân của bạn cho bất kỳ bên thứ ba nào vì mục đích quảng cáo hoặc tiếp thị.

## 6. Lưu trữ và Bảo vệ dữ liệu

- Dữ liệu của bạn được lưu trữ trên các máy chủ đám mây an toàn.
- Dữ liệu hội thoại, dữ liệu bot và dữ liệu kỹ thuật được lưu trữ trong thời gian cần thiết để cung cấp dịch vụ, phục vụ bảo mật, xử lý khiếu nại, tuân thủ nghĩa vụ pháp lý hoặc cho đến khi chủ tài khoản yêu cầu xóa theo các chức năng có sẵn trên Dashboard.
- Việc trừ Tín dụng (Credits) được bảo vệ bằng cơ chế khóa để ngăn chặn các cuộc tấn công khai thác lỗ hổng xử lý đồng thời.
- Các Worker cào dữ liệu (Scraper) hoạt động trong môi trường độc lập, cô lập để đảm bảo không rò rỉ bộ nhớ hoặc dữ liệu chéo giữa các khách hàng.

## 7. Quyền của Chủ thể dữ liệu

Căn cứ theo quy định của pháp luật, bạn có các quyền sau:

1. **Quyền truy cập và yêu cầu xóa:** Bạn có thể xem, tải xuống, hoặc xóa thủ công các cuộc hội thoại, tài liệu, và toàn bộ thông tin tài khoản của mình ngay trên giao diện Dashboard.
2. **Quyền hạn chế xử lý:** Bạn có thể sử dụng tính năng Tắt/bật chatbot thủ công trên Dashboard để ngay lập tức tạm dừng việc chatbot xử lý dữ liệu và phản hồi người dùng trên website của bạn.

## 8. Thay đổi Chính sách Bảo mật

Chúng tôi có thể cập nhật Chính sách này để phản ánh các thay đổi về công nghệ, pháp lý hoặc hoạt động kinh doanh. Chúng tôi sẽ thông báo cho bạn qua email hoặc qua thông báo trực tiếp trên Dashboard trước khi các thay đổi quan trọng có hiệu lực.

## 9. Thông tin liên hệ

Nếu bạn có bất kỳ câu hỏi, khiếu nại hoặc yêu cầu nào liên quan đến quyền riêng tư và bảo vệ dữ liệu trên nền tảng Vielora, vui lòng liên hệ với đơn vị chủ quản:

**Công ty Titops DX4U**

- **Email hỗ trợ:** contact@vielora.vn
