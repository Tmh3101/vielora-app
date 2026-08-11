**Mục đích**: Tài liệu bàn giao cho team tester — đặc tả nghiệp vụ toàn hệ thống để tester **tự viết test case**. Không phải test catalog thực thi sẵn.

**Quy ước**:

- ✅ = hành động/điều kiện cần thực hiện
- **Kết quả mong đợi** = hành vi hệ thống khi thao tác đúng — tester dùng làm căn cứ viết expected result
- **Trường hợp ngoại lệ** = các tình huống lỗi/ngoài luồng cần phủ trong test case
- Hệ thống có **2 loại quyền**: **Chủ sở hữu (Owner)** và **Quản trị viên (Admin)** — chỉ Chủ sở hữu mới mời được thành viên
- 📷 **Ảnh minh họa** = vị trí chèn hình chụp màn hình tương ứng — tester/BA chụp ảnh thực tế rồi **thay thế dòng này bằng hình** (xóa dòng text sau khi chèn)

---

# MÔI TRƯỜNG KIỂM THỬ

| Hạng mục                  | Giá trị                                     | Ghi chú                                 |
| ------------------------- | ------------------------------------------- | --------------------------------------- |
| URL môi trường test       | **[ĐIỀN URL TEST]**                         | Ví dụ: https://dev-vielora.vercel.app   |
| URL môi trường production | https://vielora.vn                          | Chỉ test đọc, không tạo dữ liệu         |
| Trình duyệt (Desktop)     | Chrome (bản mới nhất), Firefox, Edge        | Test cross-browser cho các luồng chính  |
| Trình duyệt (Mobile)      | Chrome Android, Safari iOS                  | Chỉ bắt buộc cho F31 (voice), F56 (PWA) |
| Thanh toán                | **[ĐIỀN: Sandbox PayOS / Môi trường thật]** | Ảnh hưởng F39, F40, F44-F46             |
| Hóa đơn điện tử           | **[ĐIỀN: EasyInvoice test / thật]**         | Ảnh hưởng F44-F46                       |
| Email nhận                | **[ĐIỀN: hộp thư test nhận email]**         | Dùng cho F01, F04, F09, F47-F51         |

# TÀI KHOẢN GỢI Ý

> Tester nên tự tạo tài khoản riêng khi cần; các tài khoản dưới đây dùng chung cho team.

| Tài khoản | Vai trò                          | Email            | Mật khẩu            | Mục đích                                  |
| --------- | -------------------------------- | ---------------- | ------------------- | ----------------------------------------- |
| Tester A  | Chủ sở hữu (Owner)               | **[ĐIỀN EMAIL]** | **[ĐIỀN MẬT KHẨU]** | Tạo workspace, mời thành viên, thanh toán |
| Tester B  | Quản trị viên (Admin)            | **[ĐIỀN EMAIL]** | **[ĐIỀN MẬT KHẨU]** | Kiểm tra phân quyền, nhận lời mời         |
| Tester C  | Người ngoài (chưa là thành viên) | **[ĐIỀN EMAIL]** | **[ĐIỀN MẬT KHẨU]** | Test từ chối truy cập, lời mời hết hạn    |

# LỊCH SỬ THAY ĐỔI

| Phiên bản | Ngày       | Tác giả    | Người duyệt | Thay đổi                                                                                |
| --------- | ---------- | ---------- | ----------- | --------------------------------------------------------------------------------------- |
| 1.0       | 26/07/2026 | [ĐIỀN TÊN] | [ĐIỀN TÊN]  | Bản đầu — phong cách kỹ thuật                                                           |
| 2.0       | 26/07/2026 | [ĐIỀN TÊN] | [ĐIỀN TÊN]  | Viết lại theo nghiệp vụ, bỏ jargon kỹ thuật                                             |
| 3.0       | 26/07/2026 | [ĐIỀN TÊN] | [ĐIỀN TÊN]  | Bổ sung môi trường/tài khoản, tình huống thiếu, quy tắc nghiệp vụ chính xác             |
| 4.0       | 26/07/2026 | [ĐIỀN TÊN] | [ĐIỀN TÊN]  | Nâng cấp bố cục chuẩn doanh nghiệp: trang bìa, mục lục, header/footer, phân cấp heading |
| 4.1       | 09/08/2026 | [ĐIỀN TÊN] | [ĐIỀN TÊN]  | Bổ sung Cách C — Tạo bot hàng loạt từ CSV vào F13, rút gọn bố cục                       |

---

# NHÓM 1 — TÀI KHOẢN VÀ ĐĂNG NHẬP

## F01. Đăng ký tài khoản

**Mô tả**: Khách hàng tạo tài khoản mới bằng email và mật khẩu trên trang Đăng ký.

**Thao tác kiểm thử**:

1. Mở trang Đăng ký (`/auth`, chuyển sang tab "Đăng ký").
2. Nhập email, mật khẩu, xác nhận mật khẩu, họ tên.
3. Nhấn nút Đăng ký.

**Yêu cầu nhập liệu**:

| Trường            | Bắt buộc | Quy tắc                                                       |
| ----------------- | :------: | ------------------------------------------------------------- |
| Email             |    ✅    | Đúng định dạng email                                          |
| Mật khẩu          |    ✅    | Tối thiểu 8 ký tự, có chữ hoa, chữ thường, số, ký tự đặc biệt |
| Xác nhận mật khẩu |    ✅    | Giống mật khẩu đã nhập                                        |
| Họ tên            |    ✅    | Tối thiểu 2 ký tự                                             |

**Kết quả mong đợi**: Hiển thị màn hình "Đăng ký thành công! Kiểm tra email để xác nhận tài khoản". Người dùng nhận được email xác nhận.

**Trường hợp ngoại lệ**:

- Email đã được đăng ký → báo lỗi "Email này đã được đăng ký", không tạo tài khoản.
- Mật khẩu không đủ mạnh → hiện lỗi ngay tại ô mật khẩu.
- Xác nhận mật khẩu không khớp → báo "Mật khẩu xác nhận không khớp".
- Email sai định dạng → báo "Email không hợp lệ".

📷 **Ảnh minh họa**: Trang Đăng ký (tab Đăng ký, form đầy đủ: email, mật khẩu, xác nhận, họ tên) + màn hình "Đăng ký thành công! Kiểm tra email" — chụp màn hình và thay thế dòng này bằng hình.

## F02. Đăng nhập

**Mô tả**: Khách hàng đăng nhập bằng email và mật khẩu.

**Thao tác kiểm thử**:

1. Mở trang Đăng nhập (`/auth`).
2. Nhập email, mật khẩu đúng.
3. Nhấn nút Đăng nhập.

**Kết quả mong đợi**: Chuyển vào màn hình quản trị (Dashboard), tự động mở workspace đầu tiên của tài khoản. Có thông báo đăng nhập thành công.

**Trường hợp ngoại lệ**:

- Sai email hoặc mật khẩu → báo "Mật khẩu không chính xác" kèm số lần thử còn lại.
- Nhập sai **5 lần liên tiếp** → tạm khóa 60 giây. Nếu tiếp tục sai sau đó, thời gian khóa tăng dần: **5 phút, rồi 30 phút**. Hết thời gian khóa mới đăng nhập lại được. Cần test cả 3 mức khóa.
- Tài khoản chưa xác nhận email → yêu cầu xác nhận email trước.
- Tài khoản bị khóa → hiển thị màn hình "Tài khoản đã bị khóa" kèm lý do.

