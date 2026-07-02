import React, { useState, useRef, useEffect } from 'react';
import { sendAICoachMessage } from '../api/codeforces';
import type { CFUserInfo, CFSubmission, CFRatingChange, AICoachHistoryEntry } from '../api/codeforces';
import type { ChatMessage } from '../App';
import { Bot, User, Send, Flame, Award, BookOpen, Sparkles, Brain, Target, Compass, MessageSquare } from 'lucide-react';

interface AICoachProps {
  userInfo: CFUserInfo;
  ratingHistory: CFRatingChange[];
  submissions: CFSubmission[];
  /** Chat messages lifted to App.tsx for persistence across tab switches */
  chatMessages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
}

export const AICoach: React.FC<AICoachProps> = ({
  userInfo,
  ratingHistory: _ratingHistory,
  submissions,
  chatMessages,
  onMessagesChange,
}) => {
  const currentRating = userInfo.rating || 1200;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Calculate weak tag from submission history
  const tagStats: { [tag: string]: { ok: number; total: number } } = {};
  submissions.forEach(s => {
    const isOk = s.verdict === 'OK';
    s.problem.tags.forEach(tag => {
      if (!tagStats[tag]) tagStats[tag] = { ok: 0, total: 0 };
      tagStats[tag].total += 1;
      if (isOk) tagStats[tag].ok += 1;
    });
  });

  const weakTopic = Object.keys(tagStats)
    .map(tag => ({ tag, ratio: tagStats[tag].ok / tagStats[tag].total, total: tagStats[tag].total }))
    .filter(t => t.total >= 3 && t.ratio < 0.6)
    .sort((a, b) => a.ratio - b.ratio)[0]?.tag || 'dynamic programming';

  // Initialize with a welcome message if the chat is empty
  useEffect(() => {
    if (chatMessages.length === 0) {
      onMessagesChange([
        {
          id: 'msg-welcome',
          sender: 'ai',
          text: `Hello ${userInfo.handle}! I am your AI Competitive Programming Coach. 🤖\n\nI have analyzed your Codeforces statistics, rating history, and recent submission verdicts.\n\nHow can I help you improve today? You can select a quick prompt below or type your own question.`,
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
      console.error('AI Coach Error:', err);
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        sender: 'ai',
        text: `⚠️ **Error communicating with your Coach**: ${err.message || 'Check if the backend server is running and has GEMINI_API_KEY set.'}`,
        timestamp: new Date(),
      };
      onMessagesChange([...updatedMessages, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in-up">
      {/* ── Sidebar Metadata Panel ── */}
      <div className="lg:col-span-1 space-y-4">
        {/* Profile Stats summary */}
        <div className="relative overflow-hidden bg-gradient-to-b from-[#0a0f1e] to-[#080e1a] border border-[#121e35] rounded-2xl p-5 group hover:border-[#1b2b48] transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-4">
            <Brain size={14} className="text-cyan-400 animate-pulse" />
            AI Coach Diagnostics
          </h4>
          
          <div className="space-y-3">
            <div className="p-3 bg-[#060b13] border border-slate-900 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Focus Area</span>
              <span className="text-xs font-black text-rose-400 capitalize">{weakTopic}</span>
            </div>
            
            <div className="p-3 bg-[#060b13] border border-slate-900 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Suggested Target</span>
              <span className="text-xs font-black text-cyan-400">Rating {currentRating + 200}</span>
            </div>

            {userInfo.leetcodeHandle && (
              <div className="p-3 bg-[#060b13] border border-slate-900 rounded-xl space-y-1.5">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Linked LeetCode</span>
                <div className="space-y-1">
                  <span className="font-bold text-slate-300 text-xs block truncate" title={userInfo.leetcodeHandle}>
                    {userInfo.leetcodeHandle}
                  </span>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                    <span className="text-emerald-400 font-bold">{(userInfo.leetcodeEasy ?? 0)}E</span>
                    <span className="text-slate-700 font-black">·</span>
                    <span className="text-amber-400 font-bold">{(userInfo.leetcodeMedium ?? 0)}M</span>
                    <span className="text-slate-700 font-black">·</span>
                    <span className="text-rose-400 font-bold">{(userInfo.leetcodeHard ?? 0)}H</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Practice tips block */}
        <div className="relative overflow-hidden bg-gradient-to-b from-[#0a0f1e] to-[#080e1a] border border-[#121e35] rounded-2xl p-5 group hover:border-[#1b2b48] transition-all">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-3">
            <Sparkles size={13} className="text-amber-400" />
            Coach Suggestions
          </h4>
          <ul className="text-xs text-slate-400 space-y-2.5">
            {[
              'Upsolve any round problems you failed to solve in-contest.',
              'Spend 15 mins proving your greedy choice property before writing code.',
              'Implement standard sub-segment tree and graph traversal queries without reference templates.'
            ].map((tip, idx) => (
              <li key={idx} className="flex gap-2 items-start leading-relaxed">
                <span className="text-cyan-400 font-bold mt-0.5">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Main Chat Shell ── */}
      <div className="lg:col-span-3 bg-[#080e1a] border border-[#121e35] rounded-2xl flex flex-col h-[560px] overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
        
        {/* Chat header */}
        <div className="bg-[#0a0f1e]/85 px-6 py-4 flex items-center justify-between border-b border-[#121e35]/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/5">
              <Bot size={20} className="animate-float" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">Gemini Assistant</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Coach online</span>
              </div>
            </div>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-[#060b13] border border-slate-900 px-2.5 py-1 rounded-md">
            v1.2 (Active)
          </span>
        </div>

        {/* Message area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-[#080e1a] to-[#040810]">
          {chatMessages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold border transition-colors ${
                  isUser
                    ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                    : 'bg-slate-950 border-slate-900 text-slate-400'
                }`}>
                  {isUser ? <User size={13} /> : <Bot size={13} />}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  isUser
                    ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-50 rounded-tr-none'
                    : 'bg-slate-900/30 border border-slate-800/80 text-slate-200 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex gap-3 max-w-[85%] animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-slate-950 border-slate-900 text-slate-500 flex items-center justify-center text-xs">
                <Bot size={13} />
              </div>
              <div className="bg-slate-900/30 border border-slate-800/80 p-4 rounded-2xl rounded-tl-none text-slate-500 text-xs flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Pills */}
        <div className="px-6 py-2 flex flex-wrap gap-2 border-t border-[#121e35]/50 bg-[#060b13]/60 backdrop-blur-md">
          {[
            { text: 'Review performance', icon: Award, color: 'text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 border-cyan-500/10 hover:border-cyan-500/25', prompt: 'Review my recent performance' },
            { text: 'Get practice plan', icon: BookOpen, color: 'text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/10 hover:border-emerald-500/25', prompt: 'Generate a 4-week practice schedule' },
            { text: 'Increase rating target', icon: Flame, color: 'text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/10 hover:border-rose-500/25', prompt: `Suggest how to cross ${currentRating + 200} rating` }
          ].map(({ text, icon: Icon, color, prompt }) => (
            <button
              key={text}
              onClick={() => handleSendMessage(prompt)}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 cursor-pointer ${color}`}
            >
              <Icon size={11} />
              {text}
            </button>
          ))}
        </div>

        {/* Message Input bar */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputText); }}
          className="p-4 bg-[#060b13] border-t border-[#121e35]/70 flex gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Ask your Coach a question (e.g. How do I practice graphs?)..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isTyping}
              className="w-full bg-[#080f1e] border border-[#1b2b48]/80 rounded-xl pl-4 pr-10 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-all"
            />
            <MessageSquare className="absolute right-3.5 top-3.5 text-slate-500" size={15} />
          </div>
          <button
            type="submit"
            disabled={isTyping || !inputText.trim()}
            className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/25 font-bold p-3 rounded-xl transition-all disabled:opacity-50 cursor-pointer active:scale-95 flex items-center justify-center"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
};
