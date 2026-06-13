/**
 * 文献库 API 封装层
 * 统一调用后端 /api/library/* 接口
 */

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

function url(path: string) {
  return `${BACKEND}${path}`;
}

// ── 文献列表 ──

export interface UserTag {
  id: string;
  name: string;
  color: string;
}

export interface LibraryDoc {
  filename: string;
  primary_field?: string;
  subfields?: string[];
  keywords?: string[];
  summary?: string;
  uploaded_at?: string;
  chunks?: number;
  sha256?: string;
  status?: string;
  user_tags?: UserTag[];
}

export async function fetchDocuments(): Promise<{ documents: LibraryDoc[]; user_tags: UserTag[] }> {
  const res = await fetch(url("/api/library/documents"));
  if (!res.ok) throw new Error("获取文献列表失败");
  return res.json();
}

export async function fetchDocumentDetail(filename: string): Promise<LibraryDoc> {
  const res = await fetch(url(`/api/library/manifest/${encodeURIComponent(filename)}`));
  if (!res.ok) throw new Error("获取文献详情失败");
  return res.json();
}

// ── 重命名 ──

export async function renameDocument(oldName: string, newName: string) {
  const res = await fetch(url(`/api/library/documents/${encodeURIComponent(oldName)}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ new_name: newName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "重命名失败");
  }
  return res.json();
}

// ── 删除 ──

export async function deleteDocument(filename: string) {
  const res = await fetch(url(`/files/${encodeURIComponent(filename)}`), { method: "DELETE" });
  if (!res.ok) throw new Error("删除失败");
  return res.json();
}

// ── 预览 URL ──

export function getPreviewUrl(filename: string): string {
  return url(`/api/library/preview/${encodeURIComponent(filename)}`);
}

// ── 导出 ──

export async function exportDocuments(filenames: string[], format: "json" | "csv" = "json") {
  const res = await fetch(url("/api/library/export"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filenames, format }),
  });
  if (!res.ok) throw new Error("导出失败");
  if (format === "csv") {
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "library_export.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    return;
  }
  return res.json();
}

// ── 标签统计 ──

export interface TagStats {
  primary_fields: Record<string, number>;
  subfields: Record<string, number>;
  keywords: Record<string, number>;
}

export async function fetchTagStats(): Promise<TagStats> {
  const res = await fetch(url("/api/library/tags"));
  if (!res.ok) throw new Error("获取标签统计失败");
  return res.json();
}

// ── 用户标签 CRUD ──

export async function fetchUserTags(): Promise<UserTag[]> {
  const res = await fetch(url("/api/library/user-tags"));
  if (!res.ok) return [];
  const data = await res.json();
  return data.tags || [];
}

export async function createUserTag(name: string, color?: string): Promise<UserTag> {
  const res = await fetch(url("/api/library/user-tags"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, color }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "创建标签失败");
  }
  const data = await res.json();
  return data.tag;
}

export async function updateUserTag(tagId: string, name?: string, color?: string): Promise<UserTag> {
  const res = await fetch(url(`/api/library/user-tags/${tagId}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, color }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "更新标签失败");
  }
  const data = await res.json();
  return data.tag;
}

export async function deleteUserTag(tagId: string) {
  const res = await fetch(url(`/api/library/user-tags/${tagId}`), { method: "DELETE" });
  if (!res.ok) throw new Error("删除标签失败");
}

export async function assignUserTag(filename: string, tagId: string, action: "assign" | "unassign" = "assign") {
  const res = await fetch(url("/api/library/user-tags/assign"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, tag_id: tagId, action }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "操作失败");
  }
}

// ── 词表 ──

export async function extendTaxonomy(primaryField: string, subfield?: string) {
  const res = await fetch(url("/api/library/taxonomy/fields"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ primary_field: primaryField, subfield }),
  });
  if (!res.ok) throw new Error("更新词表失败");
  return res.json();
}

// ── 上传 ──

export async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(url("/upload/"), { method: "POST", body: formData });
  if (!res.ok) throw new Error("上传失败");
  return res.json();
}
