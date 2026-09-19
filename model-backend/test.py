import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()
print("KEY prefix:", os.getenv("GROQ_API_KEY")[:10])
print("MODEL:", os.getenv("GROQ_MODEL"))

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
resp = client.chat.completions.create(
    model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
    messages=[{"role": "user", "content": "Say hello"}],
    temperature=0.0,
)
print("OK, got:", resp.choices[0].message.content)