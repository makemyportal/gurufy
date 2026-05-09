import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGamification } from '../contexts/GamificationContext';
import { generateAIContent } from '../utils/aiService';
import { MonitorPlay, Sparkles, Download, Loader2, ChevronLeft, ChevronRight, LayoutTemplate, HelpCircle, Image as ImageIcon, Palette } from 'lucide-react';
import pptxgen from 'pptxgenjs';

const THEMES = {
  modern: {
    id: 'modern',
    name: 'Modern Minimalist',
    colors: {
      bg: 'F8FAFC',
      textTitle: '0F172A',
      textContent: '334155',
      bulletText: '475569',
      accent: 'E2E8F0',
      css: {
        bg: 'bg-slate-50',
        textTitle: 'text-slate-900',
        textContent: 'text-slate-600',
        bulletText: 'text-slate-700',
        accentBg: 'bg-slate-200'
      }
    },
    fonts: { title: 'Segoe UI', body: 'Segoe UI Light' }
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Corporate',
    colors: {
      bg: '0F172A', 
      textTitle: 'FFFFFF',
      textContent: 'CBD5E1',
      bulletText: '94A3B8',
      accent: '1E293B',
      css: {
        bg: 'bg-slate-900',
        textTitle: 'text-white',
        textContent: 'text-slate-300',
        bulletText: 'text-slate-400',
        accentBg: 'bg-slate-800'
      }
    },
    fonts: { title: 'Arial', body: 'Arial' }
  },
  vibrant: {
    id: 'vibrant',
    name: 'Vibrant Creative',
    colors: {
      bg: '2E1065', 
      textTitle: 'FFFFFF',
      textContent: 'E9D5FF',
      bulletText: 'D8B4FE',
      accent: '4C1D95',
      css: {
        bg: 'bg-purple-950',
        textTitle: 'text-white',
        textContent: 'text-purple-200',
        bulletText: 'text-purple-300',
        accentBg: 'bg-purple-900'
      }
    },
    fonts: { title: 'Trebuchet MS', body: 'Trebuchet MS' }
  }
};

