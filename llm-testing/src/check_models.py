# src/check_models.py
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

print("--- Checking Available Gemini Models ---")
available_models = []
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(f"ID: {m.name} | Display Name: {m.display_name}")
        available_models.append(m.name)

print("\n--- Summary ---")
print(f"Total Models Found: {len(available_models)}")