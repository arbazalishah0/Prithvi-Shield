import asyncio
import json
import sys
import urllib.request
import websockets

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_URL = "http://127.0.0.1:8000"



def post_json(path, data):
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode("utf-8"))


def main():
    print("\n" + "=" * 65)
    print("  * PRITHVI — AI SAFETY ASSISTANT (LIVE VOICE DEMO)")
    print("  * Multilingual Voice Agent Powered by Rumik AI")
    print("=" * 65)

    # 1. English Demo
    print("\n[1] ENGLISH VOICE SESSION:")
    en_sess = post_json("/api/voice/session", {"language": "en"})
    sid_en = en_sess["session_id"]
    print(f"  Session ID:  {sid_en}")
    print(f"  PRITHVI:     {en_sess['greeting']}")

    chat_en = post_json("/api/voice/chat", {
        "session_id": sid_en,
        "text": "Hello Prithvi, can you help me?"
    })
    print(f"  Citizen:     Hello Prithvi, can you help me?")
    print(f"  PRITHVI:     {chat_en['response_text']}")
    print(f"  Audio:       {len(chat_en.get('audio_base64', ''))} base64 chars ({chat_en['content_type']})")

    chat_en2 = post_json("/api/voice/chat", {
        "session_id": sid_en,
        "text": "What should I do during a landslide?"
    })
    print(f"  Citizen:     What should I do during a landslide?")
    print(f"  PRITHVI:     {chat_en2['response_text']}")

    # 2. Hindi Demo
    print("\n[2] HINDI VOICE SESSION (हिन्दी):")
    hi_sess = post_json("/api/voice/session", {"language": "hi"})
    sid_hi = hi_sess["session_id"]
    print(f"  Session ID:  {sid_hi}")
    print(f"  PRITHVI:     {hi_sess['greeting']}")

    chat_hi = post_json("/api/voice/chat", {
        "session_id": sid_hi,
        "text": "नमस्ते पृथ्वी, क्या मेरा क्षेत्र सुरक्षित है?"
    })
    print(f"  Citizen:     नमस्ते पृथ्वी, क्या मेरा क्षेत्र सुरक्षित है?")
    print(f"  PRITHVI:     {chat_hi['response_text']}")
    print(f"  Audio:       {len(chat_hi.get('audio_base64', ''))} base64 chars ({chat_hi['content_type']})")

    # 3. Marathi Demo
    print("\n[3] MARATHI VOICE SESSION (मराठी):")
    mr_sess = post_json("/api/voice/session", {"language": "mr"})
    sid_mr = mr_sess["session_id"]
    print(f"  Session ID:  {sid_mr}")
    print(f"  PRITHVI:     {mr_sess['greeting']}")

    chat_mr = post_json("/api/voice/chat", {
        "session_id": sid_mr,
        "text": "मला तातडीची मदत हवी आहे"
    })
    print(f"  Citizen:     मला तातडीची मदत हवी आहे")
    print(f"  PRITHVI:     {chat_mr['response_text']}")
    print(f"  Audio:       {len(chat_mr.get('audio_base64', ''))} base64 chars ({chat_mr['content_type']})")

    # 4. WebSocket Realtime Streaming Demo
    print("\n[4] REALTIME FULL-DUPLEX WEBSOCKET STREAM:")
    async def test_ws():
        uri = f"ws://127.0.0.1:8000/api/voice/stream/{sid_en}"
        async with websockets.connect(uri) as ws:
            ready = await ws.recv()
            ready_json = json.loads(ready)
            print(f"  Connected:   Agent={ready_json.get('agent')} | Sample Rate={ready_json.get('sample_rate')} Hz")
            
            # Send question
            print(f"  Citizen ->   Where is the nearest shelter?")
            await ws.send(json.dumps({"type": "speak", "text": "Where is the nearest shelter?"}))
            
            audio_chunks = 0
            total_bytes = 0
            while True:
                msg = await ws.recv()
                if isinstance(msg, str):
                    data = json.loads(msg)
                    if data.get("type") == "transcript":
                        print(f"  PRITHVI ->   {data.get('text')}")
                    elif data.get("type") == "turn_complete":
                        print(f"  Turn Done:   Received {audio_chunks} audio chunks ({total_bytes} bytes PCM)")
                        break
                else:
                    audio_chunks += 1
                    total_bytes += len(msg)

    asyncio.run(test_ws())

    print("\n" + "=" * 65)
    print("  * ALL LIVE VOICE INTERACTIONS EXECUTED PERFECTLY!")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    main()
