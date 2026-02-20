"use client";

import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, RotateCw, ZoomIn, ZoomOut } from "lucide-react";

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfPreviewProps {
    file: File;
}

export default function PdfPreview({ file }: PdfPreviewProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.0);
    const [rotation, setRotation] = useState<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState<number>(0);

    useEffect(() => {
        if (containerRef.current) {
            setContainerWidth(containerRef.current.clientWidth);
        }

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => resizeObserver.disconnect();
    }, []);


    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    return (
        <div className="flex flex-col h-full w-full bg-gray-100 rounded-xl overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-2 bg-white border-b border-gray-200 shadow-sm z-10">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.max(0.5, s - 0.1))} title="Zoom Out">
                        <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-xs font-medium min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
                    <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.min(2, s + 0.1))} title="Zoom In">
                        <ZoomIn className="w-4 h-4" />
                    </Button>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setRotation(r => (r + 90) % 360)} title="Rotate">
                    <RotateCw className="w-4 h-4" />
                </Button>
            </div>

            {/* Document Area */}
            <div className="flex-1 overflow-auto p-4 flex justify-center bg-gray-50/50" ref={containerRef}>
                <Document
                    file={file}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={
                        <div className="flex flex-col items-center justify-center p-10 h-full">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-2" />
                            <p className="text-sm text-gray-500">Loading PDF...</p>
                        </div>
                    }
                    error={
                        <div className="flex items-center justify-center h-full text-red-500 text-sm">
                            Failed to load PDF.
                        </div>
                    }
                    className="flex flex-col items-center"
                >
                    <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        rotate={rotation}
                        width={containerWidth ? Math.min(containerWidth - 32, 800) : undefined}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        className="shadow-md bg-white"
                        loading={
                            <div className="h-[400px] w-[300px] bg-white animate-pulse rounded-md shadow-sm" />
                        }
                    />
                </Document>
            </div>

            {/* Footer Navigation */}
            {numPages > 1 && (
                <div className="flex items-center justify-between p-3 bg-white border-t border-gray-200">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                        disabled={pageNumber <= 1}
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Prev
                    </Button>
                    <span className="text-sm font-medium">
                        Page {pageNumber} of {numPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                        disabled={pageNumber >= numPages}
                    >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            )}
        </div>
    );
}
