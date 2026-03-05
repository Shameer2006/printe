'use client';

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { Loader2, Download, Eye, Sparkles, User, Briefcase, GraduationCap, Wrench, FileText, Calendar, Building, MapPin, Send, ChevronDown } from 'lucide-react';

type DocumentType = 'resume' | 'od_letter' | 'leave_letter' | 'formal_letter';

interface BaseFormData {
    fullName: string;
}

interface ResumeData extends BaseFormData {
    jobTitle: string;
    experience: string;
    skills: string;
    education: string;
    additionalNotes: string;
}

interface ODLetterData extends BaseFormData {
    idNo: string;
    department: string;
    eventName: string;
    duration: string;
    reason: string;
}

interface LeaveLetterData extends BaseFormData {
    reason: string;
    startDate: string;
    endDate: string;
    totalDays: string;
    recipient: string;
}

interface FormalLetterData extends BaseFormData {
    recipientDetails: string;
    subject: string;
    content: string;
}

type FormData = ResumeData | ODLetterData | LeaveLetterData | FormalLetterData;

export function AIDocumentGenerator() {
    const [docType, setDocType] = useState<DocumentType>('resume');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);

    const [credits, setCredits] = useState<string | null>(null);

    const [resumeData, setResumeData] = useState<ResumeData>({
        fullName: '',
        jobTitle: '',
        experience: '',
        skills: '',
        education: '',
        additionalNotes: '',
    });

    const [odData, setOdData] = useState<ODLetterData>({
        fullName: '',
        idNo: '',
        department: '',
        eventName: '',
        duration: '',
        reason: '',
    });

    const [leaveData, setLeaveData] = useState<LeaveLetterData>({
        fullName: '',
        reason: '',
        startDate: '',
        endDate: '',
        totalDays: '',
        recipient: '',
    });

    const [formalData, setFormalData] = useState<FormalLetterData>({
        fullName: '',
        recipientDetails: '',
        subject: '',
        content: '',
    });

    const handleDocTypeChange = (type: DocumentType) => {
        setDocType(type);
        if (generatedPdfUrl) {
            window.URL.revokeObjectURL(generatedPdfUrl);
            setGeneratedPdfUrl(null);
        }
    };

    const updateData = (type: DocumentType, field: string, value: string) => {
        if (generatedPdfUrl) {
            window.URL.revokeObjectURL(generatedPdfUrl);
            setGeneratedPdfUrl(null);
        }

        if (type === 'resume') setResumeData(prev => ({ ...prev, [field]: value }));
        if (type === 'od_letter') setOdData(prev => ({ ...prev, [field]: value }));
        if (type === 'leave_letter') setLeaveData(prev => ({ ...prev, [field]: value }));
        if (type === 'formal_letter') setFormalData(prev => ({ ...prev, [field]: value }));
    };

    const buildPrompt = (): string => {
        if (docType === 'resume') {
            return `Create a professional, well-formatted resume for ${resumeData.fullName}. 
      Job Title: ${resumeData.jobTitle}. 
      Experience: ${resumeData.experience}. 
      Skills: ${resumeData.skills}. 
      Education: ${resumeData.education}. 
      Notes: ${resumeData.additionalNotes}. 
      Format as a clean, ATS-friendly resume.`;
        }

        if (docType === 'od_letter') {
            return `Write a formal On-Duty (OD) permission letter.
      Student Name: ${odData.fullName}.
      ID/Roll No: ${odData.idNo}.
      Department: ${odData.department}.
      Event/Purpose: ${odData.eventName}.
      Duration/Date: ${odData.duration}.
      Reason: ${odData.reason}.
      The letter should be professional and addressed to the Head of Department.`;
        }

        if (docType === 'leave_letter') {
            return `Write a formal leave application letter.
      From: ${leaveData.fullName}.
      To: ${leaveData.recipient}.
      Reason for Leave: ${leaveData.reason}.
      Start Date: ${leaveData.startDate}.
      End Date: ${leaveData.endDate}.
      Total Days: ${leaveData.totalDays}.
      State the request clearly and professionally.`;
        }

        if (docType === 'formal_letter') {
            return `Write a professional formal letter.
      Sender: ${formalData.fullName}.
      Recipient: ${formalData.recipientDetails}.
      Subject: ${formalData.subject}.
      Content/Context: ${formalData.content}.
      Follow standard formal letter formatting.`;
        }

        return '';
    };

    const getCurrentName = () => {
        if (docType === 'resume') return resumeData.fullName;
        if (docType === 'od_letter') return odData.fullName;
        if (docType === 'leave_letter') return leaveData.fullName;
        if (docType === 'formal_letter') return formalData.fullName;
        return 'Document';
    };

    const handleGeneratePdf = async () => {
        const name = getCurrentName();
        if (!name.trim()) {
            toast.error('Please enter your name.');
            return;
        }

        setIsLoading(true);

        try {
            const prompt = buildPrompt();

            const response = await fetch('/api/generate-resume-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-hugpdf-mode': 'normal'
                },
                body: JSON.stringify({ prompt, name }),
            });

            // Capture credits from headers
            const remainingCredits = response.headers.get('X-Credits-Remaining');
            if (remainingCredits) {
                setCredits(remainingCredits);
            }

            if (!response.ok) {
                let errorMessage = 'Failed to generate PDF';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch { }
                throw new Error(errorMessage);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            setGeneratedPdfUrl(url);

            toast.success('Document generated! Download it below.');
        } catch (error: any) {
            console.error('Error generating PDF:', error);
            toast.error(error.message || 'Error generating PDF.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        if (!generatedPdfUrl) return;
        const a = document.createElement('a');
        a.href = generatedPdfUrl;
        const suffix = docType.replace('_', ' ');
        a.download = `${getCurrentName().replace(/\s+/g, '_')}_${suffix}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    return (
        <div className="space-y-6">
            {/* Doc Type Selector - Dropdown */}
            <div className="flex flex-col gap-1.5">
                <div className="relative group">
                    <select
                        value={docType}
                        onChange={(e) => handleDocTypeChange(e.target.value as DocumentType)}
                        className="w-full h-12 pl-11 pr-10 bg-white border border-gray-200 rounded-2xl text-sm font-bold appearance-none focus:outline-none focus:border-black focus:ring-4 focus:ring-black/5 transition-all cursor-pointer hover:border-gray-300"
                        disabled={isLoading}
                    >
                        <option value="resume">Resume Builder</option>
                        <option value="od_letter">On-Duty (OD) Letter</option>
                        <option value="leave_letter">Leave Application</option>
                        <option value="formal_letter">Formal Letter</option>
                    </select>

                    {/* Left Icon */}
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-focus-within:text-black transition-colors">
                        {docType === 'resume' && <Briefcase className="h-4 w-4" />}
                        {docType === 'od_letter' && <MapPin className="h-4 w-4" />}
                        {docType === 'leave_letter' && <Calendar className="h-4 w-4" />}
                        {docType === 'formal_letter' && <Send className="h-4 w-4" />}
                    </div>

                    {/* Right Chevron */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <ChevronDown className="h-4 w-4" />
                    </div>
                </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" /> Full Name *
                    </Label>
                    <Input
                        placeholder="Enter your name"
                        value={getCurrentName()}
                        onChange={(e) => updateData(docType, 'fullName', e.target.value)}
                        className="h-11 rounded-xl bg-white"
                        disabled={isLoading}
                    />
                </div>

                {docType === 'resume' && (
                    <>
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                <Briefcase className="h-3.5 w-3.5" /> Job Title
                            </Label>
                            <Input
                                placeholder="e.g. Software Engineer"
                                value={resumeData.jobTitle}
                                onChange={(e) => updateData('resume', 'jobTitle', e.target.value)}
                                className="h-11 rounded-xl bg-white"
                                disabled={isLoading}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" /> Experience
                                </Label>
                                <Input
                                    placeholder="e.g. 3 years"
                                    value={resumeData.experience}
                                    onChange={(e) => updateData('resume', 'experience', e.target.value)}
                                    className="h-11 rounded-xl bg-white"
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                    <GraduationCap className="h-3.5 w-3.5" /> Education
                                </Label>
                                <Input
                                    placeholder="e.g. B.Tech"
                                    value={resumeData.education}
                                    onChange={(e) => updateData('resume', 'education', e.target.value)}
                                    className="h-11 rounded-xl bg-white"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                <Wrench className="h-3.5 w-3.5" /> Key Skills
                            </Label>
                            <Input
                                placeholder="React, Node.js, Python..."
                                value={resumeData.skills}
                                onChange={(e) => updateData('resume', 'skills', e.target.value)}
                                className="h-11 rounded-xl bg-white"
                                disabled={isLoading}
                            />
                        </div>
                    </>
                )}

                {docType === 'od_letter' && (
                    <>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5" /> ID/Roll No
                                </Label>
                                <Input
                                    placeholder="e.g. 21CS001"
                                    value={odData.idNo}
                                    onChange={(e) => updateData('od_letter', 'idNo', e.target.value)}
                                    className="h-11 rounded-xl bg-white"
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                    <Building className="h-3.5 w-3.5" /> Dept
                                </Label>
                                <Input
                                    placeholder="Computer Science"
                                    value={odData.department}
                                    onChange={(e) => updateData('od_letter', 'department', e.target.value)}
                                    className="h-11 rounded-xl bg-white"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5" /> Event/Purpose
                            </Label>
                            <Input
                                placeholder="Symposium / Sports Meet"
                                value={odData.eventName}
                                onChange={(e) => updateData('od_letter', 'eventName', e.target.value)}
                                className="h-11 rounded-xl bg-white"
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" /> Date/Duration
                            </Label>
                            <Input
                                placeholder="e.g. 24th Oct (1 day)"
                                value={odData.duration}
                                onChange={(e) => updateData('od_letter', 'duration', e.target.value)}
                                className="h-11 rounded-xl bg-white"
                                disabled={isLoading}
                            />
                        </div>
                    </>
                )}

                {docType === 'leave_letter' && (
                    <>
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5" /> To (Recipient)
                            </Label>
                            <Input
                                placeholder="e.g. Class Advisor / Manager"
                                value={leaveData.recipient}
                                onChange={(e) => updateData('leave_letter', 'recipient', e.target.value)}
                                className="h-11 rounded-xl bg-white"
                                disabled={isLoading}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" /> From Date
                                </Label>
                                <Input
                                    type="date"
                                    value={leaveData.startDate}
                                    onChange={(e) => updateData('leave_letter', 'startDate', e.target.value)}
                                    className="h-11 rounded-xl bg-white"
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" /> To Date
                                </Label>
                                <Input
                                    type="date"
                                    value={leaveData.endDate}
                                    onChange={(e) => updateData('leave_letter', 'endDate', e.target.value)}
                                    className="h-11 rounded-xl bg-white"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5" /> Reason
                            </Label>
                            <Input
                                placeholder="Fever / Family Function / Wedding"
                                value={leaveData.reason}
                                onChange={(e) => updateData('leave_letter', 'reason', e.target.value)}
                                className="h-11 rounded-xl bg-white"
                                disabled={isLoading}
                            />
                        </div>
                    </>
                )}

                {docType === 'formal_letter' && (
                    <>
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5" /> Recipient Details
                            </Label>
                            <Input
                                placeholder="Name, Address, Title"
                                value={formalData.recipientDetails}
                                onChange={(e) => updateData('formal_letter', 'recipientDetails', e.target.value)}
                                className="h-11 rounded-xl bg-white"
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5" /> Subject
                            </Label>
                            <Input
                                placeholder="Request for Certificate / Application for Post"
                                value={formalData.subject}
                                onChange={(e) => updateData('formal_letter', 'subject', e.target.value)}
                                className="h-11 rounded-xl bg-white"
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                <Send className="h-3.5 w-3.5" /> Content / Context
                            </Label>
                            <textarea
                                rows={3}
                                placeholder="Describe the purpose of your letter..."
                                value={formalData.content}
                                onChange={(e) => updateData('formal_letter', 'content', e.target.value)}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:border-black focus:ring-1 focus:ring-black/5 disabled:opacity-50 bg-white"
                                disabled={isLoading}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Action Button */}
            <Button
                onClick={handleGeneratePdf}
                disabled={isLoading || !getCurrentName().trim()}
                className="w-full h-14 text-lg font-bold rounded-2xl bg-black hover:bg-gray-800 text-white shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
            >
                {isLoading ? (
                    <span className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Generating PDF...
                    </span>
                ) : (
                    <span className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        Generate PDF
                    </span>
                )}
            </Button>

            {/* Result */}
            {generatedPdfUrl && (
                <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Button
                        onClick={handleDownload}
                        className="flex-1 h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                    </Button>
                    <Button
                        onClick={() => window.open(generatedPdfUrl, '_blank')}
                        variant="outline"
                        className="flex-1 h-12 rounded-xl border-gray-200 hover:bg-gray-50 font-bold"
                    >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                    </Button>
                </div>
            )}

            {/* Branding & Credits */}
            <div className="pt-4 flex flex-col items-center gap-2">
                {credits && (
                    <div className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 uppercase tracking-wider animate-in fade-in duration-500">
                        Credits Remaining: {credits}
                    </div>
                )}
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <span>Powered by</span>
                    <div className="flex items-center gap-1 text-black">
                        <div className="w-4 h-4 bg-black rounded flex items-center justify-center">
                            <span className="text-white text-[8px]">H</span>
                        </div>
                        <span className="tracking-tighter">HugPDF</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