📷 **Ảnh minh họa**: Trang Đăng nhập + thông báo lỗi "Mật khẩu không chính xác" kèm số lần thử còn lại — chụp màn hình và thay thế dòng này bằng hình.

## F03. Đăng nhập bằng Google / GitHub

**Mô tả**: Đăng nhập nhanh không cần mật khẩu bằng tài khoản Google hoặc GitHub.

**Thao tác kiểm thử**:

1. Mở trang Đăng nhập.
2. Nhấn nút "Đăng nhập với Google" (hoặc GitHub).
3. Đăng nhập tài khoản Google/GitHub.

**Kết quả mong đợi**: Tự động đăng nhập và vào Dashboard. Tài khoản mới được nhận email chào mừng.

**Trường hợp ngoại lệ**:

- Hủy đăng nhập tại trang Google/GitHub → quay lại trang đăng nhập, có thông báo đã hủy.
- Lỗi từ Google/GitHub → thông báo không thể đăng nhập, đề nghị thử lại.

📷 **Ảnh minh họa**: Trang Đăng nhập — khu vực 2 nút "Đăng nhập với Google" / "Đăng nhập với GitHub" — chụp màn hình và thay thế dòng này bằng hình.

## F04. Quên mật khẩu

**Mô tả**: Khách hàng quên mật khẩu, tự đặt lại qua email.

**Thao tác kiểm thử**:

1. Tại trang Đăng nhập, nhấn "Quên mật khẩu".
2. Nhập email.
3. Mở email, nhấn link đặt lại mật khẩu.
4. Nhập mật khẩu mới.

**Kết quả mong đợi**: Email chứa link đặt lại mật khẩu được gửi. Đặt mật khẩu mới xong có thể đăng nhập bằng mật khẩu mới.

**Trường hợp ngoại lệ**:

- Link đặt lại hết hạn hoặc không hợp lệ → không thể đặt lại mật khẩu, yêu cầu thực hiện lại.

📷 **Ảnh minh họa**: Form quên mật khẩu (nhập email) + email chứa link đặt lại mật khẩu — chụp màn hình và thay thế dòng này bằng hình.

## F05. Tài khoản bị khóa

**Mô tả**: Tài khoản vi phạm chính sách sẽ bị khóa bởi quản trị hệ thống.

**Kết quả mong đợi**: Khi vào Dashboard, hiển thị màn hình "Tài khoản đã bị khóa" kèm lý do và email liên hệ hỗ trợ.

**Ghi chú cho tester**: Tester không tự tạo được tài khoản bị khóa — **liên hệ quản trị hệ thống (admin) để khóa tạm một tài khoản test** trước khi chạy case này.

---

# NHÓM 2 — KHÔNG GIAN LÀM VIỆC (WORKSPACE)

> **Khái niệm**: Mỗi khách hàng doanh nghiệp có một "không gian làm việc" (workspace) riêng. Mọi chatbot, gói cước, credits, thành viên đều thuộc về một workspace. Đường dẫn vào workspace: `vielora.vn/ten-workspace`.

📷 **Ảnh minh họa**: Màn hình "Tài khoản đã bị khóa" kèm lý do — chụp màn hình và thay thế dòng này bằng hình.

## F06. Tạo workspace mới

**Mô tả**: Khách hàng tạo không gian làm việc riêng để quản lý chatbot của mình.

**Thao tác kiểm thử**:

1. Nhấn vào tên workspace ở góc trái (hoặc menu trên điện thoại) → chọn "Tạo Workspace mới".
2. Nhập tên workspace.
3. Kiểm tra đường dẫn (slug) tự động sinh từ tên — có thể sửa.
4. Nhấn "Tạo Workspace".

**Yêu cầu nhập liệu**:

| Trường           | Bắt buộc | Quy tắc                        |
| ---------------- | :------: | ------------------------------ |
| Tên workspace    |    ✅    | Tối thiểu 2 ký tự              |
| Đường dẫn (slug) |    ✅    | Chữ thường, số, dấu gạch ngang |

**Kết quả mong đợi**: Tạo xong tự chuyển vào workspace mới. Tối đa được tạo 5 workspace cho một tài khoản.

**Trường hợp ngoại lệ**:

- Đường dẫn bị trùng với workspace khác → hiện các gợi ý đường dẫn thay thế để chọn (ví dụ thêm số -1, -2).
- Đã đạt 5 workspace → không tạo thêm được, có thông báo.

📷 **Ảnh minh họa**: Dialog "Tạo Workspace mới" (tên + slug tự sinh) + trường hợp slug trùng hiện gợi ý — chụp màn hình và thay thế dòng này bằng hình.

## F07. Chuyển đổi workspace

**Mô tả**: Khách hàng có nhiều workspace, chuyển qua lại bằng menu chọn.

**Thao tác kiểm thử**: Nhấn vào tên workspace hiện tại → chọn workspace khác trong danh sách.

**Kết quả mong đợi**: Chuyển sang workspace đã chọn; toàn bộ nội dung (chatbot, số dư credits, gói cước) đổi theo workspace tương ứng. Workspace đang dùng có dấu tích.

**Trường hợp ngoại lệ / tình huống cần phủ**:

- **Cô lập dữ liệu giữa các workspace (bắt buộc test)**: Tạo bot A trong workspace A, bot B trong workspace B → vào workspace A chỉ thấy bot A, vào workspace B chỉ thấy bot B. Không có bot nào xuất hiện nhầm ở workspace khác.
- Đường dẫn URL đổi theo workspace (ví dụ `/ws-a` → `/ws-b`) khi chuyển.

📷 **Ảnh minh họa**: Dropdown chuyển workspace (danh sách workspace + dấu tích workspace đang dùng) — chụp màn hình và thay thế dòng này bằng hình.

## F08. Sửa thông tin workspace

**Mô tả**: Đổi tên hoặc đường dẫn workspace.

**Kết quả mong đợi**: Tên/đường dẫn mới được lưu; toàn bộ liên kết nội bộ cập nhật theo đường dẫn mới.

**Trường hợp ngoại lệ**:

- Sau khi đổi đường dẫn, không được đổi lại ngay (có thời gian chờ 30 ngày).
- Đường dẫn trùng với workspace khác → báo lỗi.

**Ghi chú cho tester**: Test **xóa workspace** (nếu có nút xóa trong phần sửa): sau khi xóa, workspace không còn trong danh sách chuyển đổi; các thành viên không còn thấy workspace. — _[XÁC NHẬN: kiểm tra UI hiện tại có nút xóa workspace không — nếu chưa có, bỏ qua tình huống này]_

📷 **Ảnh minh họa**: Form sửa thông tin workspace (đổi tên/slug) — chụp màn hình và thay thế dòng này bằng hình.

## F09. Mời thành viên vào workspace

**Mô tả**: Chủ sở hữu mời đồng nghiệp vào cùng quản lý workspace qua email.

**Thao tác kiểm thử**:

