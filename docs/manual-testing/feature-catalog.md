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

| Phiên bản | Ngày       | Tác giả    | Người duyệt | Thay đổi                                                                                                                                                                                                                                                                                                                                                                               |
| --------- | ---------- | ---------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0       | 26/07/2026 | [ĐIỀN TÊN] | [ĐIỀN TÊN]  | Bản đầu — phong cách kỹ thuật                                                                                                                                                                                                                                                                                                                                                          |
| 2.0       | 26/07/2026 | [ĐIỀN TÊN] | [ĐIỀN TÊN]  | Viết lại theo nghiệp vụ, bỏ jargon kỹ thuật                                                                                                                                                                                                                                                                                                                                            |
| 3.0       | 26/07/2026 | [ĐIỀN TÊN] | [ĐIỀN TÊN]  | Bổ sung môi trường/tài khoản, tình huống thiếu, quy tắc nghiệp vụ chính xác                                                                                                                                                                                                                                                                                                            |
| 4.0       | 26/07/2026 | [ĐIỀN TÊN] | [ĐIỀN TÊN]  | Nâng cấp bố cục chuẩn doanh nghiệp: trang bìa, mục lục, header/footer, phân cấp heading                                                                                                                                                                                                                                                                                                |
| 4.1       | 09/08/2026 | [ĐIỀN TÊN] | [ĐIỀN TÊN]  | Bổ sung Cách C — Tạo bot hàng loạt từ CSV vào F13, rút gọn bố cục                                                                                                                                                                                                                                                                                                                      |
| 4.2       | 14/08/2026 | [ĐIỀN TÊN] | [ĐIỀN TÊN]  | Cập nhật NHÓM 7 & NHÓM 9 theo subscription-flow.md (F38-F43.1, F44-F46, F49, F51) — bản nháp, một số điểm Enterprise chưa chuẩn                                                                                                                                                                                                                                                        |
| 4.3       | 14/08/2026 | [ĐIỀN TÊN] | [ĐIỀN TÊN]  | SỬA LẠI luồng Enterprise chuẩn hóa theo code: F39 tách Mua/Nâng cấp/Gia hạn; Enterprise tự cấu hình bot(50-2000)+credit(10k-100k) tự tính tiền; gia hạn cùng chu kỳ + chỉ 1 lần (≤35 ngày tháng / ≤370 ngày năm); nâng cấp cùng chu kỳ có bù credit từ ngày nâng cấp; F42 nâng cấp cấu hình Enterprise không reset chu kỳ, tính theo đơn giá × tháng còn lại; F43.1 ma trận hiệu chỉnh |
| 4.4       | 14/08/2026 | [ĐIỀN TÊN] | [ĐIỀN TÊN]  | BỔ SUNG NHÓM 15 — GROUP CHAT (F60-F69): tạo nhóm, mời/thêm thành viên (giới hạn 5), tự động tạo tài khoản khách + Magic Link, màn hình từ chối truy cập, gửi/reply/voice + toggle AI, realtime & tin chưa đọc, ghim kiến thức vào RAG, bật/tắt nhóm, rời/xóa thành viên, báo cáo tóm tắt hàng ngày (Insights)                                                                          |
| 4.5       | 14/08/2026 | [ĐIỀN TÊN] | [ĐIỀN TÊN]  | SỬA LẠI F66 (Ghim kiến thức): bổ sung trừ 1 credit khi ghim, hoàn credit nếu lỗi, báo không đủ credit, bỏ ghim xóa cả embedding RAG; SỬA F69 (Tóm tắt hàng ngày): rõ cron 2h sáng, lưu 2 nơi (Insights + documents làm kiến thức bot/RAG), không cố định 3-5 ý, giới hạn 30 tin/loại đã xóa, upsert không trùng                                                                        |
| 4.6       | 17/08/2026 | [ĐIỀN TÊN] | [ĐIỀN TÊN]  | BỔ SUNG GROUP NOTES & VOICE-TO-NOTE vào NHÓM 15: F70 Tạo ghi chú (1 credit, single-active, nạp RAG, banner + thông báo); F71 Sửa ghi chú (upsert RAG, -1 credit); F72 Xóa ghi chú (xóa RAG, hoàn +1 credit); F73 Pin/Unpin ghi chú; F74 Phân quyền can_create_note (2 nơi: drawer nhóm & MemberList bot-detail); F75 Tab "Ghi chú" (active+archived, phân trang 20); F76 Voice-to-Note (mic trong editor, STT 1 credit + AI format, lưu 1 credit AddKnowledge, không auto-save) |

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
- Dòng thiếu tên, slug sai định dạng, trùng slug trong file, nội dung kiến thức vượt quá 10.000 ký tự (Cách C) → dòng lỗi kèm lý do tiếng Việt.
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

**Mô tả**: Trang "Thanh toán" hiển thị gói đang dùng, ngày hết hạn, giới hạn bot tối đa, số dư credits (credits gói + credits nạp thêm), và thời gian còn lại tính bằng ngày.

**Kết quả mong đợi**: Thông tin hiển thị đúng với workspace. Số dư credits cập nhật real-time sau mỗi thao tác (tạo bot, hệ thống trừ credits).

**Ghi chú cho tester**: Ghi chép số credits trước/sau mỗi thao tác liên quan (F13, F22-F23) để kiểm chứng trừ đúng số lượng.

📷 **Ảnh minh họa**: Trang "Thanh toán" — gói, ngày hết hạn, giới hạn bot, số dư credits — chụp màn hình và thay thế dòng này bằng hình.

## F39. Mua gói / Nâng cấp / Gia hạn

**Mô tả**: Khách quản lý gói cước qua trang "Thanh toán". Có 3 nghiệp vụ: **Mua gói lần đầu**, **Nâng cấp/Chuyển gói**, **Gia hạn**.

