import requests
from secrets import keys

class OpenRouterClient():
    def __init__(self):
        self.api_key = keys()
        self.url = "https://openrouter.ai/api/v1/chat/completions"
        self.model = "deepseek/deepseek-r1-0528:free"
    
    def _get_choice_text(choice):
        return choice["message"]["content"]

    def _get_headers(self):
        headers = {
        'Authorization': f'Bearer {self.api_key}',
        'Content-Type': 'application/json',
        }
        return headers
    
    def request(self, prompt: str):
        headers = self._get_headers()
        data = {
            'model': self.model,
            'messages': [
                {'role': 'user', 'content': f'Take a moment to think, then provide three unique one word answers. All other information will be ignored! Do not include any other details in your response. Provide the word being described by the prompt: {prompt}'},
            ],
            'reasoning': {
                "effort": "xhigh", # Can be "xhigh", "high", "medium", "low", "minimal" or "none"
                "exclude": True # Set to true to exclude reasoning tokens from response
            },
            'max_output_tokens': 1000
        }

        response = requests.post(self.url, headers=headers, json=data)
        response_data = response.json()

        if response.status_code == 200:
            output = response_data['choices'][0]['message']['content'].lower()
            if output == "":
                return f'Output Missing: {response_data}'
            return output
        else:
            return f'Error: {response_data}'
        

    
    def __call__(self, prompt):
        response_data = self.request(prompt)
        # completions = [choice['message']['content'] for choice in response_data.get("choices", [])]
        print(response_data)


if __name__ == "__main__":
    machine = OpenRouterClient()
    machine("Hot drink morning bean water")