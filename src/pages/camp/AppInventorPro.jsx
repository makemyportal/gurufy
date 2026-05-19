import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateAIContent } from '../../utils/aiService'

const DESIGN_TIPS = [
  "🎨 UX Tip: Make buttons at least 44px tall so they are easy to tap on real phones!",
  "👁️ UI Tip: Use high contrast colors (like white text on a dark background) for readability.",
  "✨ UX Tip: Keep your interface clean. Don't crowd the screen with too many elements.",
  "📱 Pro Tip: Consistency is key! Stick to 1 or 2 fonts and a cohesive color palette.",
  "⚡ Perf Tip: Keep your JavaScript logic simple to ensure the app runs smoothly.",
  "👆 UI Tip: Add hover or active effects to buttons so users know they clicked them!",
  "🤖 AI Tip: Stuck on an error? Ask the AI Assistant to fix your code!"
]

const SNIPPETS = [
  { label: 'Navbar', type: 'html', code: `<nav class="navbar">\n  <h2>My App</h2>\n  <button>☰</button>\n</nav>` },
  { label: 'Card', type: 'html', code: `<div class="card">\n  <img src="https://via.placeholder.com/150" alt="placeholder">\n  <h3>Card Title</h3>\n  <p>Some interesting content here.</p>\n</div>` },
  { label: 'Gradient Button', type: 'css', code: `.btn-gradient {\n  background: linear-gradient(45deg, #ff6b6b, #feca57);\n  color: white;\n  border: none;\n  padding: 12px 24px;\n  border-radius: 25px;\n  font-weight: bold;\n}` },
  { label: 'Vibrate Phone', type: 'js', code: `// Vibrates phone for 200ms (Android only)\nif(navigator.vibrate) {\n  navigator.vibrate(200);\n} else {\n  console.log("Vibration not supported");\n}` },
  { label: 'Get Location', type: 'js', code: `navigator.geolocation.getCurrentPosition(\n  (pos) => console.log("Lat: " + pos.coords.latitude),\n  (err) => console.log("Error: " + err.message)\n);` }
]

