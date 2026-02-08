import os
from src.models import GeminiModel, MultiAgentSUT, OllamaModel

def get_model(role):
    m_type = os.getenv(f"{role}_MODEL_TYPE", "OLLAMA").upper()
    m_name = os.getenv(f"{role}_MODEL_NAME")
    base_url = os.getenv(f"{role}_BASE_URL") or os.getenv("SUT_BASE_URL")

    if m_type == "GEMINI":
        return GeminiModel(model_name=m_name)
    
    elif m_type == "OLLAMA":
        return OllamaModel(model_name=m_name, base_url=base_url)
    
    elif m_type == "MULTI_AGENT":
        return MultiAgentSUT(
            model_name=m_name,
            base_url=base_url,
            endpoint=os.getenv("SUT_ENDPOINT", "/analyze"),
            api_key=os.getenv("SUT_API_KEY")
        )
    else:
        raise ValueError(f"Unknown model type: {m_type}")