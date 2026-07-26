export interface Macro {
  id: string;
  title: string;
  content: string;
  x: number;
  y: number;
  zIndex: number;
}

export interface HighlightRule {
  id: string;
  keyword: string;
  color: string;
}

export interface DraftMacro {
  id?: string;
  title: string;
  content: string;
}
