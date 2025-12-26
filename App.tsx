
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { gemini } from './services/geminiService';
import { Message } from './types';
import { 
  ChatBubbleBottomCenterTextIcon, 
  PaperAirplaneIcon, 
  ArrowPathIcon, 
  BuildingOffice2Icon,
  ClockIcon,
  PlusIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  StopIcon,
  LightBulbIcon,
  DocumentTextIcon,
  Bars3Icon,
  XMarkIcon,
  LockClosedIcon,
  KeyIcon
} from '@heroicons/react/24/outline';

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}

const ACCESS_KEY = "1q2w3e!!";
const STORAGE_KEY = "archi_king_sessions";

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [accessInput, setAccessInput] = useState('');
  const [accessError, setAccessError] = useState(false);
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load sessions from LocalStorage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem(STORAGE_KEY);
    if (savedSessions) {
      try {
        setSessions(JSON.parse(savedSessions));
      } catch (e) {
        console.error("Failed to parse saved sessions", e);
      }
    }
  }, []);

  // Save sessions to LocalStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  const handleAccessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessInput === ACCESS_KEY) {
      setIsAuthenticated(true);
      setAccessError(false);
    } else {
      setAccessError(true);
      setAccessInput('');
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAuthenticated) {
      scrollToBottom();
    }
  }, [messages, isLoading, isAuthenticated]);

  // Sync current messages to the active session in the sessions list
  useEffect(() => {
    if (activeSessionId && isAuthenticated) {
      setSessions(prev => prev.map(s => 
        s.id === activeSessionId ? { ...s, messages } : s
      ));
    }
  }, [messages, isAuthenticated, activeSessionId]);

  useEffect(() => {
    if (isLoading) {
      const startTime = Date.now();
      setElapsedTime(0);
      timerRef.current = window.setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isLoading]);

  const handleNewChat = () => {
    setMessages([]);
    setActiveSessionId(null);
    setIsSidebarOpen(false);
  };

  const selectSession = (session: ChatSession) => {
    setActiveSessionId(session.id);
    setMessages(session.messages);
    setIsSidebarOpen(false);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      type: 'text'
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    
    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      currentSessionId = Date.now().toString();
      setActiveSessionId(currentSessionId);
      const newSession: ChatSession = {
        id: currentSessionId,
        title: input.slice(0, 20) + (input.length > 20 ? '...' : ''),
        messages: newMessages
      };
      setSessions(prev => [newSession, ...prev]);
    }

    setInput('');
    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    const startTime = Date.now();

    try {
      const history = newMessages.map(m => ({ role: m.role, content: m.content }));
      const { text, sources } = await gemini.chatWithGrounding(input, history);
      
      if (abortControllerRef.current?.signal.aborted) return;

      const endTime = Date.now();
      const finalDuration = Math.floor((endTime - startTime) / 1000);
      
      const parts = text.split(/📌 답변 요약|💡 추가 제언/);
      const mainContent = parts[0]?.trim() || "";
      const summaryPart = text.includes('📌 답변 요약') ? text.split('📌 답변 요약')[1].split('💡 추가 제언')[0].trim() : undefined;
      const suggestionsPart = text.includes('💡 추가 제언') ? text.split('💡 추가 제언')[1].trim() : undefined;
      
      const assistantResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: mainContent,
        summary: summaryPart,
        suggestions: suggestionsPart,
        type: 'text',
        sources: sources,
        duration: finalDuration
      };

      setMessages(prev => [...prev, assistantResponse]);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Generation stopped by user');
      } else {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: '국가 데이터 서버 응답 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
          type: 'error'
        }]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) {
      setMessages([]);
      setActiveSessionId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900 p-6 font-sans overflow-hidden">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="mb-10 flex flex-col items-center text-center">
            <div className="mb-6 rounded-3xl bg-indigo-600 p-5 shadow-2xl shadow-indigo-500/30">
              <BuildingOffice2Icon className="h-12 w-12 text-white" />
            </div>
            <h1 className="mb-2 text-3xl font-black tracking-tighter text-white lg:text-4xl">Archi-King</h1>
            <p className="text-sm font-bold tracking-widest text-indigo-400 uppercase">Access Protection</p>
          </div>
          
          <div className="overflow-hidden rounded-[2rem] bg-white p-8 shadow-2xl ring-1 ring-white/10">
            <form onSubmit={handleAccessSubmit} className="space-y-6">
              <div className="text-center">
                <p className="text-sm font-medium text-slate-500 break-keep">이 시스템은 승인된 사용자만 접근할 수 있습니다.<br/>관리자로부터 전달받은 접속키를 입력해 주세요.</p>
              </div>
              
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <KeyIcon className={`h-5 w-5 transition-colors ${accessError ? 'text-red-500' : 'text-slate-400 group-focus-within:text-indigo-600'}`} />
                </div>
                <input
                  type="password"
                  value={accessInput}
                  onChange={(e) => {
                    setAccessInput(e.target.value);
                    if (accessError) setAccessError(false);
                  }}
                  placeholder="접속키를 입력하세요"
                  className={`block w-full rounded-2xl border-2 bg-slate-50 py-4 pl-12 pr-4 text-sm font-bold text-slate-900 transition-all placeholder:text-slate-300 focus:bg-white focus:outline-none focus:ring-4 ${
                    accessError 
                      ? 'border-red-200 focus:border-red-500 focus:ring-red-500/10' 
                      : 'border-slate-100 focus:border-indigo-500 focus:ring-indigo-500/10'
                  }`}
                  autoFocus
                />
              </div>

              {accessError && (
                <div className="animate-in slide-in-from-top-2 flex items-center justify-center space-x-2 rounded-xl bg-red-50 py-3 text-xs font-bold text-red-600">
                  <XMarkIcon className="h-4 w-4" />
                  <span>잘못된 접속키입니다. 다시 확인해 주세요.</span>
                </div>
              )}

              <button
                type="submit"
                className="flex w-full items-center justify-center space-x-2 rounded-2xl bg-slate-900 py-4 text-sm font-black text-white shadow-xl transition-all hover:bg-black active:scale-[0.98] active:shadow-inner"
              >
                <span>시스템 입장</span>
                <LockClosedIcon className="h-5 w-5" />
              </button>
            </form>
          </div>
          
          <p className="mt-8 text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest opacity-40">
            Copyright © 2025 Archi-King Project
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen max-w-full bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-slate-900 flex flex-col transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center space-x-3">
            <BuildingOffice2Icon className="w-6 h-6 text-indigo-400" />
            <span className="text-white font-bold text-lg tracking-tight">Archi-King</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="px-4 py-6">
          <button 
            onClick={handleNewChat}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all text-sm font-semibold shadow-lg shadow-indigo-500/20"
          >
            <PlusIcon className="w-5 h-5" />
            <span>새로운 대화</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-3 space-y-1 pb-10">
          <div className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">대화 보관함</div>
          {sessions.length === 0 ? (
            <div className="px-3 py-4 text-slate-600 text-[11px] italic">저장된 대화가 없습니다.</div>
          ) : (
            sessions.map(s => (
              <div key={s.id} className="group relative">
                <button
                  onClick={() => selectSession(s)}
                  className={`w-full flex items-center space-x-3 p-3.5 rounded-xl text-xs text-left transition-all truncate group ${
                    activeSessionId === s.id ? 'bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <ChatBubbleLeftRightIcon className={`w-4 h-4 flex-shrink-0 ${activeSessionId === s.id ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <span className="truncate pr-6">{s.title}</span>
                </button>
                <button 
                  onClick={(e) => deleteSession(s.id, e)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Auth logout option */}
        <div className="p-4 border-t border-white/10">
           <button 
             onClick={() => {
               window.location.reload();
             }}
             className="w-full text-left text-[10px] font-bold text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest flex items-center space-x-2 px-3"
           >
             <LockClosedIcon className="h-3 w-3" />
             <span>시스템 로그아웃</span>
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative h-full overflow-hidden bg-white">
        {/* Header */}
        <header className="px-4 lg:px-8 py-4 lg:py-6 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 lg:hidden text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
            <div className="hidden lg:flex items-center space-x-3">
               <div className="bg-slate-900 p-1.5 rounded-lg">
                <BuildingOffice2Icon className="w-5 h-5 text-indigo-400" />
               </div>
               <div>
                <h1 className="text-lg font-black text-slate-900 tracking-tight">Archi-King</h1>
                <p className="text-[10px] text-slate-500 font-bold">건축설계 법규 도우미</p>
               </div>
            </div>
            <div className="lg:hidden">
               <h1 className="text-base font-bold text-slate-900 tracking-tight">Archi-King</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-100">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] lg:text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Live Data</span>
          </div>
        </header>

        {/* Message List */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-10 space-y-10 scroll-smooth pb-32">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="p-5 bg-indigo-50 rounded-3xl">
                <BuildingOffice2Icon className="w-14 h-14 text-indigo-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight break-keep px-4">전문 설계 법규 가이드를 시작합니다</h2>
                <p className="text-sm lg:text-base text-slate-500 font-medium leading-relaxed px-6 break-keep">
                  질문에 대해 국가 공인 데이터베이스를 기반으로 <br className="hidden lg:block"/> 가장 정확한 답변을 제공합니다.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 w-full px-4">
                <button 
                  onClick={() => setInput("건축물 피난계단 설치 대상 및 기준 알려줘")} 
                  className="group flex items-center justify-between text-left text-[13px] p-4 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-2xl text-slate-700 transition-all shadow-sm hover:shadow-md"
                >
                  <span className="font-semibold break-keep">건축물 피난계단 설치 대상 및 기준 알려줘</span>
                  <PlusIcon className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                </button>
                <button 
                  onClick={() => setInput("대지 안의 공지 기준에 대해 설명해줘")} 
                  className="group flex items-center justify-between text-left text-[13px] p-4 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-2xl text-slate-700 transition-all shadow-sm hover:shadow-md"
                >
                  <span className="font-semibold break-keep">대지 안의 공지 기준에 대해 설명해줘</span>
                  <PlusIcon className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                </button>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}>
              <div className={`w-full ${msg.role === 'user' ? 'max-w-[85%] lg:max-w-[70%]' : 'max-w-full'}`}>
                {msg.role === 'assistant' ? (
                  <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-6">
                    <div className="hidden lg:block flex-shrink-0">
                      <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-indigo-400 font-black text-sm shadow-xl border border-white/10 ring-4 ring-slate-50">AK</div>
                    </div>
                    <div className="flex-1 flex flex-col space-y-4">
                      {/* Main Content Bubble */}
                      <div className="bg-white border border-slate-100 rounded-3xl lg:rounded-[2rem] p-6 lg:p-8 shadow-sm ring-1 ring-slate-100/50">
                        <div className="prose prose-slate max-w-none prose-sm lg:prose-base leading-relaxed break-keep">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm, remarkMath]} 
                            rehypePlugins={[rehypeKatex]}
                            components={{
                              table: ({node, ...props}) => <table className="prose-table" {...props} />
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      </div>

                      {/* Summary Bubble */}
                      {msg.summary && (
                        <div className="bg-slate-900 rounded-3xl p-6 shadow-2xl border-l-[6px] border-indigo-500">
                          <div className="flex items-center space-x-2.5 mb-4 text-indigo-400 font-bold text-[11px] lg:text-[12px] uppercase tracking-[0.2em]">
                            <DocumentTextIcon className="w-5 h-5" />
                            <span>핵심 요약</span>
                          </div>
                          <div className="text-slate-200 text-[14px] lg:text-[15px] leading-relaxed font-medium break-keep">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {msg.summary}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {/* Suggestions Bubble */}
                      {msg.suggestions && (
                        <div className="bg-indigo-50/50 rounded-3xl p-6 shadow-sm border border-indigo-100/50">
                          <div className="flex items-center space-x-2.5 mb-4 text-indigo-700 font-bold text-[11px] lg:text-[12px] uppercase tracking-[0.1em]">
                            <LightBulbIcon className="w-5 h-5" />
                            <span>💡 전문가 제언</span>
                          </div>
                          <div className="text-slate-700 text-[13px] lg:text-[14px] leading-relaxed font-medium break-keep">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {msg.suggestions}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex flex-wrap items-center justify-between gap-4 px-2">
                        <div className="flex flex-wrap gap-1.5 lg:gap-2">
                          {msg.sources?.map((s, idx) => (
                            <a 
                              key={idx} 
                              href={s.uri} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2 px-3.5 py-2 bg-slate-50 hover:bg-indigo-50 text-indigo-700 rounded-xl text-[10px] lg:text-[11px] font-bold border border-slate-200 transition-all hover:scale-105 active:scale-95"
                            >
                              <ShieldCheckIcon className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[120px] lg:max-w-[200px]">{s.title}</span>
                            </a>
                          ))}
                        </div>
                        {msg.duration !== undefined && (
                          <div className="flex items-center space-x-1.5 text-[10px] lg:text-[11px] font-bold text-slate-400 bg-slate-50/50 px-3 py-1.5 rounded-full">
                            <ClockIcon className="w-3.5 h-3.5" />
                            <span>{msg.duration}s</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-indigo-600 text-white rounded-2xl lg:rounded-3xl p-5 lg:p-6 shadow-lg shadow-indigo-600/10 font-semibold text-[14px] lg:text-[16px] leading-relaxed break-keep">
                    {msg.content}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex space-x-4 items-center animate-in fade-in slide-in-from-left-4">
              <div className="hidden lg:block w-12 h-12 bg-slate-100 rounded-2xl animate-pulse" />
              <div className="flex items-center space-x-4 text-slate-400 bg-white/50 backdrop-blur-sm px-5 py-3 rounded-2xl border border-slate-100 shadow-sm">
                <ArrowPathIcon className="w-5 h-5 animate-spin text-indigo-500" />
                <span className="text-[13px] font-bold animate-pulse text-slate-600 tracking-tight">
                  분석 및 답변 생성 중... <span className="ml-1.5 text-indigo-600 font-mono text-sm">{elapsedTime}s</span>
                </span>
                <button 
                  onClick={handleStop} 
                  className="ml-2 text-[11px] font-black text-red-500 hover:text-red-700 active:scale-90 transition-transform px-3 py-1.5 bg-red-50 rounded-lg"
                >
                  중단
                </button>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </main>

        {/* Input Footer */}
        <footer className="p-4 lg:p-8 bg-white/90 backdrop-blur-xl border-t border-slate-100 absolute bottom-0 left-0 right-0 safe-bottom">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="flex items-end space-x-3 bg-slate-50 rounded-2xl lg:rounded-[1.75rem] p-3 lg:p-4 border border-slate-200 focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all duration-300">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="설계 지침 검색 또는 상세 기준 질문..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm lg:text-base py-2 min-h-[24px] max-h-[160px] text-slate-800 placeholder:text-slate-400 font-medium resize-none"
                rows={1}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="flex-shrink-0 bg-indigo-600 text-white p-3.5 lg:p-4 rounded-xl lg:rounded-2xl hover:bg-indigo-500 active:scale-90 disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-lg shadow-indigo-600/20"
              >
                <PaperAirplaneIcon className="w-5 h-5 lg:w-6 h-6" />
              </button>
            </div>
            <div className="mt-3 text-center">
              <p className="text-[10px] lg:text-[11px] text-slate-400 font-bold tracking-tight uppercase opacity-60">Archi-King은 실수를 할 수 있습니다.</p>
            </div>
          </form>
        </footer>
      </div>
    </div>
  );
};

export default App;