### F39.1. Mua gói lần đầu (Standard / Pro / Enterprise)

**Thao tác kiểm thử**:

1. Vào trang "Thanh toán" → chọn gói.
2. Chọn chu kỳ: **1 tháng** hoặc **1 năm**.
3. (Riêng Enterprise) Nhập cấu hình: số lượng bot (50–2.000) và credits/tháng (10.000–100.000). Hệ thống **tự động tính tiền** ngay khi thay đổi cấu hình.
4. Nhấn thanh toán → trang PayOS → chọn hình thức (QR, ATM, thẻ) → thanh toán.

**Kết quả mong đợi**:

- **Standard / Pro**: giá niêm yết cố định theo tháng/năm, thanh toán bình thường.
- **Enterprise (tự động tính)**: giá = **1.490.000đ (phí nền) + (số bot − 50) × 10.000đ + (credits − 10.000) / 1.000 × 100.000đ**; gói năm = giá tháng × 10 (trả 10 tháng/năm). Khách chỉ cần chọn cấu hình, số tiền hiện ra tự động, thanh toán như bình thường.

**Yêu cầu nhập liệu**:

| Trường                           | Bắt buộc | Quy tắc                     |
| -------------------------------- | :------: | --------------------------- |
| Gói cước                         |    ✅    | Standard / Pro / Enterprise |
| Chu kỳ                           |    ✅    | Tháng hoặc Năm              |
| Số bot (riêng Enterprise)        |    ✅    | 50–2.000                    |
| Credits/tháng (riêng Enterprise) |    ✅    | 10.000–100.000              |

### F39.2. Nâng cấp / Chuyển gói (Standard ↔ Pro, hoặc lên Enterprise)

**Thao tác kiểm thử**:

1. Đang dùng gói trả phí → chọn gói mới + chu kỳ mới (cùng chu kỳ hiện tại: tháng theo tháng, năm theo năm).
2. Hệ thống tính: **giá gói mới − tiền bù trừ** (bù trừ theo lượng credits còn lại của chu kỳ hiện tại).
3. Thanh toán phần chênh lệch → kích hoạt gói mới.

**Kết quả mong đợi**:

- Chu kỳ **bắt đầu lại từ ngày nâng cấp** (thời gian còn lại của gói cũ không bảo lưu, chỉ quy đổi qua tiền bù credit).
- Credits được cấp lại theo hạn mức gói mới.
- Tiền bù = (credits còn lại trong kỳ / tổng credits của gói cũ trong chu kỳ) × giá gói cũ đã trả.

**Trường hợp ngoại lệ**:

- Chọn trùng gói đang dùng (không phải Enterprise) → từ chối: "You are already on this plan".
- Hủy thanh toán giữa chừng → gói không đổi, không trừ tiền.
- Thanh toán một giao dịch **hai lần** (webhook + trang kết quả cùng lúc) → hệ thống chống trùng, chỉ tính 1 lần.

### F39.3. Gia hạn gói

**Thao tác kiểm thử**:

1. Trước khi hết hạn (hoặc sau khi hết hạn) → chọn "Gia hạn".
2. Chọn chu kỳ: **phải cùng chu kỳ gói hiện tại** (đang tháng → gia hạn tháng, đang năm → gia hạn năm).
3. Thanh toán full giá gói → kích hoạt.

**Kết quả mong đợi**:

- Gia hạn **đúng gói trả phí hiện tại** (standard → standard, pro → pro, enterprise → enterprise cùng cấu hình).
- Thời gian được **cộng dồn**: tháng thêm 1 tháng, năm thêm 1 năm (tính từ ngày kết thúc chu kỳ cũ).
- **Chỉ gia hạn được 1 lần** cho đến khi bắt đầu chu kỳ mới — nếu đã có chu kỳ tiếp theo (còn hơn 35 ngày với gói tháng / hơn 370 ngày với gói năm) → báo "Bạn đã có sẵn chu kỳ tiếp theo", không gia hạn được nữa.
- Credits: giữ nguyên (không reset) nếu còn hạn; cấp lại đầy đủ nếu đã hết hạn lâu.

**Trường hợp ngoại lệ**:

- Enterprise chọn gia hạn khác chu kỳ hiện tại → từ chối: "Không thể gia hạn khác chu kỳ. Gói hiện tại của bạn là chu kỳ Tháng/Năm".
- Hủy thanh toán → gói không đổi.

**Ghi chú cho tester**: Thanh toán phụ thuộc môi trường (Sandbox PayOS hay thật) — xem mục **MÔI TRƯỜNG KIỂM THỬ**. Nếu dùng sandbox: dùng thẻ test/QR test của PayOS — _[ĐIỀN: link hướng dẫn]_. Test cả thanh toán thành công và hủy thanh toán.

📷 **Ảnh minh họa**: Trang chọn gói + cấu hình Enterprise (slider/numer bot & credit + số tiền tự động) + trang thanh toán PayOS — chụp màn hình và thay thế dòng này bằng hình.

## F40. Nạp thêm credits

**Mô tả**: Mua thêm credits dùng dần — không thời hạn, không reset khi gói đổi/kế hạn.

**Thao tác kiểm thử**: Vào "Thanh toán" → "Nạp thêm credits" → chọn gói (vd: 5.000 credits) → thanh toán PayOS → xác nhận.

**Kết quả mong đợi**: Thanh toán xong → số dư credits tăng đúng; lịch sử ghi nhận giao dịch.

**Trường hợp ngoại lệ**: Không đủ credits nhưng có đang nạp thêm → hệ thống gợi ý nạp credit trước khi thực hiện.

📷 **Ảnh minh họa**: Trang nạp thêm credits — chọn gói số lượng credits — chụp màn hình và thay thế dòng này bằng hình.

## F41. Hậu kiểm gia hạn gói