1. Vào mục "Thành viên" trong menu bên trái.
2. Nhấn "Mời thành viên".
3. Nhập email người được mời.
4. Chọn quyền: **Chủ sở hữu (Owner)** hoặc **Quản trị viên (Admin)**.
5. Gửi lời mời.

**Kết quả mong đợi**: Người được mời nhận email chứa link chấp nhận lời mời. Lời mời hiển thị trong danh sách "Đang chờ chấp nhận" trên trang Thành viên. Mỗi ngày mời tối đa 10 người.

**Trường hợp ngoại lệ**:

- Đã gửi lời mời cho email này rồi → báo "đã gửi lời mời trước đó".
- Email đã là thành viên → báo "đã là thành viên".
- Người gửi không phải Chủ sở hữu → không được phép mời (nút chức năng không hoạt động hoặc báo lỗi).

📷 **Ảnh minh họa**: Modal "Mời thành viên" (email + chọn quyền Owner/Admin) — chụp màn hình và thay thế dòng này bằng hình.

## F10. Chấp nhận lời mời

**Mô tả**: Người được mời nhấn link trong email để gia nhập workspace.

**Thao tác kiểm thử**:

1. Mở email mời → nhấn link "Chấp nhận lời mời".
2. Nếu chưa đăng nhập → đăng nhập tài khoản.
3. Xác nhận gia nhập.

**Kết quả mong đợi**: Gia nhập workspace thành công và được đưa vào Dashboard của workspace đó.

**Trường hợp ngoại lệ**:

- Link sai hoặc hết hạn (quá 7 ngày) → hiển thị thông báo lời mời không hợp lệ hoặc đã hết hạn.
- Tài khoản đã ở 5 workspace → không gia nhập thêm được.

📷 **Ảnh minh họa**: Trang chấp nhận lời mời (accept-invite) — trạng thái thành công — chụp màn hình và thay thế dòng này bằng hình.

## F11. Danh sách thành viên

**Mô tả**: Trang Thành viên hiển thị danh sách người trong workspace (tên, email, quyền) và danh sách lời mời đang chờ.

**Kết quả mong đợi**: Thấy đầy đủ thành viên + lời mời chưa chấp nhận kèm trạng thái.

📷 **Ảnh minh họa**: Trang Thành viên — danh sách thành viên active + mục lời mời đang chờ — chụp màn hình và thay thế dòng này bằng hình.

## F12. Xóa thành viên / Thu hồi lời mời

**Mô tả**: Quản lý ai được ở lại trong workspace.

**Trường hợp ngoại lệ**:

- Không xóa được Chủ sở hữu.
- Xóa thành viên xong → người đó không còn thấy workspace trong danh sách của mình.

---

# NHÓM 3 — QUẢN LÝ CHATBOT

📷 **Ảnh minh họa**: Xác nhận xóa thành viên / thu hồi lời mời — chụp màn hình và thay thế dòng này bằng hình.

## F13. Tạo chatbot

**Mô tả**: Khách hàng tạo chatbot cho website của mình. Quy trình tạo gồm **4 bước (Onboarding)**: tạo bot → chọn/chỉnh dữ liệu → hệ thống xử lý (index) → trang thành công.

**Thao tác kiểm thử — Bước 1: Tạo bot (3 cách)**:

Tại bước 1 có **3 cách tạo bot**:

**Cách A — Website URL**:

1. Vào Dashboard → nhấn nút tạo chatbot.
2. Chọn tab **"Website URL"**.
3. Nhập tên bot.
4. Nhập domain website (ví dụ: ctyabc.vn) — bắt buộc, kiểm tra định dạng URL.
5. Chọn phạm vi crawl: "Toàn bộ website" hoặc phạm vi hẹp hơn.
6. Tải lên avatar (tùy chọn).
7. Nhấn tạo → hệ thống tự quét website (Discover → Step 2 chọn trang → Step 3 index).

**Cách B — Tệp dữ liệu (File)**:

1. Vào Dashboard → nhấn nút tạo chatbot.
2. Chọn tab **"Tệp dữ liệu"**.
3. Nhập tên bot (tải lên avatar tùy chọn).
4. Nhấn tạo bot → sang **Bước 2: Tải lên file** — chọn file PDF, Word (DOCX), TXT, CSV, Markdown (chọn nhiều file).
5. Hệ thống kiểm tra **số credits** trước khi tải: nếu không đủ credits → báo "Bạn chỉ có thể tải tối đa X tệp với Y credits hiện tại".
6. Tải xong → **Bước 3: hệ thống xử lý (index)** — xem tiến độ → **Bước 4: trang thành công**.

**Cách C — Tạo bot hàng loạt từ file CSV**:

1. Vào Dashboard → nút **"Tạo mới"** → chọn **"Tạo bot hàng loạt"**.
2. **Bước 1 — Tải file CSV**: tải file mẫu (5 cột: name, slug, avatar_url, knowledge_title, knowledge_content) hoặc tải file .csv ≤10MB → bảng xem trước: số dòng hợp lệ/lỗi kèm lý do.
3. **Bước 2 — Cấu hình chung**: đặt màu chủ đạo, công khai, tính cách, kỹ năng cho tất cả bot → hệ thống kiểm tra giới hạn: số bot còn tạo được theo gói + credits cần/đủ; vượt giới hạn → chặn, báo rõ.
4. **Bước 3 — Tạo bot**: theo dõi tiến trình realtime từng bot (đang tạo → thành công/lỗi) → tự chuyển sang bước 4.
5. **Bước 4 — Báo cáo**: tổng số bot, số thành công/lỗi kèm lý do từng dòng → bot thành công xuất hiện trong danh sách chatbot (trạng thái xử lý → hoạt động), bot lỗi không tạo bot rác.

**Yêu cầu nhập liệu**:

| Trường                | Bắt buộc | Quy tắc                         |
| --------------------- | :------: | ------------------------------- |
| Tên bot               |    ✅    | Bắt buộc                        |
| Domain (chỉ Cách A)   |    ✅    | Địa chỉ website hợp lệ          |
| Avatar                |    ❌    | Ảnh đại diện                    |
| File (chỉ Cách B)     |    ✅    | PDF, DOCX, TXT, CSV, MD         |
| File CSV (chỉ Cách C) |    ✅    | .csv ≤10MB, 5 cột theo file mẫu |

**Kết quả mong đợi**: Bot được tạo và xuất hiện trong danh sách bot của workspace. Số bot tạo được tùy theo gói cước.

**Trường hợp ngoại lệ**:

- Chưa chọn workspace → báo lỗi cần chọn workspace.
- Không đủ quyền (không phải thành viên) → bị từ chối.
- Đã đạt giới hạn số bot của gói → không tạo thêm được.
- Không đủ credits (Cách B) → chặn, báo số file tối đa tải được.
- File sai định dạng / quá lớn (Cách B) → từ chối.
- File không phải .csv / quá 10MB (Cách C) → từ chối: "Vui lòng tải lên file đúng định dạng .csv" / "Dung lượng file vượt quá giới hạn 10MB".
- Dòng thiếu tên, slug sai định dạng, trùng slug trong file, nội dung kiến thức >10.000 ký tự (Cách C) → dòng lỗi kèm lý do tiếng Việt.
- Vượt giới hạn bot của gói / thiếu credits (Cách C) → chặn ở bước 2, báo rõ số còn thiếu.
- Mất mạng / đóng tab giữa chừng (Cách C) → bot đã xử lý xong vẫn được tạo, bot chưa xử lý thì không — kiểm tra lại không có bot lỗi dở dang.
- **Xóa bot (tình huống bắt buộc phủ)**: Sau khi xóa bot, bot biến mất khỏi danh sách; kiến thức, khách hàng tiềm năng, lịch sử trò chuyện của bot xử lý như thế nào (xóa theo hay giữ lại) — xác nhận hành vi và ghi nhận kết quả.

