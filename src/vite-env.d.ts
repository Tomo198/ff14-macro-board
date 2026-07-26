/// <reference types="vite/client" />

interface DocumentPictureInPictureOptions {
  width?: number;
  height?: number;
}

interface DocumentPictureInPictureEvent extends Event {
  readonly window: Window;
}

interface DocumentPictureInPicture extends EventTarget {
  requestWindow(options?: DocumentPictureInPictureOptions): Promise<Window>;
  onenter?: (event: DocumentPictureInPictureEvent) => void;
}

interface Window {
  documentPictureInPicture?: DocumentPictureInPicture;
}