**Mô tả**: Sau khi gia hạn (theo F39.3), kiểm tra trạng thái gói.

**Kết quả mong đợi**:

- Ngày hết hạn được **cộng dồn** đúng chu kỳ (tháng +1 tháng, năm +1 năm tính từ ngày kết thúc cũ).
- Credits **giữ nguyên** nếu gia hạn khi còn hạn; chỉ cấp lại khi gói đã hết hạn lâu.
- Không thể gia hạn lần 2 cho đến khi bắt đầu chu kỳ mới (còn hơn 35 ngày tháng / hơn 370 ngày năm → báo "đã có sẵn chu kỳ tiếp theo").

**Trường hợp ngoại lệ**:

- Trước khi hết hạn **1-3 ngày**, toàn bộ thành viên nhận email: "Gói X sắp hết hạn trong Y ngày" kèm nút gia hạn.

**Ghi chú cho tester**: Test "gói hết hạn" **không thể chờ thật** — liên hệ admin đặt ngày hết hạn tài khoản test về gần nhất. — _[ĐIỀN: tài khoản test / quy trình nhờ admin đặt hạn]_.

📷 **Ảnh minh họa**: Trang "Thanh toán" sau gia hạn — ngày hết hạn mới cộng dồn — chụp màn hình và thay thế dòng này bằng hình.

## F42. Nâng cấp cấu hình gói Enterprise (không reset chu kỳ)

**Mô tả**: Áp dụng cho khách **đang là Enterprise** muốn tăng thêm bot / credits — **không thay đổi ngày hết hạn, không reset chu kỳ**.

**Thao tác kiểm thử**: "Thanh toán" → "Mở rộng gói Doanh nghiệp" → nhập số bot thêm / credits thêm → hệ thống tính tiền → thanh toán PayOS → xác nhận.

**Kết quả mong đợi**:

- Ngày hết hạn **giữ nguyên** (khác với nâng cấp gói thường ở F39.2).
- Giới hạn cấu hình (số bot tối đa, credits/tháng) được **tăng đúng số đã đăng ký**.
- Credits bổ sung được **cộng ngay vào ví**, không chờ reset; không áp dụng bù trừ.
- Tiền phải trả = (số bot thêm × 10.000đ + credits thêm / 1.000 × 100.000đ) × **số tháng còn lại** (làm tròn lên, tối thiểu 1 tháng); gói năm áp dụng hệ số 10/12.

**Trường hợp ngoại lệ**:

- Không nhập bot/credit thêm → từ chối: "Vui lòng chọn số lượng bot hoặc credit cần nâng cấp bổ sung".
- Gói còn 10 ngày (dưới 1 tháng) → vẫn tính tròn 1 tháng (không tính theo ngày).

## F43. Lịch sử thanh toán

**Mô tả**: Liệt kê giao dịch của workspace (gói, số tiền, ngày, người trả, trạng thái hóa đơn).

**Kết quả mong đợi**: Hiển thị đầy đủ — kể cả giao dịch do thành viên khác thực hiện. Khi thành viên rời workspace, giao dịch họ từng trả vẫn giữ lại.

📷 **Ảnh minh họa**: Trang lịch sử thanh toán (giao dịch + người trả + trạng thái hóa đơn) — chụp màn hình và thay thế dòng này bằng hình.

### F43.1. Ma trận luồng thanh toán (tham khảo)

> Tóm tắt quy tắc cho từng kịch bản — tester đối chiếu kết quả thực tế với bảng này.

| Kịch bản                       | Thanh toán                                                               | Chu kỳ mới                       | Credit             | Ghi chú                                                |
| ------------------------------ | ------------------------------------------------------------------------ | -------------------------------- | ------------------ | ------------------------------------------------------ |
| Mua gói lần đầu (Standard/Pro) | Full giá niêm yết                                                        | Từ hôm nay                       | Cấp đủ             | —                                                      |
| Mua gói Enterprise (lần đầu)   | Tự động: 1.490.000 + (bot−50)×10.000 + (credit−10k)/1k×100.000; năm ×10  | Từ hôm nay                       | Cấp đủ             | Bot 50–2.000, credit 10k–100k, thanh toán bình thường  |
| Gia hạn (còn hạn)              | Full giá                                                                 | Cộng dồn (tháng+1tháng/năm+1năm) | Giữ nguyên         | Cùng chu kỳ hiện tại; chỉ gia hạn 1 lần đến chu kỳ mới |
| Gia hạn (đã hết hạn)           | Full giá                                                                 | Từ hôm nay                       | Cấp đủ             | —                                                      |
| Nâng cấp / Chuyển gói          | Giá mới − bù credit còn lại                                              | Từ ngày nâng cấp                 | Reset theo gói mới | Cùng chu kỳ; bù theo credit còn lại của kỳ hiện tại    |
| Nâng cấp cấu hình Enterprise   | (bot thêm×10.000 + credit thêm/1k×100.000) × tháng còn lại (tối thiểu 1) | **Giữ nguyên**                   | Cộng thêm ngay     | Không reset chu kỳ; credit cộng ngay; năm ×10/12       |
| Gói hết hạn không gia hạn      | —                                                                        | Tự về Free                       | Về mức Free        | Bot bị dừng, email thông báo                           |

⚠️ **Ràng buộc cần test**: (1) Gia hạn chỉ cùng chu kỳ — Enterprise chọn khác chu kỳ → từ chối. (2) Chỉ gia hạn được 1 lần: còn hơn 35 ngày (tháng) / hơn 370 ngày (năm) → báo "đã có sẵn chu kỳ tiếp theo". (3) Nâng cấp cấu hình Enterprise không đổi ngày hết hạn, chỉ tăng giới hạn + tính tiền theo đơn giá cấu hình × tháng còn lại.

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

