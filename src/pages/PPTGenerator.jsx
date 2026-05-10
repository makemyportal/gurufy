import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGamification } from '../contexts/GamificationContext';
import { generateAIContent } from '../utils/aiService';
import { MonitorPlay, Sparkles, Download, Loader2, ChevronLeft, ChevronRight, LayoutTemplate, HelpCircle, Image as ImageIcon, Palette, Maximize2, X } from 'lucide-react';
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
  },
  nature: {
    id: 'nature',
    name: 'Eco Nature',
    colors: {
      bg: 'F0FDF4',
      textTitle: '14532D',
      textContent: '166534',
      bulletText: '15803D',
      accent: 'DCFCE7',
      css: {
        bg: 'bg-green-50',
        textTitle: 'text-green-900',
        textContent: 'text-green-800',
        bulletText: 'text-green-700',
        accentBg: 'bg-green-100'
      }
    },
    fonts: { title: 'Georgia', body: 'Georgia' }
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Neon Cyber',
    colors: {
      bg: '000000',
      textTitle: '00FF41',
      textContent: 'E0E7FF',
      bulletText: 'A855F7',
      accent: '111827',
      css: {
        bg: 'bg-black',
        textTitle: 'text-green-400',
        textContent: 'text-indigo-100',
        bulletText: 'text-purple-400',
        accentBg: 'bg-gray-900'
      }
    },
    fonts: { title: 'Courier New', body: 'Arial' }
  },
  rose: {
    id: 'rose',
    name: 'Rose Gold',
    colors: {
      bg: 'FFF1F2',
      textTitle: '881337',
      textContent: '9F1239',
      bulletText: 'BE123C',
      accent: 'FFE4E6',
      css: {
        bg: 'bg-rose-50',
        textTitle: 'text-rose-900',
        textContent: 'text-rose-800',
        bulletText: 'text-rose-700',
        accentBg: 'bg-rose-100'
      }
    },
    fonts: { title: 'Palatino Linotype', body: 'Palatino Linotype' }
  }
};

// Scaled wrapper for Present mode - defined outside to prevent remounts
const ScaledSlideWrapper = ({ children }) => {
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !containerRef.current.parentElement) return;
      const parent = containerRef.current.parentElement;
      const { width, height } = parent.getBoundingClientRect();
      setScale(Math.min(width / 1280, height / 720) * 0.95);
    };
    handleResize();
    setTimeout(handleResize, 50);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center overflow-hidden">
      <div
        style={{ width: '1280px', height: '720px', transform: `scale(${scale})`, transformOrigin: 'center' }}
        className="shrink-0 flex items-center justify-center drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-[2rem] overflow-hidden bg-white"
      >
        {children}
      </div>
    </div>
  );
};

