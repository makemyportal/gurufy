import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Loader2, Send, Copy, Download, Share2, CheckCircle2, Wand2, TerminalSquare, ExternalLink } from 'lucide-react';
import { generateAIContent } from '../utils/aiService';
import { tools } from '../pages/AITools';
import { useAuth } from '../contexts/AuthContext';
import { useGamification } from '../contexts/GamificationContext';
import { db } from '../utils/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TokenShopModal from './TokenShopModal';

const PLACEHOLDERS = [
  "Class 5 ke liye Photosynthesis par ek MCQ worksheet bana do...",
  "Draft an email to parents about upcoming science fair...",
  "Generate a 3-day lesson plan on Fractions for Grade 4...",
  "Create a 10-question quiz on World War II...",
  "Write a short moral story about honesty for Class 2...",
  "Generate a rubric for a high school persuasive essay..."
];

export default function GlobalAIAssistant() {
  const { currentUser, userProfile } = useAuth();
  const { stats, spendCoins, toolCosts } = useGamification();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stage, setStage] = useState(''); // 'routing', 'generating', 'done', 'error'
  const [result, setResult] = useState(null);
  const [detectedTool, setDetectedTool] = useState(null);
  const [error, setError] = useState(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const inputRef = useRef(null);
  const resultRef = useRef(null);

  // Auto-cycle placeholders
  useEffect(() => {
    if (isOpen) return;
    const interval = setInterval(() => {
      setPlaceholderIdx(prev => (prev + 1) % PLACEHOLDERS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Keyboard shortcuts (Cmd/Ctrl + J)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !result) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, result]);

  const resetState = () => {
    setPrompt('');
    setResult(null);
    setDetectedTool(null);
    setError(null);
    setStage('');
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(resetState, 300); // Wait for exit animation
  };

  const processOmniPrompt = async (e) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isProcessing) return;

    if (!currentUser) {
      setError("Please log in to use the AI Magic Box.");
      return;
    }

    if (userProfile?.status === 'suspended') {
      setError("Your account is suspended. Feature unavailable.");
      return;
    }

    const COST = 5; // Fixed cost for Omni-Prompt
    const isSuperAdmin = userProfile?.role === 'superadmin';

    if (!isSuperAdmin && (stats?.coins || 0) < COST) {
      setShowShop(true);
      setError(`Not enough coins. You need ${COST} coins. Please refill your wallet. 🪙`);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);
    setDetectedTool(null);
    setStage('routing');

    try {
      // Step 1: Intent Routing
      const toolsDescription = tools.map(t => `- ID: "${t.id}", Name: "${t.title}", Desc: "${t.description}"`).join('\n');
      
      const routingPrompt = `
You are an advanced Intent Router for an educational AI platform.
The user will provide a natural language prompt. Your job is to:
1. Identify WHICH tool from the available list best fits the request.
2. Extract the necessary parameters for that tool based on the user's prompt. Make reasonable assumptions for missing parameters based on typical school contexts.

Available Tools:
${toolsDescription}

User Prompt: "${prompt}"

Return ONLY a valid, raw JSON object (no markdown, no backticks) in this exact format:
{
  "tool_id": "the_matched_tool_id",
  "confidence": 0.95,
  "params": {
    "key1": "extracted value",
    "key2": "extracted value"
  }
}
If no tool matches even loosely, return { "tool_id": "none", "confidence": 0 }
`;

      const routerResponseRaw = await generateAIContent(routingPrompt);
      // Clean up potential markdown formatting in JSON response
      let routerResponseStr = routerResponseRaw.trim();
      if (routerResponseStr.startsWith('```json')) {
          routerResponseStr = routerResponseStr.replace(/```json/g, '').replace(/```/g, '').trim();
      } else if (routerResponseStr.startsWith('```')) {
          routerResponseStr = routerResponseStr.replace(/```/g, '').trim();
      }

      let routerData;
      try {
        routerData = JSON.parse(routerResponseStr);
      } catch (parseErr) {
        throw new Error("Failed to understand the intent. Please try being more specific.");
      }

      if (!routerData.tool_id || routerData.tool_id === 'none' || routerData.confidence < 0.3) {
        throw new Error("I couldn't confidently match your request to a specific tool. Try including words like 'worksheet', 'lesson plan', or 'quiz'.");
      }

      const matchedTool = tools.find(t => t.id === routerData.tool_id);
      if (!matchedTool) {
         throw new Error("Identified a tool that doesn't exist. Please try again.");
      }

      setDetectedTool({ ...matchedTool, extractedParams: routerData.params });
      setStage('generating');

      // Step 2: Generation
      // Deduct coins only right before successful generation attempt
      if (!isSuperAdmin) {
        const success = await spendCoins(COST, 'AI Magic Box Generation');
        if (!success) throw new Error("Transaction failed. Please try again.");
      }

      const generationPrompt = matchedTool.promptTemplate(routerData.params || {});
      const finalContent = await generateAIContent(generationPrompt);

      setResult(finalContent);
      setStage('done');

      // Save to history
      try {
        await addDoc(collection(db, 'users', currentUser.uid, 'generations'), {
          toolId: matchedTool.id,
          toolName: matchedTool.title + " (Magic Box)",
          inputs: { ...routerData.params, originalPrompt: prompt },
          output: finalContent,
          timestamp: serverTimestamp()
        });
      } catch (histErr) {
        console.warn('Failed to save history', histErr);
      }

    } catch (err) {
      console.error(err);
      
      // Preserve custom UX errors, but hide technical API errors
      const customErrors = [
        "Not enough coins",
        "Failed to understand the intent",
        "couldn't confidently match",
        "Identified a tool that doesn't exist",
        "Transaction failed"
      ];
      
      let displayMessage = "All servers are currently busy processing requests. Please try again after a few seconds. ✨";
      if (err.message && customErrors.some(customErr => err.message.includes(customErr))) {
        displayMessage = err.message;
      }
      
      setError(displayMessage);
      setStage('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = async () => {
    if (!resultRef.current || !result) return;
    setIsDownloading(true);

    try {
      const safeTitle = (detectedTool?.title || 'AI_Generated').replace(/\s+/g, '_');
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error("Popup blocked. Please allow popups to save as PDF.");
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${safeTitle}</title>
            <style>
              @page { margin: 20mm; }
              body { 
                font-family: 'Segoe UI', 'Inter', system-ui, -apple-system, sans-serif; 
                color: #0f172a; 
                line-height: 1.6; 
                font-size: 14px;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
              }
              .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
              .header h1 { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; }
              .header p { color: #64748b; margin: 0; font-size: 14px; }
              
              /* Markdown Styles */
              h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin: 24px 0 16px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; page-break-after: avoid; }
              h2 { font-size: 18px; font-weight: 700; color: #1e293b; margin: 20px 0 12px 0; page-break-after: avoid; }
              h3 { font-size: 16px; font-weight: 600; color: #334155; margin: 16px 0 8px 0; page-break-after: avoid; }
              p { margin-bottom: 12px; color: #334155; page-break-inside: avoid; }
              strong { color: #0f172a; }
              ul, ol { margin: 10px 0 16px 0; padding-left: 24px; color: #334155; }
              li { margin-bottom: 6px; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; page-break-inside: auto; }
              th { background: #f8fafc; font-weight: 600; text-align: left; padding: 10px; border: 1px solid #e2e8f0; }
              td { padding: 10px; border: 1px solid #e2e8f0; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              blockquote { border-left: 4px solid #6366f1; background: #f8fafc; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0; page-break-inside: avoid; }
              
              .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px; }
              
              @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${detectedTool?.title || 'AI Generated Content'}</h1>
              <p>Generated via LDMS Spark AI</p>
            </div>
            
            <div class="content">
              ${resultRef.current.innerHTML}
            </div>
            
            <div class="footer">
              Generated on ${new Date().toLocaleDateString()}
            </div>
            
            <script>
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      
    } catch (error) {
      console.error("Print generation failed:", error);
      alert(error.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share && result) {
      try {
        await navigator.share({
          title: detectedTool?.title || 'Generated Content',
          text: result,
        });
      } catch (err) {
        console.warn("Error sharing", err);
      }
    } else {
       handleCopy(); // Fallback
    }
  };


  const handleRedirect = () => {
    if (!detectedTool) return;
    setIsOpen(false);
    
    // Redirect mapping for standalone tools
    const routeMap = {
      'ppt-generator': '/ppt-generator',
      'exam-paper': '/smart-exam',
      'timetable': '/timetable',
      'syllabus-planner': '/syllabus-bifurcator'
    };
    
    const targetRoute = routeMap[detectedTool.id] || `/ai-tools?tool=${detectedTool.id}`;
    navigate(targetRoute);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-[84px] xl:bottom-6 right-4 sm:right-6 z-[85] group flex items-center justify-center animate-fade-in-up"
        >
           <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full blur-xl opacity-50 group-hover:opacity-80 group-hover:scale-110 transition-all duration-300"></div>
           <div className="relative flex items-center gap-3 px-5 py-3.5 bg-slate-900/90 dark:bg-white/90 backdrop-blur-xl border border-white/20 dark:border-slate-800/20 shadow-2xl rounded-full text-white dark:text-slate-900 hover:scale-105 transition-all duration-300">
             <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-inner">
               <Sparkles className="w-3.5 h-3.5 animate-pulse text-white" />
             </div>
             <span className="font-extrabold text-[15px] tracking-wide hidden sm:block">Spark AI</span>
             <kbd className="hidden sm:flex items-center justify-center px-2 py-0.5 bg-white/20 dark:bg-black/10 rounded text-[11px] font-bold uppercase ml-1 opacity-80">⌘ J</kbd>
           </div>
        </button>
      )}

      {/* Main Full-Screen Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          {/* Glassmorphism Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" 
            onClick={handleClose}
          />

          {/* Premium Modal Container */}
          <div className="relative w-full max-w-[1000px] bg-white/95 dark:bg-[#0f1117]/95 backdrop-blur-[40px] rounded-[32px] shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_32px_128px_rgba(0,0,0,0.4)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_32px_128px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col transform-gpu transition-all duration-500 animate-slide-up-scale" style={{ height: '85vh', maxHeight: '900px' }}>
            
            {/* Animated Edge Glow */}
            <div className="absolute inset-0 pointer-events-none rounded-[32px] border-[2px] border-transparent" style={{ background: 'linear-gradient(120deg, rgba(99,102,241,0.5), rgba(217,70,239,0.5), rgba(6,182,212,0.5)) border-box', WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}></div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/50 z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 p-[1px]">
                  <div className="w-full h-full bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center">
                    <Wand2 className="w-5 h-5 text-fuchsia-500" />
                  </div>
                </div>
                <div>
                  <h2 className="text-[16px] font-extrabold text-slate-800 dark:text-white flex items-center gap-2 tracking-tight">
                    LDMS Spark AI <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] uppercase font-black tracking-widest border border-indigo-200">Beta</span>
                  </h2>
                  <p className="text-xs font-semibold text-slate-500">Type what you need, AI will figure out the rest.</p>
                </div>
              </div>
              <button onClick={handleClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col relative z-10">
              
              {!result ? (
                /* Input State */
                <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 relative overflow-y-auto custom-scrollbar">
                  
                  {/* Big Input Area */}
                  <div className="w-full max-w-3xl relative group">
                    <div className="absolute -inset-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[32px] blur-xl opacity-20 group-hover:opacity-40 transition duration-700"></div>
                    <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white dark:border-slate-800 p-2 sm:p-4 transition-all">
                      <form onSubmit={processOmniPrompt} className="relative flex flex-col h-full">
                        <textarea
                          ref={inputRef}
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                              e.preventDefault();
                              processOmniPrompt();
                            }
                          }}
                          placeholder={PLACEHOLDERS[placeholderIdx]}
                          className="w-full min-h-[180px] max-h-[400px] resize-none bg-transparent outline-none text-[22px] sm:text-[28px] font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 px-6 py-6 hide-scrollbar leading-snug"
                          disabled={isProcessing}
                          style={{
                            WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
                            maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)'
                          }}
                        />
                        
                        <div className="flex items-center justify-between px-6 pb-2 pt-4 border-t border-slate-100 dark:border-slate-800/50 mt-auto">
                           <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
                             <Sparkles className="w-4 h-4 text-indigo-400" />
                             {prompt.length > 0 ? `${prompt.length} chars` : 'LDMS Spark AI Engine'}
                           </div>
                           <div className="flex items-center gap-4">
                             {prompt.length > 0 && !isProcessing && (
                               <span className="text-xs font-bold text-slate-400 dark:text-slate-500 hidden sm:block"><kbd className="font-sans px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">⌘</kbd> + <kbd className="font-sans px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">↵</kbd></span>
                             )}
                             <button
                               type="submit"
                               disabled={!prompt.trim() || isProcessing}
                               className="relative overflow-hidden group flex items-center gap-2 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95"
                             >
                               {/* Button Shine Effect */}
                               <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 dark:via-black/10 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
                               
                               {isProcessing ? (
                                 <>
                                   <Loader2 className="w-5 h-5 animate-spin" />
                                   <span className="text-[15px] font-extrabold tracking-wide">
                                     {stage === 'routing' ? 'Analyzing...' : 'Generating...'}
                                   </span>
                                 </>
                               ) : (
                                 <>
                                   <span className="text-[16px] font-extrabold tracking-wide">Generate ✨</span>
                                 </>
                               )}
                             </button>
                           </div>
                        </div>
                      </form>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="mt-6 px-6 py-3.5 bg-red-50 text-red-600 rounded-xl font-medium text-sm flex items-center gap-2 border border-red-100 shadow-sm animate-fade-in max-w-2xl text-center">
                      <X className="w-5 h-5 shrink-0" /> {error}
                    </div>
                  )}

                  {/* Status Indicator during processing */}
                  {isProcessing && (
                    <div className="mt-8 flex flex-col items-center gap-3 animate-fade-in text-slate-500 dark:text-slate-400">
                      <div className="flex gap-2">
                         <div className={`w-2 h-2 rounded-full ${stage === 'routing' ? 'bg-indigo-500 animate-ping' : 'bg-indigo-500'}`}></div>
                         <div className={`w-2 h-2 rounded-full ${stage === 'generating' ? 'bg-fuchsia-500 animate-ping' : stage === 'routing' ? 'bg-slate-200' : 'bg-fuchsia-500'}`}></div>
                      </div>
                      <p className="text-sm font-semibold tracking-wide uppercase">
                        {stage === 'routing' && '1. Deciphering your request...'}
                        {stage === 'generating' && `2. Crafting via ${detectedTool?.title}...`}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Result State - Document View */
                <div className="flex-1 flex flex-col h-full bg-slate-100/50 dark:bg-[#0b0c10] relative">
                  
                  {/* Sticky Result Header Toolbar */}
                  <div className="absolute top-0 left-0 right-0 px-6 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4 z-20 shadow-sm">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Generated via</span>
                        {detectedTool && (
                          <div className={`flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200`}>
                            <div className={`w-5 h-5 rounded flex items-center justify-center bg-gradient-to-br ${detectedTool.color} text-white shadow-sm`}>
                               <detectedTool.icon className="w-3 h-3" />
                            </div>
                            {detectedTool.title}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                       <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 transition-all shadow-sm">
                        {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                      <div className="w-px h-4 bg-slate-300 dark:bg-slate-600"></div>
                      <button onClick={handleDownloadPDF} disabled={isDownloading} className="flex items-center gap-2 px-4 py-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 transition-all shadow-sm disabled:opacity-50">
                        {isDownloading ? <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> : <Download className="w-4 h-4" />}
                        <span className="hidden sm:inline">Print / Save PDF</span>
                      </button>
                      <div className="w-px h-4 bg-slate-300 dark:bg-slate-600"></div>
                      <button onClick={handleShare} className="flex items-center gap-2 px-4 py-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 transition-all shadow-sm">
                        <Share2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Share</span>
                      </button>
                    </div>
                  </div>

                  {/* Rendered Markdown Area (Notion-like Document) */}
                  <div className="flex-1 overflow-y-auto pt-[88px] pb-24 px-4 sm:px-8 custom-scrollbar">
                     <div className="max-w-4xl mx-auto bg-white dark:bg-[#151821] rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)] border border-slate-200/60 dark:border-slate-800/60 min-h-full">
                        <div ref={resultRef} className="p-8 sm:p-14 prose prose-slate dark:prose-invert prose-headings:font-display prose-headings:font-bold prose-h1:text-slate-900 dark:prose-h1:text-white prose-h2:text-slate-800 dark:prose-h2:text-slate-100 prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-blockquote:border-l-indigo-500 prose-blockquote:bg-indigo-50/50 dark:prose-blockquote:bg-indigo-500/10 prose-blockquote:px-5 prose-blockquote:py-3 prose-blockquote:rounded-r-2xl prose-blockquote:font-medium prose-blockquote:not-italic prose-li:marker:text-slate-400 max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {result}
                          </ReactMarkdown>
                        </div>
                     </div>
                  </div>

                  {/* Floating Bottom Action */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 w-full max-w-[90%] sm:max-w-none justify-center">
                    <button onClick={handleRedirect} className="flex items-center gap-2 px-6 py-3.5 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-extrabold rounded-full transition-all shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-indigo-100 dark:border-indigo-900 hover:scale-105">
                      <ExternalLink className="w-4 h-4" /> Open in {detectedTool?.title}
                    </button>
                    <button onClick={resetState} className="flex items-center gap-2 px-6 py-3.5 bg-slate-900/95 dark:bg-white/95 backdrop-blur-md hover:scale-105 text-white dark:text-slate-900 font-extrabold rounded-full transition-all shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
                      <Sparkles className="w-4 h-4" /> Generate New
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {showShop && <TokenShopModal onClose={() => setShowShop(false)} />}
    </>
  );
}
