import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function mergePDFs(files: File[]): Promise<Blob> {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    if (file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer, {
        updateMetadata: false,
        throwOnInvalidObject: false
      } as any);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    } else if (file.type.startsWith('image/')) {
      const arrayBuffer = await file.arrayBuffer();
      let image;
      if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
        image = await mergedPdf.embedJpg(arrayBuffer);
      } else if (file.type === 'image/png') {
        image = await mergedPdf.embedPng(arrayBuffer);
      }

      if (image) {
        const page = mergedPdf.addPage();
        const { width, height } = image.scale(1);
        const pageWidth = page.getWidth();
        const pageHeight = page.getHeight();
        const scale = Math.min((pageWidth - 40) / width, (pageHeight - 40) / height, 1);

        page.drawImage(image, {
          x: (pageWidth - width * scale) / 2,
          y: (pageHeight - height * scale) / 2,
          width: width * scale,
          height: height * scale,
        });
      }
    }
  }

  const mergedPdfBytes = await mergedPdf.save();
  return new Blob([mergedPdfBytes as BlobPart], { type: 'application/pdf' });
}

// Order codes are allocated by the server (`createOrder` in lib/orders.ts), which picks
// one inside a transaction so it cannot land on a live order. Generating one client-side
// overwrote existing orders on collision, so that helper is deliberately gone.

export async function getPDFPageCount(blob: Blob): Promise<number> {
  const arrayBuffer = await blob.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, {
    updateMetadata: false,
    throwOnInvalidObject: false
  } as any);
  return pdfDoc.getPageCount();
}

