import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

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
        throw new Error("No text could be extracted from this PDF. It might be a scanned image.");
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
    } else {
      throw new Error('Unsupported file format. Please upload a PDF or an Image.');
    }
  } catch (error) {
    console.error('Local text extraction failed:', error);
    throw new Error(error.message || 'Failed to extract text from the file.');
  }
}