**Mô tả**: Mỗi hóa đơn có mã tra cứu (lookup code) và link tra cứu trên cổng hóa đơn điện tử — khách chủ động kiểm tra.

**Thao tác kiểm thử**:

1. Vào lịch sử thanh toán → chọn giao dịch đã có hóa đơn "đã phát hành".
2. Sao chép mã tra cứu / nhấn link tra cứu.
3. Mở cổng tra cứu hóa đơn điện tử → nhập mã → xem chi tiết.

**Kết quả mong đợi**: Tra cứu ra đúng hóa đơn (số tiền, ngày, bên bán/mua khớp với giao dịch).

**Trường hợp ngoại lệ**:

- Hóa đơn chưa phát hành → chưa có mã tra cứu.
- Mã tra cứu sai → cổng báo "không tìm thấy hóa đơn".

📷 **Ảnh minh họa**: Lịch sử thanh toán — mã tra cứu + link cổng tra cứu hóa đơn — chụp màn hình và thay thế dòng này bằng hình.

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

**Kết quả mong đợi**: 1-3 ngày trước khi hết hạn, tất cả thành viên workspace nhận email nhắc gia hạn (chi tiết gói, ngày hết hạn, nút gia hạn).

📷 **Ảnh minh họa**: Email nhắc hết hạn gói (hộp thư) — chi tiết gói + ngày hết hạn — chụp màn hình và thay thế dòng này bằng hình.

## F50. Email thông báo hạ gói

**Kết quả mong đợi**: Khi gói bị chuyển về Miễn phí, thành viên nhận email thông báo kèm ngày hiệu lực.

📷 **Ảnh minh họa**: Email thông báo hạ gói (hộp thư) — chụp màn hình và thay thế dòng này bằng hình.

## F51. Email hóa đơn

**Mô tả**: Sau khi hóa đơn được phát hành, khách nhận email chứa thông tin hóa đơn (số tiền, ngày, mã số thuế bên mua) và mã tra cứu kèm link tra cứu.

**Kết quả mong đợi**: Email đến hộp thư người thanh toán (và thành viên liên quan) — đầy đủ thông tin hóa đơn + mã tra cứu.

**Trường hợp ngoại lệ**:

- Hóa đơn phát hành thất bại → không có email, ghi nhận trạng thái trong lịch sử thanh toán.

📷 **Ảnh minh họa**: Email hóa đơn (hộp thư) — thông tin hóa đơn + mã tra cứu + link — chụp màn hình và thay thế dòng này bằng hình.

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

# NHÓM 15 — NHÓM CHAT (GROUP CHAT)

> **Khái niệm**: Nhóm chat cho phép **nhiều người cùng chat chung với một Bot AI** trong một "phòng" riêng, thay vì mỗi người phải chat riêng. Chủ sở hữu Bot (Owner) tạo nhóm, mời thành viên qua email, và quản lý nhóm từ trang quản trị. Thành viên có thể **tạo Ghi chú nhóm** (tóm tắt kiến thức quan trọng, lưu riêng khỏi luồng chat), **ghim** các câu hỏi–trả lời hay vào kho tri thức (RAG) của Bot, và Manager nhận báo cáo tóm tắt hàng ngày.
> **Vai trò trong nhóm**: (1) **Chủ sở hữu Bot (Owner)** — tạo/sửa/xóa nhóm, mời thành viên, cấp quyền tạo ghi chú (`can_create_note`) và ghim (`can_pin_knowledge`); (2) **Thành viên được mời** — chat, reply, voice, tạo/sửa ghi chú (nếu được cấp `can_create_note`), ghim (nếu được cấp); (3) **Người ngoài (chưa là thành viên)** — bị từ chối truy cập.
> **Ghi chú nhóm (Group Note)**: là các "thẻ ghi chú" do thành viên tạo để lưu tóm tắt / kiến thức cần nhớ của nhóm — KHÁC với tin nhắn chat và KHÁC với Ghim kiến thức (Pin → RAG). Mỗi nhóm chỉ có **1 ghi chú đang hoạt động (active)** tại một thời điểm; tạo ghi chú mới sẽ tự động đưa ghi chú cũ về trạng thái "đã lưu trữ" (archived) nhưng vẫn giữ trong RAG. Ghi chú tiêu tốn **1 credit workspace** khi tạo, và được **hoàn 1 credit** khi xóa.
> **Điều kiện**: Tính năng Group Chat chỉ mở khi Bot thuộc **gói Pro trở lên** và Bot đã bật **trang chat độc lập** (có slug công khai).

## F60. Tạo nhóm chat

**Mô tả**: Chủ sở hữu Bot tạo một nhóm chat để tập hợp nhiều người cùng trò chuyện với Bot AI.

**Thao tác kiểm thử**:

1. Vào Dashboard → chọn Bot → tab **"Nhóm"** (Group).
2. Nếu Bot chưa có nhóm, nhấn nút **"Tạo nhóm chat"**.
3. Xác nhận tạo.

**Kết quả mong đợi**: Nhóm được tạo tự động, giao diện chuyển sang màn hình nhóm chat (trống, chờ tin nhắn). Bot xuất hiện trong nhóm với vai trò trả lời tự động.

**Trường hợp ngoại lệ**:

- Bot chưa thuộc gói Pro → hệ thống báo **"Tính năng nhóm chat yêu cầu gói Pro"** và đưa tới trang nâng cấp (không tạo được).
- Bot chưa bật trang chat độc lập (chưa có slug) → báo cần bật chat độc lập trước khi tạo nhóm.

📷 **Ảnh minh họa**: Tab "Nhóm" trong bot-detail + nút "Tạo nhóm chat" + màn hình nhóm trống sau khi tạo — chụp màn hình và thay thế dòng này bằng hình.

## F61. Mời thành viên vào nhóm

**Mô tả**: Chủ sở hữu mời đồng nghiệp/khách hàng vào nhóm qua email. Mỗi nhóm **tối đa 5 thành viên**.

