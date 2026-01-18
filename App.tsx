import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GeminiService } from './services/gemini';
import { SpeechService } from './services/speech';
import { getAllLogsFromDB, addLogToDB } from './services/db';
import { WordLog, SuggestionContext } from './types';
import ReportView from './components/ReportView';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './services/firebase';

const AppContent: React.FC = () => {
  const { user, signOut } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [suggestionCtx, setSuggestionCtx] = useState<SuggestionContext | null>(null);
  const [logs, setLogs] = useState<WordLog[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");

  const geminiRef = useRef<GeminiService | null>(null);
  const speechRef = useRef<SpeechService | null>(null);

  // Helper to log words
  const addLog = (word: string, category: string, weight: number, method: WordLog['selectionMethod']) => {
    const newLog: WordLog = {
      id: crypto.randomUUID(),
      word,
      category,
      weight,
      timestamp: Date.now(),
      selectionMethod: method
    };

    // Save to Firestore if user is logged in
    if (user) {
      const logRef = doc(db, `users/${user.uid}/logs/${newLog.id}`);
      setDoc(logRef, newLog).catch(console.error);
    }

    // Also save to local DB as backup/cache (optional, keeping for now)
    addLogToDB(newLog).catch(console.error);

    setLogs(prev => [
      ...prev,
      newLog
    ]);
  };

  // Load logs on mount
  useEffect(() => {
    getAllLogsFromDB().then((savedLogs) => {
      setLogs(savedLogs);
    }).catch(console.error);
  }, []);

  // Logic for implicit split (50/40/10)
  // This is called when new suggestions arrive replacing old ones, or session ends with pending suggestions
  const processImplicitSplit = useCallback((ctx: SuggestionContext) => {
    const weights = [0.5, 0.4, 0.1];
    ctx.words.forEach((word, idx) => {
      addLog(word, ctx.category, weights[idx] || 0.1, 'implicit_split');
    });
  }, []);

  const handleStartSession = async () => {
    setError(null);
    try {
      geminiRef.current = new GeminiService({
        onSuggestions: (words, category) => {
          // If previous suggestions existed and weren't selected, log them as implicit split
          setSuggestionCtx(prev => {
            if (prev) {
              processImplicitSplit(prev);
            }
            return { words, category, timestamp: Date.now() };
          });
        },
        onConfirmedWord: (word) => {
          // Find category from current context or default to 'Unknown'
          setSuggestionCtx(current => {
            const category = current?.category || 'General';
            addLog(word, category, 1.0, 'voice_confirmed');
            return null; // Clear suggestions after success
          });
        },
        onRejectWord: () => {
          // Clear rejected words.
          setSuggestionCtx(current => {
            return null; // Clear suggestions
          });
        },
        onTranscriptUpdate: () => { }, // Not strictly using transcript text in UI to keep it simple
        onError: (err) => setError(err)
      });

      // Initialize Speech Service
      speechRef.current = new SpeechService(
        (text, isFinal) => {
          if (isFinal) {
            setTranscript(prev => prev ? prev + ". " + text : text);
          } else {
            // Option: Show interim results if desired, or just wait for final
            // For now, let's show interim to be responsive
            // We need a way to verify interim vs final in UI if we want to be fancy
            // But simpler is just:
            setTranscript(text);
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

  const handleStopSession = async () => { //TODO
    if (geminiRef.current) {
      await geminiRef.current.disconnect();
      geminiRef.current = null;
    }

    if (speechRef.current) {
      speechRef.current.stop();
      speechRef.current = null;
    }

    setIsRecording(false);

    // If there were pending suggestions, log them as split 
    if (suggestionCtx) {
      processImplicitSplit(suggestionCtx);
      setSuggestionCtx(null);
    }
  };

  const handleManualSelect = (word: string, index: number) => {
    if (!suggestionCtx) return;
    addLog(word, suggestionCtx.category, 1.0, 'manual_click');
    setSuggestionCtx(null); // Clear after selection
  };

  const handleSkip = () => {
    if (suggestionCtx) {
      processImplicitSplit(suggestionCtx);
      setSuggestionCtx(null);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      return () => {
        if (geminiRef.current) geminiRef.current.disconnect();
        if (speechRef.current) speechRef.current.stop();
      };
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">

      {/* Navigation / Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Logo */}
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Anomia Aid</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowReport(true)}
              className="text-sm font-medium text-slate-600 hover:text-blue-600 transition flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-full"
            >
              Report
            </button>
            <button
              onClick={() => signOut()}
              className="text-xs text-slate-400 hover:text-red-500 underline"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 pb-32">

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r shadow-sm">
            <p className="font-bold">Connection Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Introduction / Empty State */}
        {!isRecording && !suggestionCtx && (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Ready to start therapy?</h2>
            <p className="text-lg text-slate-600 max-w-md mx-auto mb-8">
              Press the microphone button below to begin the session. Describe words you can't find, and I will help you.
            </p>
          </div>
        )}

        {/* Live Transcript (Center Screen) */}
        {isRecording && !suggestionCtx && (
          <div className="flex flex-col items-center justify-center py-10 min-h-[40vh] animate-fade-in-up">
            <div className="mb-8">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-ping" />
            </div>
            {transcript ? (
              <p className="text-3xl md:text-4xl font-medium text-slate-700 text-center max-w-2xl leading-relaxed tracking-tight">
                {transcript}
              </p>
            ) : (
              <p className="text-2xl text-slate-400 font-medium animate-pulse">
                Listening...
              </p>
            )}
          </div>
        )}

        {/* Active Suggestions */}
        {suggestionCtx && (
          <div className="animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-slate-500 uppercase tracking-wider text-sm font-semibold">
                Detected Category: <span className="text-blue-600">{suggestionCtx.category}</span>
              </h3>
              <button
                onClick={handleSkip}
                className="text-slate-400 hover:text-slate-600 text-sm font-medium"
              >
                None of these
              </button>
            </div>

            <div className="grid gap-4">
              {suggestionCtx.words.map((word, idx) => (
                <button
                  key={`${word}-${idx}`}
                  onClick={() => handleManualSelect(word, idx)}
                  className="group relative w-full text-left p-8 bg-white border-2 border-slate-200 hover:border-blue-500 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-200 flex items-center justify-between"
                >
                  <span className="text-3xl md:text-4xl font-bold text-slate-800 group-hover:text-blue-700">
                    {word}
                  </span>
                  <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                    <svg className="w-6 h-6 text-slate-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-8 text-center text-slate-400 text-sm">
              Tap a word to select it, or simply say it out loud.
            </p>
          </div>
        )}
      </main>

      {/* Floating Action Bar (Sticky Bottom) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-slate-200 p-6 z-20">
        <div className="max-w-md mx-auto flex items-center justify-center">
          <button
            onClick={isRecording ? handleStopSession : handleStartSession}
            className={`
              relative flex items-center justify-center w-20 h-20 rounded-full shadow-lg transition-all duration-300
              ${isRecording
                ? 'bg-red-500 hover:bg-red-600 ring-4 ring-red-200 animate-pulse'
                : 'bg-blue-600 hover:bg-blue-700 ring-4 ring-blue-100 hover:scale-105'
              }
            `}
          >
            {isRecording ? (
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg>
            ) : (
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            )}
          </button>
        </div>



        <p className="text-center mt-3 text-sm font-medium text-slate-500">
          {isRecording ? "Listening..." : "Tap to Start"}
        </p>
      </div>

      {/* Report Modal */}
      {showReport && (
        <ReportView logs={logs} onClose={() => setShowReport(false)} />
      )}
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