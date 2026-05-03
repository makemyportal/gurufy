import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import mammoth from 'mammoth';

// Setup pdf.js worker using unpkg CDN to avoid Vite build configuration issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * Extracts text from a PDF or Image file locally in the browser
 * @param {File} file - The file object from input type="file"
 * @param {string} previewUrl - Optional URL.createObjectURL of the file to save memory
 * @returns {Promise<string>} - Extracted text
 */
export async function extractTextFromFile(file, previewUrl = null) {
  try {
    if (file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      // Load the PDF document
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      // Loop through all pages to extract text
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map(item => item.str);
        fullText += strings.join(' ') + '\n';
      }
      
      if (!fullText.trim()) {
        console.warn("No text found natively. Attempting OCR on PDF pages...");
        let ocrText = '';
        // Fallback to OCR for scanned PDFs
        for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) { // Limit to 5 pages to prevent browser crash
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 }); // 1.5x scale for better OCR
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({ canvasContext: context, viewport: viewport }).promise;
          const dataUrl = canvas.toDataURL('image/png');
          
          const result = await Tesseract.recognize(dataUrl, 'eng');
          ocrText += result.data.text + '\n';
        }
        
        if (!ocrText.trim()) {
          throw new Error("No text could be extracted from this PDF. Ensure it contains readable content.");
        }
        return ocrText;
      }
      return fullText;
    } else if (file.type.startsWith('image/')) {
      const imageUrl = previewUrl || URL.createObjectURL(file);
      
      // Extract text from image using Tesseract OCR
      const result = await Tesseract.recognize(imageUrl, 'eng', {
        logger: m => {
          // Optional: You can dispatch an event or use a callback to show OCR progress
          // console.log(m);
        }
      });
      
      if (!result.data.text.trim()) {
        throw new Error("No text found in the image.");
      }
      return result.data.text;
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.toLowerCase().endsWith('.docx')) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      if (!result.value.trim()) {
        throw new Error("No text found in the DOCX file.");
      }
      return result.value;
    } else {
      throw new Error('Unsupported file format. Please upload a PDF, DOCX, or Image.');
    }
  } catch (error) {
    console.error('Local text extraction failed:', error);
    throw new Error(error.message || 'Failed to extract text from the file.');
  }
}
