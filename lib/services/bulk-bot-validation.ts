export interface RawBulkRow {
  name?: string;
  slug?: string;
  avatar_url?: string;
  avatar?: string;
  knowledge_title?: string;
  knowledge_content?: string;
  [key: string]: string | undefined;
}

export interface ValidatedBulkRow {
  index: number;
  name: string;
  slug: string;
  avatarUrl?: string;
  knowledgeTitle: string;
  knowledgeContent: string;
  isValid: boolean;
  errorReason?: string;
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_TITLE_LENGTH = 100;
const MAX_CONTENT_LENGTH = 10000;

/**
 * Parse CSV string text into RawBulkRow array with quote & multiline support
 */
export function parseCSVString(csvText: string): RawBulkRow[] {
  // Strip UTF-8 BOM
  let cleanText = csvText;
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.slice(1);
  }

  const records: string[][] = [];
  let currentRecord: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i += 1) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRecord.push(currentField);
      currentField = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }
      currentRecord.push(currentField);
      currentField = "";
      if (currentRecord.some((f) => f.trim().length > 0)) {
        records.push(currentRecord);
      }
      currentRecord = [];
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRecord.length > 0) {
    currentRecord.push(currentField);
    if (currentRecord.some((f) => f.trim().length > 0)) {
      records.push(currentRecord);
    }
  }

  if (records.length < 2) return [];

  const headers = records[0].map((h) => h.trim().toLowerCase());
  const rows: RawBulkRow[] = [];

  for (let i = 1; i < records.length; i += 1) {
    const values = records[i];
    const row: RawBulkRow = {};
    headers.forEach((header, colIndex) => {
      row[header] = values[colIndex] ? values[colIndex].trim() : "";
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Validate raw rows against mandatory field requirements & constraints
 */
export function validateBulkRows(rawRows: RawBulkRow[]): ValidatedBulkRow[] {
  const seenSlugs = new Set<string>();

  return rawRows.map((row, index) => {
    const name = (row.name || "").trim();
    const slug = (row.slug || "").trim().toLowerCase();
    const avatarUrl = (row.avatar_url || row.avatar || "").trim() || undefined;
    const knowledgeTitle = (row.knowledge_title || "").trim();
    const knowledgeContent = (row.knowledge_content || "").trim();

    if (!name) {
      return {
        index,
        name,
        slug,
        knowledgeTitle,
        knowledgeContent,
        isValid: false,
        errorReason: "Tên bot (name) không được để trống",
      };
    }

    if (name.length > 100) {
      return {
        index,
        name,
        slug,
        knowledgeTitle,
        knowledgeContent,
        isValid: false,
        errorReason: "Tên bot không được vượt quá 100 ký tự",
      };
    }

    if (!slug) {
      return {
        index,
        name,
        slug,
        knowledgeTitle,
        knowledgeContent,
        isValid: false,
        errorReason: "Mã định danh (slug) không được để trống",
      };
    }

    if (!SLUG_REGEX.test(slug)) {
      return {
        index,
        name,
        slug,
        knowledgeTitle,
        knowledgeContent,
        isValid: false,
        errorReason: "Slug chỉ chứa chữ cái thường (a-z), chữ số (0-9) và dấu gạch ngang (-)",
      };
    }

    if (seenSlugs.has(slug)) {
      return {
        index,
        name,
        slug,
        knowledgeTitle,
        knowledgeContent,
        isValid: false,
        errorReason: `Slug "${slug}" bị trùng lặp trong file CSV`,
      };
    }
    seenSlugs.add(slug);

    if (!knowledgeTitle) {
      return {
        index,
        name,
        slug,
        knowledgeTitle,
        knowledgeContent,
        isValid: false,
        errorReason: "Tiêu đề kiến thức (knowledge_title) không được để trống",
      };
    }

    if (knowledgeTitle.length > MAX_TITLE_LENGTH) {
      return {
        index,
        name,
        slug,
        knowledgeTitle,
        knowledgeContent,
        isValid: false,
        errorReason: `Tiêu đề kiến thức vượt quá ${MAX_TITLE_LENGTH} ký tự`,
      };
    }

    if (!knowledgeContent) {
      return {
        index,
        name,
        slug,
        knowledgeTitle,
        knowledgeContent,
        isValid: false,
        errorReason: "Nội dung kiến thức (knowledge_content) không được để trống",
      };
    }

    if (knowledgeContent.length < 10) {
      return {
        index,
        name,
        slug,
        knowledgeTitle,
        knowledgeContent,
        isValid: false,
        errorReason: "Nội dung kiến thức phải có ít nhất 10 ký tự",
      };
    }

    if (knowledgeContent.length > MAX_CONTENT_LENGTH) {
      return {
        index,
        name,
        slug,
        knowledgeTitle,
        knowledgeContent,
        isValid: false,
        errorReason: `Nội dung kiến thức vượt quá ${MAX_CONTENT_LENGTH} ký tự`,
      };
    }

    return {
      index,
      name,
      slug,
      avatarUrl,
      knowledgeTitle,
      knowledgeContent,
      isValid: true,
    };
  });
}
