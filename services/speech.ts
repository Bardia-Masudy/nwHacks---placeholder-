export class SpeechService {
    private recognition: any; // webkitSpeechRecognition
    private isListening: boolean = false;
    private onResult: (text: string, isFinal: boolean) => void;
    private onError: (error: string) => void;
    private shouldRestart: boolean = false;

    constructor(
        onResult: (text: string, isFinal: boolean) => void,
        onError: (error: string) => void
    ) {
        this.onResult = onResult;
        this.onError = onError;

        // Support both standard and webkit prefixed API (Android Chrome vs iOS Safari)
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
            this.recognition.maxAlternatives = 1; // Improves Android compatibility

            this.recognition.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                if (finalTranscript) {
                    this.onResult(finalTranscript, true);
                }
                if (interimTranscript) {
                    this.onResult(interimTranscript, false);
                }
            };

            this.recognition.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                if (event.error === 'not-allowed') {
                    this.onError("Microphone access denied.");
                    this.shouldRestart = false;
                } else if (event.error === 'network') {
                    // Network errors are common on Android, just log and continue
                    console.warn("Network error in speech recognition, will retry automatically");
                } else if (event.error === 'no-speech') {
                    // Silence is normal, don't treat as error
                    console.log("No speech detected, continuing to listen");
                } else if (event.error === 'aborted') {
                    // Aborted is common during restarts, ignore
                    console.log("Speech recognition aborted, will restart if needed");
                }
            };

            this.recognition.onend = () => {
                if (this.shouldRestart && this.isListening) {
                    // Add delay before restarting - critical for Android Chrome stability
                    setTimeout(() => {
                        try {
                            this.recognition.start();
                        } catch (e) {
                            console.error("Failed to restart speech recognition:", e);
                        }
                    }, 200); // 200ms delay helps Android handle restart
                } else {
                    this.isListening = false;
                }
            };
        } else {
            this.onError("Speech recognition not supported in this browser.");
        }
    }

    start() {
        if (this.recognition && !this.isListening) {
            try {
                this.shouldRestart = true;
                this.recognition.start();
                this.isListening = true;
            } catch (e) {
                console.error("Failed to start speech recognition", e);
            }
        }
    }

    stop() {
        if (this.recognition) {
            this.shouldRestart = false;
            this.isListening = false;
            this.recognition.stop();
        }
    }
}
