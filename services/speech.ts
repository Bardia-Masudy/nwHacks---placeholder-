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

        if ('webkitSpeechRecognition' in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

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
                }
            };

            this.recognition.onend = () => {
                if (this.shouldRestart && this.isListening) {
                    try {
                        this.recognition.start();
                    } catch (e) {
                        // Ignore if already started
                    }
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