**Thao tác kiểm thử**:

1. Tại tab Nhóm → phần quản lý thành viên, nhấn **"Mời thành viên"**.
2. Nhập email người được mời.
3. Nhấn gửi lời mời.

**Kết quả mong đợi**: Người được mời nhận email chứa link truy cập trực tiếp vào đúng nhóm. Thành viên xuất hiện trong danh sách thành viên (hoặc "đang chờ" nếu chưa vào).

**Trường hợp ngoại lệ**:

- Đã đạt giới hạn 5 thành viên → báo **"Đã đạt giới hạn 5 thành viên cho mỗi nhóm"**, không mời thêm.
- Email đã là thành viên → báo **"Email này đã là thành viên của nhóm"**.
- Đã gửi lời mời cho email này rồi → báo **"Đã gửi lời mời trước đó"**.
- Người gửi không phải Chủ sở hữu Bot → không được phép mời.

📷 **Ảnh minh họa**: Form "Mời thành viên nhóm" (nhập email) + thông báo giới hạn 5 người — chụp màn hình và thay thế dòng này bằng hình.

## F62. Tự động tạo tài khoản khách + Magic Link

**Mô tả**: Nếu email được mời **chưa có tài khoản Vielora**, hệ thống tự động tạo tài khoản và gửi link đăng nhập (Magic Link) — người nhận không cần đăng ký thủ công.

**Thao tác kiểm thử**:

1. Owner mời một email chưa từng có tài khoản Vielora.
2. Người nhận mở email mời → nhấn link.
3. Hệ thống tự đăng nhập và đưa vào nhóm.

**Kết quả mong đợi**: Tài khoản được tạo tự động (chưa xác nhận mật khẩu), đăng nhập thành công qua Magic Link, người dùng vào được nhóm chat ngay.

**Trường hợp ngoại lệ**:

- Link hết hạn / đã dùng → hiển thị thông báo "liên kết xác thực đã được sử dụng hoặc hết hạn", đề nghị Owner mời lại hoặc đăng nhập bằng email.

📷 **Ảnh minh họa**: Email mời nhóm gửi cho người chưa có tài khoản (có Magic Link) + màn hình nhóm sau khi click link — chụp màn hình và thay thế dòng này bằng hình.

## F63. Màn hình "Yêu cầu lời mời" (từ chối truy cập)

**Mô tả**: Người chưa đăng nhập hoặc không phải thành viên truy cập đường dẫn nhóm → thấy màn hình rõ ràng thay vì lỗi 404.

**Thao tác kiểm thử**:

1. Mở đường dẫn nhóm (`/public-bot/ten-bot/group`) khi chưa đăng nhập HOẶC khi đã đăng nhập bằng tài khoản không nằm trong nhóm.
2. Quan sát màn hình.

**Kết quả mong đợi**: Hiển thị màn hình **"Yêu cầu Lời mời Tham gia"** — giải thích nhóm riêng tư chỉ dành cho thành viên được mời. Có các nút: **Đăng nhập tài khoản** (nếu chưa login), **Chuyển đổi tài khoản** (nếu login sai email), và **Về trang Chat AI**.

**Trường hợp ngoại lệ**:

- Link xác thực trong email hết hạn (OTP expired) → toast thông báo "Liên kết xác thực đã hết hạn", hướng đăng nhập bằng email.

📷 **Ảnh minh họa**: Màn hình "Yêu cầu Lời mời Tham gia" (email hiện tại + 2 nút đăng nhập/chuyển tài khoản) — chụp màn hình và thay thế dòng này bằng hình.

## F64. Gửi tin nhắn, Reply, Voice & Toggle AI trả lời

**Mô tả**: Thành viên chat trong nhóm: gửi text, trả lời (quote) một tin, nhắn giọng nói (chuyển thành text tự động), và tự quyết định có cho Bot trả lời hay không.

**Thao tác kiểm thử**:

1. Nhập tin nhắn vào ô soạn → nhấn Enter (hoặc nút gửi) để gửi.
2. Di chuột lên một tin nhắn → bấm nút **Reply** để trả lời riêng tin đó.
3. Bấm nút **mic** để thu âm giọng nói → hệ thống tự nhận diện và gửi.
4. Bấm nút **Bot** (toggle) để bật/tắt chế độ "AI trả lời tự động".

**Yêu cầu nhập liệu**:

| Trường       | Bắt buộc | Quy tắc                    |
| ------------ | :------: | -------------------------- |
| Nội dung tin |    ✅    | Tối đa 1000 ký tự/tin nhắn |

**Kết quả mong đợi**:

- Tin nhắn hiện ngay trong nhóm (thấy cả mình và người khác realtime).
- Khi toggle **Bật**, Bot tự động trả lời (tiêu tốn 1 credit/lần).
- Khi toggle **Tắt**, Bot không trả lời (dùng để nói chuyện nội bộ giữa người).
- Voice: sau khi thu âm xong, text được gửi tự động (không cần bấm gửi).
- Tin được reply hiển thị banner "Đang trả lời [tên]" kèm trích dẫn.

**Trường hợp ngoại lệ**:

- Nhóm bị tắt (disabled) → không gửi được, chỉ xem lịch sử.
- Mất mạng → tin nhắn được xếp hàng, tự động gửi lại khi có kết nối.
- Nội dung vượt 1000 ký tự → bị chặn (không cho nhập thêm).

📷 **Ảnh minh họa**: Ô soạn tin nhóm (nút Bot toggle + mic + gửi) + banner reply + tin nhắn voice đã chuyển text — chụp màn hình và thay thế dòng này bằng hình.

## F65. Tin nhắn realtime & phân biệt chưa đọc

**Mô tả**: Tin mới xuất hiện ngay lập tức; hệ thống đánh dấu và phân biệt các tin thành viên **chưa đọc**.

