import requests
import json
from secrets import keys

API_KEY = keys()
MODEL = "deepseek/deepseek-r1-0528:free"
PROMPT = "It's a red fruit and starts with an a"

response = requests.post(
    'https://openrouter.ai/api/v1/responses',
    headers={
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json',
    },
    json={
        'model': MODEL,
        'input': f'Take a moment to think, then provide three unique single word answers. All other information will be ignored! Do not include any other details in your response. Provide the word being described by the prompt: {PROMPT}',
        'reasoning': {
            'effort': 'low'
        },
        'max_output_tokens': 1000,
    }
)
result = response.json()

if result['error'] == None:
    for item in result['output']:
        if item['type'] == 'message':
            print(f'{item['content']['text']}\n\n')
            break
    else:
        print("No output text found.")
else:
    print(result['error']['message'])