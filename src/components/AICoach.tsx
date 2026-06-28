import React, { useState } from 'react';
import { sendAICoachMessage } from '../api/codeforces';
import type { CFUserInfo, CFSubmission, CFRatingChange } from '../api/codeforces';
import { Bot, User, Send, Flame, Award, BookOpen } from 'lucide-react';

interface AICoachProps {
  userInfo: CFUserInfo;
  ratingHistory: CFRatingChange[];
  submissions: CFSubmission[];
}

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: Date;
}

export const AICoach: React.FC<AICoachProps> = ({ userInfo, ratingHistory: _ratingHistory, submissions }) => {
  const currentRating = userInfo.rating || 1200;
  
  // Calculate weak tag
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

  const defaultMessages: Message[] = [
    {
      id: 'msg-1',
      sender: 'ai',
      text: `Hello ${userInfo.handle}! I am your AI Competitive Programming Coach. 🤖\n\nI have analyzed your Codeforces statistics, rating history, and recent submission verdicts.\n\nHow can I help you improve today? You can select a quick prompt below or type your own question.`,
      timestamp: new Date()
    }
  ];

  const [messages, setMessages] = useState<Message[]>(defaultMessages);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      // Skip the initial welcome message so the history starts with a 'user' message
      const history = messages.slice(1).map(msg => ({
        role: msg.sender === 'ai' ? ('model' as const) : ('user' as const),
        parts: msg.text
      }));

      const aiResponseText = await sendAICoachMessage(userInfo.handle, text, history);

      const aiMsg: Message = {
        id: `msg-${Date.now()}-ai`,
        sender: 'ai',
        text: aiResponseText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('AI Coach Error:', err);
      const errorMsg: Message = {
        id: `msg-${Date.now()}-error`,
        sender: 'ai',
        text: `⚠️ **Error communicating with your Coach**: ${err.message || 'Check if the backend server is running and has GEMINI_API_KEY set.'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
      {/* Sidebar tips */}
      <div className="lg:col-span-1 space-y-4">
        <div className="glass-card p-5 rounded-2xl space-y-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Bot size={16} className="text-violet-400" />
            AI Coach Profile
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your personalized AI assistant reads your live Codeforces profile statistics to pinpoint skill gaps and curate practices.
          </p>
          <div className="pt-2 border-t border-slate-900 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Active Target:</span>
              <span className="font-bold text-violet-400">Rating +200</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Focus Tag:</span>
              <span className="font-bold text-rose-400 capitalize">{weakTopic}</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl space-y-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
            💡 Practice Tips
          </h4>
          <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
            <li>Upsolve every B & C problem you fail.</li>
            <li>Verify constraints before selecting algorithms.</li>
            <li>Code templates for graphs & queries.</li>
          </ul>
        </div>
      </div>

      {/* Chat shell */}
      <div className="lg:col-span-3 glass-card rounded-2xl flex flex-col h-[520px] overflow-hidden">
        {/* Chat header */}
        <div className="glass-panel px-6 py-4 flex items-center gap-3 border-b border-slate-900">
          <div className="w-10 h-10 rounded-full bg-violet-600/20 text-violet-400 flex items-center justify-center border border-violet-500/20">
            <Bot size={22} />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Coach Bot</h3>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Online & Analyzing Profile
            </span>
          </div>
        </div>

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div 
              key={msg.id}
              className={`flex items-start gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                msg.sender === 'user' 
                  ? 'bg-violet-600 text-white' 
                  : 'bg-slate-900 border border-slate-800 text-violet-400'
              }`}>
                {msg.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                msg.sender === 'user' 
                  ? 'bg-violet-600 text-white rounded-tr-none' 
                  : 'bg-slate-900/60 border border-slate-800/80 text-slate-200 rounded-tl-none markdown-style'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex items-start gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 text-violet-400 flex items-center justify-center text-xs">
                <Bot size={14} />
              </div>
              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl rounded-tl-none text-slate-400 text-sm flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Prompts */}
        <div className="px-6 py-2 flex flex-wrap gap-2 border-t border-slate-900/40 bg-slate-950/20">
          <button 
            onClick={() => handleSendMessage('Review my recent performance')}
            className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold px-3 py-1.5 rounded-full border border-slate-800 hover:border-violet-500/20 transition-all flex items-center gap-1"
          >
            <Award size={12} className="text-violet-400" />
            Review performance
          </button>
          <button 
            onClick={() => handleSendMessage('Generate a 4-week practice schedule')}
            className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold px-3 py-1.5 rounded-full border border-slate-800 hover:border-violet-500/20 transition-all flex items-center gap-1"
          >
            <BookOpen size={12} className="text-emerald-400" />
            Get practice plan
          </button>
          <button 
            onClick={() => handleSendMessage(`Suggest how to cross ${currentRating + 200} rating`)}
            className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold px-3 py-1.5 rounded-full border border-slate-800 hover:border-violet-500/20 transition-all flex items-center gap-1"
          >
            <Flame size={12} className="text-rose-400" />
            How to increase rating
          </button>
        </div>

        {/* Message Input Form */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputText); }}
          className="p-4 bg-slate-950/60 border-t border-slate-900 flex gap-2"
        >
          <input 
            type="text" 
            placeholder="Ask your Coach a question (e.g. How do I practice graphs?)..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 glass-input rounded-xl px-4 py-2.5 text-sm"
            disabled={isTyping}
          />
          <button 
            type="submit" 
            className="bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white font-bold p-2.5 rounded-xl transition-all"
            disabled={isTyping || !inputText.trim()}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};
