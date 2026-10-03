import re
import unicodedata
from pathlib import Path

import joblib
import torch

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"

LANGUAGE_MODEL_PATH = MODELS_DIR / "language_model.pkl"
VECTORIZER_PATH = MODELS_DIR / "tfidf_vectorizer.pkl"


# ============================================================
# NLLB
# ============================================================

NLLB_MODEL = "facebook/nllb-200-distilled-600M"

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


# ============================================================
# LANGUAGE CODES
# ============================================================

LANGUAGE_CODES = {
    "English": "eng_Latn",
    "Hindi": "hin_Deva",
    "French": "fra_Latn",
    "German": "deu_Latn",

    "Spanish": "spa_Latn",
    "Spanish (South America)": "spa_Latn",

    "Portuguese (Brazil)": "por_Latn",
    "Portuguese (EU)": "por_Latn",

    "Danish": "dan_Latn",
    "Indonesian": "ind_Latn",
    "Korean": "kor_Hang",
    "Finnish": "fin_Latn",
    "Polish": "pol_Latn",
    "Turkish": "tur_Latn",
    "Malay": "zsm_Latn",
    "Swedish": "swe_Latn",
    "Latvian": "lvs_Latn",
    "Japanese": "jpn_Jpan",
    "Farsi": "pes_Arab",
    "Ukranian": "ukr_Cyrl",
    "Chinese (Simplified)": "zho_Hans",
    "Chinese (Traditional)": "zho_Hant",
    "Norwegian (Bokmal)": "nob_Latn",
}


TARGET_LANGUAGES = {
    "Hindi": "hin_Deva",
    "English": "eng_Latn",
    "French": "fra_Latn",
    "Spanish": "spa_Latn",
    "German": "deu_Latn",
    "Japanese": "jpn_Jpan",
    "Korean": "kor_Hang",
    "Russian": "rus_Cyrl",
    "Chinese": "zho_Hans",
    "Portuguese": "por_Latn",
    "Turkish": "tur_Latn",
}


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="LinguaAI API",
    description="AI powered language detection and multilingual translation",
    version="2.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# LOAD ML MODEL
# ============================================================

print("Loading language detection model...")

if not LANGUAGE_MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Missing model: {LANGUAGE_MODEL_PATH}"
    )

if not VECTORIZER_PATH.exists():
    raise FileNotFoundError(
        f"Missing vectorizer: {VECTORIZER_PATH}"
    )

language_model = joblib.load(
    LANGUAGE_MODEL_PATH
)

tfidf_vectorizer = joblib.load(
    VECTORIZER_PATH
)

print("Language detection model loaded.")


# ============================================================
# LOAD NLLB
# ============================================================

print("Loading NLLB model...")
print(f"Device: {DEVICE}")

tokenizer = AutoTokenizer.from_pretrained(
    NLLB_MODEL
)

translation_model = AutoModelForSeq2SeqLM.from_pretrained(
    NLLB_MODEL
)

translation_model.to(DEVICE)
translation_model.eval()

print("NLLB model loaded.")


# ============================================================
# REQUEST SCHEMA
# ============================================================

class TranslationRequest(BaseModel):

    text: str = Field(
        ...,
        min_length=1,
        max_length=2000
    )

    target_language: str


# ============================================================
# PREPROCESSING
# ============================================================

def preprocess_text(text: str) -> str:

    text = str(text)

    text = unicodedata.normalize(
        "NFC",
        text
    )

    text = re.sub(
        r"https?://\S+|www\.\S+",
        "",
        text
    )

    text = re.sub(
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
        "",
        text
    )

    text = re.sub(
        r"<[^>]+>",
        "",
        text
    )

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


# ============================================================
# CONFIDENCE LEVEL
# ============================================================

def get_confidence_level(confidence):

    if confidence is None:
        return "Unknown"

    if confidence >= 0.80:
        return "High"

    if confidence >= 0.50:
        return "Medium"

    return "Low"


# ============================================================
# LANGUAGE DETECTION
# ============================================================

