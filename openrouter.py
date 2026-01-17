import requests
from secrets import keys

API_KEY = keys()
MODEL = "tngtech/deepseek-r1t2-chimera:free"
PROMPT = "It's a red fruit and starts with an a"

response = requests.post(
    'https://openrouter.ai/api/v1/responses',
    headers={
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json',
    },
    json={
        'model': MODEL,
        'input': f'Take a moment to think, then provide three single word answers. All other information will be ignored! Do not include any other details in your response. Provide the word being described by the prompt: {PROMPT}',
        'reasoning': {
            'effort': 'low'
        },
        'max_output_tokens': 1000,
    }
)
result = response.json()
print(result)