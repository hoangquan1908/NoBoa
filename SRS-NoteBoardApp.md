# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
## Ứng dụng Note kèm To-do List và Board (Note-Board App)

**Phiên bản:** 1.0
**Ngày:** 06/07/2026

---

## 1. Giới thiệu

### 1.1 Mục đích
Tài liệu này mô tả yêu cầu chức năng và phi chức năng của ứng dụng Note-Board — một ứng dụng ghi chú cho phép người dùng quản lý công việc dạng danh sách (to-do list) và tổ chức ý tưởng trực quan trên một bảng ghim tự do (board), bao gồm ảnh, ghi chú, nét vẽ tay và liên kết giữa các phần tử.

### 1.2 Phạm vi
Sản phẩm là một ứng dụng web, cho phép người dùng:
- Tạo và quản lý nhiều ghi chú/dự án.
- Trong mỗi ghi chú, quản lý một danh sách công việc (to-do list).
- Trong mỗi ghi chú, tạo và quản lý nhiều "board" — không gian bảng tự do để dán ảnh, ghi chú, vẽ tay và nối dây liên kết giữa các phần tử.
- Dữ liệu được đồng bộ lên backend (Supabase) để lưu trữ lâu dài, đồng bộ đa thiết bị.

### 1.3 Định nghĩa, thuật ngữ viết tắt
| Thuật ngữ | Ý nghĩa |
|---|---|
| Note | Một ghi chú/dự án, chứa 1 to-do list và nhiều board |
| Board | Không gian bảng tự do trong 1 note, chứa các item |
| Board Item | Một phần tử trên board: ảnh, sticky note, hoặc text box |
| Stroke | Một nét vẽ tay trên board |
| Link | Đường dây nối giữa 2 board item |
| SRS | Software Requirements Specification |

### 1.4 Đối tượng sử dụng tài liệu
Nhà phát triển, người thiết kế hệ thống, và người kiểm thử sử dụng tài liệu này làm cơ sở triển khai và kiểm tra sản phẩm.

---

## 2. Mô tả tổng quan

### 2.1 Bối cảnh sản phẩm
Ứng dụng độc lập (standalone), không tích hợp vào hệ thống lớn hơn. Gồm 2 phần:
- **Frontend**: React + Vite, chạy trên trình duyệt.
- **Backend**: Supabase (PostgreSQL + Storage + Auth).

### 2.2 Đối tượng người dùng
- Người dùng cá nhân cần công cụ vừa quản lý task vừa tổ chức ý tưởng trực quan (mind-mapping nhẹ, mood board, moodboard cho dự án cá nhân...).

### 2.3 Ràng buộc thiết kế
- Phải hoạt động mượt trên trình duyệt hiện đại (Chrome, Edge, Firefox, Safari bản mới).
- Thao tác vẽ, kéo thả trên board phải phản hồi tức thời (local-first), dữ liệu đồng bộ lên server theo cơ chế debounce autosave, không chặn thao tác người dùng.
- Ảnh tải lên lưu tại Supabase Storage, không lưu base64 trong database.

### 2.4 Giả định và phụ thuộc
- Người dùng có kết nối Internet để đồng bộ dữ liệu (có thể thao tác offline tạm thời, đồng bộ lại khi có mạng — xem mục 3.9).

---

## 3. Use Case

### 3.1 Danh sách Actor
- **User**: người dùng đã đăng nhập, thao tác chính trên hệ thống.

### 3.2 Sơ đồ tổng quan Use Case (mô tả dạng danh sách)

**Nhóm quản lý Note**
- UC-01: Tạo ghi chú mới
- UC-02: Xoá ghi chú
- UC-03: Đổi tên ghi chú

**Nhóm To-do List**
- UC-04: Thêm task
- UC-05: Đánh dấu hoàn thành task
- UC-06: Sửa/xoá task
- UC-07: Lọc task theo trạng thái

**Nhóm quản lý Board**
- UC-08: Tạo board mới trong 1 note
- UC-09: Đổi tên / xoá / nhân bản board
- UC-10: Chuyển đổi giữa các board

**Nhóm thao tác trên Board**
- UC-11: Thêm ảnh lên board
- UC-12: Thêm sticky note lên board
- UC-13: Di chuyển / xoay / xoá item trên board
- UC-14: Vẽ tay tự do lên board
- UC-15: Tẩy / xoá nét vẽ
- UC-16: Nối dây liên kết giữa 2 item
- UC-17: Xoá dây liên kết
- UC-18: Xem ảnh phóng to (lightbox)
- UC-19: Phóng to / thu nhỏ và di chuyển vùng nhìn (zoom & pan)
- UC-20: Undo / Redo thao tác trên board
- UC-21: Xuất board ra file ảnh (PNG)

### 3.3 Mô tả chi tiết một số Use Case chính