📷 **Ảnh minh họa**: Bước 1 tạo bot — 3 cách ("Website URL" / "Tệp dữ liệu" / "Tạo bot hàng loạt") + bước 2 tải file + 4 bước tạo hàng loạt từ CSV — chụp màn hình và thay thế dòng này bằng hình.

### F13.1. Trang thành công sau khi tạo (Step 4)

**Mô tả**: Sau khi bot học xong dữ liệu, hiển thị trang "Chatbot đã sẵn sàng!" — nơi khách hàng có thể làm ngay các việc sau **tại trang này** (không cần vào dashboard):

| Thành phần                                          | Nội dung                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------- |
| Thông tin bot                                       | Avatar, tên bot, trạng thái "Đang hoạt động", badge số nguồn đã học |
| Nút "Trở về Dashboard"                              | Về trang quản trị                                                   |
| Nút "Cài đặt Widget"                                | Chuyển thẳng tới trang cài đặt widget của bot                       |
| **"Tuỳ chỉnh tính cách và kỹ năng"** (mở rộng được) | Chọn tính cách AI + gắn kỹ năng ngay tại trang thành công           |
| **"Tạo trang chat độc lập"** (mở rộng được)         | Đặt đường dẫn (slug), bật/tắt chia sẻ công khai, xem link + mã QR   |

**Thao tác kiểm thử — Tuỳ chỉnh tính cách và kỹ năng**:

1. Tại trang thành công, nhấn nút "Tuỳ chỉnh tính cách và kỹ năng".
2. Chọn tính cách (personality) — danh sách tùy theo gói cước.
3. Chọn kỹ năng (skills) nếu có.
4. Lưu → thông báo thành công.
5. Xác nhận lựa chọn được giữ (vào dashboard bot → tab AI vẫn thấy đúng tính cách/kỹ năng).

**Thao tác kiểm thử — Tạo trang chat độc lập**:

1. Tại trang thành công, nhấn nút "Tạo trang chat độc lập".
2. Nhập đường dẫn (slug) — quy tắc: chữ thường, số, dấu gạch ngang.
3. Bật "chia sẻ công khai" (nếu muốn).
4. Lưu → thông báo "Đã lưu cài đặt trang chat độc lập".
5. Xác nhận link `/chat/ten-bot` hoạt động + mã QR hiển thị.
6. Kiểm tra slug cấm (trùng với đường dẫn hệ thống) → báo lỗi.

**Ghi chú**: Trang chat độc lập đầy đủ (link, QR, chia sẻ) được mô tả chi tiết tại **F33**; tính cách/kỹ năng chi tiết tại **F18-F19**.

📷 **Ảnh minh họa**: Trang thành công "Chatbot đã sẵn sàng!" — 2 panel mở rộng: "Tuỳ chỉnh tính cách và kỹ năng" + "Tạo trang chat độc lập" — chụp màn hình và thay thế dòng này bằng hình.

## F14. Danh sách chatbot (tìm kiếm)

**Mô tả**: Trang danh sách bot hiển thị các bot của workspace — có ô tìm kiếm theo tên.

**Kết quả mong đợi**: Nhập tên → danh sách lọc đúng bot. Khi nhiều bot → phân trang.

**Tình huống cần phủ**:

- Tìm kiếm từ khóa **không tồn tại** → hiển thị danh sách trống + thông báo "không tìm thấy" (không crash, không hiện toàn bộ).
- Tìm kiếm **tiếng Việt không dấu** (vd: gõ "bot ban hang" thay vì "bot bán hàng") → xác nhận hệ thống có tìm được không, ghi nhận hành vi.
- **Ô tìm kiếm rỗng** → hiển thị toàn bộ danh sách.
- Tìm kiếm **khoảng trắng thừa** (leading/trailing space).

📷 **Ảnh minh họa**: Trang danh sách bot — ô tìm kiếm + kết quả lọc + phân trang — chụp màn hình và thay thế dòng này bằng hình.

## F15. Chỉnh sửa giao diện bot (nhận diện thương hiệu)

**Mô tả**: Đổi tên, avatar, màu sắc, biểu tượng, vị trí hiển thị của cửa sổ chat để khớp thương hiệu website.

**Kết quả mong đợi**: Các thay đổi được lưu và áp dụng khi xem thử widget chat.

📷 **Ảnh minh họa**: Trang chỉnh sửa giao diện bot (tên, avatar, màu sắc, vị trí widget) — chụp màn hình và thay thế dòng này bằng hình.

## F16. Bật / tắt chatbot

**Mô tả**: Tạm dừng hoặc bật lại bot.

**Kết quả mong đợi**: Khi bot tạm dừng, khách truy cập website thấy thông báo bot đang tạm dừng, không chat được.

📷 **Ảnh minh họa**: Nút bật/tắt (toggle) trạng thái bot — chụp màn hình và thay thế dòng này bằng hình.

## F17. Domain được phép (Allowed Domains)

**Mô tả**: Khai báo danh sách domain được phép hiển thị widget chat. Widget chỉ hoạt động trên các domain này.

**Kết quả mong đợi**: Widget hiển thị trên domain đã khai báo; không hiển thị trên domain khác.

📷 **Ảnh minh họa**: Trang khai báo danh sách domain được phép — chụp màn hình và thay thế dòng này bằng hình.

## F18. Tính cách AI (Personality)

**Mô tả**: Chọn tính cách phù hợp cho bot (thân thiện, chuyên nghiệp...) — tùy theo gói cước.

📷 **Ảnh minh họa**: Khu vực chọn tính cách AI (danh sách personality) — chụp màn hình và thay thế dòng này bằng hình.

## F19. Kỹ năng AI (Skills)

**Mô tả**: Gắn thêm kỹ năng chuyên biệt cho bot.

📷 **Ảnh minh họa**: Khu vực chọn kỹ năng AI (danh sách skills) — chụp màn hình và thay thế dòng này bằng hình.

## F20. Đường dẫn bot (Slug)

**Mô tả**: Đổi đường dẫn bot — ảnh hưởng đến địa chỉ trang chat của bot.

📷 **Ảnh minh họa**: Form đổi đường dẫn (slug) của bot — chụp màn hình và thay thế dòng này bằng hình.

## F21. Tải lên ảnh đại diện

**Mô tả**: Tải lên ảnh avatar/branding cho bot.

**Kết quả mong đợi**: Ảnh được lưu và hiển thị đúng chỗ (avatar, trang chat).

---

# NHÓM 4 — KIẾN THỨC CỦA BOT (NỘI DUNG TRẢ LỜI)

