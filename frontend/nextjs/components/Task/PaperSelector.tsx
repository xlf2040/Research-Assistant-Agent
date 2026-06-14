import React, { useState, useEffect } from "react";
import { ChatBoxSettings, LibraryDocument } from "@/types/data";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

interface PaperSelectorProps {
  chatBoxSettings: ChatBoxSettings;
  setChatBoxSettings: React.Dispatch<React.SetStateAction<ChatBoxSettings>>;
}

export default function PaperSelector({
  chatBoxSettings,
  setChatBoxSettings,
}: PaperSelectorProps) {
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND}/api/library/documents`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const filename = e.target.value;
    setChatBoxSettings((prev) => ({
      ...prev,
      paper_filename: filename,
    }));
  };

  // Filter supported paper formats
  const paperFiles = documents.filter((doc) => {
    const ext = doc.filename.toLowerCase().split(".").pop();
    return ["pdf", "docx", "md", "txt"].includes(ext || "");
  });

  return (
    <div className="form-group">
      <label htmlFor="paper_filename" className="agent_question">
        选择论文{" "}
      </label>
      {loading ? (
        <p className="text-sm text-gray-500">加载文档列表...</p>
      ) : (
        <select
          name="paper_filename"
          value={chatBoxSettings.paper_filename || ""}
          onChange={handleSelect}
          className="form-control-static"
          required
        >
          <option value="">-- 请选择论文文件 --</option>
          {paperFiles.map((doc) => (
            <option key={doc.filename} value={doc.filename}>
              {doc.filename}
              {doc.primary_field ? ` [${doc.primary_field}]` : ""}
            </option>
          ))}
        </select>
      )}
      <p className="text-xs text-gray-400 mt-1">
        支持 PDF / DOCX / MD / TXT 格式，请先在「我的文档」中上传论文
      </p>
    </div>
  );
}
