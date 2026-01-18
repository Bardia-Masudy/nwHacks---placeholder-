from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import openrouter
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SuggestionRequest(BaseModel):
    transcript: str

@app.post("/suggest")
async def get_suggestions(request: SuggestionRequest):
    print(f"Received transcript: {request.transcript}")
    transcript = request.transcript.lower()
    
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
    
    return {
        "suggestions": [],
        "context_detected": False
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