> **Khái niệm**: Để bot trả lời đúng, cần cung cấp "kiến thức" — nội dung lấy từ website, file tài liệu, hoặc nhập tay. Bot sẽ trả lời dựa trên kiến thức này.

📷 **Ảnh minh họa**: Khu vực tải lên ảnh đại diện (avatar) của bot — chụp màn hình và thay thế dòng này bằng hình.

## F22. Quét nội dung website

**Mô tả**: Nhập địa chỉ website → hệ thống tự quét các trang → chọn trang cần lấy → bot học nội dung.

**Thao tác kiểm thử**:

1. Mở bot → tab "Kiến thức" → "Thêm nguồn" → chọn Website.
2. Nhập địa chỉ website.
3. Chờ hệ thống quét (xem tiến độ).
4. Chọn các trang cần lấy.
5. Xác nhận quét.

**Kết quả mong đợi**: Các trang được đưa vào danh sách kiến thức với trạng thái "đã lấy". Số credits bị trừ tương ứng với lượng nội dung — tester ghi nhận **số credits trước khi quét, sau khi quét**, so sánh mức chênh lệch (tham khảo bảng giá credits để biết định mức).

**Trường hợp ngoại lệ**:

- Website không truy cập được → báo lỗi, có thể thử lại.
- Website không có nội dung → danh sách trống.
- Không đủ credits → thông báo và không quét được.

📷 **Ảnh minh họa**: Luồng quét website: form nhập URL → danh sách trang discover → chọn trang — chụp màn hình và thay thế dòng này bằng hình.

## F23. Tải lên file tài liệu

**Mô tả**: Tải lên file PDF, Word, TXT, CSV để bot học.

**Kết quả mong đợi**: File được xử lý và xuất hiện trong danh sách kiến thức. Credits trừ theo dung lượng.

**Trường hợp ngoại lệ**:

- Sai định dạng file → từ chối.
- File quá lớn → từ chối.
- Không đủ credits → thông báo.

📷 **Ảnh minh họa**: Khu vực tải lên file kiến thức (danh sách file + trạng thái xử lý) — chụp màn hình và thay thế dòng này bằng hình.

## F24. Thêm kiến thức thủ công

**Mô tả**: Nhập trực tiếp nội dung (tiêu đề + nội dung) cho bot.

**Yêu cầu nhập liệu**:

| Trường   | Bắt buộc |
| -------- | :------: |
| Tiêu đề  |    ✅    |
| Nội dung |    ✅    |

📷 **Ảnh minh họa**: Form thêm kiến thức thủ công (tiêu đề + nội dung) — chụp màn hình và thay thế dòng này bằng hình.

## F25. Kiến thức chung của workspace

**Mô tả**: Kiến thức dùng chung cho **tất cả chatbot trong workspace** — nhập một lần, mọi bot đều dùng được. Quản lý tại mục "Knowledge Chung" ở menu bên trái.

**Thao tác kiểm thử**:

1. Vào menu "Knowledge Chung" (bên trái màn hình).
2. Nhấn "Thêm kiến thức".
3. Nhập tiêu đề + nội dung → Lưu.
4. Mở bất kỳ bot nào trong workspace → hỏi nội dung vừa thêm → bot trả lời được.
5. Xóa một kiến thức (biểu tượng thùng rác + xác nhận).

**Kết quả mong đợi**: Kiến thức chung hiển thị trong danh sách, mọi bot dùng được. Giới hạn số lượng kiến thức chung tùy theo gói cước.

**Trường hợp ngoại lệ**:

- Vượt giới hạn kiến thức của gói → không thêm được, báo lỗi.
- Chưa chọn workspace → nhắc chọn workspace trước.

📷 **Ảnh minh họa**: Trang "Knowledge Chung" — danh sách kiến thức chung + modal thêm mới — chụp màn hình và thay thế dòng này bằng hình.

## F26. Kiến thức riêng của bot

**Mô tả**: Kiến thức chỉ áp dụng cho một bot cụ thể (tab "Kiến thức" trong trang chi tiết bot).

📷 **Ảnh minh họa**: Tab "Bot Knowledge" trong trang chi tiết bot (kiến thức riêng) — chụp màn hình và thay thế dòng này bằng hình.

## F27. Làm mới kiến thức (Reindex)

**Mô tả**: Khi nội dung website/file thay đổi, nhấn làm mới để bot cập nhật.

**Kết quả mong đợi**: Hiển thị trạng thái "đang làm mới", xong thì bot trả lời theo nội dung mới.

📷 **Ảnh minh họa**: Nút làm mới (reindex) + trạng thái đang xử lý — chụp màn hình và thay thế dòng này bằng hình.

## F28. Chất lượng trả lời

**Mô tả**: Kiểm tra bot trả lời chính xác dựa trên kiến thức đã cung cấp.

**Kết quả mong đợi**: Câu hỏi đúng nội dung kiến thức → bot trả lời đúng trọng tâm, không tự thêm thông tin sai. Câu hỏi ngoài phạm vi → bot trả lời "không biết" hoặc đề nghị để lại thông tin liên hệ — **tester ghi nhận câu trả lời cụ thể để đối chiếu**, không chỉ đánh giá "nghe ổn".

**Hướng dẫn**: Chuẩn bị **bộ 5-10 câu hỏi mẫu** (3 câu có trong kiến thức, 2 câu ngoài phạm vi, 1 câu lệch chủ đề nhưng gần nghĩa) → ghi lại câu trả lời của bot cho từng câu → đối chiếu với nội dung kiến thức đã nhập.

---

# NHÓM 5 — WIDGET CHAT TRÊN WEBSITE

> **Khái niệm**: "Widget" là cửa sổ chat hiển thị trên website của khách hàng, nơi khách truy cập trò chuyện với bot.

📷 **Ảnh minh họa**: Cửa sổ chat — 1 câu hỏi trong kiến thức + 1 câu ngoài phạm vi (minh họa cách bot trả lời) — chụp màn hình và thay thế dòng này bằng hình.

## F29. Nhúng widget vào website

**Mô tả**: Lấy đoạn mã (hoặc cài qua Google Tag Manager) và đưa vào website.

**Kết quả mong đợi**: Cửa sổ chat hiển thị đúng vị trí, màu sắc theo thiết lập của bot.

**Trường hợp ngoại lệ**:

- Website không nằm trong danh sách domain được phép → widget không hiển thị.
- Bot đang tạm dừng → khách thấy thông báo tạm dừng.

📷 **Ảnh minh họa**: Widget chat hiển thị trên website khách (cửa sổ chat nổi) — chụp màn hình và thay thế dòng này bằng hình.

## F30. Trò chuyện với bot

**Mô tả**: Khách truy cập đặt câu hỏi, bot trả lời dựa trên kiến thức.

**Kết quả mong đợi**: Trả lời nhanh, đúng nội dung. Mỗi tin nhắn của khách trừ một lượng credits của workspace.

**Trường hợp ngoại lệ**:

- Hết credits → bot không trả lời, thông báo giới hạn.
- Gửi quá nhiều tin trong ngày → tạm chặn với thông báo thử lại sau.

