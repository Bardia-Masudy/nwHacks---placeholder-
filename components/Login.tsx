import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { AnimatePresence, motion } from 'framer-motion';
import { Github, Mail, Mic, ShieldCheck, Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import { auth, githubProvider, googleProvider } from '../services/firebase';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        try {
            setError(null);
            await signInWithPopup(auth, googleProvider);
        } catch (err: any) {
            console.error("Login failed", err);
            if (err.code === 'auth/invalid-api-key') {
                setError("Firebase setup incomplete. Please add your API keys.");
            } else if (err.code === 'auth/operation-not-allowed') {
                setError("Google Sign-In is disabled. Enable it in Firebase Console.");
            } else {
                setError(`Failed to sign in: ${err.message}`);
            }
        }
    };

    const handleGithubLogin = async () => {
        try {
            setError(null);
            await signInWithPopup(auth, githubProvider);
        } catch (err: any) {
            console.error("GitHub login failed", err);
            if (err.code === 'auth/operation-not-allowed') {
                setError("GitHub Sign-In is disabled. Enable it in Firebase Console.");
            } else {
                setError(`Failed to sign in with GitHub: ${err.message}`);
            }
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (isSignUp) {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err: any) {
            console.error("Email auth failed", err);
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError("Invalid email or password.");
            } else if (err.code === 'auth/email-already-in-use') {
                setError("This email is already registered.");
            } else if (err.code === 'auth/weak-password') {
                setError("Password should be at least 6 characters.");
            } else if (err.code === 'auth/operation-not-allowed') {
                setError("Email/Password Sign-In is disabled. Enable it in Firebase Console.");
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Animated Background Blobs - Adjusted for light theme */}
            <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
            <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md z-10"
            >
                <div className="bg-white/80 backdrop-blur-2xl border border-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden">
                    <div className="p-8 md:p-12">
                        <div className="flex flex-col items-center mb-6 md:mb-10">
                            <motion.div
                                whileHover={{ scale: 1.05, rotate: 5 }}
                                className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 shadow-xl shadow-blue-500/20"
                            >
                                <Mic className="w-6 h-6 md:w-8 md:h-8 text-white" />
                            </motion.div>
                            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                                {isSignUp ? 'Join Listen Me' : 'Welcome to Listen Me'}
                            </h2>
                            <p className="text-slate-500 text-center text-xs md:text-sm font-medium max-w-[280px]">
                                {isSignUp
                                    ? 'Start your journey to better speech today.'
                                    : 'A specialized speech assistant for individuals with Anomia.'}
                            </p>
                        </div>

                        <form onSubmit={handleEmailAuth} className="space-y-4 md:space-y-5">
                            <div className="space-y-1 md:space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="email"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-10 md:pl-12 pr-4 py-3 md:py-4 rounded-xl md:rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all placeholder:text-slate-400 font-medium text-sm md:text-base"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1 md:space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Password</label>
                                <div className="relative group">
                                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-10 md:pl-12 pr-4 py-3 md:py-4 rounded-xl md:rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all placeholder:text-slate-400 font-medium text-sm md:text-base"
                                    />
                                </div>
                            </div>

                            <AnimatePresence mode="wait">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-3 font-medium"
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={loading}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        {isSignUp ? 'Create Account' : 'Sign In'}
                                        <Sparkles className="w-4 h-4" />
                                    </>
                                )}
                            </motion.button>
                        </form>

                        <div className="relative my-10">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-100"></div>
                            </div>
                            <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em]">
                                <span className="px-4 bg-white text-slate-400 font-bold">Or continue with</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <motion.button
                                whileHover={{ scale: 1.02, backgroundColor: '#f8fafc' }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleGoogleLogin}
                                className="flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 font-bold py-3.5 px-4 rounded-2xl transition-all text-sm shadow-sm"
                            >
                                <img
                                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                                    alt="Google"
                                    className="w-5 h-5"
                                />
                                Google
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.02, backgroundColor: '#f8fafc' }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleGithubLogin}
                                className="flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 font-bold py-3.5 px-4 rounded-2xl transition-all text-sm shadow-sm"
                            >
                                <Github className="w-5 h-5" />
                                GitHub
                            </motion.button>
                        </div>

                        <p className="mt-10 text-center text-sm text-slate-500 font-medium">
                            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                            <button
                                onClick={() => setIsSignUp(!isSignUp)}
                                className="text-blue-600 font-bold hover:text-blue-700 transition-colors underline underline-offset-4"
                            >
                                {isSignUp ? 'Sign In' : 'Sign Up'}
                            </button>
                        </p>
                    </div>
                </div>

                <p className="mt-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                    This is not a licensed medical or therapy aid.
                </p>
            </motion.div>

            <style>{`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
            `}</style>
        </div>
    );
};

export default Login;