const TEMPLATES = [
  {
    id: 'calculator',
    name: 'Calculator',
    icon: '🧮',
    html: `<div class="calculator">\n  <div class="screen" id="screen">0</div>\n  <div class="keypad">\n    <button class="key action" onclick="clearScreen()">C</button>\n    <button class="key action" onclick="append('/')">/</button>\n    <button class="key action" onclick="append('*')">×</button>\n    <button class="key action" onclick="backspace()">⌫</button>\n    <button class="key" onclick="append('7')">7</button>\n    <button class="key" onclick="append('8')">8</button>\n    <button class="key" onclick="append('9')">9</button>\n    <button class="key action" onclick="append('-')">-</button>\n    <button class="key" onclick="append('4')">4</button>\n    <button class="key" onclick="append('5')">5</button>\n    <button class="key" onclick="append('6')">6</button>\n    <button class="key action" onclick="append('+')">+</button>\n    <button class="key" onclick="append('1')">1</button>\n    <button class="key" onclick="append('2')">2</button>\n    <button class="key" onclick="append('3')">3</button>\n    <button class="key equal" onclick="calculate()">=</button>\n    <button class="key zero" onclick="append('0')">0</button>\n    <button class="key" onclick="append('.')">.</button>\n  </div>\n</div>`,
    css: `body { margin: 0; background: #111; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; }\n.calculator { width: 90%; max-width: 350px; background: #222; border-radius: 30px; padding: 20px; box-shadow: 0 10px 20px rgba(0,0,0,0.5); }\n.screen { background: #333; color: white; font-size: 40px; text-align: right; padding: 20px; border-radius: 15px; margin-bottom: 20px; overflow: hidden; }\n.keypad { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }\n.key { background: #444; color: white; font-size: 24px; border: none; border-radius: 15px; padding: 20px 0; cursor: pointer; }\n.key:active { background: #555; }\n.action { background: #f59e0b; }\n.action:active { background: #d97706; }\n.equal { background: #3b82f6; grid-row: span 2; }\n.equal:active { background: #2563eb; }\n.zero { grid-column: span 2; }`,
    js: `const screen = document.getElementById('screen');\nfunction append(val) {\n  if(screen.innerText === '0' && val !== '.') screen.innerText = val;\n  else screen.innerText += val;\n}\nfunction clearScreen() { screen.innerText = '0'; }\nfunction backspace() {\n  if(screen.innerText.length > 1) screen.innerText = screen.innerText.slice(0, -1);\n  else screen.innerText = '0';\n}\nfunction calculate() {\n  try {\n    screen.innerText = eval(screen.innerText);\n    console.log("Calculated successfully!");\n  } catch(e) {\n    screen.innerText = 'Error';\n    console.error("Math error!");\n    setTimeout(clearScreen, 1000);\n  }\n}`
  },
  {
    id: 'expense',
    name: 'Expense Manager',
    icon: '💰',
    html: `<div class="expense-app">\n  <h1>Expense Manager</h1>\n  <div class="balance">Total: ₹<span id="totalAmt">0</span></div>\n  <div class="input-area">\n    <input type="text" id="desc" placeholder="Expense description...">\n    <input type="number" id="amt" placeholder="Amount (₹)">\n    <button onclick="addExpense()">Add</button>\n  </div>\n  <div class="history-title">History</div>\n  <ul id="expenseList"></ul>\n</div>`,
    css: `body { margin: 0; font-family: 'Segoe UI', sans-serif; background: #1e293b; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; }\n.expense-app { background: #0f172a; width: 90%; max-width: 400px; padding: 25px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); display: flex; flex-direction: column; max-height: 85vh; }\nh1 { margin: 0 0 15px 0; font-size: 24px; text-align: center; color: #38bdf8; }\n.balance { text-align: center; font-size: 32px; font-weight: bold; margin-bottom: 20px; background: #1e293b; padding: 15px; border-radius: 12px; }\n.input-area { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }\ninput { padding: 12px; border: none; border-radius: 8px; background: #334155; color: white; outline: none; font-size: 16px; }\ninput::placeholder { color: #94a3b8; }\nbutton { padding: 12px; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 16px; }\nbutton:active { background: #059669; }\n.history-title { font-weight: bold; margin-bottom: 10px; color: #94a3b8; }\nul { list-style: none; padding: 0; margin: 0; overflow-y: auto; flex: 1; }\nli { display: flex; justify-content: space-between; padding: 12px; background: #1e293b; border-radius: 8px; margin-bottom: 8px; border-left: 4px solid #ef4444; }`,
    js: `let total = 0;\nconst descInput = document.getElementById('desc');\nconst amtInput = document.getElementById('amt');\nconst expenseList = document.getElementById('expenseList');\nconst totalEl = document.getElementById('totalAmt');\n\nfunction addExpense() {\n  const desc = descInput.value.trim();\n  const amt = parseFloat(amtInput.value);\n  if(!desc || isNaN(amt) || amt <= 0) return alert("Enter valid details!");\n  \n  total += amt;\n  totalEl.innerText = total;\n  \n  const li = document.createElement('li');\n  li.innerHTML = \`<span>\${desc}</span> <span>₹\${amt}</span>\`;\n  expenseList.prepend(li);\n  \n  descInput.value = '';\n  amtInput.value = '';\n}`
  },
  {
    id: 'todo',
    name: 'To-Do List',
    icon: '✅',
    html: `<div class="todo-app">\n  <h1>To-Do List</h1>\n  <div class="input-area">\n    <input type="text" id="taskInput" placeholder="Add a new task...">\n    <button onclick="addTask()">Add</button>\n  </div>\n  <ul id="taskList"></ul>\n</div>`,
    css: `body { margin: 0; font-family: 'Inter', sans-serif; background: #f1f5f9; display: flex; justify-content: center; align-items: center; height: 100vh; }\n.todo-app { background: white; padding: 20px; border-radius: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); width: 90%; max-width: 400px; max-height: 80vh; display: flex; flex-direction: column; }\nh1 { margin-top: 0; color: #1e293b; text-align: center; }\n.input-area { display: flex; margin-bottom: 20px; gap: 10px; }\ninput { flex: 1; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; }\nbutton { padding: 12px 20px; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; }\nbutton:active { background: #4f46e5; }\nul { list-style: none; padding: 0; margin: 0; overflow-y: auto; }\nli { background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #e2e8f0; }\n.delete-btn { background: #ef4444; padding: 6px 12px; font-size: 12px; border: none; border-radius: 6px; color: white; cursor: pointer; }`,
    js: `const taskInput = document.getElementById('taskInput');\nconst taskList = document.getElementById('taskList');\nfunction addTask() {\n  const text = taskInput.value.trim();\n  if(!text) return;\n  const li = document.createElement('li');\n  li.innerHTML = \`<span>\${text}</span> <button class="delete-btn" onclick="this.parentElement.remove()">✕</button>\`;\n  taskList.appendChild(li);\n  taskInput.value = '';\n}`
  },
  {
    id: 'counter',
    name: 'Counter',
    icon: '🔢',
    html: `<div class="app-container">\n  <h1>Counter</h1>\n  <div class="display" id="display">0</div>\n  <div class="btn-group">\n    <button class="btn btn-red" onclick="decrease()">-</button>\n    <button class="btn btn-green" onclick="increase()">+</button>\n  </div>\n</div>`,
    css: `body { margin: 0; font-family: 'Segoe UI', sans-serif; background: #0f172a; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; }\n.app-container { text-align: center; background: #1e293b; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }\n.display { font-size: 80px; font-weight: bold; margin: 20px 0; color: #38bdf8; }\n.btn { font-size: 30px; width: 60px; height: 60px; border: none; border-radius: 50%; color: white; cursor: pointer; margin: 0 10px; transition: transform 0.1s; }\n.btn:active { transform: scale(0.9); }\n.btn-red { background: #ef4444; }\n.btn-green { background: #10b981; }`,
    js: `let count = 0;\nconst display = document.getElementById('display');\n\nfunction increase() {\n  count++;\n  display.innerText = count;\n  console.log("Count increased to: " + count);\n}\n\nfunction decrease() {\n  count--;\n  display.innerText = count;\n  console.log("Count decreased to: " + count);\n}`
  },
  {
    id: 'camera',
    name: 'Camera API',
    icon: '📸',
    html: `<div class="camera-app">\n  <div class="header">Selfie Cam</div>\n  <video id="videoElement" autoplay playsinline></video>\n  <button class="capture-btn" onclick="startCamera()">📷 Start Camera</button>\n</div>`,
    css: `body { margin: 0; background: #000; color: white; font-family: sans-serif; }\n.camera-app { display: flex; flex-direction: column; height: 100vh; }\n.header { padding: 20px; text-align: center; font-weight: bold; font-size: 20px; background: #111; }\nvideo { flex: 1; width: 100%; background: #222; object-fit: cover; }\n.capture-btn { margin: 20px; padding: 15px; border-radius: 30px; background: #ef4444; color: white; border: none; font-size: 18px; font-weight: bold; cursor: pointer; }\n.capture-btn:active { background: #dc2626; }`,
    js: `async function startCamera() {\n  const video = document.getElementById('videoElement');\n  try {\n    const stream = await navigator.mediaDevices.getUserMedia({ video: true });\n    video.srcObject = stream;\n    console.log("Camera started successfully!");\n  } catch(err) {\n    console.error("Camera error: " + err.message);\n    alert("Could not access camera!");\n  }\n}`
  },
  {
    id: 'weather',
    name: 'GPS Weather',
    icon: '🌤️',
    html: `<div class="weather-app">\n  <h1>Weather Tracker</h1>\n  <div class="card">\n    <div id="location">Press button to locate</div>\n    <div id="temp">--°C</div>\n  </div>\n  <button onclick="getWeather()">📍 Get My Weather</button>\n</div>`,
    css: `body { margin: 0; font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #3b82f6, #0ea5e9); color: white; display: flex; justify-content: center; align-items: center; height: 100vh; }\n.weather-app { text-align: center; width: 100%; }\n.card { background: rgba(255,255,255,0.2); margin: 20px; padding: 40px 20px; border-radius: 20px; backdrop-filter: blur(10px); }\n#location { font-size: 18px; opacity: 0.9; margin-bottom: 10px; }\n#temp { font-size: 60px; font-weight: bold; }\nbutton { background: white; color: #0ea5e9; border: none; padding: 15px 30px; border-radius: 30px; font-size: 18px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }\nbutton:active { transform: scale(0.95); }`,
    js: `function getWeather() {\n  const locEl = document.getElementById('location');\n  const tempEl = document.getElementById('temp');\n  locEl.innerText = "Locating...";\n  if(!navigator.geolocation) {\n    locEl.innerText = "GPS Not Supported";\n    return;\n  }\n  navigator.geolocation.getCurrentPosition(async (pos) => {\n    locEl.innerText = \`Lat: \${pos.coords.latitude.toFixed(2)}, Lon: \${pos.coords.longitude.toFixed(2)}\`;\n    try {\n      const res = await fetch(\`https://api.open-meteo.com/v1/forecast?latitude=\${pos.coords.latitude}&longitude=\${pos.coords.longitude}&current_weather=true\`);\n      const data = await res.json();\n      tempEl.innerText = data.current_weather.temperature + "°C";\n    } catch(e) {\n      tempEl.innerText = "Error";\n    }\n  }, (err) => {\n    locEl.innerText = "Location Denied";\n  });\n}`
  }
]