📷 **Ảnh minh họa**: Cửa sổ chat — trao đổi giữa khách và bot (bubble tin nhắn) — chụp màn hình và thay thế dòng này bằng hình.

## F31. Nhắn tin bằng giọng nói

**Mô tả**: Khách nhấn nút micro, nói, bot chuyển giọng nói thành chữ rồi trả lời.

**Thao tác kiểm thử**:

1. Nhấn nút micro trong cửa sổ chat.
2. Nói nội dung (dưới 30 giây).
3. Quan sát sóng âm hiển thị khi ghi.
4. Thả nút — hệ thống gửi nội dung.

**Kết quả mong đợi**: Giọng nói chuyển thành chữ, bot trả lời bình thường.

**Trường hợp ngoại lệ**:

- Từ chối quyền truy cập micro → thông báo thân thiện.
- Thiết bị không có micro → thông báo.
- Nhận dạng giọng nói thất bại → thông báo lỗi, khách thử lại.

📷 **Ảnh minh họa**: Nút micro trong cửa sổ chat + trạng thái đang ghi (sóng âm) — chụp màn hình và thay thế dòng này bằng hình.

## F32. Biểu mẫu thu thập thông tin khách hàng (Lead)

**Mô tả**: Khi bot không trả lời được câu hỏi, hiển thị biểu mẫu để khách để lại thông tin liên hệ.

**Yêu cầu nhập liệu**:

| Trường        | Bắt buộc | Quy tắc              |
| ------------- | :------: | -------------------- |
| Họ tên        |    ✅    | 2–100 ký tự          |
| Email         |    ✅    | Đúng định dạng email |
| Số điện thoại |    ❌    | 8–15 chữ số          |
| Ghi chú       |    ❌    |                      |

**Kết quả mong đợi**: Gửi thành công → thông báo cảm ơn; thông tin xuất hiện trong mục "Khách hàng tiềm năng" (Leads) của bot.

**Trường hợp ngoại lệ**:

- Thiếu tên/email → báo cần nhập đủ.
- Email sai định dạng → báo lỗi email.
- Số điện thoại không hợp lệ (dưới 8 hoặc trên 15 số) → báo lỗi.

📷 **Ảnh minh họa**: Biểu mẫu thu thập thông tin khách hàng (lead form: tên, email, SĐT, ghi chú) — chụp màn hình và thay thế dòng này bằng hình.

## F33. Trang chat chia sẻ (Standalone Chat)

**Mô tả**: Trang chat riêng có đường dẫn riêng (`/chat/ten-bot`) — có thể chia sẻ công khai, kèm mã QR.

**Thao tác kiểm thử**:

1. Mở trang chia sẻ của bot (nút chia sẻ trong trang chi tiết bot / dashboard).
2. Mở link `/chat/ten-bot` ở trình duyệt khác / chế độ ẩn danh.
3. Nếu có mã QR → mở mã QR, quét bằng điện thoại → mở được trang chat.

**Kết quả mong đợi**: Mở link → chat hoạt động như widget toàn trang. Quét QR → mở đúng trang chat.

**Trường hợp ngoại lệ**:

- Bot không cho phép chia sẻ công khai → báo không truy cập được.
- Bot không tồn tại → thông báo không khả dụng.

📷 **Ảnh minh họa**: Trang chat chia sẻ (/chat/ten-bot) + mã QR — chụp màn hình và thay thế dòng này bằng hình.

## F34. Sao chép tin nhắn

**Mô tả**: Nút sao chép trên mỗi tin nhắn.

**Kết quả mong đợi**: Sao chép nội dung vào clipboard, có thông báo "đã sao chép".

---

# NHÓM 6 — BÁO CÁO VÀ THỐNG KÊ

📷 **Ảnh minh họa**: Nút sao chép tin nhắn + thông báo "đã sao chép" — chụp màn hình và thay thế dòng này bằng hình.

## F35. Trang tổng quan

**Mô tả**: Trang chính của Dashboard hiển thị tình hình workspace: số bot, lượt trò chuyện, credits đã dùng, số trang kiến thức.

**Kết quả mong đợi**: Số liệu đúng với workspace đang chọn; chuyển workspace → số liệu đổi tương ứng.

📷 **Ảnh minh họa**: Trang tổng quan Dashboard (số bot, lượt trò chuyện, credits, số trang kiến thức) — chụp màn hình và thay thế dòng này bằng hình.

## F36. Thống kê theo từng bot

**Mô tả**: Xem lượt trò chuyện, tương tác của từng bot.

📷 **Ảnh minh họa**: Trang thống kê theo từng bot (analytics) — chụp màn hình và thay thế dòng này bằng hình.

## F37. Lịch sử trò chuyện

**Mô tả**: Xem các cuộc trò chuyện giữa khách và bot (kèm thông tin khách truy cập).

---

# NHÓM 7 — GÓI CƯỚC VÀ THANH TOÁN

> **Khái niệm**: Hệ thống có các gói: **Miễn phí (Free)**, **Tiêu chuẩn (Standard)**, **Chuyên nghiệp (Pro)**, **Doanh nghiệp (Enterprise)**. Mỗi gói có giới hạn số bot và số credits riêng. Credits là đơn vị dùng cho mỗi tin nhắn/lượt quét nội dung.

📷 **Ảnh minh họa**: Trang lịch sử trò chuyện (danh sách cuộc trò chuyện + chi tiết) — chụp màn hình và thay thế dòng này bằng hình.

## F38. Xem gói hiện tại

**Mô tả**: Trang "Thanh toán" hiển thị gói đang dùng, ngày hết hạn, giới hạn bot, và số dư credits (credits gói + credits nạp thêm).

**Kết quả mong đợi**: Thông tin đúng với workspace đang chọn.

📷 **Ảnh minh họa**: Trang "Thanh toán" — gói hiện tại, ngày hết hạn, giới hạn bot, số dư credits — chụp màn hình và thay thế dòng này bằng hình.

## F39. Nâng cấp / Mua gói

**Mô tả**: Chọn gói và chu kỳ (tháng / năm) → thanh toán qua cổng PayOS (chuyển khoản QR, ATM, thẻ).

**Thao tác kiểm thử**:

1. Vào trang "Thanh toán" → chọn gói.
2. Chọn chu kỳ thanh toán.
3. Nhấn nút thanh toán → chuyển sang trang thanh toán PayOS.
4. Thanh toán thành công.

**Kết quả mong đợi**: Thanh toán xong → gói được nâng cấp, credits gói được cộng vào ví, quay lại trang kết quả thành công.

**Trường hợp ngoại lệ**:

- Chọn gói Doanh nghiệp → hiện thông báo liên hệ bộ phận bán hàng (contact@vielora.vn).
- Chọn gói Miễn phí → thông báo gói miễn phí chỉ tự động áp dụng khi gói trả phí hết hạn.
- Gia hạn sai chu kỳ → báo chọn đúng chu kỳ.
- Hủy thanh toán giữa chừng → gói không đổi, không bị trừ tiền.

**Ghi chú cho tester**:

- Thanh toán phụ thuộc môi trường — xem mục **MÔI TRƯỜNG KIỂM THỬ** (Sandbox PayOS hay thật).
- Nếu dùng PayOS sandbox: dùng **thẻ test / QR test** theo hướng dẫn của PayOS — _[ĐIỀN: link hướng dẫn thẻ test sandbox]_.
- Test luôn trường hợp **thanh toán thành công** và **hủy thanh toán** (quay lại trang kết quả tương ứng).

