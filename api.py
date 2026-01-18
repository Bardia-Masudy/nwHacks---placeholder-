from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import openrouter
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

<<<<<<< HEAD
# Configure Gemini
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

=======
>>>>>>> 04e9ff19073840e8ed30be4b2c2e0f8c55deb483
class SuggestionRequest(BaseModel):
    transcript: str

@app.post("/suggest")
async def get_suggestions(request: SuggestionRequest):
<<<<<<< HEAD
=======
    print(f"Received transcript: {request.transcript}")
>>>>>>> 04e9ff19073840e8ed30be4b2c2e0f8c55deb483
    transcript = request.transcript.lower()
    print(f"Received transcript: {transcript}")
    
<<<<<<< HEAD
    # Much broader triggers for better detection
    triggers = [
        "remember", "forgot", "what is", "what's", "that thing", 
        "looking for", "describe", "describing", "how do you say", 
        "it's a", "it is a", "um", "uh", "what was it", "name of",
        "word for", "called", "place for", "give me a",
    ]
    
    # Trigger if a keyword is found OR if the transcript is long enough to be a description
    if any(trigger in transcript for trigger in triggers) or len(transcript) > 40:
        try:
            prompt = (
                f"The user is describing something they can't remember. "
                f"Context: '{transcript}'. "
                f"Provide 3 single-word suggestions for what they might be thinking of. "
                f"Return ONLY the words separated by commas. No other text."
            )
            
            response = model.generate_content(prompt)
            content = response.text.strip()
            
            print(f"Gemini Content: {content}")
            suggestions = [word.strip() for word in content.split(',')]
            
            return {
                "suggestions": suggestions[:3],
                "context_detected": True
            }
        except Exception as e:
            print(f"Error calling Gemini: {e}")
            # Fallback to mock suggestions for demonstration
            mock_suggestions = ["Apple", "Apricot", "Avocado"] if "fruit" in transcript else ["Screwdriver", "Hammer", "Wrench"]
            return {
                "suggestions": mock_suggestions,
                "context_detected": True,
                "is_fallback": True
            }
=======
    triggers = ["can't remember", "forgot the name", "what is it called", "that thing", "um", "uh"]
    
    # Check if any trigger phrase is in the transcript
    if any(trigger in transcript for trigger in triggers):
        # Call OpenRouter API
        print(f"Trigger detected in transcript context: {transcript}")
        # We pass the full transcript as the prompt context
        suggestions = openrouter.get_openrouter_suggestions(transcript)
        
        return {
            "suggestions": suggestions,
            "context_detected": True
        }
>>>>>>> 04e9ff19073840e8ed30be4b2c2e0f8c55deb483
    
    return {
        "suggestions": [],
        "context_detected": False
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