export default function PPTGenerator() {
  const { currentUser, userProfile } = useAuth();
  const { stats, spendCoins } = useGamification();

  const [formData, setFormData] = useState({
    topic: '',
    category: 'Education',
    industry: 'EdTech',
    audience: 'Class 10',
    slideCount: '5',
    language: 'English',
    goal: 'Educate & Inform',
    theme: 'modern'
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSlides, setGeneratedSlides] = useState(null);
  const [error, setError] = useState('');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const COST = 10;
  const activeTheme = THEMES[formData.theme];

  // Fullscreen: body scroll lock, native API sync, keyboard navigation
  useEffect(() => {
    document.body.style.overflow = isFullscreen ? 'hidden' : 'auto';
    
    const onFsChange = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) setIsFullscreen(false);
    };
    const onKeyDown = (e) => {
      if (!isFullscreen || !generatedSlides) return;
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); setCurrentSlideIndex(p => Math.min(p + 1, generatedSlides.length - 1)); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setCurrentSlideIndex(p => Math.max(p - 1, 0)); }
      if (e.key === 'Escape') toggleFullscreenMode(false);
    };
    
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('keydown', onKeyDown);
    return () => { 
      document.body.style.overflow = 'auto'; 
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isFullscreen, generatedSlides]);

  const toggleFullscreenMode = async (enter) => {
    try {
      if (enter) {
        setIsFullscreen(true);
        const el = document.documentElement;
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      } else {
        setIsFullscreen(false);
        if (document.fullscreenElement || document.webkitFullscreenElement) {
          if (document.exitFullscreen) await document.exitFullscreen();
          else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
        }
      }
    } catch (err) { console.warn('Fullscreen API:', err); }
  };

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

    const slideCount = parseInt(formData.slideCount) || 5;

    const buildPrompt = (count) => `You are a JSON-only AI Presentation Engine. Output ONLY a raw JSON object, no markdown, no code fences, no explanation.

Generate a ${count}-slide professional presentation.

JSON SCHEMA (follow exactly):
{"presentation_title":"...","slides":[{"title":"...","subtitle":"...","layout":"...","content":["bullet1","bullet2"],"cards":[{"title":"...","description":"..."}],"stats":[{"label":"...","value":"..."}],"timeline":[{"year":"...","event":"..."}],"comparison":[{"left":"...","right":"..."}],"image_keywords":["keyword1","keyword2"],"summary_points":["..."],"speaker_notes":"..."}]}

LAYOUT VALUES (use ONLY these): hero, cinematic, full_image, floating_cards, image_left, image_right, split_screen, centered, minimal, cards.

RULES:
- First slide: layout "hero" or "cinematic". Last slide: layout "centered" with summary.
- Use varied layouts across slides. Mix image_left, image_right, cards, centered.
- Each slide must have "title" and "layout". Other fields are optional per slide type.
- "content": max 4 bullet points per slide. Keep each bullet under 20 words.
- "cards": max 3 cards per slide.
- "stats": max 4 stats per slide.
- "image_keywords": 2-3 descriptive words for image search (e.g. "students laptop classroom").
- Keep the total JSON compact. Do NOT add unused empty arrays.
- Ensure valid, complete JSON. No trailing commas. Close all brackets.

Topic: ${formData.topic}
Category: ${formData.category}
Industry: ${formData.industry}
Audience: ${formData.audience}
Language: ${formData.language}
Goal: ${formData.goal}
Slides: ${count}

Return ONLY the JSON object.`;

    const parseAIResponse = (raw) => {
      // Extract JSON from response
      let text = raw;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) text = jsonMatch[0];
      else text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

      // Try direct parse
      try { return JSON.parse(text); } catch (e) { /* continue to repair */ }

      // Repair: trailing commas, unbalanced brackets
      let repaired = text.replace(/,\s*([\]}])/g, '$1');
      const ob = (repaired.match(/\{/g) || []).length;
      const cb = (repaired.match(/\}/g) || []).length;
      const oq = (repaired.match(/\[/g) || []).length;
      const cq = (repaired.match(/\]/g) || []).length;
      if (oq > cq) repaired += ']'.repeat(oq - cq);
      if (ob > cb) repaired += '}'.repeat(ob - cb);

      try { return JSON.parse(repaired); } catch (e2) {
        throw new Error('JSON parse failed after repair.');
      }
    };

    // Attempt generation with retry (reduce slide count on failure)
    let attempts = 0;
    let currentCount = slideCount;
    while (attempts < 3) {
      try {
        const prompt = buildPrompt(currentCount);
        const aiResponse = await generateAIContent(prompt, { preferGemini: true });
        const parsedData = parseAIResponse(aiResponse);

        if (!parsedData.slides || !Array.isArray(parsedData.slides) || parsedData.slides.length === 0) {
          throw new Error('No slides in response.');
        }
        setGeneratedSlides(parsedData.slides);
        setError('');
        break;
      } catch (err) {
        attempts++;
        console.warn(`Generation attempt ${attempts} failed:`, err.message);
        if (attempts < 3) {
          currentCount = Math.max(3, currentCount - 2); // reduce slides and retry
          await new Promise(r => setTimeout(r, 1500));
        } else {
          setError(`Generation failed after ${attempts} attempts. Please try a shorter topic or fewer slides.`);
        }
      }
    }
    setIsGenerating(false);
  };

  const getImageUrl = (keywords) => {
    let keyword = 'abstract';
    if (Array.isArray(keywords) && keywords.length > 0) {
      keyword = keywords.slice(0, 3).join(' ');
    } else if (typeof keywords === 'string' && keywords.trim() !== '') {
      keyword = keywords;
    }
    // Add style modifiers for better quality
    const enhancedPrompt = `${keyword}, professional, high quality, 4k`;
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1280&height=720&nologo=true&seed=${Math.abs(keyword.split('').reduce((a,b) => a + b.charCodeAt(0), 0))}`;
  };

  // Gradient fallback when image fails
  const ImageWithFallback = ({ src, alt, className, isBackground = false }) => {
    const [failed, setFailed] = useState(false);
    const gradients = [
      'from-indigo-600 via-purple-600 to-pink-500',
      'from-emerald-500 via-teal-500 to-cyan-500',
      'from-amber-500 via-orange-500 to-red-500',
      'from-blue-600 via-violet-600 to-purple-600',
      'from-rose-500 via-pink-500 to-fuchsia-500',
    ];
    const gradient = gradients[Math.abs((alt || '').length) % gradients.length];

    if (failed || !src) {
      if (isBackground) {
        return <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-40`}></div>;
      }
      return (
        <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <div className="text-white/30"><ImageIcon className="w-16 h-16" /></div>
        </div>
      );
    }

    return (
      <img
        src={src}
        alt={alt}
        className={className}
        crossOrigin="anonymous"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
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

      const imagePromises = generatedSlides.map(slideData => {
         const hasImage = slideData.image_keywords && slideData.image_keywords.length > 0;
         const layout = slideData.layout || 'centered';
         if (hasImage && !['centered', 'minimal', 'cards'].includes(layout)) {
            const url = getImageUrl(slideData.image_keywords);
            return fetchImageAsBase64(url);
         }
         return Promise.resolve(null);
      });
      const slideImages = await Promise.all(imagePromises);

      for (let i = 0; i < generatedSlides.length; i++) {
        const slideData = generatedSlides[i];
        const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
        
        if (slideData.speaker_notes) {
          slide.addNotes(slideData.speaker_notes);
        }

        const base64Image = slideImages[i];
        const layout = slideData.layout || 'centered';

        const addPremiumText = (xPos) => {
           slide.addText(slideData.title || '', { x: xPos, y: 0.5, w: 4.5, h: 1.2, fontSize: 36, color: activeTheme.colors.textTitle, bold: true, fontFace: activeTheme.fonts.title, valign: "top" });
           
           if (slideData.subtitle) {
             slide.addText(slideData.subtitle, { x: xPos, y: 1.8, w: 4.5, h: 0.8, fontSize: 18, color: activeTheme.colors.textContent, fontFace: activeTheme.fonts.body, italic: true, valign: "top" });
           }
           
           if (slideData.content && slideData.content.length > 0) {
             slide.addText(
               slideData.content.map(b => ({ text: b, options: { breakLine: true } })),
               { x: xPos, y: 2.8, w: 4.5, h: 2.2, fontSize: 16, color: activeTheme.colors.bulletText, fontFace: activeTheme.fonts.title, lineSpacing: 22, valign: "top" }
             );
           }
        };

        if (['hero', 'cinematic', 'full_image', 'floating_cards'].includes(layout)) {
          if (base64Image) {
            slide.addImage({ x: 0, y: 0, w: "100%", h: "100%", data: base64Image });
          } else {
            slide.background = { fill: activeTheme.colors.bg };
          }
          slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: "000000", transparency: 65 } });
          slide.addText(slideData.title || '', { x: 1, y: 2.5, w: 8, h: 1.5, fontSize: 54, color: "FFFFFF", bold: true, align: "center", fontFace: activeTheme.fonts.title, valign: "middle" });
          if (slideData.subtitle) {
            slide.addText(slideData.subtitle, { x: 1, y: 4.2, w: 8, h: 1.0, fontSize: 24, color: "E0E7FF", align: "center", fontFace: activeTheme.fonts.body, italic: true, valign: "top" });
          }
        } 
        else if (['image_left', 'split_screen'].includes(layout)) {
          if (base64Image) {
             slide.addImage({ x: 0, y: 0, w: "45%", h: "100%", data: base64Image });
          } else {
             slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "45%", h: "100%", fill: { color: activeTheme.colors.accent } });
          }
          addPremiumText(5.0);
        }
        else if (['image_right'].includes(layout)) {
          addPremiumText(0.5);
          if (base64Image) {
             slide.addImage({ x: "55%", y: 0, w: "45%", h: "100%", data: base64Image });
          } else {
             slide.addShape(pptx.ShapeType.rect, { x: "55%", y: 0, w: "45%", h: "100%", fill: { color: activeTheme.colors.accent } });
          }
        }
        else { 
           // Generic fallback layout for everything else (Cards, Stats, Timeline, Comparison)
           slide.background = { fill: activeTheme.colors.bg };
           slide.addText(slideData.title || '', { x: 0.5, y: 0.5, w: 9, h: 1.0, fontSize: 36, color: activeTheme.colors.textTitle, bold: true, fontFace: activeTheme.fonts.title, align: "center", valign: "top" });
           
           if (slideData.subtitle) {
             slide.addText(slideData.subtitle, { x: 0.5, y: 1.5, w: 9, h: 0.6, fontSize: 18, color: activeTheme.colors.textContent, fontFace: activeTheme.fonts.body, align: "center", valign: "top" });
           }

           if (slideData.cards && slideData.cards.length > 0) {
             const cardWidth = 2.8;
             const cardSpacing = 0.3;
             const totalCards = Math.min(slideData.cards.length, 3);
             const startX = (10 - (cardWidth * totalCards + cardSpacing * (totalCards - 1))) / 2;
             
             for (let j = 0; j < totalCards; j++) {
               const x = startX + j * (cardWidth + cardSpacing);
               slide.addShape(pptx.ShapeType.roundRect, { x: x, y: 2.5, w: cardWidth, h: 2.5, fill: { color: activeTheme.colors.accent }, rectRadius: 0.1 });
               slide.addText(slideData.cards[j].title || '', { x: x + 0.1, y: 2.6, w: cardWidth - 0.2, h: 0.6, fontSize: 16, color: activeTheme.colors.textTitle, fontFace: activeTheme.fonts.title, align: "center", valign: "middle", bold: true });
               slide.addText(slideData.cards[j].description || '', { x: x + 0.1, y: 3.2, w: cardWidth - 0.2, h: 1.6, fontSize: 13, color: activeTheme.colors.textContent, fontFace: activeTheme.fonts.body, align: "center", valign: "top" });
             }
           } else if (slideData.stats && slideData.stats.length > 0) {
             const statWidth = 4;
             const totalStats = Math.min(slideData.stats.length, 2);
             for (let j = 0; j < totalStats; j++) {
                const x = 0.5 + j * 5;
                slide.addText(slideData.stats[j].value || '', { x: x, y: 2.5, w: statWidth, h: 1.5, fontSize: 60, color: activeTheme.colors.textTitle, bold: true, align: "center" });
                slide.addText(slideData.stats[j].label || '', { x: x, y: 4.0, w: statWidth, h: 1.0, fontSize: 20, color: activeTheme.colors.textContent, align: "center" });
             }
           } else if (slideData.timeline && slideData.timeline.length > 0) {
              slide.addText(
                 slideData.timeline.map(t => ({ text: `${t.year} - ${t.event}`, options: { breakLine: true } })),
                 { x: 1, y: 2.5, w: 8, h: 3, fontSize: 16, color: activeTheme.colors.bulletText, lineSpacing: 24, align: "left" }
              );
           } else if (slideData.comparison && slideData.comparison.length > 0) {
              slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 2.5, w: 4.2, h: 3.5, fill: { color: activeTheme.colors.accent } });
              slide.addShape(pptx.ShapeType.rect, { x: 5.3, y: 2.5, w: 4.2, h: 3.5, fill: { color: "FFFFFF" } });
              
              slide.addText(
                 slideData.comparison.map(c => ({ text: c.left || '', options: { breakLine: true } })),
                 { x: 0.7, y: 2.7, w: 3.8, h: 3, fontSize: 15, color: activeTheme.colors.textTitle, lineSpacing: 20 }
              );
              slide.addText(
                 slideData.comparison.map(c => ({ text: c.right || '', options: { breakLine: true } })),
                 { x: 5.5, y: 2.7, w: 3.8, h: 3, fontSize: 15, color: activeTheme.colors.textTitle, lineSpacing: 20 }
              );
           } else if (slideData.content && slideData.content.length > 0) {
             slide.addText(
               slideData.content.map(b => ({ text: b, options: { breakLine: true } })),
               { x: 1, y: 2.5, w: 8, h: 2.5, fontSize: 18, color: activeTheme.colors.bulletText, fontFace: activeTheme.fonts.title, lineSpacing: 24, align: "center", valign: "middle" }
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

  const renderSlideCard = (slide, index, isPresentMode = false) => {
    const rc = (responsiveClass, fixedClass) => isPresentMode ? fixedClass : responsiveClass;
    const hasImage = slide.image_keywords && slide.image_keywords.length > 0;
    const imageUrl = hasImage ? getImageUrl(slide.image_keywords) : '';

    const layout = slide.layout || 'centered';

    const renderTitle = (classes) => <h2 className={classes}>{slide.title}</h2>;
    const renderSubtitle = (classes) => slide.subtitle && <p className={classes}>{slide.subtitle}</p>;
    const renderContent = (classes) => slide.content && slide.content.length > 0 && (
      <div className={classes}>
        {slide.content.slice(0, isPresentMode ? 4 : 5).map((c, i) => (
           <div key={i} className={`flex items-start ${isPresentMode ? 'gap-2' : 'gap-3'}`}>
             <div className={`${isPresentMode ? 'w-1.5 h-1.5 mt-2' : 'w-2 h-2 mt-2.5'} rounded-full bg-indigo-500 shrink-0`}></div>
             <p className="flex-1">{c}</p>
           </div>
        ))}
      </div>
    );

    const renderCards = () => slide.cards && slide.cards.length > 0 && (
      <div className={`grid grid-cols-3 ${isPresentMode ? 'gap-3 mt-4' : 'gap-6 mt-8'} w-full`}>
        {slide.cards.slice(0, 3).map((card, i) => (
          <div key={i} className={`${isPresentMode ? 'p-3 rounded-xl' : 'p-6 rounded-[2rem]'} ${activeTheme.colors.css.accentBg} shadow-lg border border-white/50 flex flex-col items-center text-center bg-opacity-70 backdrop-blur-md transition-all hover:-translate-y-1`}>
            {card.title && <h4 className={`font-bold ${rc('text-xl', 'text-[16px]')} ${isPresentMode ? 'mb-1' : 'mb-3'} ${activeTheme.colors.css.textTitle}`}>{card.title}</h4>}
            {card.description && <p className={`${rc('text-base', 'text-[13px] leading-snug')} font-medium ${activeTheme.colors.css.textContent}`}>{card.description}</p>}
          </div>
        ))}
      </div>
    );

    const renderStats = () => slide.stats && slide.stats.length > 0 && (
      <div className={`grid grid-cols-4 ${isPresentMode ? 'gap-3 mt-4' : 'gap-6 mt-8'} w-full`}>
        {slide.stats.slice(0, 4).map((stat, i) => (
          <div key={i} className={`${isPresentMode ? 'p-3 rounded-xl' : 'p-8 rounded-3xl'} bg-white/60 backdrop-blur-xl shadow-xl border border-white/80 flex flex-col items-center justify-center text-center`}>
            <h3 className={`${rc('text-4xl sm:text-5xl', 'text-[32px]')} font-black mb-1 ${activeTheme.colors.css.textTitle}`}>{stat.value}</h3>
            <p className={`${rc('text-sm', 'text-[11px]')} font-bold uppercase tracking-widest ${activeTheme.colors.css.textContent}`}>{stat.label}</p>
          </div>
        ))}
      </div>
    );

    const renderTimeline = () => slide.timeline && slide.timeline.length > 0 && (
      <div className={`w-full max-w-4xl ${isPresentMode ? 'mt-4 space-y-2' : 'mt-8 space-y-4'} flex flex-col text-left mx-auto`}>
        {slide.timeline.slice(0, isPresentMode ? 4 : 5).map((item, i) => (
          <div key={i} className={`flex items-center ${isPresentMode ? 'gap-3 p-2 rounded-lg' : 'gap-6 p-5 rounded-2xl'} ${activeTheme.colors.css.accentBg} border border-slate-200/50 shadow-md`}>
            <div className={`${rc('text-xl', 'text-[15px]')} font-black ${activeTheme.colors.css.textTitle} ${isPresentMode ? 'w-20' : 'w-32'} shrink-0 border-r-4 border-indigo-500 pr-3 text-right`}>{item.year}</div>
            <div className={`${rc('text-lg', 'text-[14px] leading-snug')} font-medium ${activeTheme.colors.css.textContent}`}>{item.event}</div>
          </div>
        ))}
      </div>
    );

    const renderComparison = () => slide.comparison && slide.comparison.length > 0 && (
       <div className={`w-full ${isPresentMode ? 'mt-4 grid-cols-2 gap-4' : 'mt-8 sm:grid-cols-2 gap-8'} grid text-left`}>
         <div className={`${isPresentMode ? 'p-3 rounded-xl border-t-4' : 'p-8 rounded-3xl border-t-8'} ${activeTheme.colors.css.accentBg} border-rose-400 shadow-lg`}>
            <ul className={isPresentMode ? 'space-y-1' : 'space-y-4'}>
              {slide.comparison.slice(0, isPresentMode ? 3 : 5).map((c, i) => c.left && <li key={i} className={`${rc('text-lg', 'text-[13px] leading-snug')} font-medium ${activeTheme.colors.css.textContent} flex items-start gap-2`}>
                <span className="text-rose-500 mt-0.5 shrink-0">✗</span> <span>{c.left}</span>
              </li>)}
            </ul>
         </div>
         <div className={`${isPresentMode ? 'p-3 rounded-xl border-t-4' : 'p-8 rounded-3xl border-t-8'} bg-white/80 border-emerald-400 shadow-lg`}>
            <ul className={isPresentMode ? 'space-y-1' : 'space-y-4'}>
              {slide.comparison.slice(0, isPresentMode ? 3 : 5).map((c, i) => c.right && <li key={i} className={`${rc('text-lg', 'text-[13px] leading-snug')} font-medium ${activeTheme.colors.css.textContent} flex items-start gap-2`}>
                <span className="text-emerald-500 mt-0.5 shrink-0">✓</span> <span>{c.right}</span>
              </li>)}
            </ul>
         </div>
       </div>
    );

    // Layout Matcher
    if (['hero', 'cinematic', 'full_image', 'floating_cards'].includes(layout)) {
      return (
        <div key={index} className={isPresentMode ? "relative w-full h-full flex flex-col items-center justify-center p-8 text-center overflow-hidden rounded-[2rem] bg-slate-900 group" : "relative w-full h-full min-h-[400px] sm:min-h-[500px] lg:aspect-video flex flex-col items-center justify-center p-6 sm:p-10 text-center overflow-hidden rounded-[2rem] shadow-2xl bg-slate-900 border border-slate-700/50 group"}>
          <ImageWithFallback src={imageUrl} alt={slide.title} className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay" isBackground={true} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
          
          <div className={`relative z-10 max-w-4xl bg-white/10 backdrop-blur-md border border-white/20 ${isPresentMode ? 'px-10 py-8' : 'p-10 md:p-16'} rounded-[2rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]`}>
            {renderTitle(`${rc('text-5xl sm:text-6xl md:text-7xl', 'text-[42px] leading-[1.15]')} font-extrabold text-white mb-3 font-display tracking-tight drop-shadow-2xl`)}
            {renderSubtitle(`${rc('text-xl sm:text-2xl md:text-3xl', 'text-[20px] leading-[1.4]')} text-indigo-100 font-light drop-shadow-md`)}
            {slide.content && slide.content.length > 0 && <div className={`mt-4 ${rc('text-lg', 'text-[15px] leading-relaxed')} text-white/80 font-medium space-y-1`}>{slide.content.slice(0,3).map((c,i)=><p key={i}>{c}</p>)}</div>}
          </div>
        </div>
      );
    }

    if (['image_left', 'split_screen'].includes(layout)) {
      return (
        <div key={index} className={isPresentMode ? `w-full h-full flex flex-row overflow-hidden rounded-[2rem] shadow-2xl ${activeTheme.colors.css.bg} group` : `w-full h-full min-h-[400px] sm:min-h-[500px] lg:aspect-video flex flex-col md:flex-row overflow-hidden rounded-[2rem] shadow-2xl border border-slate-200/50 ${activeTheme.colors.css.bg} group`}>
          <div className={isPresentMode ? `w-[45%] h-full relative overflow-hidden` : `w-full md:w-[45%] h-64 md:h-full relative overflow-hidden`}>
            <ImageWithFallback src={imageUrl} alt={slide.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20"></div>
          </div>
          <div className={isPresentMode ? "w-[55%] h-full p-6 flex flex-col justify-center text-left relative overflow-hidden" : "w-full md:w-[55%] h-full p-6 sm:p-10 flex flex-col justify-center text-left relative overflow-y-auto"}>
            {renderTitle(`${rc('text-4xl sm:text-5xl md:text-6xl', 'text-[32px] leading-[1.15]')} font-extrabold ${activeTheme.colors.css.textTitle} mb-2 font-display tracking-tight`)}
            {renderSubtitle(`${rc('text-xl md:text-2xl', 'text-[16px] leading-[1.4]')} ${activeTheme.colors.css.textContent} mb-3 font-light border-l-4 border-indigo-500 pl-4 italic`)}
            {renderContent(`space-y-1.5 mb-3 ${rc('text-lg', 'text-[14px] leading-snug')} ${activeTheme.colors.css.textContent} font-medium`)}
            {renderCards()}
            {renderStats()}
            {renderTimeline()}
            {renderComparison()}
          </div>
        </div>
      );
    }

    if (['image_right'].includes(layout)) {
      return (
        <div key={index} className={isPresentMode ? `w-full h-full flex flex-row overflow-hidden rounded-[2rem] shadow-2xl ${activeTheme.colors.css.bg} group` : `w-full h-full min-h-[400px] sm:min-h-[500px] lg:aspect-video flex flex-col-reverse md:flex-row overflow-hidden rounded-[2rem] shadow-2xl border border-slate-200/50 ${activeTheme.colors.css.bg} group`}>
          <div className={isPresentMode ? "w-[55%] h-full p-6 flex flex-col justify-center text-left relative overflow-hidden" : "w-full md:w-[55%] h-full p-6 sm:p-10 flex flex-col justify-center text-left relative overflow-y-auto"}>
            {renderTitle(`${rc('text-4xl sm:text-5xl md:text-6xl', 'text-[32px] leading-[1.15]')} font-extrabold ${activeTheme.colors.css.textTitle} mb-2 font-display tracking-tight`)}
            {renderSubtitle(`${rc('text-xl md:text-2xl', 'text-[16px] leading-[1.4]')} ${activeTheme.colors.css.textContent} mb-3 font-light border-l-4 border-indigo-500 pl-4 italic`)}
            {renderContent(`space-y-1.5 mb-3 ${rc('text-lg', 'text-[14px] leading-snug')} ${activeTheme.colors.css.textContent} font-medium`)}
            {renderCards()}
            {renderStats()}
            {renderTimeline()}
            {renderComparison()}
          </div>
          <div className={isPresentMode ? `w-[45%] h-full relative overflow-hidden` : `w-full md:w-[45%] h-64 md:h-full relative overflow-hidden`}>
            <ImageWithFallback src={imageUrl} alt={slide.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black/20"></div>
          </div>
        </div>
      );
    }

    // Default layout for everything else
    return (
      <div key={index} className={isPresentMode ? `w-full h-full flex flex-col items-center justify-center p-6 text-center overflow-hidden rounded-[2rem] ${activeTheme.colors.css.bg} group relative` : `w-full h-full min-h-[400px] sm:min-h-[500px] lg:aspect-video flex flex-col items-center justify-center p-6 sm:p-10 text-center overflow-hidden rounded-[2rem] shadow-2xl border border-slate-200/50 ${activeTheme.colors.css.bg} group relative`}>
        {hasImage && <ImageWithFallback src={imageUrl} alt={slide.title} className="absolute inset-0 w-full h-full object-cover opacity-[0.08]" isBackground={false} />}
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-50 pointer-events-none"></div>
        <div className="relative z-10 w-full max-w-6xl flex flex-col items-center">
          {renderTitle(`${rc('text-4xl sm:text-5xl md:text-6xl', 'text-[36px] leading-[1.15]')} font-extrabold ${activeTheme.colors.css.textTitle} mb-2 font-display tracking-tight`)}
          {renderSubtitle(`${rc('text-xl md:text-2xl', 'text-[17px] leading-[1.4]')} ${activeTheme.colors.css.textContent} mb-4 font-light max-w-3xl`)}
          {renderContent(`${isPresentMode ? 'space-y-1.5 mb-3' : 'space-y-3 mb-6'} ${rc('text-lg', 'text-[14px] leading-snug')} ${activeTheme.colors.css.textContent} max-w-4xl text-left w-full mx-auto`)}
          
          <div className="w-full">
            {renderCards()}
            {renderStats()}
            {renderTimeline()}
            {renderComparison()}
          </div>

          {!slide.cards && !slide.stats && !slide.timeline && !slide.comparison && slide.summary_points && slide.summary_points.length > 0 && (
             <div className={`grid grid-cols-2 ${isPresentMode ? 'gap-2 mt-3' : 'gap-5 mt-6'} text-left w-full max-w-4xl`}>
               {slide.summary_points.slice(0, isPresentMode ? 4 : 6).map((p, i) => (
                 <div key={i} className={`bg-white/60 backdrop-blur-md border border-white/80 ${isPresentMode ? 'rounded-lg p-2.5' : 'rounded-2xl p-5'} shadow-md ${activeTheme.colors.css.bulletText}`}>
                   <p className={`font-semibold ${rc('text-lg', 'text-[13px] leading-snug')}`}>{p}</p>
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
      {isFullscreen && generatedSlides && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center animate-fade-in">
          <div className="absolute top-4 right-4 z-50">
            <button onClick={() => toggleFullscreenMode(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all shadow-lg border border-white/10">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Slide + Nav stacked tightly */}
          <div className="flex flex-col items-center justify-center w-full h-full">
            <div className="w-full flex-1 flex items-center justify-center overflow-hidden">
              <ScaledSlideWrapper>
                {renderSlideCard(generatedSlides[currentSlideIndex], currentSlideIndex, true)}
              </ScaledSlideWrapper>
            </div>
            
            <div className="shrink-0 px-6 py-2.5 my-3 rounded-full flex items-center gap-6 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
              <button onClick={prevSlide} disabled={currentSlideIndex === 0} className="text-white hover:text-indigo-400 disabled:opacity-30 transition-all hover:scale-110 active:scale-95"><ChevronLeft className="w-6 h-6" /></button>
              <div className="flex items-center gap-2">
                <span className="text-white/60 font-bold text-xs tracking-widest uppercase mr-2">{currentSlideIndex + 1} / {generatedSlides.length}</span>
                {generatedSlides.map((_, idx) => <div key={idx} onClick={() => setCurrentSlideIndex(idx)} className={`cursor-pointer rounded-full transition-all duration-300 ${idx === currentSlideIndex ? 'bg-indigo-400 w-6 h-1.5' : 'bg-white/30 hover:bg-white/50 w-1.5 h-1.5'}`} />)}
              </div>
              <button onClick={nextSlide} disabled={currentSlideIndex === generatedSlides.length - 1} className="text-white hover:text-indigo-400 disabled:opacity-30 transition-all hover:scale-110 active:scale-95"><ChevronRight className="w-6 h-6" /></button>
            </div>
          </div>
        </div>
      )}

      <div className="relative overflow-hidden rounded-[24px] sm:rounded-[32px] bg-slate-950 border border-slate-800 p-6 sm:p-10 lg:p-14 shadow-2xl">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[500px] sm:w-[900px] h-[500px] sm:h-[900px] bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 rounded-full blur-[140px] pointer-events-none opacity-30" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold tracking-widest uppercase backdrop-blur-md mb-6 shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-400" /> Web-Native Presentation
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold font-display text-white tracking-tight leading-[1.1] mb-5">
            Smart Presentation <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500">Pro</span>
          </h1>
          <p className="text-base sm:text-xl text-slate-400 font-light leading-relaxed">
            Generate cinematic, highly engaging web presentations. Read them like a sleek document, present them in full-screen, or download as a perfectly scaled .pptx.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
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
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
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
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Category</label>
                <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white shadow-inner transition-all appearance-none">
                  <option value="Education">Education</option><option value="Business">Business</option><option value="Marketing">Marketing</option><option value="Startup Pitch">Startup Pitch</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Industry</label>
                <input type="text" value={formData.industry} onChange={e => setFormData({ ...formData, industry: e.target.value })} placeholder="e.g. EdTech" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white shadow-inner transition-all" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Audience</label>
                <input type="text" value={formData.audience} onChange={e => setFormData({ ...formData, audience: e.target.value })} placeholder="e.g. Class 10" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white shadow-inner transition-all" required />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Language</label>
                <select value={formData.language} onChange={e => setFormData({ ...formData, language: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white shadow-inner transition-all appearance-none">
                  <option value="English">English</option><option value="Hindi">Hindi</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Goal</label>
                <select value={formData.goal} onChange={e => setFormData({ ...formData, goal: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white shadow-inner transition-all appearance-none">
                  <option value="Educate & Inform">Educate</option><option value="Persuade">Persuade</option><option value="Report">Report</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Slide Count</label>
                <select value={formData.slideCount} onChange={e => setFormData({ ...formData, slideCount: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white shadow-inner transition-all appearance-none">
                  <option value="5">5 Slides</option><option value="10">10 Slides</option><option value="15">15 Slides</option>
                </select>
              </div>
            </div>
            
            {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm font-bold border border-red-200 flex items-start gap-3 shadow-sm"><HelpCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />{error}</div>}
            
            <button type="submit" disabled={isGenerating || !formData.topic.trim()} className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-slate-900 to-black text-white rounded-[1rem] font-extrabold hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:-translate-y-1 transition-all disabled:opacity-50 disabled:transform-none text-base">
              {isGenerating ? <><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /> Crafting Masterpiece...</> : <><Sparkles className="w-6 h-6 text-amber-400" /> Generate Advanced Deck (10 🪙)</>}
            </button>
          </form>
        </div>

        <div className="lg:col-span-8">
          <div className="flex flex-col gap-10 min-h-[600px] pb-10">
            {!generatedSlides && !isGenerating && (
              <div className={`border border-slate-200 rounded-[24px] p-4 sm:p-6 lg:p-10 h-[600px] flex flex-col items-center justify-center relative shadow-inner overflow-hidden ${activeTheme.id === 'midnight' ? 'bg-slate-900' : 'bg-slate-100'}`}>
                <div className="w-24 h-24 bg-white rounded-[2rem] mx-auto mb-8 flex items-center justify-center shadow-xl border border-slate-200 -rotate-6 transition-transform hover:rotate-0 duration-500">
                  <Palette className="w-12 h-12 text-indigo-600" />
                </div>
                <h3 className={`text-2xl font-extrabold mb-3 font-display ${activeTheme.id === 'midnight' ? 'text-white' : 'text-slate-900'}`}>Gamma-Style View</h3>
                <p className={`text-base font-medium leading-relaxed max-w-md text-center ${activeTheme.id === 'midnight' ? 'text-slate-400' : 'text-slate-500'}`}>Your presentation will appear here as a beautiful, continuous scrollable document with floating cards.</p>
              </div>
            )}

            {isGenerating && (
              <div className={`border border-slate-200 rounded-[24px] p-4 sm:p-6 lg:p-10 h-[600px] flex flex-col items-center justify-center relative shadow-inner overflow-hidden ${activeTheme.id === 'midnight' ? 'bg-slate-900' : 'bg-slate-100'}`}>
                <div className="relative w-24 h-24 mx-auto mb-8">
                  <div className="absolute inset-0 border-4 border-indigo-200 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                  <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-indigo-600 animate-pulse" />
                </div>
                <h3 className={`text-xl font-extrabold mb-2 font-display ${activeTheme.id === 'midnight' ? 'text-white' : 'text-slate-900'}`}>AI is rendering layout...</h3>
                <p className={`font-medium ${activeTheme.id === 'midnight' ? 'text-slate-400' : 'text-slate-500'}`}>Applying cinematic Web-Native styling</p>
              </div>
            )}

            {generatedSlides && generatedSlides.length > 0 && (
              <div className="w-full flex flex-col gap-8 animate-fade-in">
                {/* Fixed Control Bar */}
                <div className="sticky top-24 z-40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-4 rounded-3xl shadow-lg border border-slate-200">
                  <div className="flex items-center gap-3 ml-2">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                      <MonitorPlay className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Web-Native View</h3>
                      <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Read & Scroll</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setCurrentSlideIndex(0); toggleFullscreenMode(true); }} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-95">
                      <Maximize2 className="w-5 h-5" /> Present
                    </button>
                    <button onClick={handleDownloadPPT} disabled={isDownloading} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-white text-slate-900 border-2 border-slate-200 rounded-2xl font-bold hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50">
                      {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />} {isDownloading ? 'Building...' : '.pptx'}
                    </button>
                  </div>
                </div>

                {/* Vertical Scroll Stack of Cards */}
                <div className="flex flex-col gap-12 mt-4">
                  {generatedSlides.map((slide, idx) => renderSlideCard(slide, idx))}
                </div>
                
                <div className="text-center py-10 opacity-50">
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-500">End of Deck</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