📷 **Ảnh minh họa**: Trang chọn gói (Free/Standard/Pro/Enterprise) + trang thanh toán PayOS — chụp màn hình và thay thế dòng này bằng hình.

## F40. Nạp thêm credits

**Mô tả**: Mua thêm credits dùng dần (không giới hạn thời gian) khi credits gói đã dùng hết.

**Kết quả mong đợi**: Thanh toán xong → credits nạp thêm xuất hiện trong ví.

📷 **Ảnh minh họa**: Trang nạp thêm credits (chọn gói credits) — chụp màn hình và thay thế dòng này bằng hình.

## F41. Khi gói hết hạn

**Mô tả**: Hệ thống tự động xử lý khi gói trả phí hết hạn.

**Kết quả mong đợi**: Gói chuyển về Miễn phí, credits tháng được làm mới theo quy định, các bot vượt giới hạn gói miễn phí bị tạm dừng.

**Trường hợp ngoại lệ**:

- Trước khi hết hạn 3 ngày, **tất cả thành viên trong workspace** nhận email nhắc: "Gói X sắp hết hạn trong Y ngày" kèm nút gia hạn.

**Ghi chú cho tester**:

- Test "gói hết hạn" **không thể chờ thời gian thật** — liên hệ quản trị hệ thống để **đặt ngày hết hạn của tài khoản test về ngày gần (1-3 ngày tới)** hoặc dùng tài khoản có gói sắp hết hạn. — _[ĐIỀN: tài khoản test có subscription sắp hết hạn / quy trình nhờ admin đặt hạn]_.
- Kiểm tra email nhắc hết hạn ở hộp thư test (xem mục MÔI TRƯỜNG KIỂM THỬ).

📷 **Ảnh minh họa**: Email nhắc hết hạn gói (hộp thư) — nội dung + nút gia hạn — chụp màn hình và thay thế dòng này bằng hình.

## F42. Lịch sử thanh toán

**Mô tả**: Trang lịch sử liệt kê các lần thanh toán của workspace (gói, số tiền, ngày, người thanh toán, trạng thái hóa đơn).

**Kết quả mong đợi**: Hiển thị đầy đủ các giao dịch của workspace — kể cả giao dịch do thành viên khác trong workspace thực hiện. Khi thành viên rời workspace, các giao dịch họ từng thanh toán vẫn được giữ trong lịch sử.

📷 **Ảnh minh họa**: Trang lịch sử thanh toán (danh sách giao dịch + thông tin người trả + trạng thái hóa đơn) — chụp màn hình và thay thế dòng này bằng hình.

## F43. Tra cứu mã số thuế

**Mô tả**: Khi cần xuất hóa đơn, nhập mã số thuế công ty → hệ thống tự tra cứu và điền tên, địa chỉ công ty.

**Kết quả mong đợi**: Nhập mã số thuế hợp lệ → tự điền thông tin công ty vào biểu mẫu hóa đơn.

**Tình huống cần phủ**:

- MST **sai định dạng** (vd: có chữ, thiếu số) → báo lỗi định dạng.
- MST **không tồn tại** trong hệ thống tra cứu → thông báo không tìm thấy, không tự điền.
- MST hợp lệ → điền đúng tên/địa chỉ công ty (đối chiếu với đăng ký kinh doanh).

---

# NHÓM 8 — HÓA ĐƠN

📷 **Ảnh minh họa**: Form tra cứu mã số thuế (nhập MST + kết quả tự điền công ty) — chụp màn hình và thay thế dòng này bằng hình.

## F44. Hóa đơn tự động

**Mô tả**: Sau khi thanh toán thành công, hệ thống tự tạo hóa đơn điện tử (VAT) và ký số.

**Kết quả mong đợi**: Hóa đơn được tạo tự động; trạng thái hiển thị trong lịch sử thanh toán (đang xử lý / đã phát hành / thất bại).

**Ghi chú cho tester**: Phụ thuộc môi trường hóa đơn điện tử (xem mục **MÔI TRƯỜNG KIỂM THỬ**). Nếu môi trường test chưa kết nối EasyInvoice, hóa đơn có thể không phát hành được — ghi nhận hành vi hiện tại.

📷 **Ảnh minh họa**: Lịch sử thanh toán — hiển thị trạng thái hóa đơn (đang xử lý / đã phát hành / thất bại) — chụp màn hình và thay thế dòng này bằng hình.

## F45. Tải hóa đơn PDF

**Mô tả**: Tải file PDF hóa đơn từ lịch sử thanh toán.

**Kết quả mong đợi**: Tải được file PDF hóa đơn hợp lệ.

**Trường hợp ngoại lệ**:

- Hóa đơn chưa phát hành → chưa có nút tải.
- Hệ thống hóa đơn lỗi → thông báo thử lại sau.

📷 **Ảnh minh họa**: Nút tải hóa đơn PDF trong lịch sử thanh toán — chụp màn hình và thay thế dòng này bằng hình.

## F46. Tra cứu hóa đơn

**Mô tả**: Hóa đơn có mã tra cứu, có thể tra trên cổng tra cứu hóa đơn điện tử.

---

# NHÓM 9 — THÔNG BÁO QUA EMAIL

📷 **Ảnh minh họa**: Hóa đơn — mã tra cứu + link cổng tra cứu hóa đơn điện tử — chụp màn hình và thay thế dòng này bằng hình.

## F47. Email chào mừng

**Kết quả mong đợi**: Tài khoản mới nhận email chào mừng.

📷 **Ảnh minh họa**: Email chào mừng tài khoản mới (hộp thư) — chụp màn hình và thay thế dòng này bằng hình.

## F48. Email mời thành viên

**Kết quả mong đợi**: Email ghi rõ ai mời, vào workspace nào, nút "Chấp nhận lời mời". Link có hiệu lực 7 ngày.

📷 **Ảnh minh họa**: Email mời thành viên — nội dung + nút "Chấp nhận lời mời" — chụp màn hình và thay thế dòng này bằng hình.

## F49. Email nhắc hết hạn gói

**Kết quả mong đợi**: 3 ngày trước khi hết hạn, tất cả thành viên workspace nhận email nhắc gia hạn.

📷 **Ảnh minh họa**: Email nhắc hết hạn gói (hộp thư) — chi tiết gói + ngày hết hạn — chụp màn hình và thay thế dòng này bằng hình.

## F50. Email thông báo hạ gói

**Kết quả mong đợi**: Khi gói bị chuyển về Miễn phí, thành viên nhận email thông báo kèm ngày hiệu lực.

📷 **Ảnh minh họa**: Email thông báo hạ gói (hộp thư) — chụp màn hình và thay thế dòng này bằng hình.

## F51. Email hóa đơn

**Kết quả mong đợi**: Nhận email chứa thông tin hóa đơn và mã tra cứu.

---

# NHÓM 10 — KẾT NỐI HỆ THỐNG NGOÀI (WEBHOOK)