**Kết quả mong đợi**:

- Tin nhắn mới (của người khác hoặc Bot) hiện realtime không cần refresh.
- Vạch ngăn **"Tin chưa đọc"** + số đếm hiển thị tại tin đầu tiên chưa đọc.
- Tự động cuộn xuống dưới khi có tin mới/bot reply (nếu đang ở gần cuối).
- Khi thành viên xem đến cuối → tự động đánh dấu đã đọc.

**Tình huống cần phủ**:

- **Cuộn lên tải tin cũ**: kéo lên đầu → hệ thống tự động tải thêm tin cũ, vị trí cuộn được giữ nguyên (không nhảy).
- **Mất kết nối realtime**: nếu kênh realtime fail, hệ thống tự động thăm dò (polling) mỗi 5 giây (chỉ khi tab đang mở) để cập nhật tin mới.
- **Offline banner**: khi mất mạng, hiển thị thanh cảnh báo ngoại tuyến.

📷 **Ảnh minh họa**: Vạch "Tin chưa đọc" + đếm + auto-scroll + thanh offline — chụp màn hình và thay thế dòng này bằng hình.

## F66. Ghim kiến thức (Pin → RAG)

**Mô tả**: Thành viên được cấp quyền có thể **ghim một câu hỏi–trả lời hay** vào kho kiến thức của Bot — Bot sẽ nhớ và dùng để trả lời thông minh hơn ở các hội thoại sau (nạp vào RAG).

**Thao tác kiểm thử**:

1. Di chuột lên một tin nhắn (của Bot, hoặc của user có Bot đã reply) → bấm nút **Ghim**.
2. Xác nhận ghim.

**Kết quả mong đợi**:

- Hệ thống tự động tách **Câu hỏi** (từ user) và **Câu trả lời** (từ Bot), tạo embedding và nạp vào kho RAG (`documents`, `source = chat_pin`). Lần sau Bot tự dùng tri thức này để trả lời.
- **Tiêu tốn 1 credit** workspace khi ghim thành công (transaction `AddKnowledge`).
- Owner xem/danh sách kiến thức đã ghim qua Dashboard (Pinned Knowledge).

**Trường hợp ngoại lệ**:

- Thành viên **không có quyền ghim** (`can_pin_knowledge = false`) → không thấy nút Ghim (API trả 403).
- Tin đã được ghim rồi → báo **"Tin nhắn đã được ghim"** (`GROUP_ALREADY_PINNED_CODE`), không ghim trùng.
- **Không đủ credit** → báo lỗi, không ghim (không trừ credit).
- Nếu ghim thất bại ở bước lưu DB → **tự động hoàn lại 1 credit** đã trừ.
- **Bỏ ghim (Owner)**: xóa cả bản ghi `chat_knowledge` và embedding tương ứng trong `documents` — Bot không còn dùng tri thức đó.

📷 **Ảnh minh họa**: Nút Ghim trên tin nhắn (chỉ hiện khi có quyền) + danh sách Pinned Knowledge trên Dashboard + thông báo trừ credit — chụp màn hình và thay thế dòng này bằng hình.

## F67. Bật / tắt nhóm (chế độ chỉ đọc)

**Mô tả**: Chủ sở hữu tạm dừng hoặc bật lại nhóm chat.

**Thao tác kiểm thử**:

1. Dashboard → Bot → tab Nhóm → chuyển trạng thái (active / disabled).

**Kết quả mong đợi**:

- Khi **tắt (disabled)**: thành viên không gửi được tin nhắn, chỉ xem lịch sử; Bot không trả lời.
- Khi **bật lại**: mọi người chat bình thường.

📷 **Ảnh minh họa**: Toggle trạng thái nhóm (active/disabled) trên Dashboard — chụp màn hình và thay thế dòng này bằng hình.

## F68. Rời nhóm / Xóa thành viên

**Mô tả**: Thành viên tự rời nhóm, hoặc Chủ sở hữu xóa thành viên khỏi nhóm.

**Thao tác kiểm thử**:

1. Mở danh sách thành viên (drawer) → bấm **"Rời nhóm"** (thành viên) hoặc nút xóa (Owner).
2. Xác nhận.

**Kết quả mong đợi**:

- Thành viên rời → không còn thấy nhóm trong danh sách của mình.
- Owner xóa thành viên → người bị xóa mất quyền truy cập nhóm ngay.

📷 **Ảnh minh họa**: Drawer thành viên nhóm (nút "Rời nhóm" + xóa thành viên) — chụp màn hình và thay thế dòng này bằng hình.

## F69. Báo cáo tóm tắt hàng ngày (Insights)

**Mô tả**: Hệ thống tự động tóm tắt cuộc hội thoại nhóm trong 24 giờ qua, chạy mỗi ngày lúc **2h sáng** (cron `0 2 * * *`), và lưu kết quả vào **2 nơi**: (1) bảng `group_chat_insights` để Manager xem trên Dashboard, (2) bảng `documents` (`source = daily_group_summary`) để **dùng làm kiến thức bot** (RAG) — Bot tự tham khảo khi trả lời sau này.

**Thao tác kiểm thử**:

1. Mở Dashboard → Bot → tab Nhóm → phần **Insights (Tóm tắt)**.
2. Xem tóm tắt của ngày hôm trước.
3. (Kiểm tra kiến thức bot) Hỏi Bot một nội dung đã nhắc đến trong chat ngày hôm trước → Bot trả lời dựa trên bản tóm tắt đã lưu.

**Kết quả mong đợi**:

- Hiển thị tóm tắt các **chủ đề thảo luận chính** bằng tiếng Việt của cuộc hội thoại nhóm trong 24h qua (số lượng ý tùy nội dung, không cố định 3–5).
- Bản tóm tắt được nạp vào RAG (`documents`) → Bot dùng làm kiến thức trả lời.
- Nếu ngày đó đã có tóm tắt → **cập nhật (upsert)**, không tạo trùng.

