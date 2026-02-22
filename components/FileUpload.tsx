"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, X } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
    onFilesChange: (files: File[], totalPages: number) => void;
    onContinue: () => void;
    totalPages: number;
}

interface FileWithPages {
    file: File;
    pages: number;
}

export function FileUpload({ onFilesChange, onContinue, totalPages }: FileUploadProps) {
    const [files, setFiles] = useState<FileWithPages[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const countPdfPages = async (file: File): Promise<number> => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            return pdfDoc.getPageCount();
        } catch (error) {
            console.error("Error counting pages:", error);
            return 0;
        }
    };

    const handleFiles = useCallback(
        async (newFiles: FileList | null) => {
            if (!newFiles || newFiles.length === 0) return;

            setIsProcessing(true);
            try {
                const pdfFiles = Array.from(newFiles).filter(
                    (file) => file.type === "application/pdf" ||
                        file.type.startsWith("image/")
                );

                if (pdfFiles.length === 0) {
                    setIsProcessing(false);
                    return;
                }

                // Combine existing files with new files for logic processing
                const existingFiles = files.map(f => f.file);
                const allFiles = [...existingFiles, ...pdfFiles];

                // Check if we need to process/convert files (if > 1 file or if single file is not PDF)
                const needsProcessing = allFiles.length > 1 || allFiles[0].type !== "application/pdf";

                let finalFile: File;
                let finalPages: number;

                if (needsProcessing) {
                    // Merge/Convert using our utility
                    const { mergePDFs } = await import("@/lib/utils");
                    const mergedBlob = await mergePDFs(allFiles);
                    const name = allFiles.length > 1 ? `Merged (${allFiles.length} files).pdf` : allFiles[0].name.replace(/\.[^/.]+$/, "") + ".pdf";
                    finalFile = new File([mergedBlob], name, { type: "application/pdf" });
                    finalPages = await countPdfPages(finalFile);
                } else {
                    // Just take the single PDF file
                    finalFile = allFiles[0];
                    finalPages = await countPdfPages(finalFile);
                }

                const newFileWithPages: FileWithPages = { file: finalFile, pages: finalPages };

                // Replace existing files with the result (single file logic)
                const updatedFiles = [newFileWithPages];
                setFiles(updatedFiles);
                onFilesChange([finalFile], finalPages);
            } catch (error) {
                console.error("Error processing files:", error);
                // Optionally show error toast here
            } finally {
                setIsProcessing(false);
                // Reset input value to allow selecting the same file triggers change again
                const input = document.getElementById("file-upload") as HTMLInputElement;
                if (input) input.value = "";
            }
        },
        [files, onFilesChange]
    );

    const removeFile = (index: number) => {
        const updatedFiles = files.filter((_, i) => i !== index);
        setFiles(updatedFiles);

        const totalPages = updatedFiles.reduce((sum, f) => sum + f.pages, 0);
        const fileArray = updatedFiles.map((f) => f.file);
        onFilesChange(fileArray, totalPages);
    };

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
        },
        [handleFiles]
    );

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    return (
        <div className="space-y-6">
            {/* Upload Area */}
            <div
                className={`border-2 border-dashed rounded-3xl transition-all h-64 flex flex-col items-center justify-center cursor-pointer ${isDragging
                    ? "border-black bg-gray-50 scale-[1.01]"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                    }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => document.getElementById("file-upload")?.click()}
            >
                <div className="space-y-4 text-center px-4">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
                        <Upload className="h-6 w-6 text-gray-900" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold mb-1 tracking-tight">Tap to upload</h3>
                        <p className="text-sm text-gray-500 font-medium text-center">
                            PDF or Images
                        </p>
                    </div>
                </div>
                <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept="application/pdf,image/*"
                    multiple
                    onChange={(e) => handleFiles(e.target.files)}
                    disabled={isProcessing}
                />
            </div>

            {/* File List & Summary */}
            {files.length > 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="space-y-2">
                        {files.map((fileWithPages, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100"
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center flex-shrink-0">
                                        <FileText className="h-5 w-5 text-gray-900" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold truncate text-gray-900">
                                            {fileWithPages.file.name}
                                        </p>
                                        <p className="text-sm text-gray-500 font-medium">
                                            {fileWithPages.pages} page{fileWithPages.pages !== 1 ? "s" : ""}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeFile(index);
                                    }}
                                    className="text-gray-400 hover:text-red-500 flex-shrink-0"
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    {/* Total Pages Summary */}
                    <div className="flex justify-between items-center py-4 px-2 border-t border-gray-100">
                        <span className="text-base font-medium text-gray-500">Total Pages</span>
                        <span className="text-2xl font-bold text-gray-900">{totalPages}</span>
                    </div>

                    {/* Continue Button */}
                    <Button
                        className="w-full h-14 text-lg font-bold rounded-2xl bg-black hover:bg-gray-800 text-white shadow-lg shadow-black/5 transition-all active:scale-[0.98]"
                        onClick={onContinue}
                    >
                        Continue
                    </Button>
                </div>
            )}
        </div>
    );
}
