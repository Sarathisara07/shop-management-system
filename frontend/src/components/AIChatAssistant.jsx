import { useState, useEffect, useRef } from 'react';
import { Mic, Send, X, Bot, Speaker, Wand2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './AIChatAssistant.css';

const AIChatAssistant = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'வணக்கம்! நான் உங்கள் ஏஐ அசிஸ்டெண்ட். நான் உங்களுக்கு எப்படி உதவ முடியும்?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle Speech Recognition (Web Speech API)
  const startListening = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser does not support speech recognition. Use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ta-IN';
    recognition.continuous = true; // Stay active longer
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    let silenceTimer;

    recognition.onstart = () => {
      setIsListening(true);
      scrollToBottom();
    };

    recognition.onend = () => {
      setIsListening(false);
      if (silenceTimer) clearTimeout(silenceTimer);
    };

    recognition.onerror = (event) => {
      console.error("Speech Recognition Error:", event.error);
      setIsListening(false);
      
      if (event.error === 'no-speech') {
        setMessages(prev => [...prev, { role: 'assistant', content: "மன்னிக்கவும், எனக்கு எதுவும் கேட்கவில்லை." }]);
      } else if (event.error === 'not-allowed') {
        alert("Please allow microphone access in your browser settings.");
      }
    };
    
    recognition.onresult = (event) => {
      let fullTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript;
      }
      
      // Update input but also log it
      setInput(prev => {
        // If it's a completely new result, we might want to append or replace
        // For simple usage, replacing input with the current full session transcript is best
        const currentSessionTranscript = Array.from(event.results)
          .map(r => r[0].transcript)
          .join(' ');
        return currentSessionTranscript;
      });

      // SILENCE DETECTION: Increase to 3 seconds for natural speaking
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        const finalTranscript = Array.from(event.results)
          .map(r => r[0].transcript)
          .join(' ');
          
        if (finalTranscript.trim()) {
          recognition.stop();
          handleSendMessage(finalTranscript);
        }
      }, 3000); 
    };

    recognition.start();
  };

  const [availableVoices, setAvailableVoices] = useState([]);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // Persistent audio object to bypass Autoplay restrictions after async fetch
  const audioRef = useRef(new Audio());

  // Handle Speech Synthesis
  const speak = (text, base64AudioUrl) => {
    if (base64AudioUrl) {
      audioRef.current.src = base64AudioUrl;
      audioRef.current.play().catch(err => {
         console.warn("Audio play blocked by browser, falling back:", err);
         fallbackSpeak(text);
      });
      return;
    }

    if (!text) return;

    // Fallback if backend didn't provide audio
    try {
      const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ta&client=gtx`;
      audioRef.current.src = url;
      audioRef.current.play().catch(err => {
         fallbackSpeak(text);
      });
    } catch (err) {
      fallbackSpeak(text);
    }
  };

  const fallbackSpeak = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ta-IN';
    
    let tamilVoices = availableVoices.filter(v =>  v.lang.includes('ta') || v.name.toLowerCase().includes('tamil'));
    const bestVoice = tamilVoices.find(v => v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('valluvar') || v.name.toLowerCase().includes('female')) || tamilVoices[0];

    if (bestVoice) utterance.voice = bestVoice;
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (rawMessage) => {
    const messageToSend = rawMessage || input;
    if (!messageToSend || !messageToSend.trim()) return;

    // Unlock audio context immediately upon user interaction
    audioRef.current.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA"; // short silent audio
    audioRef.current.play().catch(() => {});

    console.log("Sending message to AI:", messageToSend);
    
    const userMessage = { role: 'user', content: messageToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch(`${API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ message: messageToSend })
      });
      
      const data = await res.json();
      console.log("AI Response received:", data);
      
      if (!res.ok && !data.response) throw new Error("Server response error");
      
      const aiResponseContent = data.response || "நான் அதை சேமித்துவிட்டேன், ஆனால் பதிலளிக்க முடியவில்லை.";
      const aiMessage = { role: 'assistant', content: aiResponseContent };
      
      setMessages(prev => [...prev, aiMessage]);
      speak(aiResponseContent, data.audio);

      // Refresh dashboard if action was taken
      if (data.action === 'entry_added') {
        console.log("Data added successfully, refreshing dashboard...");
        window.dispatchEvent(new CustomEvent('data_updated'));
      }

    } catch (err) {
      console.error("Chat Error:", err);
      const fallbackMsg = 'இணைப்பு பிழை. சிறிது நேரம் கழித்து முயற்சிக்கவும்.';
      setMessages(prev => [...prev, { role: 'assistant', content: fallbackMsg }]);
      speak(fallbackMsg); // May fallback to device TTS
    } finally {
      setIsTyping(false);
    }
  };

  if (!user) return null;

  return (
    <div className={`ai-assistant-wrapper ${isOpen ? 'open' : ''}`}>
      {!isOpen && (
        <button className="ai-toggle-btn glass-panel animate-bounce-subtle" onClick={() => setIsOpen(true)}>
          <Bot size={28} />
          <span className="tooltip">Ask AI Assistant</span>
        </button>
      )}

      {isOpen && (
        <div className="ai-chat-window glass-panel animate-enter">
          <header className="chat-header">
            <div className="header-info">
              <div className="avatar">
                <Wand2 size={20} />
              </div>
              <div>
                <h4>Shop Assistant</h4>
                <p className="status">Online | AI-Powered</p>
              </div>
            </div>
            <button className="btn-icon" onClick={() => setIsOpen(false)}><X size={20}/></button>
          </header>

          <div className="chat-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`message-bubble ${msg.role}`}>
                <div className="bubble-content">{msg.content}</div>
              </div>
            ))}
            {isTyping && (
              <div className="message-bubble assistant typing">
                <div className="typing-dots"><span></span><span></span><span></span></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form className="chat-input-section" onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}>
            <button 
              type="button" 
              className={`btn-icon mic-btn ${isListening ? 'listening' : ''}`}
              onClick={startListening}
            >
              <Mic size={20} />
            </button>
            <input 
              type="text" 
              placeholder={isListening ? "Listening... Speak now" : "Ask anything or 'Add 2kg iron'..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" className="btn-icon send-btn">
              <Send size={20} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AIChatAssistant;
