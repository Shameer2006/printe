/**
 * PDF Decryption Utility
 * 
 * Uses pdfjs-dist (which has real PDF decryption support) to unlock
 * password-protected PDFs and convert them to unprotected PDFs
 * that pdf-lib can then merge/process.
 * 
 * Strategy: Load encrypted PDF with pdfjs → render each page to canvas 
 * at high resolution → embed images into a new clean PDF via pdf-lib.
 */

import { PDFDocument } from 'pdf-lib';

// Dynamically import pdfjs to avoid SSR issues
async function getPdfjs() {
    const pdfjs = await import('pdfjs-dist');

    // Set up worker
    if (typeof window !== 'undefined') {
        const pdfjsLib = pdfjs as any;
        if (!pdfjsLib.GlobalWorkerOptions?.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        }
    }

    return pdfjs;
}

/**
 * Check if a PDF file is password-protected.
 * Returns true if the PDF requires a password.
 */
export async function isPdfEncrypted(file: File): Promise<boolean> {
    const pdfjs = await getPdfjs();
    const arrayBuffer = await file.arrayBuffer();

    try {
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
        const doc = await loadingTask.promise;
        doc.destroy();
        return false; // Loaded without password = not encrypted
    } catch (error: any) {
        if (error?.name === 'PasswordException') {
            return true;
        }
        // Some other error, not encryption-related
        return false;
    }
}

/**
 * Get page count of a PDF, optionally with a password.
 * Throws 'ENCRYPTED' error if password is needed but not provided/wrong.
 */
export async function getPdfPageCount(file: File, password?: string): Promise<number> {
    const pdfjs = await getPdfjs();
    const arrayBuffer = await file.arrayBuffer();

    try {
        const loadingTask = pdfjs.getDocument({
            data: new Uint8Array(arrayBuffer),
            password: password || undefined
        });
        const doc = await loadingTask.promise;
        const numPages = doc.numPages;
        doc.destroy();
        return numPages;
    } catch (error: any) {
        if (error?.name === 'PasswordException') {
            throw new Error('ENCRYPTED');
        }
        throw error;
    }
}

/**
 * Decrypt a password-protected PDF by rendering it through pdfjs 
 * and creating a new unencrypted PDF.
 * 
 * @param file - The encrypted PDF file
 * @param password - The password to unlock it
 * @param dpi - Resolution for rendering (default 200, good balance of quality/size)
 * @returns A new File containing an unencrypted PDF
 */
export async function decryptPdf(file: File, password: string, dpi: number = 200): Promise<File> {
    const pdfjs = await getPdfjs();
    const arrayBuffer = await file.arrayBuffer();

    // Load the encrypted PDF with password using pdfjs
    const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(arrayBuffer),
        password
    });

    let doc;
    try {
        doc = await loadingTask.promise;
    } catch (error: any) {
        if (error?.name === 'PasswordException') {
            throw new Error('WRONG_PASSWORD');
        }
        throw error;
    }

    const numPages = doc.numPages;
    const newPdf = await PDFDocument.create();

    // Create an offscreen canvas for rendering
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const scaleFactor = dpi / 72; // PDF uses 72 DPI natively

    for (let i = 1; i <= numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: scaleFactor });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Clear canvas
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Render page to canvas
        await page.render({
            canvasContext: ctx,
            viewport: viewport,
            canvas: canvas,
        } as any).promise;

        // Convert canvas to JPEG (good compression for printing)
        const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.92);
        });

        const imageBytes = new Uint8Array(await blob.arrayBuffer());
        const image = await newPdf.embedJpg(imageBytes);

        // Create a page matching the original dimensions in PDF points
        const originalViewport = page.getViewport({ scale: 1 });
        const newPage = newPdf.addPage([originalViewport.width, originalViewport.height]);

        newPage.drawImage(image, {
            x: 0,
            y: 0,
            width: originalViewport.width,
            height: originalViewport.height,
        });
    }

    doc.destroy();

    const pdfBytes = await newPdf.save();
    const decryptedName = file.name.replace(/\.pdf$/i, '') + '.pdf';
    return new File([pdfBytes as BlobPart], decryptedName, { type: 'application/pdf' });
}
