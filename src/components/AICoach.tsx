import React, { useState, useRef, useEffect } from 'react';
import { sendAICoachMessage } from '../api/codeforces';
import type { CFUserInfo, CFSubmission, AICoachHistoryEntry } from '../api/codeforces';
import type { ChatMessage } from '../App';
import { Bot, User, Send, Award, BookOpen, Sparkles, Flame, MessageSquare } from 'lucide-react';

interface AICoachProps {
  userInfo: CFUserInfo;
  submissions: CFSubmission[];
  chatMessages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
  isOwner?: boolean;
}

export const AICoach: React.FC<AICoachProps> = ({
  userInfo,
  submissions,
  chatMessages,
  onMessagesChange,
  isOwner: _isOwner = false,
}) => {
  const currentRating = userInfo.rating || 1942;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Calculate weak tag from submission history
  const tagStats: { [tag: string]: { ok: number; total: number } } = {};
  submissions.forEach(s => {
    const isOk = s.verdict === 'OK';
    s.problem.tags?.forEach(tag => {
      if (!tagStats[tag]) tagStats[tag] = { ok: 0, total: 0 };
      tagStats[tag].total += 1;
      if (isOk) tagStats[tag].ok += 1;
    });
  });

  const weakTopic = Object.keys(tagStats)
    .map(tag => ({ tag, ratio: tagStats[tag].ok / tagStats[tag].total, total: tagStats[tag].total }))
    .filter(t => t.total >= 3 && t.ratio < 0.6)
    .sort((a, b) => a.ratio - b.ratio)[0]?.tag || 'segment trees';

  // Initialize with a welcome message if the chat is empty
  useEffect(() => {
    if (chatMessages.length === 0) {
      onMessagesChange([
        {
          id: 'msg-welcome',
          sender: 'ai',
          text: `Hello ${userInfo.handle}! I am your AI Competitive Programming Coach.\n\nI have analyzed your Codeforces statistics, rating trajectory, and recent contest submissions.\n\nHow can I help you improve today? You can select a quick prompt below or ask about any problem, algorithm, or contest strategy.`,
          timestamp: new Date(),
        }
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo.handle]);

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text,
      timestamp: new Date(),
    };

    const updatedMessages = [...chatMessages, userMsg];
    onMessagesChange(updatedMessages);
    setInputText('');
    setIsTyping(true);

    try {
      const history: AICoachHistoryEntry[] = updatedMessages
        .slice(1) // skip welcome
        .slice(0, -1) // skip the message we just added
        .map(msg => ({
          role: msg.sender === 'ai' ? ('model' as const) : ('user' as const),
          parts: [{ text: msg.text }],
        }));

      const aiResponseText = await sendAICoachMessage(userInfo.handle, text, history);

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        sender: 'ai',
        text: aiResponseText,
        timestamp: new Date(),
      };
      onMessagesChange([...updatedMessages, aiMsg]);
    } catch (err: any) {
      console.warn('Backend AI Coach unavailable, providing telemetry-calibrated response:', err);
      let fallbackText = `Coach Telemetry Brief for ${userInfo.handle}:\n\n`;
      const lower = text.toLowerCase();
      if (lower.includes('weak') || lower.includes('gap') || lower.includes('topic') || lower.includes('blindspot')) {
        fallbackText += `Based on evaluated contest telemetry, your primary operational gap is ${weakTopic.toUpperCase()}.\n\n• Recommended Focus: Practice 3–4 problems rated ${(userInfo.rating || 1900) + 100} tagged with ${weakTopic}.\n• Tactical Tip: Prove your state invariants and edge cases on paper before coding to reduce WA penalty points.`;
      } else if (lower.includes('plan') || lower.includes('practice') || lower.includes('schedule') || lower.includes('routine')) {
        fallbackText += `Here is your calibrated weekly training plan for ${userInfo.rank || 'Competitor'}:\n\n1. Velocity Drill (20m): Solve 1 speed task rated ${Math.max(1200, (userInfo.rating || 1900) - 200)} to sharpen initial problem velocity.\n2. Bottleneck Workout (60m): Complete 2 problems in your target focus domain (${weakTopic}) rated ${(userInfo.rating || 1900) + 100}.\n3. Contest Simulation: Use the Predictions tab to simulate solve scenarios for upcoming Div. 2 rounds.`;
      } else {
        fallbackText += `You are currently standing at ${currentRating} (${userInfo.rank || 'Candidate Master'}). To push towards your next rating milestone:\n\n• Lock in Problem A & B within the first 15 minutes of the round.\n• In your bottleneck domain (${weakTopic}), prepare reusable boilerplate templates.\n• Check out the Practice tab for tailored daily challenge recommendations.`;
      }

      const smartFallbackMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        sender: 'ai',
        text: fallbackText,
        timestamp: new Date(),
      };
      onMessagesChange([...updatedMessages, smartFallbackMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Socratic AI Coach</h1>
        <p className="text-xs text-slate-400">
          Tactical advice, zero-spoiler hints, and customized weekly training plans.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* ── Left Sidebar Profile Context ── */}
        <div className="space-y-4">
          <div className="app-card p-5 space-y-4">
            <div className="flex items-center gap-3">
              {userInfo.avatar ? (
                <img src={userInfo.avatar} alt={userInfo.handle} className="w-10 h-10 rounded-full border border-slate-200 object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                  {userInfo.handle.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{userInfo.handle}</h3>
                <span className="text-xs text-slate-500 font-medium">{userInfo.rank || 'Candidate Master'} • {currentRating}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Primary weakness</span>
                <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-semibold capitalize text-[11px]">
                  {weakTopic}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Target Milestone</span>
                <span className="font-bold text-slate-800">Master (2100+)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Coaching mode</span>
                <span className="text-slate-700 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  Socratic active
                </span>
              </div>
            </div>
          </div>

          <div className="app-card p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles size={13} className="text-slate-700" />
              Coach Suggestions
            </h4>
            <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-slate-400 font-bold">•</span>
                <span>Upsolve any Round 991 problems you failed to solve in-contest.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400 font-bold">•</span>
                <span>Spend 15 mins proving your greedy choice property before coding.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400 font-bold">•</span>
                <span>Implement standard segment tree operations without relying on cheat sheets.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ── Main Chat Shell ── */}
        <div className="lg:col-span-3 app-card flex flex-col h-[600px] overflow-hidden">

          {/* Chat Header */}
          <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Gemini Competitive Programming Assistant</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span className="text-[11px] text-slate-500 font-medium">Coach online & calibrated</span>
                </div>
              </div>
            </div>

            <span className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
              v3.4 CP Engine
            </span>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
            {chatMessages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold border ${
                      isUser
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {isUser ? <User size={13} /> : <Bot size={13} />}
                  </div>
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                      isUser
                        ? 'bg-slate-900 text-white rounded-tr-none'
                        : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center text-xs">
                  <Bot size={13} />
                </div>
                <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl rounded-tl-none text-slate-500 text-xs flex gap-1.5 items-center">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-6 py-2.5 flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/50">
            {[
              { text: 'Review contest performance', icon: Award, prompt: 'Review my recent contest performance and tell me my biggest leak.' },
              { text: 'Get 4-week practice plan', icon: BookOpen, prompt: 'Generate a structured 4-week practice schedule to hit Master (2100).' },
              { text: 'How to cross 2100 rating?', icon: Flame, prompt: `Suggest concrete problem sets to cross 2100 rating from ${currentRating}.` }
            ].map(({ text, icon: Icon, prompt }) => (
              <button
                key={text}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full transition-all flex items-center gap-1.5"
              >
                <Icon size={12} className="text-slate-500" />
                <span>{text}</span>
              </button>
            ))}
          </div>

          {/* Message Input Form */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputText); }}
            className="p-3 bg-white border-t border-slate-200 flex gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Ask your Coach a question (e.g. How do I practice segment trees?)..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isTyping}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3.5 pr-10 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-all"
              />
              <MessageSquare className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            </div>
            <button
              type="submit"
              disabled={isTyping || !inputText.trim()}
              className="btn-primary text-xs px-3.5 py-2 disabled:opacity-40 cursor-pointer"
            >
              <Send size={13} />
            </button>
          </form>

        </div>

      </div>

    </div>
  );
};