export default function PPTGenerator() {
  const { currentUser, userProfile } = useAuth();
  const { stats, spendCoins } = useGamification();

  const [formData, setFormData] = useState({
    topic: '',
    grade: 'Class 8',
    slideCount: '5',
    tone: 'Professional & High-Impact',
    theme: 'modern'
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSlides, setGeneratedSlides] = useState(null);
  const [error, setError] = useState('');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const COST = 10;
  const activeTheme = THEMES[formData.theme];

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!formData.topic.trim()) return;

    if (userProfile?.role !== 'superadmin') {
      if ((stats?.coins || 0) < COST) {
        setError(`Not enough coins! You need ${COST} coins to generate a PPT.`);
        return;
      }
      const success = await spendCoins(COST, 'PPT Generation');
      if (!success) {
        setError('Transaction failed.');
        return;
      }
    }

    setIsGenerating(true);
    setError('');
    setGeneratedSlides(null);
    setCurrentSlideIndex(0);

    const prompt = `Act as an Expert Presentation Creator and Subject Matter Specialist.
Create a HIGHLY ACCURATE, factual, and visually engaging presentation about "${formData.topic}" for a ${formData.grade} audience.
Tone: ${formData.tone}.
Total slides: ${formData.slideCount}.

CRITICAL CONTENT RULES (STRICTLY FOLLOW THIS):
1. BE DIRECT AND FACTUAL. If the topic implies a list (e.g., "Top AI tools", "Reasons for Global Warming", "Steps to learn"), directly provide the actual specific names, tools, or facts in the bullets. Do NOT use generic or abstract corporate fluff.
2. EVERY SINGLE bullet point MUST start with a relevant EMOJI (e.g., 🚀, 💡, 🌍, 📊) to act as a visual icon.
3. MAXIMUM 3 bullet points per slide. Keep them strictly concise (1-2 lines max) to prevent text overflow.
4. The 'content' field should be a very short, direct summary sentence. All hard facts, specific examples, and deep knowledge MUST go into the 'bullets' array.

You MUST respond strictly with a valid JSON object matching this schema. DO NOT wrap the JSON in Markdown formatting blocks.

{
  "title": "Main Title of the Presentation",
  "slides": [
    {
      "layout": "COVER",
      "title": "Slide Title",
      "subtitle": "A powerful, thought-provoking subtitle or hook",
      "imageKeyword": "one highly specific keyword for background image (e.g., galaxy, technology)",
      "speakerNotes": "..."
    },
    {
      "layout": "SPLIT_LEFT_IMAGE",
      "title": "Direct Heading (e.g., Top 3 AI Tools)",
      "content": "One single factual summary sentence.",
      "bullets": ["🤖 ChatGPT - Excellent for drafting and lesson planning...", "🎨 Canva AI - Best for generating visual classroom materials...", "📊 Gradescope - Automates grading for math and science..."],
      "imageKeyword": "specific contextual keyword",
      "speakerNotes": "..."
    },
    {
      "layout": "SPLIT_RIGHT_IMAGE",
      "title": "Another Direct Heading",
      "content": "Another short, factual sentence.",
      "bullets": ["📈 Specific fact or tool A...", "🎯 Specific fact or tool B..."],
      "imageKeyword": "specific contextual keyword",
      "speakerNotes": "..."
    },
    {
      "layout": "FULL_BACKGROUND",
      "title": "Major Quote, Statistic, or Impactful Statement",
      "subtitle": "Supporting insight",
      "imageKeyword": "specific contextual keyword",
      "speakerNotes": "..."
    },
    {
      "layout": "DARK_TEXT_ONLY",
      "title": "Conclusion / Summary",
      "content": "A masterful concluding thought.",
      "bullets": ["🏆 Final specific point 1...", "🔥 Final specific point 2..."],
      "speakerNotes": "..."
    }
  ]
}

Mix the layouts (SPLIT_LEFT_IMAGE, SPLIT_RIGHT_IMAGE, FULL_BACKGROUND, DARK_TEXT_ONLY) to create a premium flow. 'imageKeyword' MUST be a single english word without spaces.`;

    try {
      let aiResponse = await generateAIContent(prompt);
      aiResponse = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const parsedData = JSON.parse(aiResponse);
      if (!parsedData.slides || !Array.isArray(parsedData.slides)) {
        throw new Error("Invalid format received from AI.");
      }
      setGeneratedSlides(parsedData.slides);
    } catch (err) {
      console.error(err);
      setError('Failed to generate premium presentation format. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getImageUrl = (keyword, width, height) => {
    return `https://loremflickr.com/${width}/${height}/${encodeURIComponent(keyword)}/all?lock=${Math.floor(Math.random() * 1000)}`;
  };

  const handleDownloadPPT = async () => {
    if (!generatedSlides) return;
    setIsDownloading(true);
    
    try {
      const pptx = new pptxgen();
      pptx.layout = 'LAYOUT_16x9';

      pptx.defineSlideMaster({
        title: "MASTER_SLIDE",
        background: { color: activeTheme.colors.bg },
        objects: [
          { text: { text: "LDMS AI Premium", options: { x: 0.5, y: 7.0, w: 3, h: 0.3, color: "94A3B8", fontSize: 10, fontFace: activeTheme.fonts.title } } }
        ]
      });

      const fetchImageAsBase64 = async (url) => {
        try {
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
          const response = await fetch(proxyUrl);
          if (!response.ok) throw new Error('Proxy fetch failed');
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          try {
             const response = await fetch(url);
             const blob = await response.blob();
             return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
             });
          } catch(err2) {
             return null;
          }
        }
      };

      // Fetch all images concurrently to drastically speed up download
      const imagePromises = generatedSlides.map(slideData => {
         if (slideData.imageKeyword && slideData.layout !== 'DARK_TEXT_ONLY') {
            const url = getImageUrl(slideData.imageKeyword, 800, 600); // Reduced size for faster fetch
            return fetchImageAsBase64(url);
         }
         return Promise.resolve(null);
      });
      const slideImages = await Promise.all(imagePromises);

      for (let i = 0; i < generatedSlides.length; i++) {
        const slideData = generatedSlides[i];
        const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
        
        if (slideData.speakerNotes) {
          slide.addNotes(slideData.speakerNotes);
        }

        const base64Image = slideImages[i];

        const addPremiumText = (xPos) => {
           // Fixed coordinates to prevent overflow
           slide.addText(slideData.title, { x: xPos, y: 0.5, w: 4.5, h: 1.2, fontSize: 36, color: activeTheme.colors.textTitle, bold: true, fontFace: activeTheme.fonts.title, valign: "top" });
           
           if (slideData.content) {
             slide.addText(slideData.content, { x: xPos, y: 1.8, w: 4.5, h: 1.2, fontSize: 16, color: activeTheme.colors.textContent, fontFace: activeTheme.fonts.body, lineSpacing: 22, valign: "top" });
           }
           
           if (slideData.bullets && slideData.bullets.length > 0) {
             slide.addText(
               slideData.bullets.map(b => ({ text: b, options: { breakLine: true } })),
               { x: xPos, y: 3.2, w: 4.5, h: 2.2, fontSize: 15, color: activeTheme.colors.bulletText, fontFace: activeTheme.fonts.title, lineSpacing: 22, valign: "top" }
             );
           }
        };

        if (slideData.layout === 'COVER' || slideData.layout === 'FULL_BACKGROUND') {
          if (base64Image) {
            slide.addImage({ x: 0, y: 0, w: "100%", h: "100%", data: base64Image });
          } else {
            slide.background = { fill: "0F172A" };
          }
          slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: "000000", transparency: 65 } });
          
          slide.addText(slideData.title, { x: 1, y: 2.5, w: 8, h: 1.5, fontSize: 54, color: "FFFFFF", bold: true, align: "center", fontFace: activeTheme.fonts.title, valign: "middle" });
          if (slideData.subtitle) {
            slide.addText(slideData.subtitle, { x: 1, y: 4.2, w: 8, h: 1.0, fontSize: 24, color: "E0E7FF", align: "center", fontFace: activeTheme.fonts.body, italic: true, valign: "top" });
          }
        } 
        else if (slideData.layout === 'SPLIT_LEFT_IMAGE') {
          if (base64Image) {
             slide.addImage({ x: 0, y: 0, w: "45%", h: "100%", data: base64Image });
          } else {
             slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "45%", h: "100%", fill: { color: activeTheme.colors.accent } });
          }
          addPremiumText(5.0);
        }
        else if (slideData.layout === 'SPLIT_RIGHT_IMAGE') {
          addPremiumText(0.5);
          if (base64Image) {
             slide.addImage({ x: "55%", y: 0, w: "45%", h: "100%", data: base64Image });
          } else {
             slide.addShape(pptx.ShapeType.rect, { x: "55%", y: 0, w: "45%", h: "100%", fill: { color: activeTheme.colors.accent } });
          }
        }
        else { // DARK_TEXT_ONLY overrides the standard background
          slide.background = { fill: "0F172A" }; 
          slide.addText(slideData.title, { x: 1.5, y: 1.2, w: 7, h: 1.5, fontSize: 44, color: "FFFFFF", bold: true, align: "center", fontFace: activeTheme.fonts.title, valign: "top" });
          if (slideData.content) {
            slide.addText(slideData.content, { x: 1.5, y: 2.8, w: 7, h: 1.0, fontSize: 20, color: "CBD5E1", align: "center", fontFace: activeTheme.fonts.body, lineSpacing: 26, valign: "top" });
          }
          if (slideData.bullets && slideData.bullets.length > 0) {
            slide.addText(
              slideData.bullets.map(b => ({ text: b, options: { breakLine: true } })),
              { x: 1.5, y: 4.0, w: 7, h: 1.5, fontSize: 16, color: "94A3B8", fontFace: activeTheme.fonts.title, lineSpacing: 24, valign: "top", align: "center" }
            );
          }
        }
      }

      await pptx.writeFile({ fileName: `Premium-${formData.theme}-${formData.topic.replace(/\s+/g, '-')}-PPT.pptx` });
    } catch (err) {
      console.error(err);
      alert('Error generating PPT file. Please check your connection.');
    } finally {
      setIsDownloading(false);
    }
  };

  const nextSlide = () => setCurrentSlideIndex(prev => Math.min(prev + 1, generatedSlides.length - 1));
  const prevSlide = () => setCurrentSlideIndex(prev => Math.max(prev - 1, 0));

  const renderSlidePreview = () => {
    const slide = generatedSlides[currentSlideIndex];
    const hasImage = slide.imageKeyword && slide.layout !== 'DARK_TEXT_ONLY';
    const imageUrl = hasImage ? getImageUrl(slide.imageKeyword, 800, 600) : '';

    if (slide.layout === 'COVER' || slide.layout === 'FULL_BACKGROUND') {
      return (
        <div className="relative w-full h-full flex flex-col items-center justify-center p-8 text-center overflow-hidden bg-slate-900">
          {hasImage && (
            <img 
              src={imageUrl} 
              alt={slide.imageKeyword} 
              className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay" 
              crossOrigin="anonymous" 
              onError={(e) => { e.target.style.display='none'; }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
          <div className="relative z-10 max-w-4xl">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight font-display tracking-tight drop-shadow-2xl">{slide.title}</h1>
            {slide.subtitle && <p className="text-lg sm:text-xl md:text-3xl text-indigo-200 font-light drop-shadow-lg italic tracking-wide">{slide.subtitle}</p>}
          </div>
        </div>
      );
    }

    if (slide.layout === 'SPLIT_LEFT_IMAGE') {
      return (
        <div className={`w-full h-full flex ${activeTheme.colors.css.bg}`}>
          <div className={`w-[45%] h-full ${activeTheme.colors.css.accentBg} relative overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.1)]`}>
            {hasImage ? (
              <img src={imageUrl} alt={slide.imageKeyword} className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" crossOrigin="anonymous" onError={(e) => { e.target.style.display='none'; }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center opacity-30"><ImageIcon className="w-20 h-20 text-slate-400"/></div>
            )}
          </div>
          <div className="w-[55%] h-full p-6 sm:p-8 md:p-14 flex flex-col justify-start overflow-y-auto text-left">
            <h2 className={`text-2xl sm:text-3xl md:text-4xl font-extrabold ${activeTheme.colors.css.textTitle} mb-4 sm:mb-6 font-display tracking-tight leading-tight`}>{slide.title}</h2>
            {slide.content && <p className={`${activeTheme.colors.css.textContent} mb-6 sm:mb-8 leading-relaxed text-sm sm:text-lg font-light`}>{slide.content}</p>}
            {slide.bullets && (
              <ul className={`space-y-4 list-none ${activeTheme.colors.css.bulletText} font-medium text-sm sm:text-lg`}>
                {slide.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      );
    }

    if (slide.layout === 'SPLIT_RIGHT_IMAGE') {
      return (
        <div className={`w-full h-full flex ${activeTheme.colors.css.bg}`}>
          <div className="w-[55%] h-full p-6 sm:p-8 md:p-14 flex flex-col justify-start overflow-y-auto text-left">
            <h2 className={`text-2xl sm:text-3xl md:text-4xl font-extrabold ${activeTheme.colors.css.textTitle} mb-4 sm:mb-6 font-display tracking-tight leading-tight`}>{slide.title}</h2>
            {slide.content && <p className={`${activeTheme.colors.css.textContent} mb-6 sm:mb-8 leading-relaxed text-sm sm:text-lg font-light`}>{slide.content}</p>}
            {slide.bullets && (
              <ul className={`space-y-4 list-none ${activeTheme.colors.css.bulletText} font-medium text-sm sm:text-lg`}>
                {slide.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={`w-[45%] h-full ${activeTheme.colors.css.accentBg} relative overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.1)]`}>
            {hasImage ? (
              <img src={imageUrl} alt={slide.imageKeyword} className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" crossOrigin="anonymous" onError={(e) => { e.target.style.display='none'; }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center opacity-30"><ImageIcon className="w-20 h-20 text-slate-400"/></div>
            )}
          </div>
        </div>
      );
    }

    // DARK_TEXT_ONLY (Constant dark style regardless of theme for contrast)
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-slate-900 relative overflow-y-auto">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600 rounded-full mix-blend-screen filter blur-[120px] opacity-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600 rounded-full mix-blend-screen filter blur-[120px] opacity-20 pointer-events-none"></div>
        
        <div className="relative z-10 max-w-4xl py-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6 sm:mb-8 font-display tracking-tight leading-tight">{slide.title}</h2>
          {slide.content && <p className="text-lg sm:text-xl md:text-2xl text-slate-300 mb-8 sm:mb-10 leading-relaxed font-light">{slide.content}</p>}
          {slide.bullets && (
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 text-left max-w-3xl mx-auto">
              {slide.bullets.map((b, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5 backdrop-blur-sm">
                  <p className="text-slate-200 font-medium leading-relaxed text-sm sm:text-base">{b}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in-up pb-20 sm:pb-0">
      <div className="relative overflow-hidden rounded-[24px] sm:rounded-[32px] bg-slate-950 border border-slate-800 p-6 sm:p-10 lg:p-14 shadow-2xl">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[500px] sm:w-[900px] h-[500px] sm:h-[900px] bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 rounded-full blur-[140px] pointer-events-none opacity-30" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold tracking-widest uppercase backdrop-blur-md mb-6 shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-400" /> Premium AI Presentation
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold font-display text-white tracking-tight leading-[1.1] mb-5">
            Smart PPT Maker <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500">Pro</span>
          </h1>
          <p className="text-base sm:text-xl text-slate-400 font-light leading-relaxed">
            Generate executive-level, visually stunning presentations. Featuring ready-made premium themes, responsive layouts, and overflow-protected .pptx export.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        <div className="lg:col-span-4 space-y-6">
          <form onSubmit={handleGenerate} className="bg-white rounded-[24px] shadow-xl shadow-slate-200/50 border border-slate-200 p-6 sm:p-8 space-y-6 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-2 border-b border-slate-100 pb-5">
              <div className="p-2.5 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl shadow-md">
                <LayoutTemplate className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Design Settings</h2>
                <p className="text-xs font-medium text-slate-500">Configure your deck & theme</p>
              </div>
            </div>
            
            <div className="space-y-3 pb-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><Palette className="w-3.5 h-3.5"/> Select Premium Theme</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.values(THEMES).map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, theme: t.id })}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${formData.theme === t.id ? 'border-indigo-600 bg-indigo-50 shadow-sm scale-[1.02]' : 'border-slate-100 hover:border-slate-300 bg-white'}`}
                  >
                    <div className="w-6 h-6 rounded-full mb-2 border border-slate-200 shadow-inner" style={{ backgroundColor: '#' + t.colors.bg }} />
                    <span className={`text-[10px] font-bold text-center leading-tight ${formData.theme === t.id ? 'text-indigo-700' : 'text-slate-500'}`}>{t.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Presentation Topic</label>
              <textarea value={formData.topic} onChange={e => setFormData({ ...formData, topic: e.target.value })} placeholder="e.g. Artificial Intelligence, Global Warming..." className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-y shadow-inner transition-all" rows={3} required />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Target Audience</label>
                <input type="text" value={formData.grade} onChange={e => setFormData({ ...formData, grade: e.target.value })} placeholder="e.g. Class 10" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white shadow-inner transition-all" required />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Slide Count</label>
                <select value={formData.slideCount} onChange={e => setFormData({ ...formData, slideCount: e.target.value })} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white shadow-inner transition-all appearance-none">
                  <option value="5">5 Slides</option><option value="10">10 Slides</option><option value="15">15 Slides</option>
                </select>
              </div>
            </div>
            
            {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm font-bold border border-red-200 flex items-start gap-3 shadow-sm"><HelpCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />{error}</div>}
            
            <button type="submit" disabled={isGenerating || !formData.topic.trim()} className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-slate-900 to-black text-white rounded-xl font-extrabold hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:-translate-y-1 transition-all disabled:opacity-50 disabled:transform-none text-base">
              {isGenerating ? <><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /> Crafting Masterpiece...</> : <><Sparkles className="w-6 h-6 text-amber-400" /> Generate Premium Deck (10 🪙)</>}
            </button>
          </form>
        </div>

        <div className="lg:col-span-8">
          <div className={`border border-slate-200 rounded-[24px] p-4 sm:p-6 lg:p-10 min-h-[600px] flex flex-col items-center justify-center relative shadow-inner overflow-hidden ${activeTheme.id === 'midnight' ? 'bg-slate-900' : 'bg-slate-100'}`}>
            {!generatedSlides && !isGenerating && (
              <div className="text-center max-w-md z-10 relative">
                <div className="w-24 h-24 bg-white rounded-[2rem] mx-auto mb-8 flex items-center justify-center shadow-xl border border-slate-200 -rotate-6 transition-transform hover:rotate-0 duration-500">
                  <Palette className="w-12 h-12 text-indigo-600" />
                </div>
                <h3 className={`text-2xl font-extrabold mb-3 font-display ${activeTheme.id === 'midnight' ? 'text-white' : 'text-slate-900'}`}>Visual Preview Mode</h3>
                <p className={`text-base font-medium leading-relaxed ${activeTheme.id === 'midnight' ? 'text-slate-400' : 'text-slate-500'}`}>Select a theme and enter a topic to generate an executive-grade presentation perfectly styled and sized.</p>
              </div>
            )}

            {isGenerating && (
              <div className="text-center z-10 relative">
                <div className="relative w-24 h-24 mx-auto mb-8">
                  <div className="absolute inset-0 border-4 border-indigo-200 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                  <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-indigo-600 animate-pulse" />
                </div>
                <h3 className={`text-xl font-extrabold mb-2 font-display ${activeTheme.id === 'midnight' ? 'text-white' : 'text-slate-900'}`}>AI is analyzing topic...</h3>
                <p className={`font-medium ${activeTheme.id === 'midnight' ? 'text-slate-400' : 'text-slate-500'}`}>Applying '{activeTheme.name}' styling rules</p>
              </div>
            )}

            {generatedSlides && generatedSlides.length > 0 && (
              <div className="w-full h-full flex flex-col z-10 relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                      <MonitorPlay className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-lg">Deck Preview</h3>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Theme: {activeTheme.name}</p>
                    </div>
                  </div>
                  <button onClick={handleDownloadPPT} disabled={isDownloading} className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-70">
                    {isDownloading ? <><Loader2 className="w-5 h-5 animate-spin" /> Packaging File...</> : <><Download className="w-5 h-5" /> Download .pptx</>}
                  </button>
                </div>

                <div className="relative w-full aspect-video bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden border border-slate-300 flex flex-col animate-fade-in transition-all group">
                  {renderSlidePreview()}
                  <div className="absolute bottom-4 right-6 text-[10px] text-white/90 font-black tracking-widest uppercase mix-blend-difference drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity">LDMS Premium AI</div>
                </div>

                <div className="flex items-center justify-center gap-4 sm:gap-8 mt-10">
                  <button onClick={prevSlide} disabled={currentSlideIndex === 0} className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-white shadow-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"><ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" /></button>
                  <div className="flex flex-wrap items-center justify-center gap-2 max-w-[250px]">
                    {generatedSlides.map((_, idx) => <button key={idx} onClick={() => setCurrentSlideIndex(idx)} className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${idx === currentSlideIndex ? 'bg-indigo-600 w-8 sm:w-10 shadow-md' : 'bg-slate-300 hover:bg-slate-400'}`} />)}
                  </div>
                  <button onClick={nextSlide} disabled={currentSlideIndex === generatedSlides.length - 1} className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-white shadow-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"><ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
