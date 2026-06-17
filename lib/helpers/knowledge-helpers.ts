import { ALLOWED_KNOWLEDGE_FILE_EXTENSIONS, MAX_KNOWLEDGE_FILE_SIZE } from "@/config/knowledge";

interface KnowledgeFileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateKnowledgeFile(file: File): KnowledgeFileValidationResult {
  const allowedExtensions = ALLOWED_KNOWLEDGE_FILE_EXTENSIONS.map((ext) => ext.toLowerCase());
  const fileName = file.name.toLowerCase();
  const isAllowedExtension = allowedExtensions.some((ext) => fileName.endsWith(ext));

  if (!isAllowedExtension) {
    return {
      valid: false,
      error: `Định dạng tệp không được hỗ trợ. Chỉ chấp nhận: ${ALLOWED_KNOWLEDGE_FILE_EXTENSIONS.join(", ")}.`,
    };
  }

  if (file.size > MAX_KNOWLEDGE_FILE_SIZE) {
    return {
      valid: false,
      error: "Tệp vượt quá 10MB. Vui lòng chọn tệp nhỏ hơn.",
    };
  }

  return { valid: true };
}
