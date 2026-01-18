from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import google.generativeai as genai
from fastapi.middleware.cors import CORSMiddleware

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

# Configure Gemini
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

class SuggestionRequest(BaseModel):
    transcript: str

@app.post("/suggest")
async def get_suggestions(request: SuggestionRequest):
    if not model:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
        
    transcript = request.transcript.lower()
    
    # Broad triggers for detection
    triggers = [
        "remember", "forgot", "what is", "what's", "that thing", 
        "looking for", "describe", "describing", "how do you say", 
        "it's a", "it is a", "um", "uh", "what was it", "name of",
        "word for", "called", "place for", "give me a"
    ]
    
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
            
            suggestions = [word.strip() for word in content.split(',')]
            
            return {
                "suggestions": suggestions[:3],
                "context_detected": True
            }
        except Exception as e:
            print(f"Error calling Gemini: {e}")
            return {
                "suggestions": ["Apple", "Apricot", "Avocado"] if "fruit" in transcript else ["Screwdriver", "Hammer", "Wrench"],
                "context_detected": True,
                "is_fallback": True
            }
    
    return {
        "suggestions": [],
        "context_detected": False
    }

@app.get("/")
async def root():
    return {"message": "Anomia Aid API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
