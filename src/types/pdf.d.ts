declare module 'pdfjs-dist' {
  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
  }

  export interface PDFPageProxy {
    getViewport(params: { scale: number; rotation: number }): PDFPageViewport;
    render(params: PDFRenderParams): PDFRenderTask;
    getTextContent(): Promise<PDFTextContent>;
  }

  export interface PDFPageViewport {
    width: number;
    height: number;
  }

  export interface PDFRenderParams {
    canvasContext: CanvasRenderingContext2D;
    viewport: PDFPageViewport;
  }

  export interface PDFRenderTask {
    promise: Promise<void>;
  }

  export interface PDFTextContent {
    items: PDFTextItem[];
  }

  export interface PDFTextItem {
    str: string;
    transform: number[];
    width: number;
    height: number;
    fontName: string;
  }

  export interface PDFLoadingTask<T> {
    promise: Promise<T>;
  }

  export function getDocument(source: string): PDFLoadingTask<PDFDocumentProxy>;

  export const GlobalWorkerOptions: {
    workerSrc: string;
  };

  export const version: string;
}