export default function AppInventorPro() {
  const navigate = useNavigate()
  
  // Code States
  const [activeTab, setActiveTab] = useState('html')
  const [htmlCode, setHtmlCode] = useState(TEMPLATES[0].html)
  const [cssCode, setCssCode] = useState(TEMPLATES[0].css)
  const [jsCode, setJsCode] = useState(TEMPLATES[0].js)
  
  // App Meta States
  const [appName, setAppName] = useState("My Awesome App")
  const [appIcon, setAppIcon] = useState("🚀")
  
  // UI States
  const [showExportModal, setShowExportModal] = useState(false)
  const [showSnippets, setShowSnippets] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [logs, setLogs] = useState([])
  const [isConsoleMinimized, setIsConsoleMinimized] = useState(false)
  
  // AI Generator States
  const [showAIGenModal, setShowAIGenModal] = useState(false)
  const [aiGenPrompt, setAiGenPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  
  // AI Assistant States
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [aiAssistantPrompt, setAiAssistantPrompt] = useState("")
  const [isAssistantWorking, setIsAssistantWorking] = useState(false)
  
  const containerRef = useRef(null)
  const iframeRef = useRef(null)
  
  const [tipIndex, setTipIndex] = useState(0)

  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTipIndex(i => (i + 1) % DESIGN_TIPS.length)
    }, 8000)
    return () => clearInterval(tipInterval)
  }, [])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    
    const messageHandler = (e) => {
      if (e.data && e.data.type === 'console') {
        setLogs(prev => [...prev.slice(-19), { level: e.data.level, msg: e.data.message }])
      }
    }
    window.addEventListener('message', messageHandler)
    
    return () => {
      document.removeEventListener('fullscreenchange', handler)
      window.removeEventListener('message', messageHandler)
    }
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen()
    }
  }

  const loadTemplate = (template) => {
    setHtmlCode(template.html)
    setCssCode(template.css)
    setJsCode(template.js)
    setLogs([])
  }

  const insertSnippet = (snippet) => {
    if (snippet.type === 'html') {
      setActiveTab('html')
      setHtmlCode(prev => prev + '\\n' + snippet.code)
    } else if (snippet.type === 'css') {
      setActiveTab('css')
      setCssCode(prev => prev + '\\n' + snippet.code)
    } else if (snippet.type === 'js') {
      setActiveTab('js')
      setJsCode(prev => prev + '\\n' + snippet.code)
    }
    setShowSnippets(false)
  }

  const getCompiledCode = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <title>${appName}</title>
          <style>${cssCode}</style>
          <script>
            window.onerror = function(msg, url, line) {
              window.parent.postMessage({ type: 'console', level: 'error', message: msg + ' (Line ' + line + ')' }, '*');
              return false;
            };
            const originalLog = console.log;
            const originalError = console.error;
            console.log = function(...args) {
              window.parent.postMessage({ type: 'console', level: 'info', message: args.join(' ') }, '*');
              originalLog.apply(console, args);
            };
            console.error = function(...args) {
              window.parent.postMessage({ type: 'console', level: 'error', message: args.join(' ') }, '*');
              originalError.apply(console, args);
            };
          </script>
        </head>
        <body>
          ${htmlCode}
          <script>${jsCode}</script>
        </body>
      </html>
    `
  }
  
  const getExportCode = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <title>${appIcon} ${appName}</title>
          <style>${cssCode}</style>
        </head>
        <body>
          ${htmlCode}
          <script>${jsCode}</script>
        </body>
      </html>
    `
  }

  const handleExportHtml = () => {
    const content = getExportCode()
    const blob = new Blob([content], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${appName.replace(/\\s+/g, '_')}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // --- AI FEATURES ---
  const handleGenerateApp = async () => {
    if (!aiGenPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const prompt = `You are an expert Senior Mobile Web Developer. The user wants you to build a complete, highly polished, fully functional web app based on this request: "${aiGenPrompt}".
      Requirements:
      1. UI/UX MUST be stunning, responsive, and mobile-friendly. Use modern design (glassmorphism, soft shadows, rounded corners, good contrast).
      2. The JavaScript MUST be robust, complete, and bug-free. Include necessary event listeners and edge-case handling.
      3. Use modern CSS (Flexbox/Grid, CSS variables). Ensure it looks like a real mobile app on a small screen.
      4. Output EXACTLY three markdown code blocks containing the FULL code: one for HTML, one for CSS, and one for JS. Do not output any other conversational text.
      
      Format your response EXACTLY like this:
      \`\`\`html
      <!-- UI Structure -->
      \`\`\`
      \`\`\`css
      /* Styling */
      \`\`\`
      \`\`\`javascript
      // Logic
      \`\`\``;
      
      const res = await generateAIContent(prompt, { preferGemini: true });
      
      const htmlMatch = res.match(/```html\s*([\s\S]*?)\s*```/i);
      const cssMatch = res.match(/```css\s*([\s\S]*?)\s*```/i);
      const jsMatch = res.match(/```(?:javascript|js)\s*([\s\S]*?)\s*```/i);
      
      if (!htmlMatch && !cssMatch && !jsMatch) {
         throw new Error("AI did not return proper markdown code blocks. Please try a different prompt.");
      }
      
      if (htmlMatch) setHtmlCode(htmlMatch[1]);
      if (cssMatch) setCssCode(cssMatch[1]);
      if (jsMatch) setJsCode(jsMatch[1]);
      
      setAppName(aiGenPrompt.substring(0, 15) + " App");
      setShowAIGenModal(false);
      setAiGenPrompt("");
      setLogs([{ level: 'info', msg: 'App generated beautifully by AI!' }]);
    } catch (err) {
      console.error(err);
      alert("AI Error: " + err.message + "\\nMake sure your API keys are working!");
    }
    setIsGenerating(false);
  }

  const handleAssistantEdit = async () => {
    if (!aiAssistantPrompt.trim()) return;
    setIsAssistantWorking(true);
    try {
      const prompt = `You are an expert Senior Web Developer Assistant. Update the mobile web app based on this request: "${aiAssistantPrompt}"

Current HTML:
${htmlCode}
Current CSS:
${cssCode}
Current JS:
${jsCode}

Requirements:
1. Modify the code to brilliantly fulfill the user's request. Maintain the existing functionality if not asked to remove it.
2. Ensure the code is production-ready, beautiful, and bug-free.
3. Output EXACTLY three markdown code blocks containing the FULL updated code: one for HTML, one for CSS, and one for JS.
4. Do NOT include any explanations or conversational text.

Format your response EXACTLY like this:
\`\`\`html
<!-- updated html here -->
\`\`\`
\`\`\`css
/* updated css here */
\`\`\`
\`\`\`javascript
// updated js here
\`\`\``;
      
      const res = await generateAIContent(prompt, { preferGemini: true });
      
      const htmlMatch = res.match(/```html\s*([\s\S]*?)\s*```/i);
      const cssMatch = res.match(/```css\s*([\s\S]*?)\s*```/i);
      const jsMatch = res.match(/```(?:javascript|js)\s*([\s\S]*?)\s*```/i);
      
      if (!htmlMatch && !cssMatch && !jsMatch) {
         throw new Error("AI did not return proper markdown code blocks. Try asking again.");
      }
      
      if (htmlMatch) setHtmlCode(htmlMatch[1]);
      if (cssMatch) setCssCode(cssMatch[1]);
      if (jsMatch) setJsCode(jsMatch[1]);
      
      setShowAIAssistant(false);
      setAiAssistantPrompt("");
      setLogs([{ level: 'info', msg: 'AI magically applied changes to your code!' }]);
    } catch (err) {
      console.error(err);
      alert("AI Assistant Error: " + err.message);
    }
    setIsAssistantWorking(false);
  }

  return (
    <div ref={containerRef} className={`min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col ${isFullscreen ? 'fixed inset-0 z-[9999]' : ''}`}>
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 p-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/camp')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/20">
              🚀
            </div>
            <div>
              <h1 className="text-white font-bold tracking-tight">App Inventor Pro</h1>
              <div className="text-xs text-indigo-400 font-mono">ADVANCED_STUDIO</div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 items-center">
          <button 
            onClick={() => setShowAIGenModal(true)} 
            className="hidden md:flex px-3 py-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-purple-500/20 transition-all items-center gap-2 mr-2"
          >
            ✨ AI App Gen
          </button>
          <button 
            onClick={() => setShowSnippets(!showSnippets)} 
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold rounded-lg text-slate-300 transition-colors flex items-center gap-2"
          >
            🧩 Snippets
          </button>
          <button 
            onClick={() => setShowExportModal(true)} 
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-sm font-bold rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export
          </button>
          <button onClick={toggleFullscreen} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="Fullscreen">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
          </button>
        </div>
      </header>

      {/* Templates Quick Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center gap-2 overflow-x-auto hide-scrollbar">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Templates:</span>
        {TEMPLATES.map(t => (
          <button 
            key={t.id} 
            onClick={() => loadTemplate(t)} 
            className="px-3 py-1 bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-xs font-bold rounded-full text-slate-300 transition-colors whitespace-nowrap"
            title={t.name}
          >
            {t.icon} {t.name}
          </button>
        ))}
      </div>
      
      {/* Design Tip Banner */}
      <div className="bg-slate-800/80 border-b border-slate-700 px-4 py-2 text-xs font-medium text-indigo-300 flex items-center gap-2 overflow-hidden whitespace-nowrap">
        <span className="animate-pulse">💡</span>
        <span key={tipIndex} className="animate-fade-in">{DESIGN_TIPS[tipIndex]}</span>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative" style={{ height: 'calc(100vh - 150px)' }}>
        
        {/* Editor Area */}
        <div className={`flex flex-col border-r border-slate-800 bg-[#1e1e1e] transition-all duration-300 relative ${showSnippets ? 'lg:w-[45%]' : 'lg:w-[60%]'}`}>
          
          {/* AI Assistant Floating Button */}
          <button 
            onClick={() => setShowAIAssistant(!showAIAssistant)}
            className="absolute bottom-6 right-6 w-12 h-12 bg-indigo-600 hover:bg-indigo-500 rounded-full flex items-center justify-center text-xl shadow-xl shadow-indigo-600/30 text-white z-20 transition-transform hover:scale-110 group"
            title="Ask AI Assistant"
          >
            ✨
            <div className="absolute right-14 bg-slate-800 text-xs px-2 py-1 rounded border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Ask AI Assistant
            </div>
          </button>

          {/* AI Assistant Panel */}
          {showAIAssistant && (
            <div className="absolute bottom-20 right-6 w-80 bg-slate-900 border border-indigo-500/50 rounded-xl shadow-2xl z-20 p-4 animate-scale-up">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-bold text-indigo-400 flex items-center gap-2">✨ AI Assistant</span>
                <button onClick={() => setShowAIAssistant(false)} className="text-slate-500 hover:text-white">✕</button>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">Ask me to write code, fix bugs, or suggest features. I will instantly update your app!</p>
              <textarea 
                value={aiAssistantPrompt}
                onChange={e => setAiAssistantPrompt(e.target.value)}
                placeholder="E.g., Add a dark mode toggle button..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 outline-none focus:border-indigo-500 mb-3 resize-none h-20"
              />
              <button 
                onClick={handleAssistantEdit}
                disabled={isAssistantWorking}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex justify-center items-center gap-2"
              >
                {isAssistantWorking ? (
                  <><span className="animate-spin">⚙️</span> Thinking...</>
                ) : (
                  "✨ Magic Edit"
                )}
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex bg-slate-900 border-b border-slate-800">
            {[
              { id: 'html', label: 'HTML (UI)', color: 'text-orange-400' },
              { id: 'css', label: 'CSS (Style)', color: 'text-blue-400' },
              { id: 'js', label: 'JS (Logic)', color: 'text-yellow-400' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === tab.id ? 'border-indigo-500 bg-slate-800/50 ' + tab.color : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Text Area */}
          <textarea
            value={activeTab === 'html' ? htmlCode : activeTab === 'css' ? cssCode : jsCode}
            onChange={e => {
              if (activeTab === 'html') setHtmlCode(e.target.value)
              if (activeTab === 'css') setCssCode(e.target.value)
              if (activeTab === 'js') setJsCode(e.target.value)
            }}
            className="flex-1 w-full bg-transparent text-slate-300 font-mono text-[15px] p-6 resize-none outline-none leading-relaxed tracking-wide"
            spellCheck={false}
          />
        </div>
        
        {/* Snippets Panel */}
        {showSnippets && (
          <div className="lg:w-[15%] bg-slate-900 border-r border-slate-800 overflow-y-auto animate-slide-right">
            <div className="p-3 bg-slate-800/50 border-b border-slate-800 flex justify-between items-center sticky top-0 backdrop-blur-sm z-10">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Library</span>
              <button onClick={() => setShowSnippets(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-2 space-y-2">
              {SNIPPETS.map((s, i) => (
                <button 
                  key={i} 
                  onClick={() => insertSnippet(s)}
                  className="w-full text-left p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors group"
                >
                  <div className="text-xs font-bold text-slate-200 group-hover:text-white mb-1">{s.label}</div>
                  <div className={`text-[10px] font-mono px-1.5 py-0.5 rounded inline-block ${s.type === 'html' ? 'bg-orange-500/20 text-orange-400' : s.type === 'css' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    +{s.type.toUpperCase()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Live Phone Preview & Console */}
        <div className="flex-1 bg-slate-950 flex flex-col relative">
          
          {/* Phone Frame Wrapper */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-y-auto min-h-0">
            {/* Decorative background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none"></div>
            
            {!isConsoleMinimized && (
              <div className="mb-2 text-center z-10 shrink-0">
                <span className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider mb-1">
                  Live Simulator
                </span>
              </div>
            )}

            {/* Phone Frame */}
            <div className={`w-[300px] bg-black rounded-[3rem] p-3 border-4 border-slate-800 shadow-2xl shadow-indigo-900/50 relative z-10 shrink-0 transition-all duration-300 ${isConsoleMinimized ? 'h-full max-h-[750px]' : 'h-[550px]'}`}>
              {/* Notch */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-xl z-20 flex justify-center items-end pb-1">
                <div className="w-16 h-1 bg-slate-800 rounded-full"></div>
              </div>
              
              {/* Iframe Screen */}
              <div className="w-full h-full bg-white rounded-[2.25rem] overflow-hidden relative">
                <iframe
                  ref={iframeRef}
                  title="App Preview"
                  srcDoc={getCompiledCode()}
                  className="w-full h-full border-0 bg-white"
                  sandbox="allow-scripts allow-modals allow-geolocation"
                  allow="camera; geolocation"
                />
              </div>
            </div>
          </div>
          
          {/* Minimizable Debug Console */}
          <div className={`border-t border-slate-800 bg-slate-900 flex flex-col transition-all duration-300 shrink-0 ${isConsoleMinimized ? 'h-10' : 'h-48'}`}>
            <div className="flex justify-between items-center px-4 py-2 bg-slate-800/80 border-b border-slate-800 cursor-pointer select-none" onClick={() => setIsConsoleMinimized(!isConsoleMinimized)}>
              <div className="flex items-center gap-2">
                <button className="text-slate-400 hover:text-white transition-transform">
                  <svg className={`w-4 h-4 transform ${isConsoleMinimized ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M4 12a8 8 0 1116 0 8 8 0 01-16 0z" /></svg>
                  Debug Console {logs.length > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{logs.length}</span>}
                </span>
              </div>
              {!isConsoleMinimized && (
                <button onClick={(e) => { e.stopPropagation(); setLogs([]) }} className="text-[10px] text-slate-500 hover:text-white px-2 py-1 rounded bg-slate-900 border border-slate-700">Clear</button>
              )}
            </div>
            
            {!isConsoleMinimized && (
              <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] space-y-1">
                {logs.length === 0 ? (
                  <div className="text-slate-600 italic">No logs yet. Use console.log() in JS!</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className={`border-b border-slate-800/50 pb-1 ${log.level === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                      <span className="opacity-50 mr-2">{'>'}</span>{log.msg}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          
        </div>
      </div>

      {/* AI App Generator Modal */}
      {showAIGenModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">✨ AI App Generator</h2>
                <p className="text-slate-400 text-sm">Tell AI what app to build and watch the magic happen.</p>
              </div>
              <button onClick={() => setShowAIGenModal(false)} className="text-slate-500 hover:text-white text-xl">✕</button>
            </div>
            
            <textarea 
              value={aiGenPrompt}
              onChange={e => setAiGenPrompt(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 outline-none focus:border-purple-500 h-32 resize-none mb-4"
              placeholder="E.g., A minimalist pomodoro timer with start and stop buttons..."
            />

            <button 
              onClick={handleGenerateApp}
              disabled={isGenerating || !aiGenPrompt.trim()}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <><span className="animate-spin">⚙️</span> Building App...</>
              ) : (
                "✨ Generate Full App"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Export & Settings Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 md:p-8 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">🚀 Export Your App!</h2>
                <p className="text-slate-400">Configure your app details before building.</p>
              </div>
              <button onClick={() => setShowExportModal(false)} className="text-slate-500 hover:text-white text-xl">✕</button>
            </div>
            
            <div className="mb-6 p-4 bg-slate-800 rounded-xl border border-slate-700 flex flex-col md:flex-row gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">App Icon</label>
                <div className="flex gap-2">
                  {['🚀', '📱', '🎮', '📸', '💰', '🎵'].map(emoji => (
                    <button 
                      key={emoji}
                      onClick={() => setAppIcon(emoji)}
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${appIcon === emoji ? 'bg-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-slate-700 hover:bg-slate-600'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">App Name</label>
                <input 
                  type="text" 
                  value={appName} 
                  onChange={e => setAppName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500"
                  placeholder="My Awesome App"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Option 1: Web App (Easy) */}
              <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl text-center">
                <div className="text-4xl mb-4">{appIcon}</div>
                <h3 className="text-lg font-bold text-white mb-2">Download Web App</h3>
                <p className="text-sm text-slate-400 mb-6 h-16">Download your app as a standalone HTML file. Send it to your phone and open it in any browser!</p>
                <button 
                  onClick={() => { handleExportHtml(); setShowExportModal(false); }}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors"
                >
                  Download .html file
                </button>
              </div>

              {/* Option 2: True APK (Pro) */}
              <div className="bg-emerald-900/20 border border-emerald-500/30 p-6 rounded-xl text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-wider">Pro Skill</div>
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="text-lg font-bold text-emerald-400 mb-2">Convert to APK</h3>
                <p className="text-sm text-slate-400 mb-6 h-16">Real Android apps require compiling. Download your code and use a free converter to build an APK!</p>
                
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => { handleExportHtml(); }}
                    className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors text-sm"
                  >
                    1. Download Code First
                  </button>
                  <a 
                    href="https://www.webintoapp.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors text-sm flex justify-center items-center gap-2"
                  >
                    2. Go to WebIntoApp.com <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                </div>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <h4 className="text-indigo-400 font-bold mb-1 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Teacher Note
              </h4>
              <p className="text-sm text-slate-300">
                To install directly as an App without an APK, open the downloaded HTML file on your mobile browser (like Chrome or Safari), click the menu, and select <strong>"Add to Home Screen"</strong>. It will install just like a real app!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
