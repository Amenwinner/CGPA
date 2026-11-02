import JSZip from 'jszip';

export interface ExtractedSlideData {
  text: string;
  slideCount: number;
  wordCount: number;
  hasNotes: boolean;
}

/**
 * Extracts slide text and speaker notes from a PPTX file using JSZip
 */
export async function extractTextFromPPTX(file: File): Promise<ExtractedSlideData> {
  const fileNameLower = file.name.toLowerCase();

  // If old binary .ppt format
  if (fileNameLower.endsWith('.ppt') && !fileNameLower.endsWith('.pptx')) {
    throw new Error(
      'Legacy PowerPoint .ppt files cannot be parsed directly in the browser. Please open the file in PowerPoint or Google Slides and Save As/Download as .pptx or .pdf, or copy-paste the slide text directly.'
    );
  }

  try {
    const zip = new JSZip();
    const arrayBuffer = await file.arrayBuffer();
    const loadedZip = await zip.loadAsync(arrayBuffer);

    // Find all slide XML files
    const slideFileNames = Object.keys(loadedZip.files).filter((name) =>
      name.match(/^ppt\/slides\/slide\d+\.xml$/i)
    );

    if (slideFileNames.length === 0) {
      throw new Error(
        'No slide XML files found inside PPTX presentation. The presentation archive might be corrupted or password-protected.'
      );
    }

    // Sort slide names numerically
    slideFileNames.sort((a, b) => {
      const matchA = a.match(/\d+/);
      const matchB = b.match(/\d+/);
      const numA = matchA ? parseInt(matchA[0], 10) : 0;
      const numB = matchB ? parseInt(matchB[0], 10) : 0;
      return numA - numB;
    });

    const slides: string[] = [];
    let hasSpeakerNotes = false;

    for (let i = 0; i < slideFileNames.length; i++) {
      const slidePath = slideFileNames[i];
      const xmlContent = await loadedZip.files[slidePath].async('string');

      // Extract text content inside <a:t>...</a:t> tags
      const textMatches = xmlContent.match(/<a:t[^>]*>([^<]*)<\/a:t>/gi) || [];
      const slideText = textMatches
        .map((tag) => tag.replace(/<[^>]+>/g, '').trim())
        .filter((text) => text.length > 0)
        .join(' ');

      // Check for corresponding speaker notes
      let notesText = '';
      const notesFile = loadedZip.files[`ppt/notesSlides/notesSlide${i + 1}.xml`];
      if (notesFile) {
        try {
          const notesXml = await notesFile.async('string');
          const noteMatches = notesXml.match(/<a:t[^>]*>([^<]*)<\/a:t>/gi) || [];
          const noteContent = noteMatches
            .map((t) => t.replace(/<[^>]+>/g, '').trim())
            .filter((t) => t.length > 0 && !t.match(/^\d+$/)) // filter out slide number marks
            .join(' ');
          if (noteContent.length > 0) {
            notesText = `\n[Speaker Notes: ${noteContent}]`;
            hasSpeakerNotes = true;
          }
        } catch {
          // ignore notes extraction failure
        }
      }

      if (slideText.trim().length > 0 || notesText.length > 0) {
        slides.push(`[SLIDE ${i + 1}]\n${slideText}${notesText}`);
      }
    }

    if (slides.length === 0) {
      throw new Error(
        'Could not extract text from PPTX. The slides appear to consist entirely of scanned images or screenshots without embedded text. Try uploading as a PDF or pasting the slide notes.'
      );
    }

    const fullText = slides.join('\n\n');
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    return {
      text: fullText,
      slideCount: slides.length,
      wordCount,
      hasNotes: hasSpeakerNotes,
    };
  } catch (err: any) {
    console.warn('PPTX parsing error:', err);
    throw new Error(
      err.message || 'Failed to extract text from PowerPoint presentation. Please convert to PDF or paste slide text.'
    );
  }
}

/**
 * Extracts text from a Word document (.docx) using JSZip
 */
export async function extractTextFromDOCX(file: File): Promise<string> {
  try {
    const zip = new JSZip();
    const arrayBuffer = await file.arrayBuffer();
    const loadedZip = await zip.loadAsync(arrayBuffer);

    const docXml = loadedZip.files['word/document.xml'];
    if (!docXml) {
      throw new Error('Not a valid DOCX document.');
    }

    const content = await docXml.async('string');
    // Extract paragraphs <w:p>
    const paragraphs = content.split(/<\/w:p>/);
    const textLines: string[] = [];

    for (const p of paragraphs) {
      const textMatches = p.match(/<w:t[^>]*>([^<]*)<\/w:t>/gi) || [];
      const line = textMatches
        .map((t) => t.replace(/<[^>]+>/g, '').trim())
        .filter(Boolean)
        .join(' ');
      if (line) {
        textLines.push(line);
      }
    }

    return textLines.join('\n\n');
  } catch (err: any) {
    throw new Error(
      err.message || 'Failed to extract text from Word document. Please copy and paste the text directly.'
    );
  }
}
