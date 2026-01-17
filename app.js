class SpeechApp {
    constructor() {
        this.recognition = null;
        this.isRecording = false;
        this.transcriptContainer = document.getElementById('transcript-container');
        this.statusIndicator = document.getElementById('status-indicator');
        this.toggleBtn = document.getElementById('toggle-record-btn');
        this.micIcon = document.getElementById('mic-icon');
        this.placeholder = document.getElementById('placeholder-text');
        this.clearBtn = document.getElementById('clear-btn');
        this.copyBtn = document.getElementById('copy-btn');
        this.suggestionContainer = null;
        this.createSuggestionUI();

        this.init();
    }

    init() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.showError("Your browser doesn't support the Web Speech API. Please use Chrome or Edge.");
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();

        // Configuration
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        // Event Bindings
        this.recognition.onstart = () => this.handleStart();
        this.recognition.onend = () => this.handleEnd();
        this.recognition.onresult = (event) => this.handleResult(event);
        this.recognition.onerror = (event) => this.handleError(event);

        // UI Event Listeners
        this.toggleBtn.addEventListener('click', () => this.toggleRecording());
        this.clearBtn.addEventListener('click', () => this.clearTranscript());
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
    }

    createSuggestionUI() {
        this.suggestionContainer = document.createElement('div');
        this.suggestionContainer.id = 'suggestion-container';
        this.suggestionContainer.classList.add('suggestion-container');
        this.suggestionContainer.innerHTML = '<h3>Suggestions</h3><div id="suggestions-list"></div>';
        this.transcriptContainer.parentNode.insertBefore(this.suggestionContainer, this.transcriptContainer.nextSibling);
    }

    toggleRecording() {
        if (this.isRecording) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    }

    handleStart() {
        this.isRecording = true;
        this.statusIndicator.textContent = "Adjusting to your voice...";
        setTimeout(() => {
            if (this.isRecording) this.statusIndicator.textContent = "Listening...";
        }, 1000);

        this.toggleBtn.textContent = "Stop Recording";
        this.toggleBtn.classList.add('recording');
        document.body.classList.add('recording');
    }

    handleEnd() {
        this.isRecording = false;
        this.statusIndicator.textContent = "Ready to listen";
        this.toggleBtn.textContent = "Start Recording";
        this.toggleBtn.classList.remove('recording');
        document.body.classList.remove('recording');
    }

    handleResult(event) {
        // We only want to process the new results
        // The API returns the entire session results in event.results if continuous=true
        // But we want to smartly append them to our DOM to allow user to scroll

        // Actually, let's clear interim results and rebuild the last part

        // Strategy: 
        // 1. Maintain a list of finalized elements.
        // 2. Have a single dynamic element for interim results.

        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                this.addFinalTranscript(event.results[i][0].transcript);
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        this.updateInterimTranscript(interimTranscript);
    }

    addFinalTranscript(text) {
        if (!text) return;

        this.ensurePlaceholderRemoved();

        const p = document.createElement('p');
        p.classList.add('transcript-line');
        p.textContent = text;

        // Remove the interim container momentarily to append final, then add interim back if needed
        const interim = document.getElementById('interim-result');
        if (interim) interim.remove();

        this.transcriptContainer.appendChild(p);
        this.scrollToBottom();
        this.fetchSuggestions(text);
    }

    async fetchSuggestions(text) {
        try {
            const response = await fetch('http://localhost:8000/suggest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ transcript: text }),
            });
            const data = await response.json();
            this.displaySuggestions(data.suggestions);
        } catch (err) {
            console.error('Failed to fetch suggestions', err);
        }
    }

    displaySuggestions(suggestions) {
        const list = document.getElementById('suggestions-list');
        if (!suggestions || suggestions.length === 0) {
            // list.innerHTML = '<p>No suggestions yet.</p>';
            return;
        }

        list.innerHTML = '';
        suggestions.forEach(word => {
            const span = document.createElement('span');
            span.classList.add('suggestion-chip');
            span.textContent = word;
            list.appendChild(span);
        });
    }

    updateInterimTranscript(text) {
        let interim = document.getElementById('interim-result');

        if (!text) {
            if (interim) interim.remove();
            return;
        }

        this.ensurePlaceholderRemoved();

        if (!interim) {
            interim = document.createElement('p');
            interim.id = 'interim-result';
            interim.classList.add('transcript-line', 'interim');
            this.transcriptContainer.appendChild(interim);
        }

        interim.textContent = text;
        this.scrollToBottom();
    }

    ensurePlaceholderRemoved() {
        if (this.placeholder && this.placeholder.parentNode) {
            this.placeholder.remove();
            this.placeholder = null; // Prevent re-querying
        }
    }

    handleError(event) {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
            this.showError("Microphone access denied. Please allow permissions.");
            this.isRecording = false;
            this.updateUIState();
        } else if (event.error === 'no-speech') {
            // Usually just means silence, ignore but maybe reset status
            return;
        } else {
            this.statusIndicator.textContent = `Error: ${event.error}`;
        }
    }

    clearTranscript() {
        this.transcriptContainer.innerHTML = '';
        // Add placeholder back
        const p = document.createElement('p');
        p.id = 'placeholder-text';
        p.textContent = 'Click the microphone to start transcribing...';
        this.transcriptContainer.appendChild(p);
        this.placeholder = p;
    }

    async copyToClipboard() {
        // Collect all text
        const lines = Array.from(this.transcriptContainer.querySelectorAll('.transcript-line'))
            .map(el => el.textContent)
            .join('\n');

        if (!lines) return;

        try {
            await navigator.clipboard.writeText(lines);
            const originalText = this.copyBtn.textContent;
            this.copyBtn.textContent = "Copied!";
            setTimeout(() => {
                this.copyBtn.textContent = originalText;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    }

    showError(msg) {
        this.statusIndicator.textContent = msg;
        this.statusIndicator.style.color = '#f43f5e';
    }

    scrollToBottom() {
        this.transcriptContainer.scrollTop = this.transcriptContainer.scrollHeight;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new SpeechApp();
});