---

**UC-11: Thêm ảnh lên board**
- **Actor**: User
- **Điều kiện trước**: User đang mở 1 board.
- **Luồng chính**:
  1. User bấm nút "Thêm ảnh" trên thanh công cụ.
  2. Hệ thống mở hộp thoại chọn file ảnh (hỗ trợ chọn nhiều file).
  3. User chọn 1 hoặc nhiều ảnh.
  4. Hệ thống tải ảnh lên Supabase Storage, tạo board item loại "photo" với vị trí ngẫu nhiên trên khung nhìn hiện tại.
  5. Ảnh hiển thị trên board dạng khung nhỏ có thể kéo thả.
- **Luồng phụ**: Nếu upload thất bại (mất mạng), hệ thống lưu tạm local, hiển thị trạng thái "đang chờ đồng bộ" và tự thử lại.
- **Điều kiện sau**: Ảnh được lưu vào bảng `board_items`, file lưu tại Storage.

---

**UC-14: Vẽ tay tự do lên board**
- **Actor**: User
- **Điều kiện trước**: User đang ở chế độ "Vẽ" trên board.
- **Luồng chính**:
  1. User chọn công cụ vẽ, chọn màu và độ dày nét.
  2. User giữ chuột/chạm và di chuyển để vẽ.
  3. Hệ thống ghi lại nét vẽ dưới dạng danh sách điểm (points), gắn theo toạ độ thực của board (không phải toạ độ màn hình) để khi zoom/pan nét vẽ vẫn đúng vị trí.
  4. Khi nhả chuột, nét vẽ được lưu thành 1 `stroke` hoàn chỉnh, đẩy vào lịch sử undo.
- **Điều kiện sau**: Stroke được lưu vào bảng `board_strokes`, đồng bộ lên server sau debounce.

---

**UC-16: Nối dây liên kết giữa 2 item**
- **Actor**: User
- **Điều kiện trước**: Board có ít nhất 2 item.
- **Luồng chính**:
  1. User bật "Chế độ nối dây".
  2. User click vào item thứ nhất (item được đánh dấu chọn).
  3. User click vào item thứ hai.
  4. Hệ thống vẽ một đường cong nối 2 item, lưu bản ghi liên kết.
- **Luồng phụ**: Nếu user click lại item thứ nhất để huỷ chọn, thao tác được reset.
- **Điều kiện sau**: Bản ghi được lưu vào bảng `board_links`. Khi 1 trong 2 item bị xoá, liên kết bị xoá theo (cascade).

---

**UC-18: Xem ảnh phóng to (lightbox)**
- **Actor**: User
- **Luồng chính**:
  1. User click vào 1 ảnh trên board (ngoài chế độ vẽ/nối dây).
  2. Hệ thống hiển thị ảnh phóng to ở giữa màn hình, nền phía sau bị làm mờ/tối.
  3. User có thể chuyển ảnh kế tiếp/trước đó (nếu board có nhiều ảnh) bằng nút mũi tên.
  4. User đóng lightbox bằng nút X, click ra ngoài, hoặc phím Esc.
- **Điều kiện sau**: Không thay đổi dữ liệu, chỉ là thao tác xem.

---

**UC-19: Phóng to / thu nhỏ và di chuyển vùng nhìn**
- **Actor**: User
- **Luồng chính**:
  1. User dùng scroll chuột hoặc nút +/- để zoom in/out.
  2. User giữ phím Space (hoặc dùng 2 ngón trên trackpad) để pan bảng.
  3. Toạ độ hiển thị của toàn bộ item, stroke, và dây liên kết được tính lại theo ma trận biến đổi (transform matrix) hiện tại, không thay đổi toạ độ gốc lưu trong database.
- **Điều kiện sau**: Trạng thái zoom/pan hiện tại có thể được lưu theo board (viewport state) để lần sau mở lại đúng vị trí đã xem.

---

**UC-20: Undo / Redo thao tác trên board**
- **Actor**: User
- **Luồng chính**:
  1. Mọi thao tác thay đổi trạng thái board (thêm/xoá/di chuyển item, vẽ/xoá nét vẽ, thêm/xoá dây) được đẩy vào một stack lịch sử cục bộ.
  2. User nhấn Ctrl+Z hoặc nút Undo → hệ thống hoàn tác thao tác gần nhất.
  3. User nhấn Ctrl+Shift+Z hoặc nút Redo → hệ thống làm lại thao tác vừa hoàn tác.
- **Điều kiện sau**: Trạng thái board được đồng bộ lại lên server sau khi undo/redo, theo cơ chế debounce như thao tác thường.

---

### 3.4 Ma trận Use Case theo module

| Module | Use Case liên quan |
|---|---|
| Note | UC-01, UC-02, UC-03 |
| To-do List | UC-04 → UC-07 |
| Quản lý Board | UC-08 → UC-10 |
| Thao tác Board | UC-11 → UC-21 |

