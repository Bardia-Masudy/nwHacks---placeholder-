import { doc, setDoc } from 'firebase/firestore';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, ChevronRight, FileText, LogOut, Mic, MicOff, Sparkles } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Login from './components/Login';
import ReportView from './components/ReportView';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { addLogToDB, getAllLogsFromDB } from './services/db';
import { db } from './services/firebase';
import { GeminiService } from './services/gemini';
import { SpeechService } from './services/speech';
import { SuggestionContext, WordLog } from './types';

const AppContent: React.FC = () => {
    const { user, signOut } = useAuth();
    const [isRecording, setIsRecording] = useState(false);
    const [suggestionCtx, setSuggestionCtx] = useState<SuggestionContext | null>(null);
    const [logs, setLogs] = useState<WordLog[]>([]);
    const [showReport, setShowReport] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [finalTranscript, setFinalTranscript] = useState<string>("");
    const [interimTranscript, setInterimTranscript] = useState<string>("");

    const transcript = finalTranscript + (finalTranscript && interimTranscript ? " " : "") + interimTranscript;

    const geminiRef = useRef<GeminiService | null>(null);
    const speechRef = useRef<SpeechService | null>(null);
    const suggestionCtxRef = useRef<SuggestionContext | null>(null);

    useEffect(() => {
        suggestionCtxRef.current = suggestionCtx;
    }, [suggestionCtx]);

    const addLog = (word: string, category: string, weight: number, method: WordLog['selectionMethod']) => {
        const newLog: WordLog = {
            id: crypto.randomUUID(),
            word,
            category,
            weight,
            timestamp: Date.now(),
            selectionMethod: method
        };

        if (user) {
            const logRef = doc(db, `users/${user.uid}/logs/${newLog.id}`);
            setDoc(logRef, newLog).catch(console.error);
        }

        addLogToDB(newLog).catch(console.error);

        setLogs(prev => [
            ...prev,
            newLog
        ]);
    };

    useEffect(() => {
        getAllLogsFromDB().then((savedLogs) => {
            setLogs(savedLogs);
        }).catch(console.error);
    }, []);

    const processImplicitSplit = useCallback((ctx: SuggestionContext) => {
        const weights = [0.5, 0.4, 0.1];
        ctx.words.forEach((word, idx) => {
            addLog(word, ctx.category, weights[idx] || 0.1, 'implicit_split');
        });
    }, []);

    const handleStartSession = async () => {
        setError(null);
        setFinalTranscript("");
        setInterimTranscript("");
        try {
            geminiRef.current = new GeminiService({
                onSuggestions: (words, category) => {
                    const prev = suggestionCtxRef.current;
                    if (prev) {
                        processImplicitSplit(prev);
                    }
                    setSuggestionCtx({ words, category, timestamp: Date.now() });
                },
                onConfirmedWord: (word) => {
                    const current = suggestionCtxRef.current;
                    const category = current?.category || 'General';
                    addLog(word, category, 1.0, 'voice_confirmed');
                    setSuggestionCtx(null);
                    setFinalTranscript("");
                    setInterimTranscript("");
                },
                onRejectWord: () => {
                    setSuggestionCtx(null);
                },
                onTranscriptUpdate: () => { },
                onError: (err) => setError(err)
            });

            speechRef.current = new SpeechService(
                (text, isFinal) => {
                    if (isFinal) {
                        setFinalTranscript(prev => prev ? prev + ". " + text : text);
                        setInterimTranscript("");
                    } else {
                        setInterimTranscript(text);
                    }
                },
                (err) => console.warn("Speech warning:", err)
            );

            await geminiRef.current.connect();
            speechRef.current.start();
            setIsRecording(true);
        } catch (e) {
            setError("Failed to start session.");
        }
    };

    const handleStopSession = async () => {
        if (geminiRef.current) {
            await geminiRef.current.disconnect();
            geminiRef.current = null;
        }

        if (speechRef.current) {
            speechRef.current.stop();
            speechRef.current = null;
        }

        setIsRecording(false);

        if (suggestionCtx) {
            processImplicitSplit(suggestionCtx);
            setSuggestionCtx(null);
        }
    };

    const handleManualSelect = (word: string, index: number) => {
        if (!suggestionCtx) return;
        addLog(word, suggestionCtx.category, 1.0, 'manual_click');
        setSuggestionCtx(null);
        setFinalTranscript("");
        setInterimTranscript("");
    };

    const handleSkip = () => {
        if (suggestionCtx) {
            setSuggestionCtx(null);
        }
    };

    useEffect(() => {
        return () => {
            if (geminiRef.current) geminiRef.current.disconnect();
            if (speechRef.current) speechRef.current.stop();
        };
    }, []);

    const transcriptEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isRecording && transcriptEndRef.current) {
            transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [transcript, isRecording]);

    return (
        <div className="h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-200 overflow-hidden flex flex-col">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 flex-shrink-0">
                <div className="max-w-5xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2 md:gap-3">
                        <motion.div
                            whileHover={{ rotate: 5, scale: 1.05 }}
                            className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20"
                        >
                            <Mic className="w-4 h-4 md:w-5 md:h-5 text-white" />
                        </motion.div>
                        <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-slate-900">Listen Me</h1>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        <button
                            onClick={() => setShowReport(true)}
                            className="text-[10px] md:text-sm font-bold text-slate-700 hover:text-blue-600 transition flex items-center gap-1.5 md:gap-2 bg-slate-100 hover:bg-blue-50 px-3 md:px-5 py-2 md:py-2.5 rounded-xl md:rounded-2xl border border-slate-200 hover:border-blue-200"
                        >
                            <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            <span className="hidden xs:inline">Session Report</span>
                            <span className="xs:hidden">Report</span>
                        </button>
                        <div className="h-5 md:h-6 w-px bg-slate-200 mx-0.5 md:mx-1"></div>
                        <button
                            onClick={() => signOut()}
                            className="p-2 md:p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg md:rounded-xl transition-colors"
                            title="Sign Out"
                        >
                            <LogOut className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-6 py-8 md:py-12 overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="wait">
                    {/* Error State */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="mb-6 md:mb-8 p-3 md:p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl md:rounded-2xl shadow-sm flex items-start gap-2 md:gap-3"
                        >
                            <AlertCircle className="w-4 h-4 md:w-5 md:h-5 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-bold text-sm md:text-base">Connection Error</p>
                                <p className="text-xs md:text-sm opacity-90">{error}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                    {/* Introduction / Empty State */}
                    {!isRecording && !suggestionCtx && (
                        <motion.div
                            key="empty-state"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex flex-col items-center justify-center min-h-full py-12 md:py-0"
                        >
                            <div className="relative inline-block mb-8 md:mb-10">
                                <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"></div>
                                <div className="relative w-24 h-24 md:w-32 md:h-32 bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl flex items-center justify-center mx-auto border border-slate-100">
                                    <Sparkles className="w-10 h-10 md:w-14 md:h-14 text-blue-600" />
                                </div>
                            </div>
                            <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-3 md:mb-4 tracking-tight px-4 text-center">Ready to find your words?</h2>
                            <p className="text-base md:text-xl text-slate-500 max-w-md mx-auto mb-8 md:mb-10 leading-relaxed px-6 text-center">
                                Start a session and I'll listen for pauses or struggles to offer helpful suggestions.
                            </p>
                        </motion.div>
                    )}

                    {/* Live Transcript */}
                    {isRecording && !suggestionCtx && (
                        <motion.div
                            key="recording-state"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-10 md:py-16 min-h-[40vh] md:min-h-[45vh]"
                        >
                            <div className="mb-8 md:mb-12 relative">
                                <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full animate-pulse"></div>
                                <div className="relative w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
                            </div>

                            <div className="max-w-2xl w-full text-center px-4">
                                {transcript ? (
                                    <div className="space-y-4">
                                        <p className="text-2xl md:text-5xl font-bold text-slate-800 leading-[1.3] tracking-tight break-words">
                                            {transcript}
                                            <span className="inline-block w-1 h-6 md:h-12 bg-blue-500 ml-2 animate-pulse align-middle"></span>
                                        </p>
                                        <div ref={transcriptEndRef} />
                                    </div>
                                ) : (
                                    <div className="space-y-3 md:space-y-4">
                                        <p className="text-2xl md:text-3xl text-slate-300 font-bold animate-pulse">
                                            Listening...
                                        </p>
                                        <p className="text-slate-400 text-xs md:text-sm font-medium">Speak naturally, I'm here to help.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Active Suggestions */}
                    {suggestionCtx && (
                        <motion.div
                            key="suggestion-state"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -30 }}
                            className="space-y-6 md:space-y-8"
                        >
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-2 md:gap-3">
                                    <div className="px-2 md:px-3 py-0.5 md:py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest">
                                        {suggestionCtx.category}
                                    </div>
                                    <h3 className="text-slate-400 text-xs md:text-sm font-medium">Suggestions</h3>
                                </div>
                                <button
                                    onClick={handleSkip}
                                    className="text-slate-400 hover:text-slate-600 text-xs md:text-sm font-bold transition-colors flex items-center gap-1"
                                >
                                    Skip <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                </button>
                            </div>

                            <div className="grid gap-3 md:gap-4">
                                {suggestionCtx.words.map((word, idx) => (
                                    <motion.button
                                        key={`${word}-${idx}`}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        whileHover={{ scale: 1.01, translateX: 4 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleManualSelect(word, idx)}
                                        className="group relative w-full text-left p-4 md:p-6 bg-white border border-slate-200 hover:border-blue-500 rounded-xl md:rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 flex items-center justify-between overflow-hidden"
                                    >
                                        <div className="absolute top-0 left-0 w-1 md:w-1.5 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <span className="text-xl md:text-4xl font-black text-slate-900 group-hover:text-blue-600 tracking-tighter">
                                            {word}
                                        </span>
                                        <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-slate-50 group-hover:bg-blue-600 flex items-center justify-center transition-all duration-300 shadow-inner">
                                            <CheckCircle2 className="w-4 h-4 md:w-6 md:h-6 text-slate-300 group-hover:text-white transition-colors" />
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                            <p className="text-center text-slate-400 text-sm font-medium pt-4">
                                Tap the word you were looking for, or just say it out loud.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Fixed Bottom Action Bar */}
            <div className="bg-white/80 backdrop-blur-xl border-t border-slate-200 p-4 md:p-6 pb-8 md:pb-10 z-40 flex-shrink-0">
                <div className="max-w-md mx-auto flex flex-col items-center gap-3 md:gap-4">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={isRecording ? handleStopSession : handleStartSession}
                        className={`
                            group relative flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-[1.5rem] shadow-xl transition-all duration-500 overflow-hidden
                            ${isRecording
                                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
                                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
                            }
                        `}
                    >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        {isRecording ? (
                            <MicOff className="w-6 h-6 md:w-8 md:h-8 text-white" />
                        ) : (
                            <Mic className="w-6 h-6 md:w-8 md:h-8 text-white" />
                        )}
                    </motion.button>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-100 px-4 md:px-5 py-1.5 md:py-2 rounded-full border border-slate-200"
                    >
                        <p className="text-[10px] md:text-xs font-bold text-slate-600 flex items-center gap-2">
                            {isRecording ? (
                                <>
                                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-red-500 rounded-full animate-pulse"></span>
                                    Session Active
                                </>
                            ) : (
                                "Tap to Start Session"
                            )}
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Report Modal */}
            <AnimatePresence>
                {showReport && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100]"
                    >
                        <ReportView logs={logs} onClose={() => setShowReport(false)} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Wrapper to provide Auth Context
const App: React.FC = () => {
    return (
        <AuthProvider>
            <AppWrapper />
        </AuthProvider>
    );
};

const AppWrapper: React.FC = () => {
    const { user } = useAuth();
    if (!user) {
        return <Login />;
    }
    return <AppContent />;
};

export default App;
