
export interface ExamResult {
  parameter: string;
  value: string;
}

export interface ExtractionResponse {
  results: ExamResult[];
  rawText: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
