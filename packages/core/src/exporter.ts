import { FFmpegExporterClient } from "@motion-canvas/ffmpeg/lib/client/FFmpegExporterClient";
import type { Exporter, ExporterClass, Project, RendererSettings } from "@motion-canvas/core";
import type { MetaField } from "@motion-canvas/core/lib/meta";
import type { RendererResult } from "@motion-canvas/core";

class MolinianiFFmpegExporter implements Exporter {
  static readonly id = "@moliniani/core/ffmpeg";
  static readonly displayName = "Video (FFmpeg + Vue)";

  static meta(project: Project): MetaField<any> {
    return FFmpegExporterClient.meta(project);
  }

  static async create(
    project: Project,
    settings: RendererSettings,
  ): Promise<MolinianiFFmpegExporter> {
    const inner = await FFmpegExporterClient.create(project, {
      ...settings,
      exporter: {
        ...settings.exporter,
        name: FFmpegExporterClient.id,
      },
    });

    return new MolinianiFFmpegExporter(inner);
  }

  constructor(private readonly inner: FFmpegExporterClient) {}

  async start(): Promise<void> {
    await this.inner.start();
  }

  async handleFrame(
    canvas: HTMLCanvasElement,
    _frame: number,
    _sceneFrame: number,
    _sceneName: string,
    _signal: AbortSignal,
  ): Promise<void> {
    await this.inner.handleFrame(canvas);
  }

  async stop(result: RendererResult): Promise<void> {
    await this.inner.stop(result);
  }
}

export const molinianiExporterPlugin = {
  name: "@moliniani/core/exporter",
  exporters(): ExporterClass[] {
    return [MolinianiFFmpegExporter];
  },
};
