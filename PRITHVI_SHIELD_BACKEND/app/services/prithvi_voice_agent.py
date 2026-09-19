"""
PRITHVI SHIELD - PRITHVI AI Voice Agent
Safety Assistant Persona, System Prompt, Multilingual Handling & Context Memory.
"""

import os
import re
import logging
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("prithvi.agent")

# Official System Prompt for PRITHVI AI Safety Assistant
PRITHVI_SYSTEM_PROMPT = """You are PRITHVI, the AI Safety Assistant for the PRITHVI-SHIELD citizen application.
Your job is to communicate with citizens through natural voice conversation.
Speak clearly, naturally, and concisely.
Use simple language that ordinary citizens can understand.
You can communicate in the language selected by the citizen.
Supported languages include English, Hindi, and Marathi.
If the citizen speaks Hindi, respond in Hindi.
If the citizen speaks Marathi, respond in Marathi.
If the citizen speaks English, respond in English.
Do not unnecessarily switch languages during a conversation.
You are a safety assistant, not a general-purpose conversational companion.
When citizens ask safety-related questions, provide clear and practical guidance.
Never invent information.
Never claim that you have access to information, services, or actions that have not actually been provided to you.
If required information is unavailable, clearly say that you cannot access it at the moment.
During an emergency, keep responses short and actionable.
Do not overwhelm the citizen with long explanations.
If a citizen appears to be in immediate danger, prioritize immediate safety guidance and encourage them to contact appropriate emergency services (such as 112 or local disaster control) when necessary.
Do not provide dangerous, speculative, or unverified instructions.
Keep all spoken responses concise (one to two clear sentences) so they sound natural and reassuring when converted to speech.
Avoid markdown bullets, emojis, or symbols in spoken replies."""