---

## 4. Yêu cầu phi chức năng

| Loại | Mô tả |
|---|---|
| Hiệu năng | Thao tác kéo thả, vẽ tay phải phản hồi < 16ms (mượt ở 60fps) trên local, không chờ phản hồi server |
| Độ tin cậy | Autosave debounce 1.5-2 giây sau khi ngừng thao tác; dữ liệu tạm lưu IndexedDB nếu mất mạng |
| Khả năng mở rộng | Database thiết kế cho phép thêm loại board item mới (ví dụ: shape, connector kiểu khác) mà không đổi schema gốc |
| Bảo mật | Áp dụng Row Level Security (RLS) trên Supabase, mỗi user chỉ truy cập được note/board của chính mình |
| Khả năng dùng | Giao diện tối giản, thao tác chính (thêm ảnh, note, vẽ) không quá 2 click |

---

## 5. Thiết kế cơ sở dữ liệu

### 5.1 Sơ đồ quan hệ (mô tả)

```
users (Supabase Auth) 1───* notes 1───1 todo (embedded trong tasks)
                          │
                          1───* tasks
                          │
                          1───* boards
                                  │
                                  1───* board_items
                                  1───* board_links (tham chiếu 2 board_items)
                                  1───* board_strokes
```

### 5.2 Chi tiết các bảng

**Bảng `notes`**
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → auth.users | |
| title | text | Tiêu đề ghi chú |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Bảng `tasks`**
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid, PK | |
| note_id | uuid, FK → notes.id, ON DELETE CASCADE | |
| content | text | Nội dung task |
| is_done | boolean | Trạng thái hoàn thành |
| position | integer | Thứ tự hiển thị |
| created_at | timestamptz | |

**Bảng `boards`**
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid, PK | |
| note_id | uuid, FK → notes.id, ON DELETE CASCADE | |
| name | text | Tên board (vì 1 note có nhiều board) |
| viewport_x | float | Vị trí pan đã lưu |
| viewport_y | float | |
| viewport_zoom | float | Mức zoom đã lưu |
| created_at | timestamptz | |

**Bảng `board_items`**
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid, PK | |
| board_id | uuid, FK → boards.id, ON DELETE CASCADE | |
| type | text | 'photo' \| 'sticky_note' \| 'text_box' |
| content | text | Text nếu là note/textbox; NULL nếu là ảnh |
| image_url | text | URL Supabase Storage, NULL nếu không phải ảnh |
| pos_x | float | Toạ độ thực trên board |
| pos_y | float | |
| rotation | float | Góc xoay (độ) |
| color | text | Màu nền (áp dụng cho sticky note) |
| z_index | integer | Thứ tự lớp hiển thị |
| locked | boolean | Có khoá không cho kéo hay không |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Bảng `board_links`**
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid, PK | |
| board_id | uuid, FK → boards.id, ON DELETE CASCADE | |
| item_a_id | uuid, FK → board_items.id, ON DELETE CASCADE | |
| item_b_id | uuid, FK → board_items.id, ON DELETE CASCADE | |
| color | text | Màu dây |
| created_at | timestamptz | |

**Bảng `board_strokes`**
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid, PK | |
| board_id | uuid, FK → boards.id, ON DELETE CASCADE | |
| points | jsonb | Mảng toạ độ [{x, y}, ...] theo hệ toạ độ thực của board |
| color | text | Màu nét vẽ |
| width | float | Độ dày nét |
| created_at | timestamptz | |

### 5.3 Ràng buộc và chỉ mục quan trọng
- Index trên `tasks.note_id`, `boards.note_id`, `board_items.board_id`, `board_links.board_id`, `board_strokes.board_id` để truy vấn theo board/note nhanh.
- `ON DELETE CASCADE` xuyên suốt: xoá note → xoá toàn bộ task/board liên quan; xoá board → xoá toàn bộ item/link/stroke; xoá item → xoá link liên quan.
- Row Level Security: mọi bảng đều kiểm tra `auth.uid() = notes.user_id` (thông qua join hoặc policy tương ứng) trước khi cho phép đọc/ghi.

---

## 6. Phụ lục — Ngăn xếp công nghệ đề xuất

| Thành phần | Công nghệ |
|---|---|
| Frontend | React + Vite + TypeScript + TailwindCSS + Zustand |
| Vẽ & canvas | SVG hoặc HTML Canvas cho lớp vẽ tay và dây liên kết |
| Local cache | IndexedDB (lưu tạm trước khi autosave) |
| Backend | Supabase (PostgreSQL + Storage + Auth + Row Level Security) |
| Xử lý phía server (nếu cần) | Supabase Edge Functions (export PNG, tạo link chia sẻ) |
