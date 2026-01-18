export interface WordLog {
  id: string;
  word: string;
  category: string;
  weight: number; // 0.0 to 1.0
  timestamp: number;
  selectionMethod: 'manual_click' | 'voice_confirmed' | 'implicit_split';
}

export interface SuggestionContext {
  words: string[];
  category: string;
  timestamp: number;
}

export interface ToolCallResponse {
  functionResponses: {
    id: string;
    name: string;
    response: object;
  }[];
}

// Audio handling types
export interface AudioConfig {
  sampleRate: number;
  bufferSize: number;
}