class PrithviVoiceAgent:
    """
    PRITHVI - AI Safety Assistant Engine.
    Handles safety dialogue, language detection, and context memory.
    """

    def __init__(self):
        self.system_prompt = PRITHVI_SYSTEM_PROMPT

    def detect_language(self, text: str, fallback_language: str = "en") -> str:
        """
        Detect whether citizen is speaking English, Hindi, or Marathi from text/transcript.
        Looks for Devanagari script markers and distinct Hindi/Marathi vocabulary.
        """
        if not text or not text.strip():
            return fallback_language

        clean = text.strip().lower()

        # Check for Marathi-specific markers (vocabulary / characters)
        marathi_markers = [
            "आहे", "नाही", "काय", "कसे", "कुठे", "करावे", "मला", "तुम्ही", "सांगा",
            "मदत", "धोका", "सुरक्षित", "रस्ता", "पाऊस", "दरड", "डोंगर", "घर",
            "namaskar", "ahe", "nahi", "kay", "kase", "kuthe", "krava", "mala", "darad"
        ]
        # Check for Hindi-specific markers
        hindi_markers = [
            "है", "हैं", "क्या", "कहाँ", "कैसे", "करना", "मुझे", "आप", "बताइए",
            "मदद", "खतरा", "सुरक्षित", "रास्ता", "बारिश", "भूस्खलन", "पहाड़", "घर",
            "namaste", "hai", "hain", "kya", "kahan", "kaise", "karna", "mujhe", "bataiye", "bhooskhalan"
        ]

        # Check for explicit Devanagari script presence
        has_devanagari = bool(re.search(r"[\u0900-\u097F]", text))

        if has_devanagari:
            # Differentiate Hindi vs Marathi in Devanagari
            marathi_score = sum(1 for m in marathi_markers[:15] if m in text)
            hindi_score = sum(1 for m in hindi_markers[:15] if m in text)
            # Marathi 'ळ' character check
            if "ळ" in text or marathi_score > hindi_score:
                return "mr"
            if hindi_score >= marathi_score:
                return "hi"

        # Check Romanized Hinglish / Marathi words
        words = set(re.findall(r"\b\w+\b", clean))
        marathi_roman_hits = sum(1 for m in marathi_markers[15:] if m in words)
        hindi_roman_hits = sum(1 for m in hindi_markers[15:] if m in words)

        if marathi_roman_hits > hindi_roman_hits:
            return "mr"
        elif hindi_roman_hits > 0:
            return "hi"

        # Default to selected session language if primarily English/Latin words
        return fallback_language

    def generate_response(
        self,
        user_text: str,
        session_history: List[Dict[str, str]],
        session_language: str = "en",
    ) -> Tuple[str, str]:
        """
        Generate PRITHVI's safety response and determine the output language.
        Returns: (response_text, effective_language)
        """
        # Detect natural spoken language or respect selected session language
        detected_lang = self.detect_language(user_text, fallback_language=session_language)
        effective_lang = detected_lang if detected_lang in ("hi", "mr") else session_language

        # Check if OpenAI or external LLM API key is available
        openai_key = os.getenv("OPENAI_API_KEY", "").strip()
        if openai_key:
            try:
                response = self._query_llm(user_text, session_history, effective_lang, openai_key)
                if response:
                    return response, effective_lang
            except Exception as e:
                logger.warning(f"[PRITHVI Agent] LLM query failed, falling back to safety engine: {e}")

        # PRITHVI Grounded Safety Reasoning Engine (Deterministic, safe, emergency-aware)
        response = self._safety_reasoning_engine(user_text, session_history, effective_lang)
        return response, effective_lang

    def _query_llm(
        self,
        user_text: str,
        history: List[Dict[str, str]],
        language: str,
        api_key: str
    ) -> Optional[str]:
        """Query OpenAI API if credentials are provided."""
        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key)

            lang_instructions = {
                "hi": "The citizen is speaking Hindi. You must reply strictly in Hindi (Devanagari script).",
                "mr": "The citizen is speaking Marathi. You must reply strictly in Marathi (Devanagari script).",
                "en": "The citizen is speaking English. Reply strictly in clear English.",
            }

            messages = [
                {"role": "system", "content": f"{self.system_prompt}\n\n{lang_instructions.get(language, '')}"}
            ]

            # Add recent session history (sliding window up to 6 turns)
            for turn in history[-6:]:
                messages.append({"role": turn.get("role", "user"), "content": turn.get("content", "")})

            messages.append({"role": "user", "content": user_text})

            completion = client.chat.completions.create(
                model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                messages=messages,
                max_tokens=150,
                temperature=0.3,
            )
            return completion.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"[LLM Error] {e}")
            return None

    def _safety_reasoning_engine(
        self,
        user_text: str,
        history: List[Dict[str, str]],
        language: str
    ) -> str:
        """
        PRITHVI Grounded Safety Knowledge Engine.
        Provides calm, verified, concise emergency and landslide risk assistance.
        """
        q = user_text.lower().strip()

        # Find recent topic from history if q is a vague follow-up (e.g., "what should I do?")
        context_text = " ".join([h.get("content", "").lower() for h in history[-4:]]) if history else ""

        is_imminent_danger = any(w in q for w in ["emergency", "danger", "trapped", "stuck", "bache", "bachao", "वाचवा", "तातडीने", "संकट", "खतरा", "फंस गया"])
        is_general_help = any(phrase in q for phrase in ["can you help me", "help me", "need help", "मदत हवी आहे", "मदद चाहिए", "सहायता चाहिए"]) and not is_imminent_danger
        is_shelter = any(w in q for w in ["shelter", "evacuation", "relief camp", "kahan jaun", "kuthe jau", "आश्रय", "शिबीर", "कहाँ जाऊं", "सुरक्षित जागा"])
        is_safety_tips = any(w in q or w in context_text for w in ["what should i do", "what to do", "tips", "precaution", "landslide", "bhooskhalan", "darad", "दरड", "भूस्खलन", "काय करावे", "क्या करूं"])
        is_report = any(w in q for w in ["report", "crack", "rockfall", "mud", "photo", "तक्रार", "भेग", "दगड", "शिकायत"])
        is_safe_query = any(w in q for w in ["is my area safe", "am i safe", "risk", "surakshit", "dhoka", "धोका", "सुरक्षित आहे का", "क्या सुरक्षित है"])
        is_greeting = any(w in q for w in ["hello", "hi", "hey", "namaste", "namaskar", "नमस्ते", "नमस्कार"])

        # ---------------- HINDI RESPONSES ----------------
        if language == "hi":
            if is_imminent_danger:
                return "तुरंत ढलान और नदी नालों से दूर ऊँचे व पक्के स्थान पर पहुँचें। यदि आप खतरे में हैं, तो तत्काल 112 पर कॉल करें।"
            elif is_general_help:
                return "हाँ, बिल्कुल। मैं आपकी क्या सहायता कर सकता हूँ?"
            elif is_shelter:
                return "निकटतम नागरिक आश्रय केंद्र उपलब्ध है। मुख्य सड़क मार्ग से सुरक्षित रूप से वहाँ पहुँचें और पहाड़ी ढलानों से बचें।"
            elif is_safety_tips:
                return "भूस्खलन के दौरान खड़ी ढलानों और जलभराव वाले रास्तों से बचें। असामान्य गड़गड़ाहट या पत्थरों के खिसकने पर तुरंत ऊँचाई की ओर बढ़ें।"
            elif is_report:
                return "पृथ्वी शील्ड ऐप के रिपोर्ट सेक्शन में जाकर आप सड़क की दरार या मलबे की फोटो और जीपीएस लोकेशन दर्ज कर सकते हैं।"
            elif is_safe_query:
                return "आपके क्षेत्र में भारी वर्षा के कारण ढलान वाले क्षेत्रों में सावधानी आवश्यक है। जलभराव वाली ढलानों से दूर रहें।"
            elif is_greeting:
                return "नमस्ते, मैं पृथ्वी हूँ, आपका AI सुरक्षा सहायक। अपनी सुरक्षा या भूस्खलन संबंधी किसी भी सहायता के लिए पूछें।"
            else:
                return "मैं आपकी सुरक्षा के लिए उपस्थित हूँ। क्या आपको आपातकालीन सहायता, सुरक्षित मार्ग, या भूस्खलन सुरक्षा के बारे में जानकारी चाहिए?"

        # ---------------- MARATHI RESPONSES ----------------
        elif language == "mr":
            if is_imminent_danger:
                return "तातडीने डोंगराळ उतारावरून दूर उंच आणि सुरक्षित ठिकाणी जा. तातडीच्या मदतीसाठी ११२ किंवा आपत्ती व्यवस्थापनाशी संपर्क साधा."
            elif is_general_help:
                return "होय नक्कीच, सुरक्षेबाबत मी आपल्याला काय मदत करू?"
            elif is_shelter:
                return "जवळचे सुरक्षित नागरिक निवारा केंद्र उपलब्ध आहे. उतारावरील रस्ते टाळून मुख्य रस्त्यावरून सुरक्षित स्थळी पोहोचा."
            elif is_safety_tips:
                return "दरड कोसळण्याच्या धोक्यात उतारावरून तत्काळ दूर व्हा आणि झाडांच्या हालचालींवर लक्ष ठेवा. वाहते पाणी असलेल्या रस्त्यांवरून जाणे टाळा."
            elif is_report:
                return "पृथ्वी शील्ड ॲपमधील 'तक्रार नोंदवा' टॅबमधून आपण जमिनीतील भेगा किंवा दगड पडल्याचे फोटो आणि लोकेशन नोंदवू शकता."
            elif is_safe_query:
                return "सततच्या पावसामुळे डोंगराळ भागात दरड कोसळण्याचा धोका संभवतो. कृपया सतर्क राहा आणि धोकादायक उतारांजवळ जाऊ नका."
            elif is_greeting:
                return "नमस्कार, मी पृथ्वी, आपला AI सुरक्षा सहाय्यक. सुरक्षिततेबाबत आपल्याला काय मदत हवी आहे?"
            else:
                return "मी आपल्या सेवेसाठी तत्पर आहे. आपत्कालीन मदत, सुरक्षित निवारा किंवा दरड सुरक्षेविषयी मला विचारू शकता."

        # ---------------- ENGLISH RESPONSES ----------------
        else:
            if is_imminent_danger:
                return "Move immediately to stable high ground away from steep slopes. If you are in immediate danger, dial 112 for emergency services."
            elif is_general_help:
                return "Of course. What would you like help with?"
            elif is_shelter:
                return "The nearest civic relief shelter is active. Travel via designated main roads and avoid steep roadside embankments."
            elif is_safety_tips:
                return "Stay alert for rumbling sounds or sudden water runoff. Avoid steep slopes, ravines, and saturated soil during heavy rainfall."
            elif is_report:
                return "You can log hazard photos and live GPS coordinates directly under the Report Hazard tab in PRITHVI-SHIELD."
            elif is_safe_query:
                return "Due to recent heavy rainfall, nearby slope embankments are vulnerable. Avoid traveling near unstable hillsides."
            elif is_greeting:
                return "Hello! I am PRITHVI, your AI Safety Assistant. How can I assist you with local safety or emergency guidance today?"
            else:
                return "I am here to assist with your safety. Please let me know if you need emergency guidance, safe shelter routes, or hazard alerts."



# Singleton instance
prithvi_agent = PrithviVoiceAgent()
