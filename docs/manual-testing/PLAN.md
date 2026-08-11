# Vielora Manual Testing Catalog — Task Plan

**Version**: 1.0 | **Date**: 2026-07-26 | **Author**: BA/Tech Lead
**Deliverable**: `Vielora_Manual_Test_Catalog.docx` (sẵn sàng bàn giao team tester)

---

## 📋 Task Breakdown

| Task   | Mô tả                                                                   | Output                                   | Skill sử dụng                    |
| ------ | ----------------------------------------------------------------------- | ---------------------------------------- | -------------------------------- |
| **T1** | Khai thác codebase: API routes, Zod schemas, form constraints, services | Dữ liệu chính xác field/ràng buộc        | find-skills, codebase-inspection |
| **T2** | Viết Feature Catalog (markdown — source of truth)                       | `docs/manual-testing/feature-catalog.md` | ba-tech-spec-authoring           |
| **T3** | Sinh DOCX từ catalog                                                    | `Vielora_Manual_Test_Catalog.docx`       | docx-generation                  |
| **T4** | Verify DOCX (mở lại, check structure, tiếng Việt)                       | Pass/FAIL report                         | docx-generation/verify           |

## 📐 Cấu trúc mỗi test spec

```
[Feature ID] Tên tính năng
├── Mô tả
├── Điều kiện tiên quyết (preconditions)
├── Output mong muốn (khi thành công)
├── Ngoại lệ (các case lỗi + response)
├── Form fields (nếu có): Trường | Bắt buộc | Ràng buộc | Ghi chú
└── Luồng thực hiện từng bước (numbered steps)
```

## 📚 14 Nhóm Nghiệp Vụ

1. Xác thực & Bảo mật (F01–F05)
2. Phiên & Người dùng (F06–F09)
3. Workspace (F10–F18)
4. Bot Management (F19–F27)
5. Knowledge & RAG (F28–F36)
6. Chatbot & Widget (F37–F45)
7. Analytics (F46–F50)
8. Subscription & Billing (F51–F59)
9. Hóa đơn (F60–F63)
10. Email (F64–F68)
11. Webhook (F69–F72)
12. Support & Admin (F73–F75)
13. Platform & Tích hợp (F76–F81)
14. Infrastructure (F82–F87)

## 🎯 Tiêu chí hoàn thành

- [ ] Mọi feature có ID, tên, mô tả, output, ngoại lệ
- [ ] Mọi form có bảng trường + ràng buộc (đúng codebase)
- [ ] Mọi luồng chính có steps numbered
- [ ] DOCX mở được, heading style chuẩn, tiếng Việt đầy đủ
- [ ] Khớp 100% hiện trạng codebase (2 roles: owner/admin)
