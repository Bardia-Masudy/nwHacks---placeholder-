import {
    GoogleGenAI,
    Session,
    LiveServerMessage,
    Modality,
    FunctionDeclaration,
    Type,
} from "@google/genai";
import { createPCMBlob, decodeBase64, decodeAudioData, outputAudioContextOptions, audioContextOptions } from "../utils/audio";

// Tool Definitions
const provideSuggestionsTool: FunctionDeclaration = {
    name: "provideSuggestions",
    description: "Call this tool when the user is describing a word but cannot retrieve it (anomia). Provide 3 distinct noun suggestions and a general category.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            words: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "An array of exactly 3 likely words the user is trying to find.",
            },
            category: {
                type: Type.STRING,
                description: "The semantic category of the words (e.g., 'Animals', 'Tools', 'Food').",
            },
        },
        required: ["words", "category"],
    },
};

const confirmSelectionTool: FunctionDeclaration = {
    name: "confirmSelection",
    description: "Call this tool when the user successfully speaks one of the previously suggested words.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            word: {
                type: Type.STRING,
                description: "The specific word the user selected/spoke.",
            },
        },
        required: ["word"],
    },
};

const rejectSelectionTool: FunctionDeclaration = {
    name: "rejectSelection",
    description: "Call this tool when the user rejects the provided suggestions or talks past them.",
    parameters: {
        type: Type.NULL,
    },
};

interface GeminiServiceProps {
    onSuggestions: (words: string[], category: string) => void;
    onConfirmedWord: (word: string) => void;
    onRejectWord: () => void;
    onTranscriptUpdate: (text: string) => void;
    onError: (error: string) => void;
}

export class GeminiService {
    private ai: GoogleGenAI;
    private session: Session | null = null;
    private inputAudioContext: AudioContext | null = null;
    private scriptProcessor: ScriptProcessorNode | null = null;
    private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
    private props: GeminiServiceProps;
    private currentStream: MediaStream | null = null;

    constructor(props: GeminiServiceProps) {
        this.props = props;
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            console.error("API Key not found in environment");
        }
        this.ai = new GoogleGenAI({ apiKey: apiKey || "" });
    }

    async connect() {
        try {
            this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)(audioContextOptions);

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("Microphone access is not supported. Please ensure you are using a secure connection (HTTPS or localhost) and a supported browser.");
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.currentStream = stream;

            const sessionPromise = this.ai.live.connect({
                model: "gemini-2.5-flash-native-audio-preview-12-2025",
                config: {
                    responseModalities: [Modality.AUDIO],
                    systemInstruction: `You are an empathetic Speech Language Pathology assistant for a person with Anomic Aphasia.
                        Your main task is to listen to the user and identify when they are struggling to find a specific word (they might describe it, use circumlocution, or pause).

                        Protocol:
                        1. If you detect Anomia (description instead of the noun) or when the user says "okay", "please", "now", immediately call the function 'provideSuggestions' with 3 guesses and a Category.
                        2. After offering suggestions, if the user says one of those words, call 'confirmSelection' with that word.
                        3. If the user continues talking without acknowledging one of your suggestions, call 'rejectSelection'.`,
                    tools: [{ functionDeclarations: [provideSuggestionsTool, confirmSelectionTool, rejectSelectionTool] }],
                },
                callbacks: {
                    onopen: () => {
                        console.log("Gemini Live Connected");
                        this.startAudioInput(stream, sessionPromise);
                    },
                    onmessage: (msg) => this.handleMessage(msg, sessionPromise),
                    onclose: () => console.log("Gemini Live Closed"),
                    onerror: (err) => this.props.onError(err.message),
                },
            });

            this.session = await sessionPromise;

        } catch (error: any) {
            this.props.onError(error.message || "Failed to connect to Gemini Live");
        }
    }

    private startAudioInput(stream: MediaStream, sessionPromise: Promise<Session>) {
        if (!this.inputAudioContext) return;

        this.mediaStreamSource = this.inputAudioContext.createMediaStreamSource(stream);
        // Buffer size 4096 is a balance between latency and processing overhead
        this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

        this.scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const blob = createPCMBlob(inputData);

            sessionPromise.then(session => {
                session.sendRealtimeInput({ media: blob });
            });
        };

        this.mediaStreamSource.connect(this.scriptProcessor);
        this.scriptProcessor.connect(this.inputAudioContext.destination);
    }

    private async handleMessage(message: LiveServerMessage, sessionPromise: Promise<Session>) {
        // Handle Tool Calls
        const toolCall = message.toolCall;
        if (toolCall) {
            const responses: any[] = [];

            for (const fc of toolCall.functionCalls) {
                if (fc.name === "provideSuggestions") {
                    const args = fc.args as { words: string[], category: string };
                    this.props.onSuggestions(args.words, args.category);
                    responses.push({
                        id: fc.id,
                        name: fc.name,
                        response: { result: "Suggestions displayed to user." }
                    });
                } else if (fc.name === "confirmSelection") {
                    const args = fc.args as { word: string };
                    this.props.onConfirmedWord(args.word);
                    responses.push({
                        id: fc.id,
                        name: fc.name,
                        response: { result: "Word confirmed and logged." }
                    });
                } else if (fc.name === "rejectSelection") {
                    this.props.onRejectWord();
                    responses.push({
                        id: fc.id,
                        name: fc.name,
                        response: { result: "Suggestions rejected." }
                    });
                }
            }

            if (responses.length > 0) {
                sessionPromise.then(session => {
                    session.sendToolResponse({
                        functionResponses: responses as any
                    });
                });
            }
        }
    }

    async disconnect() {
        if (this.session) {
            // No explicit close method on session object in this SDK version usually, 
            // but we stop streams. 
            // Depending on SDK version, might have .close(). 
            // Using stream cleanup to effectively end usage.
        }

        if (this.scriptProcessor) {
            this.scriptProcessor.disconnect();
            this.scriptProcessor = null;
        }
        if (this.mediaStreamSource) {
            this.mediaStreamSource.disconnect();
            this.mediaStreamSource = null;
        }
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
        if (this.inputAudioContext) {
            await this.inputAudioContext.close();
            this.inputAudioContext = null;
        }
    }
}