"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileText, X, Lock, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isPdfEncrypted, getPdfPageCount, decryptPdf } from "@/lib/pdf-decrypt";

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
    const [error, setError] = useState<string | null>(null);

    // Password Prompt State
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [password, setPassword] = useState("");
    const [passwords, setPasswords] = useState<Record<string, string>>({});
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
    const [passwordError, setPasswordError] = useState(false);

    // Batch State
    const [currentBatch, setCurrentBatch] = useState<File[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFiles = useCallback(
        async (newFiles: File[] | FileList | null) => {
            if (!newFiles || (newFiles instanceof FileList ? newFiles.length === 0 : newFiles.length === 0)) return;

            setIsProcessing(true);
            setError(null);
            try {
                const incomingFiles = Array.from(newFiles).filter(
                    (file) => file.type === "application/pdf" || file.type.startsWith("image/")
                );

                if (incomingFiles.length === 0) {
                    setIsProcessing(false);
                    return;
                }

                // Store the batch for later (in case password prompt interrupts)
                const existingFiles = files.map(f => f.file);
                const allFiles = [...existingFiles, ...incomingFiles];
                setCurrentBatch(allFiles);

                // Check each PDF for encryption BEFORE merging
                for (const file of allFiles) {
                    if (file.type === 'application/pdf') {
                        const encrypted = await isPdfEncrypted(file);
                        if (encrypted && !passwords[file.name]) {
                            // This file needs a password — prompt the user
                            setPendingFile(file);
                            setShowPasswordPrompt(true);
                            setIsProcessing(false);
                            return;
                        }
                    }
                }

                // All passwords collected — decrypt any protected files first
                const decryptedFiles: File[] = [];
                for (const file of allFiles) {
                    if (file.type === 'application/pdf' && passwords[file.name]) {
                        const decrypted = await decryptPdf(file, passwords[file.name]);
                        decryptedFiles.push(decrypted);
                    } else {
                        decryptedFiles.push(file);
                    }
                }

                let finalFile: File;
                let finalPages: number;

                if (decryptedFiles.length === 1 && decryptedFiles[0].type === 'application/pdf') {
                    // Single PDF — use directly
                    finalFile = decryptedFiles[0];
                    finalPages = await getPdfPageCount(finalFile);
                } else {
                    // Multiple files or images — merge them
                    const { mergePDFs } = await import("@/lib/utils");
                    const mergedBlob = await mergePDFs(decryptedFiles);
                    const name = decryptedFiles.length > 1
                        ? `Merged (${decryptedFiles.length} files).pdf`
                        : decryptedFiles[0].name.replace(/\.[^/.]+$/, "") + ".pdf";
                    finalFile = new File([mergedBlob], name, { type: "application/pdf" });
                    finalPages = await getPdfPageCount(finalFile);
                }

                const newFileWithPages: FileWithPages = { file: finalFile, pages: finalPages };
                setFiles([newFileWithPages]);
                setCurrentBatch([]);
                onFilesChange([finalFile], finalPages);
            } catch (error: any) {
                console.error("Error processing files:", error);
                setError(error.message || "An error occurred while processing your files.");
            } finally {
                setIsProcessing(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        },
        [files, onFilesChange, passwords, currentBatch]
    );

    const handlePasswordSubmitFixed = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pendingFile || !password) return;

        setPasswordError(false);
        setIsProcessing(true);

        try {
            // Verify the password is correct by trying to get page count
            await getPdfPageCount(pendingFile, password);

            // Password is correct — build the complete passwords map
            const allPasswords = { ...passwords, [pendingFile.name]: password };
            setPasswords(allPasswords);
            setShowPasswordPrompt(false);
            setPendingFile(null);
            setPassword("");

            // Process the batch inline (avoids stale closure issues with setTimeout)
            const batch = currentBatch;

            // Check if any OTHER files in the batch still need passwords
            for (const file of batch) {
                if (file.type === 'application/pdf' && file !== pendingFile) {
                    const encrypted = await isPdfEncrypted(file);
                    if (encrypted && !allPasswords[file.name]) {
                        // Another file needs a password too
                        setPendingFile(file);
                        setShowPasswordPrompt(true);
                        setIsProcessing(false);
                        return;
                    }
                }
            }

            // All passwords collected — decrypt protected files
            const decryptedFiles: File[] = [];
            for (const file of batch) {
                if (file.type === 'application/pdf' && allPasswords[file.name]) {
                    const decrypted = await decryptPdf(file, allPasswords[file.name]);
                    decryptedFiles.push(decrypted);
                } else {
                    decryptedFiles.push(file);
                }
            }

            let finalFile: File;
            let finalPages: number;

            if (decryptedFiles.length === 1 && decryptedFiles[0].type === 'application/pdf') {
                finalFile = decryptedFiles[0];
                finalPages = await getPdfPageCount(finalFile);
            } else {
                const { mergePDFs } = await import("@/lib/utils");
                const mergedBlob = await mergePDFs(decryptedFiles);
                const name = decryptedFiles.length > 1
                    ? `Merged (${decryptedFiles.length} files).pdf`
                    : decryptedFiles[0].name.replace(/\.[^/.]+$/, "") + ".pdf";
                finalFile = new File([mergedBlob], name, { type: "application/pdf" });
                finalPages = await getPdfPageCount(finalFile);
            }

            const newFileWithPages: FileWithPages = { file: finalFile, pages: finalPages };
            setFiles([newFileWithPages]);
            setCurrentBatch([]);
            onFilesChange([finalFile], finalPages);
            setIsProcessing(false);
        } catch (err: any) {
            if (err.message === 'ENCRYPTED') {
                setPasswordError(true);
            } else {
                console.error("Password submit error:", err);
                setError(err.message || "Failed to unlock file.");
                setShowPasswordPrompt(false);
            }
            setIsProcessing(false);
        }
    };

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
                className={`border-2 border-dashed rounded-3xl transition-all h-64 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden ${isDragging
                    ? "border-black bg-gray-50 scale-[1.01]"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                    } ${isProcessing ? "pointer-events-none opacity-60" : ""}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
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
                {isProcessing && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm font-bold text-gray-900">Processing...</p>
                        </div>
                    </div>
                )}
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="application/pdf,image/*"
                    multiple
                    onChange={(e) => handleFiles(e.target.files)}
                    disabled={isProcessing}
                />
            </div>

            {error && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
                    {error}
                </div>
            )}

            {/* Password Prompt Modal-style Overlay */}
            {showPasswordPrompt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center">
                                <Lock className="h-8 w-8 text-amber-500" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold tracking-tight text-gray-900">Protected PDF</h3>
                                <p className="text-gray-500 text-sm font-medium leading-relaxed px-4">
                                    The file <span className="text-gray-900 font-bold">"{pendingFile?.name}"</span> is password protected.
                                    Please enter the password to unlock it.
                                </p>
                            </div>

                            <form onSubmit={handlePasswordSubmitFixed} className="w-full space-y-4">
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-black">
                                        <KeyRound className="h-5 w-5" />
                                    </div>
                                    <Input
                                        type="password"
                                        placeholder="Enter PDF password"
                                        className={`h-14 pl-12 rounded-2xl border-2 transition-all text-lg font-medium bg-gray-50 focus:bg-white ${passwordError
                                            ? "border-red-500 focus:ring-red-500/10"
                                            : "border-gray-100 focus:border-black focus:ring-black/5"
                                            }`}
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            setPasswordError(false);
                                        }}
                                        autoFocus
                                    />
                                    {passwordError && (
                                        <p className="absolute -bottom-6 left-2 text-xs font-bold text-red-500 animate-in slide-in-from-top-1">
                                            Incorrect password. Please try again.
                                        </p>
                                    )}
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="flex-1 h-14 rounded-2xl text-gray-500 font-bold hover:bg-gray-100 transition-all"
                                        onClick={() => {
                                            setShowPasswordPrompt(false);
                                            setPendingFile(null);
                                            setPassword("");
                                            setIsProcessing(false);
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="flex-[2] h-14 rounded-2xl bg-black hover:bg-gray-800 text-white font-bold shadow-lg shadow-black/10 transition-all active:scale-[0.98]"
                                        disabled={!password || isProcessing}
                                    >
                                        Unlock File
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

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
