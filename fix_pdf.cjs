const fs = require('fs');
const path = './src/pages/AITools.jsx';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `  async function handleDownloadPDF() {
    const printContent = document.getElementById('printable-area')
    if (!printContent || isDownloading) return

    setIsDownloading(true)

    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ])

      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.left = '-9999px'
      container.style.top = '0'
      container.style.width = '794px'
      container.style.background = '#ffffff'
      container.style.padding = '40px'
      container.style.zIndex = '-9999'

      container.innerHTML = \`
        <style>
          .pdf-wrapper { font-family: 'Segoe UI', 'Inter', system-ui, -apple-system, sans-serif; color: #0f172a; line-height: 1.7; }
          .pdf-content h1 { font-size: 24px; font-weight: 800; color: #0f172a; margin: 24px 0 14px 0; padding-bottom: 8px; border-bottom: 3px solid #e2e8f0; }
          .pdf-content h2 { font-size: 18px; font-weight: 700; color: #1e293b; margin: 20px 0 10px 0; padding-bottom: 5px; border-bottom: 2px solid #f1f5f9; }
          .pdf-content h3 { font-size: 15px; font-weight: 700; color: #334155; margin: 16px 0 8px 0; }
          .pdf-content p { font-size: 13px; color: #475569; margin-bottom: 12px; line-height: 1.7; }
          .pdf-content strong { color: #0f172a; font-weight: 700; }
          .pdf-content em { font-style: italic; color: #64748b; }
          .pdf-content ul, .pdf-content ol { margin: 10px 0 14px 0; padding-left: 24px; }
          .pdf-content li { font-size: 13px; color: #475569; margin-bottom: 6px; line-height: 1.6; }
          .pdf-content table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; border: 1px solid #e2e8f0; }
          .pdf-content th { background: #f1f5f9; font-weight: 700; color: #1e293b; padding: 10px 12px; text-align: left; border: 1px solid #e2e8f0; }
          .pdf-content td { padding: 8px 12px; color: #475569; border: 1px solid #e2e8f0; }
          .pdf-content tr:nth-child(even) { background-color: #fafbfc; }
          .pdf-content blockquote { border-left: 4px solid #6366f1; background: #eef2ff; padding: 14px 18px; margin: 16px 0; border-radius: 0 8px 8px 0; }
        </style>
        <div class="pdf-wrapper">
          <div class="pdf-content">\${printContent.innerHTML}</div>
        </div>
      \`

      document.body.appendChild(container)
      await new Promise(resolve => setTimeout(resolve, 500))

      const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' })
      document.body.removeChild(container)

      const imgData = canvas.toDataURL('image/jpeg', 1.0)
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(\`LDMS_\${activeTool.title.replace(/\\s+/g, '_')}.pdf\`)

    } catch (err) {
      console.error('PDF generation failed:', err)
    } finally {
      setIsDownloading(false)
    }
  }`;

const replacement = `  const handleDownloadPDF = () => {
    const element = document.getElementById('printable-area')
    if (!element || isDownloading) return

    setIsDownloading(true)

    // Explicitly mark headings for page breaks to prevent orphan titles
    const headings = element.querySelectorAll('.prose h1')
    headings.forEach((h, i) => {
      if (i > 0) h.classList.add('pdf-page-break-before')
    })

    const opt = {
      margin:       10,
      filename:     \`LDMS_\${activeTool.title.replace(/\\s+/g, '_')}.pdf\`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: 'css', before: '.pdf-page-break-before', avoid: 'tr' }
    }
    
    html2pdf().set(opt).from(element).save().then(() => {
      headings.forEach(h => h.classList.remove('pdf-page-break-before'))
      setIsDownloading(false)
    }).catch(err => {
      console.error('PDF generation failed:', err)
      setIsDownloading(false)
    })
  }`;

if (content.includes("async function handleDownloadPDF()")) {
  content = content.replace(targetStr, replacement);
  fs.writeFileSync(path, content);
  console.log('Replaced PDF successfully!');
} else {
  console.log('Could not find target pdf function');
}