def detect_language(text):

    cleaned = preprocess_text(text)

    if not cleaned:
        raise ValueError(
            "Text is empty."
        )

    features = tfidf_vectorizer.transform(
        [cleaned]
    )

    prediction = language_model.predict(
        features
    )[0]

    confidence = None

    if hasattr(
        language_model,
        "predict_proba"
    ):

        probabilities = (
            language_model
            .predict_proba(features)[0]
        )

        confidence = float(
            probabilities.max()
        )

    return (
        prediction,
        confidence
    )


# ============================================================
# TRANSLATION
# ============================================================

def translate_text(
    text,
    source_language,
    target_language
):

    if source_language not in LANGUAGE_CODES:

        raise ValueError(
            f"Unsupported source language: "
            f"{source_language}"
        )

    if target_language not in TARGET_LANGUAGES:

        raise ValueError(
            f"Unsupported target language: "
            f"{target_language}"
        )

    source_code = LANGUAGE_CODES[
        source_language
    ]

    target_code = TARGET_LANGUAGES[
        target_language
    ]

    # Same language
    if source_code == target_code:
        return text

    tokenizer.src_lang = source_code

    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=512
    )

    inputs = {
        key: value.to(DEVICE)
        for key, value in inputs.items()
    }

    target_token_id = (
        tokenizer.convert_tokens_to_ids(
            target_code
        )
    )

    with torch.inference_mode():

        output_tokens = (
            translation_model.generate(
                **inputs,
                forced_bos_token_id=target_token_id,
                max_length=512,
                num_beams=4,
                early_stopping=True
            )
        )

    result = tokenizer.batch_decode(
        output_tokens,
        skip_special_tokens=True
    )[0]

    return result.strip()


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "status": "online",
        "message": "LinguaAI API",
        "version": "2.0.0"
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/api/health")
def health():

    return {
        "status": "healthy",
        "language_model": "loaded",
        "translation_model": NLLB_MODEL,
        "device": DEVICE
    }


# ============================================================
# LANGUAGES
# ============================================================

@app.get("/api/languages")
def get_languages():

    return {
        "languages": list(
            TARGET_LANGUAGES.keys()
        )
    }


# ============================================================
# DETECT API
# ============================================================

@app.post("/api/detect")
def detect(request: TranslationRequest):

    text = preprocess_text(
        request.text
    )

    if not text:

        raise HTTPException(
            status_code=400,
            detail="Please enter valid text."
        )

    try:

        language, confidence = (
            detect_language(text)
        )

        level = get_confidence_level(
            confidence
        )

        warning = None

        if len(text) < 20:

            warning = (
                "Short text may reduce "
                "language-detection accuracy."
            )

        return {
            "success": True,
            "detected_language": language,
            "confidence": confidence,
            "confidence_level": level,
            "warning": warning
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# ============================================================
# TRANSLATE API
# ============================================================

@app.post("/api/translate")
def translate(request: TranslationRequest):

    text = preprocess_text(
        request.text
    )

    if not text:

        raise HTTPException(
            status_code=400,
            detail="Please enter some text."
        )

    if request.target_language not in TARGET_LANGUAGES:

        raise HTTPException(
            status_code=400,
            detail="Unsupported target language."
        )

    try:

        # ---------------------------------------------
        # DETECT
        # ---------------------------------------------

        detected_language, confidence = (
            detect_language(text)
        )

        confidence_level = (
            get_confidence_level(
                confidence
            )
        )

        # ---------------------------------------------
        # WARNING
        # ---------------------------------------------

        warning = None

        if len(text) < 20:

            warning = (
                "Short text may reduce "
                "language-detection accuracy."
            )

        # ---------------------------------------------
        # TRANSLATE
        # ---------------------------------------------

        translated = translate_text(
            text=text,
            source_language=detected_language,
            target_language=request.target_language
        )

        return {
            "success": True,
            "input": text,
            "detected_language": detected_language,
            "confidence": confidence,
            "confidence_level": confidence_level,
            "target_language": request.target_language,
            "translation": translated,
            "warning": warning
        }

    except Exception as error:

        print(
            "Translation error:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        reload=False
    )