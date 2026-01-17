from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import json
import requests
import snowflake.connector
import sseclient
import os
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mocking st.secrets behavior for a standalone API
# In a real scenario, these should be environment variables or a config file
# For now, I'll try to read from a .secrets.toml if it exists, or use placeholders
# Since I don't have the actual secrets, I'll structure the code to use them if provided.

class SuggestionRequest(BaseModel):
    transcript: str

@app.post("/suggest")
async def get_suggestions(request: SuggestionRequest):
    # This is where the Snowflake Cortex logic would go.
    # For the purpose of this demonstration and since I don't have the actual Snowflake credentials,
    # I will implement a logic that simulates the "Word Finder" behavior:
    # If the transcript contains "um", "uh", or "that thing", it suggests words.
    
    transcript = request.transcript.lower()
    
    # Simple heuristic for "can't remember"
    triggers = ["can't remember", "forgot the name", "what is it called", "that thing", "um", "uh"]
    
    if any(trigger in transcript for trigger in triggers):
        # In a real app, you'd send the transcript to Snowflake Cortex (Claude-3-5-sonnet)
        # with a prompt like: "The user is trying to remember a word. Based on this context: '{transcript}', what words are they looking for?"
        
        # Simulating a response for now
        return {
            "suggestions": ["Screwdriver", "Hammer", "Wrench"],
            "context_detected": True
        }
    
    return {
        "suggestions": [],
        "context_detected": False
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
