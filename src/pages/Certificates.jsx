import React, { useState } from 'react'
import { Award, Download, Printer, Loader2 } from 'lucide-react'

export default function Certificates() {
  const [studentName, setStudentName] = useState('John Doe')
  const [title, setTitle] = useState('Student of the Week')
  const [reason, setReason] = useState('For outstanding performance in science class.')
  const [date, setDate] = useState(new Date().toLocaleDateString())
  const [isDownloading, setIsDownloading] = useState(false)

  async function handleExportPDF() {
    const printContent = document.getElementById('certificate-preview')
    if (!printContent || isDownloading) return

    setIsDownloading(true)
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ])

      const canvas = await html2canvas(printContent, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff' 
      })
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0)
      
      // Calculate landscape A4 presentation
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`Certificate_${studentName.replace(/\s+/g, '_')}.pdf`)
    } catch (err) {
      console.error('PDF generation failed:', err)
      alert("Failed to export. Please try again.")
    } finally {
      setIsDownloading(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="max-w-[1200px] mx-auto py-8 animate-fade-in-up">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Editor sidebar */}
        <div className="lg:w-1/3 bg-white rounded-[32px] p-8 shadow-sm border border-surface-200 h-fit">
          <h1 className="text-2xl font-extrabold font-display text-surface-900 mb-6 flex items-center gap-3">
            <Award className="w-7 h-7 text-amber-500" /> Certificate Maker
          </h1>
          
          <div className="space-y-5">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-surface-500 mb-2 block">Student Name</label>
              <input type="text" value={studentName} onChange={e => setStudentName(e.target.value)}
                className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 font-medium focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-surface-500 mb-2 block">Award Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 font-medium focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-surface-500 mb-2 block">Reason / Description</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 font-medium focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-surface-500 mb-2 block">Date</label>
              <input type="text" value={date} onChange={e => setDate(e.target.value)}
                className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 font-medium focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all" />
            </div>
            
            <div className="pt-4 flex gap-3">
              <button 
                onClick={handleExportPDF}
                disabled={isDownloading}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                {isDownloading ? 'Generating...' : 'Export PDF'}
              </button>
              <button onClick={handlePrint} className="p-3 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-xl transition-all print:hidden">
                <Printer className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Live Preview Area */}
        <div className="lg:w-2/3 flex items-center justify-center bg-surface-100 rounded-[32px] p-4 sm:p-10 border border-surface-200">
          <div id="certificate-preview" className="w-full max-w-2xl bg-white aspect-[1.414/1] relative shadow-2xl p-8 sm:p-16 flex flex-col items-center justify-center text-center border-[12px] border-double border-amber-600/20">
            {/* Corner decorations */}
            <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-amber-500" />
            <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-amber-500" />
            <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-amber-500" />
            <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-amber-500" />
            
            <Award className="w-16 h-16 text-amber-500 mb-6 drop-shadow-md" />
            <h2 className="text-4xl sm:text-5xl font-black font-display text-surface-900 mb-2 tracking-tight uppercase text-amber-900/90">{title || 'Award Title'}</h2>
            <p className="text-surface-500 font-bold tracking-widest uppercase text-sm mb-8">This certificate is proudly presented to</p>
            
            <h3 className="text-5xl sm:text-6xl font-serif italic text-amber-600 mb-8 border-b-2 border-amber-200 pb-2 px-8">{studentName || 'Student Name'}</h3>
            
            <p className="text-surface-600 font-medium max-w-md mx-auto mb-12 text-lg italic">
              {reason || 'For outstanding achievement and dedication.'}
            </p>
            
            <div className="flex justify-between w-full mt-auto px-8">
              <div className="text-center w-32 border-t-2 border-surface-300 pt-2">
                <p className="font-bold text-surface-900">{date || 'Date'}</p>
                <p className="text-xs uppercase tracking-wider text-surface-500 font-bold">Date</p>
              </div>
              <div className="text-center w-40 border-t-2 border-surface-300 pt-2">
                <p className="font-title text-amber-700 italic font-bold">Authorized Signature</p>
                <p className="text-xs uppercase tracking-wider text-surface-500 font-bold mt-1">Teacher</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