**Tình huống cần phủ**:

- Nhóm có **ít hơn 2 tin nhắn** trong 24h → hệ thống bỏ qua, không tạo tóm tắt (không lỗi).
- Chỉ lấy **tối đa 30 tin nhắn gần nhất** và **loại bỏ tin đã xóa** (`deleted_at`).
- Nhóm không ở trạng thái Active → không tóm tắt.
- Owner kiểm tra được tóm tắt cập nhật qua ngày (cron chạy hàng ngày lúc 2h sáng).

📷 **Ảnh minh họa**: Phần Insights trên Dashboard nhóm (tóm tắt ngày) + minh chứng Bot trả lời dựa trên tóm tắt đã lưu — chụp màn hình và thay thế dòng này bằng hình.

## F70. Tạo ghi chú nhóm (Group Note)

**Mô tả**: Thành viên được cấp quyền tạo ghi chú (Owner hoặc thành viên có `can_create_note = true`) tạo một "thẻ ghi chú" tóm tắt kiến thức quan trọng của nhóm — lưu riêng khỏi luồng chat, và được nạp vào kho tri thức Bot (RAG) để Bot tham khảo khi trả lời.

**Thao tác kiểm thử**:

1. Mở nhóm chat → nhấn nút **"+ Ghi chú"** (chỉ hiện khi người dùng có quyền tạo ghi chú).
2. Nhập **Tiêu đề** và **Nội dung** (rich text editor) cho ghi chú.
3. Nhấn **"Lưu"**.

**Yêu cầu nhập liệu**:

| Trường    | Bắt buộc | Quy tắc                                  |
| --------- | :------: | ---------------------------------------- |
| Tiêu đề   |    ✅    | Tối đa 100 ký tự                         |
| Nội dung  |    ✅    | Tối đa 5000 ký tự (rich text / markdown) |

**Kết quả mong đợi**:

- Ghi chú được tạo, hiển thị dạng **banner** (NoteBanner) ở đầu nhóm chat.
- Hệ thống gửi **thông báo hệ thống** trong nhóm: "**[tên] đã tạo ghi chú: [tiêu đề]**".
- Nội dung ghi chú được **nạp vào RAG** (`documents`, `source = group_note`) → Bot dùng làm kiến thức trả lời.
- **Tiêu tốn 1 credit workspace** khi tạo thành công (transaction `AddKnowledge`).
- Nếu trước đó nhóm đã có ghi chú active → ghi chú cũ tự động chuyển sang **"đã lưu trữ" (archived)** nhưng vẫn giữ trong RAG (mỗi nhóm chỉ 1 active tại 1 thời điểm).

**Trường hợp ngoại lệ**:

- Người dùng **không có quyền tạo ghi chú** (`can_create_note = false`) → không thấy nút "+ Ghi chú" (API trả 403).
- **Không đủ credit** → báo lỗi, không tạo (không trừ credit).
- Thiếu Tiêu đề / Nội dung → nút Lưu bị vô hiệu hóa.

📷 **Ảnh minh họa**: Nút "+ Ghi chú" + modal tạo ghi chú (tiêu đề + rich text) + banner ghi chú sau khi lưu + thông báo hệ thống — chụp màn hình và thay thế dòng này bằng hình.

## F71. Sửa / cập nhật ghi chú

**Mô tả**: Người tạo ghi chú (hoặc Owner) chỉnh sửa tiêu đề / nội dung ghi chú đã tạo.

**Thao tác kiểm thử**:

1. Tại banner ghi chú → nhấn nút **"Sửa"**.
2. Thay đổi Tiêu đề / Nội dung.
3. Nhấn **"Lưu"**.

**Kết quả mong đợi**:

- Ghi chú được cập nhật, banner hiển thị nội dung mới.
- RAG được **cập nhật (upsert)** — embedding cũ bị thay thế bằng embedding mới (không tạo bản ghi trùng).
- **Tiêu tốn thêm 1 credit workspace** khi cập nhật (transaction `AddKnowledge`) — kiểm chứng số credit giảm đúng.

**Trường hợp ngoại lệ**:

- Thành viên **không phải người tạo và không phải Owner** → không thấy nút Sửa (API trả 403).
- **Không đủ credit** khi cập nhật → báo lỗi, không lưu (không trừ credit).

📷 **Ảnh minh họa**: Modal sửa ghi chú + thông báo trừ credit khi cập nhật — chụp màn hình và thay thế dòng này bằng hình.

## F72. Xóa ghi chú & hoàn credit

**Mô tả**: Người tạo ghi chú (hoặc Owner) xóa ghi chú khỏi nhóm.

**Thao tác kiểm thử**:

1. Tại banner ghi chú → nhấn nút **"Xóa"** → xác nhận trong hộp thoại **"Xóa ghi chú"**.
2. Quan sát số credit workspace trước/sau.

**Kết quả mong đợi**:

- Ghi chú bị xóa khỏi banner và danh sách.
- Embedding tương ứng trong RAG (`documents`) bị **xóa hoàn toàn** → Bot không còn dùng tri thức đó.
- **Hoàn lại 1 credit workspace** (refund transaction `AddKnowledgeRefund`) — số credit tăng đúng 1 đơn vị so với trước khi xóa.
- Hệ thống gửi thông báo hệ thống: "**[tên] đã xóa ghi chú**".

**Trường hợp ngoại lệ**:

- Xóa thất bại ở bước xóa DB/RAG → **tự động hoàn lại credit** đã trừ (nếu có trừ trước).
- Thành viên không có quyền → không thấy nút Xóa.

