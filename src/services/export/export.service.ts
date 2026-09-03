import { api } from "@/services/api";

class ExportService {
  private static instance: ExportService;

  private constructor() {}

  static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  downloadPptx = async (projectId: string, filename: string): Promise<void> => {
    const response = await api.get(`/projects/${projectId}/export/pptx`, { responseType: "blob" });

    const blob = new Blob([response.data as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.pptx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
}

export const exportService = ExportService.getInstance();
