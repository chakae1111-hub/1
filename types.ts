
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'error';
  summary?: string;
  suggestions?: string;
  sources?: { uri: string; title: string }[];
  duration?: number; // Time taken in seconds
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}