📷 **Ảnh minh họa**: Hộp thoại xác nhận "Xóa ghi chú" + thông báo hoàn credit — chụp màn hình và thay thế dòng này bằng hình.

## F73. Ghim / bỏ ghim ghi chú (Pin / Unpin)

**Mô tả**: Khi có nhiều ghi chú (active + archived), Owner hoặc người tạo có thể **ghim** một ghi chú để nó luôn hiển thị ở đầu nhóm (ưu tiên trên các ghi chú khác).

**Thao tác kiểm thử**:

1. Mở tab **"Ghi chú"** trong drawer nhóm → tìm ghi chú cần ghim → nhấn biểu tượng **ghim**.
2. Quay lại nhóm chat → quan sát banner.

**Kết quả mong đợi**:

- Ghi chú được ghim hiển thị **đầu tiên** (trên ghi chú active chưa ghim).
- Bỏ ghim → ghi chú về vị trí mặc định (theo thời gian tạo).

📷 **Ảnh minh họa**: Tab "Ghi chú" với nút ghim + banner ghi chú đã ghim ở đầu — chụp màn hình và thay thế dòng này bằng hình.

## F74. Phân quyền tạo ghi chú (can_create_note)

**Mô tả**: Chủ sở hữu Bot cấp / thu quyền tạo ghi chú cho từng thành viên — từ 2 nơi: (1) Tab "Thành viên" trong drawer nhóm chat, hoặc (2) Trang quản lý Bot → chi tiết nhóm → danh sách thành viên (MemberList).

**Thao tác kiểm thử**:

1. Tại danh sách thành viên → tìm thành viên → bật/tắt toggle **"Tạo ghi chú"** (cạnh toggle "Ghim kiến thức KT").
2. Đăng nhập bằng tài khoản thành viên đó → kiểm tra nút "+ Ghi chú" có hiện hay không.

**Kết quả mong đợi**:

- Bật quyền → thành viên thấy nút "+ Ghi chú" và có thể tạo/sửa/xóa ghi chú.
- Tắt quyền → nút "+ Ghi chú" biến mất; nếu truy cập API tạo ghi chú → trả **403**.

**Trường hợp ngoại lệ**:

- Chỉ Owner mới được cấp quyền (thành viên thường không thể tự bật cho mình).

📷 **Ảnh minh họa**: Toggle "Tạo ghi chú" trong danh sách thành viên (cả 2 nơi: drawer nhóm & MemberList bot-detail) + badge "Được tạo ghi chú" — chụp màn hình và thay thế dòng này bằng hình.

## F75. Xem danh sách ghi chú (tab "Ghi chú")

**Mô tả**: Thành viên xem lại tất cả ghi chú của nhóm (cả active và đã lưu trữ) qua tab chuyên biệt trong drawer nhóm.

**Thao tác kiểm thử**:

1. Mở drawer nhóm → chuyển sang tab **"Ghi chú"** (cạnh tab "Thành viên").
2. Quan sát danh sách, cuộn xuống khi có nhiều ghi chú.

**Kết quả mong đợi**:

- Danh sách hiển thị tất cả ghi chú (active + archived), có nhãn phân biệt trạng thái.
- Phân trang **20 ghi chú / trang** — khi cuộn đến cuối, hệ thống tự tải trang tiếp theo (load more).

📷 **Ảnh minh họa**: Tab "Ghi chú" liệt kê ghi chú (active + archived) + phân trang — chụp màn hình và thay thế dòng này bằng hình.

## F76. Tạo ghi chú bằng giọng nói (Voice-to-Note)

**Mô tả**: Thay vì gõ, người dùng bấm mic trong editor ghi chú, đọc nội dung — hệ thống tự nhận dạng (STT), **AI định dạng lại** (chỉnh chính tả, cấu trúc hóa thành tiêu đề + nội dung sạch) và hiển thị lên editor để người dùng sửa trước khi lưu. KHÔNG tự động lưu.

**Thao tác kiểm thử**:

1. Mở editor ghi chú (nút "+ Ghi chú") → bấm nút **mic** (bên trong editor, scope Bot).
2. Đọc nội dung cần ghi chú (tối đa 180 giây).
3. Dừng thu âm → chờ hệ thống xử lý (thấy trạng thái "Đang định dạng ghi chú…").
4. Quan sát: **Tiêu đề** và **Nội dung** được điền tự động (đã chỉnh sửa chính tả, cấu trúc markdown).
5. Sửa nếu cần → nhấn **"Lưu"**.

**Kết quả mong đợi**:

- Bước STT tiêu tốn **1 credit** (transaction STT).
- Bước lưu ghi chú tiêu tốn **1 credit AddKnowledge** (tổng 2 credit cho 1 voice-note).
- Nội dung AI định dạng: **sửa chính tả**, **cấu trúc hóa** (heading / bullet / markdown sạch), **giữ nguyên nghĩa** (không bịa thêm).
- Hiển thị vào ô Tiêu đề + rich text editor — **chưa lưu** cho đến khi user bấm Lưu.
- Nếu AI không thể phân tích → fallback: điền text thô để user tự sửa.

**Trường hợp ngoại lệ**:

- **Không đủ credit STT** → báo lỗi, không thể tạo voice-note.
- Thu âm quá 180s → hệ thống tự dừng / báo giới hạn.
- Mất mạng trong lúc STT → báo lỗi, cho thử lại.

📷 **Ảnh minh họa**: Nút mic trong editor ghi chú + trạng thái "Đang định dạng" + kết quả tiêu đề/nội dung được AI điền sẵn — chụp màn hình và thay thế dòng này bằng hình.

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
| Trang nhóm chat     | `/public-bot/ten-bot/group`          |

---

_HẾT TÀI LIỆU_

📷 **Ảnh minh họa**: Giao diện quản lý bot trong Shopify (App Bridge) — chụp màn hình và thay thế dòng này bằng hình.