> **Khái niệm**: Webhook giúp đẩy sự kiện (tin nhắn mới, khách hàng mới, thành viên mới...) sang hệ thống khác của khách hàng theo thời gian thực. Chủ yếu dành cho khách hàng có đội kỹ thuật.

📷 **Ảnh minh họa**: Email hóa đơn (hộp thư) — thông tin hóa đơn + mã tra cứu — chụp màn hình và thay thế dòng này bằng hình.

## F52. Tạo webhook

**Mô tả**: Khai báo địa chỉ nhận sự kiện và chọn các loại sự kiện muốn nhận.

**Yêu cầu nhập liệu**:

| Trường             | Bắt buộc | Quy tắc                         |
| ------------------ | :------: | ------------------------------- |
| Địa chỉ nhận (URL) |    ✅    | Địa chỉ web hợp lệ (http/https) |
| Loại sự kiện       |    ✅    | Chọn tối thiểu 1 loại           |

**Kết quả mong đợi**: Tạo thành công, hệ thống cấp mã xác thực (secret) cho webhook. Tối đa 10 webhook trong một workspace.

**Trường hợp ngoại lệ**:

- URL không hợp lệ → báo lỗi.
- Không chọn loại sự kiện → báo lỗi.
- Đã đạt 10 webhook → không tạo thêm.

📷 **Ảnh minh họa**: Form tạo webhook (URL + chọn loại sự kiện) + danh sách webhook đã tạo — chụp màn hình và thay thế dòng này bằng hình.

## F53. Nhận sự kiện

**Mô tả**: Khi sự kiện xảy ra, hệ thống gửi thông báo đến địa chỉ đã khai báo kèm chữ ký xác thực.

**Kết quả mong đợi**: Hệ thống ngoài nhận được sự kiện (tin nhắn mới, khách hàng để lại thông tin, thành viên thay đổi, gói cước thay đổi, bot tạo/xóa...).

**Trường hợp ngoại lệ**:

- Hệ thống ngoài đang gặp lỗi → hệ thống gửi lại sau một khoảng thời gian.

---

# NHÓM 11 — HỖ TRỢ KHÁCH HÀNG

📷 **Ảnh minh họa**: Ví dụ hệ thống ngoài nhận được sự kiện (webhook receiver) — minh họa — chụp màn hình và thay thế dòng này bằng hình.

## F54. Gửi phiếu hỗ trợ

**Mô tả**: Khách hàng gửi yêu cầu hỗ trợ từ trang "Hỗ trợ".

**Kết quả mong đợi**: Phiếu được tạo, có thể xem lại danh sách phiếu đã gửi.

📷 **Ảnh minh họa**: Trang "Hỗ trợ" — form gửi phiếu + danh sách phiếu đã gửi — chụp màn hình và thay thế dòng này bằng hình.

## F55. Trang giới thiệu & liên hệ

**Mô tả**: Các trang thông tin sản phẩm, về chúng tôi, chính sách bảo mật, điều khoản sử dụng.

---

# NHÓM 12 — NỀN TẢNG KHÁC

📷 **Ảnh minh họa**: Trang giới thiệu / về chúng tôi / chính sách bảo mật — chụp màn hình và thay thế dòng này bằng hình.

## F56. Bot trên website qua PWA (cài như ứng dụng)

**Mô tả**: Trang chat của bot có thể "cài" vào điện thoại như một ứng dụng (đường dẫn riêng dạng `ten-bot.vielora.vn`).

**Kết quả mong đợi**: Trên điện thoại, mở trang bot → có lựa chọn "cài đặt ứng dụng" → cài xong hiển thị như app riêng (biểu tượng + màn hình riêng). Khi mất mạng, hiển thị thông báo đang ngoại tuyến.

**Ghi chú cho tester**: Bắt buộc test trên **điện thoại thật** (không phải trình giả lập):

- Android → Chrome → menu "Cài đặt ứng dụng" / "Thêm vào màn hình chính".
- iPhone → Safari → "Thêm vào màn hình chính" (A2HS). Safari có thể hiển thị khác Chrome.
- Test **mất mạng** (bật chế độ máy bay) sau khi cài → kiểm tra banner ngoại tuyến.

📷 **Ảnh minh họa**: Điện thoại: menu cài đặt PWA (Android Chrome / iOS Safari) + banner ngoại tuyến khi mất mạng — chụp màn hình và thay thế dòng này bằng hình.

## F57. Hướng dẫn khởi đầu (Onboarding)

**Mô tả**: Khách hàng mới được hướng dẫn từng bước tạo bot đầu tiên (chọn cách thêm kiến thức, tải lên file...).

**Kết quả mong đợi**: Quy trình hướng dẫn từng bước rõ ràng, thoát giữa chừng có xác nhận.

📷 **Ảnh minh họa**: Quy trình hướng dẫn khởi đầu (onboarding wizard) — 1 bước bất kỳ — chụp màn hình và thay thế dòng này bằng hình.

## F58. Blog

**Mô tả**: Trang tin tức công khai của sản phẩm.

📷 **Ảnh minh họa**: Trang blog công khai (danh sách bài viết) — chụp màn hình và thay thế dòng này bằng hình.

## F59. Tích hợp Shopify

**Mô tả**: Cài đặt bot vào cửa hàng Shopify — đăng nhập qua Shopify, quản lý bot ngay trong giao diện Shopify.

**Kết quả mong đợi**: Kết nối tài khoản Shopify thành công, bot hoạt động trong cửa hàng.

**Ghi chú cho tester**: Cần **cửa hàng Shopify test** (Shopify Partner / Development Store) — _[ĐIỀN: URL cửa hàng Shopify test + tài khoản]_. Nếu chưa có, bỏ qua nhóm này và ghi chú "không test được".

---

# PHỤ LỤC A — BẢNG PHÂN QUYỀN

| Hoạt động               | Chủ sở hữu (Owner) | Quản trị viên (Admin) |
| ----------------------- | :----------------: | :-------------------: |
| Mời thành viên          |         ✅         |          ❌           |
| Xóa thành viên          |         ✅         |          ✅           |
| Tạo chatbot             |         ✅         |          ✅           |
| Quản lý kiến thức chung |         ✅         |          ✅           |
| Quản lý webhook         |         ✅         |          ✅           |
| Nâng cấp / thanh toán   |         ✅         |          ✅           |

# PHỤ LỤC B — DANH SÁCH TRANG CHÍNH CẦN KIỂM THỬ

| Trang               | Đường dẫn                            |
| ------------------- | ------------------------------------ |
| Đăng nhập / Đăng ký | `/auth`                              |
| Dashboard           | `/ten-workspace`                     |
| Nâng cấp gói        | `/ten-workspace/upgrade`             |
| Lịch sử thanh toán  | `/ten-workspace/upgrade/history`     |
| Kiến thức chung     | `/ten-workspace/workspace-knowledge` |
| Thành viên          | `/ten-workspace/settings/members`    |
| Chấp nhận lời mời   | `/auth/accept-invite?token=...`      |
| Trang chat bot      | `/chat/ten-bot`                      |

---

_HẾT TÀI LIỆU_

📷 **Ảnh minh họa**: Giao diện quản lý bot trong Shopify (App Bridge) — chụp màn hình và thay thế dòng này bằng hình.
