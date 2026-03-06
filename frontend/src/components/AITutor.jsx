import { useState, useRef, useEffect } from 'react';
import PaperCard from './PaperCard.jsx';

const AITutor = ({ title }) => {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [learningMode, setLearningMode] = useState('apprentice');
  const [textOnlyMode, setTextOnlyMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const speechRef = useRef(null);

  // Sample knowledge base for different TK contexts
  const knowledgeBase = {
    'Sambalpuri Ikat': {
      beginner: {
        simple: "Sambalpuri Ikat is a traditional tie-dye weaving technique from Odisha. Artisans tie and dye threads before weaving to create beautiful patterns.",
        insight: "What makes it special is that the patterns emerge during weaving, not before. The dyed threads create designs as they're woven together.",
        practical: "Start by observing how the threads are tied. Each knot prevents dye from reaching that part of the thread, creating the pattern."
      },
      apprentice: {
        simple: "Sambalpuri Ikat uses resist dyeing on warp and weft threads. The mathematical precision in tying determines the final pattern.",
        insight: "The craft embodies the concept of 'woven geometry' - where mathematical relationships between tied sections create symmetrical patterns.",
        practical: "Practice the counting system. Each tie represents a unit in the pattern. Master the basic grid before attempting complex motifs."
      },
      research: {
        simple: "Sambalpuri Ikat employs complex mathematical algorithms in thread arrangement. The resist-dyeing process follows precise geometric sequences.",
        insight: "Research indicates that traditional Ikat patterns follow Fibonacci sequences and golden ratio proportions, suggesting sophisticated mathematical knowledge.",
        practical: "Document the tying sequences. Analyze pattern frequency across different regions to understand cultural diffusion patterns."
      }
    },
    'Pattachitra': {
      beginner: {
        simple: "Pattachitra is a traditional cloth painting from Odisha, telling stories of gods and goddesses through vibrant colors.",
        insight: "Each color has meaning - red for power, yellow for knowledge, and the paintings follow strict compositional rules passed down generations.",
        practical: "Learn the color preparation first. Natural pigments need specific preparation methods to achieve the right consistency and brightness."
      },
      apprentice: {
        simple: "Pattachitra follows the 'Pancha Varna' system - five colors made from natural sources. The composition uses the 'Mandala' principle.",
        insight: "The spatial arrangement follows ancient architectural principles, with the central deity occupying the most sacred space in the composition.",
        practical: "Master the line work first. Pattachitra artists believe 'line is life' - the entire painting depends on the strength of the initial sketch."
      },
      research: {
        simple: "Pattachitra employs complex iconographic systems with over 200 standardized mudras (hand gestures) and symbolic elements.",
        insight: "Analysis reveals that Pattachitra compositions follow fractal patterns, with micro-elements reflecting macro-structures at multiple scales.",
        practical: "Study the regional variations in iconography. Document how different communities interpret the same mythological narratives."
      }
    },
    'Herbal Tribal Medicine': {
      beginner: {
        simple: "Tribal herbal medicine uses local plants for healing. Knowledge is passed down through generations in tribal communities.",
        insight: "The practice considers not just the plant, but also the season, time of collection, and the patient's constitution.",
        practical: "Never harvest without guidance. Tribal healers know which parts to use and when - the same plant can be harmful if used incorrectly."
      },
      apprentice: {
        simple: "Tribal medicine follows the 'Pancha Bhoota' principle - balancing five elements through plant-based remedies.",
        insight: "The diagnostic system considers environmental factors, seasonal changes, and individual constitution before prescribing treatment.",
        practical: "Learn plant identification first. Many medicinal plants look similar to poisonous varieties. Always verify with experienced healers."
      },
      research: {
        simple: "Tribal medicine systems demonstrate sophisticated pharmacological knowledge, including synergistic plant combinations and preparation methods.",
        insight: "Recent studies validate many traditional remedies, showing bioactive compounds that match modern pharmaceutical mechanisms.",
        practical: "Document preparation methods precisely. Temperature, timing, and combination ratios significantly affect therapeutic efficacy."
      }
    }
  };

  const defaultKnowledge = {
    beginner: {
      simple: "Traditional knowledge is living wisdom passed down through generations. It represents deep understanding of local ecology, materials, and cultural practices.",
      insight: "This knowledge isn't just information - it's embodied wisdom that includes values, ethics, and spiritual connections to place and community.",
      practical: "Approach traditional knowledge with respect and humility. Listen more than you speak, and understand that context matters more than facts."
    },
    apprentice: {
      simple: "Traditional knowledge systems are complex adaptive frameworks that integrate ecological observation, cultural values, and practical application.",
      insight: "These systems demonstrate sophisticated systems thinking - understanding interconnections between environment, culture, and technology.",
      practical: "Practice observation skills. Traditional knowledge holders notice patterns that others miss - in weather, materials, and human behavior."
    },
    research: {
      simple: "Traditional knowledge represents validated epistemological systems with their own methodologies for validation, transmission, and innovation.",
      insight: "Research shows that traditional knowledge systems often demonstrate higher resilience and sustainability outcomes than conventional approaches.",
      practical: "Apply interdisciplinary research methods. Combine ethnographic approaches with ecological and material science analysis."
    }
  };

  useEffect(() => {
    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      speechRef.current = window.speechSynthesis;
    }
  }, []);

  const speakResponse = (text) => {
    if (!speechRef.current || textOnlyMode) return;

    // Cancel any ongoing speech
    speechRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure voice for elder-like characteristics
    utterance.rate = 0.85; // Slower pace
    utterance.pitch = 0.9; // Slightly lower pitch
    utterance.volume = 0.9;
    
    // Add natural pauses by breaking into sentences
    const sentences = text.split('. ');
    let currentIndex = 0;
    
    const speakNext = () => {
      if (currentIndex < sentences.length && isSpeaking) {
        const sentence = sentences[currentIndex];
        if (sentence.trim()) {
          const sentenceUtterance = new SpeechSynthesisUtterance(sentence);
          sentenceUtterance.rate = 0.85;
          sentenceUtterance.pitch = 0.9;
          sentenceUtterance.volume = 0.9;
          
          sentenceUtterance.onend = () => {
            currentIndex++;
            setTimeout(speakNext, 300); // Natural pause between sentences
          };
          
          speechRef.current.speak(sentenceUtterance);
        } else {
          currentIndex++;
          speakNext();
        }
      } else {
        setIsSpeaking(false);
      }
    };
    
    setIsSpeaking(true);
    speakNext();
  };

  const stopSpeaking = () => {
    if (speechRef.current) {
      speechRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsProcessing(true);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate response based on context and mode
    const context = title || 'General';
    const knowledge = knowledgeBase[context] || defaultKnowledge;
    const modeKnowledge = knowledge[learningMode];

    // Simple response generation logic
    let responseText = '';
    
    if (question.toLowerCase().includes('how') || question.toLowerCase().includes('prepare')) {
      responseText = `${modeKnowledge.simple} ${modeKnowledge.practical}`;
    } else if (question.toLowerCase().includes('why') || question.toLowerCase().includes('important')) {
      responseText = `${modeKnowledge.simple} ${modeKnowledge.insight}`;
    } else if (question.toLowerCase().includes('mistake') || question.toLowerCase().includes('avoid')) {
      responseText = `${modeKnowledge.practical} Remember, traditional knowledge requires patience and respect for the process.`;
    } else {
      responseText = `${modeKnowledge.simple} ${modeKnowledge.insight} ${modeKnowledge.practical}`;
    }

    const newResponse = {
      question,
      simple: modeKnowledge.simple,
      insight: modeKnowledge.insight,
      practical: modeKnowledge.practical,
      relatedConcepts: getRelatedConcepts(context),
      timestamp: new Date().toLocaleTimeString()
    };

    setResponse(newResponse);
    setIsProcessing(false);
    
    // Auto-speak response
    const fullText = `${newResponse.simple} ${newResponse.insight} ${newResponse.practical}`;
    speakResponse(fullText);
  };

  const getRelatedConcepts = (context) => {
    const concepts = {
      'Sambalpuri Ikat': ['Natural Indigo', 'Tie-Dye Mathematics', 'Weaving Patterns', 'Color Symbolism'],
      'Pattachitra': ['Natural Pigments', 'Mandala Composition', 'Mythological Stories', 'Color Preparation'],
      'Herbal Tribal Medicine': ['Medicinal Plants', 'Seasonal Harvesting', 'Traditional Diagnostics', 'Community Healing'],
      'General': ['Oral Tradition', 'Cultural Context', 'Ecological Knowledge', 'Community Wisdom']
    };
    return concepts[context] || concepts['General'];
  };

  const suggestions = [
    "How is natural dye prepared?",
    "Why is this craft culturally important?", 
    "What mistakes should beginners avoid?",
    "What materials are traditionally used?",
    "How does this connect to ecology?"
  ];

  return (
    <div className="ai-tutor">
      {/* Header */}
      <div className="tutor-header">
        <h1>AI Tutor – Learn from Living Memory</h1>
        <p>Ask anything about this tradition. Learn like an apprentice.</p>
        {title && (
          <div className="mentorship-session">
            Mentorship Session: {title}
          </div>
        )}
      </div>

      {/* Learning Mode Toggle */}
      <div className="learning-modes">
        <button 
          className={`mode-btn ${learningMode === 'beginner' ? 'active' : ''}`}
          onClick={() => setLearningMode('beginner')}
        >
          Beginner Mode
        </button>
        <button 
          className={`mode-btn ${learningMode === 'apprentice' ? 'active' : ''}`}
          onClick={() => setLearningMode('apprentice')}
        >
          Apprentice Mode
        </button>
        <button 
          className={`mode-btn ${learningMode === 'research' ? 'active' : ''}`}
          onClick={() => setLearningMode('research')}
        >
          Research Mode
        </button>
      </div>

      {/* Question Input */}
      <div className="question-area">
        <form onSubmit={handleSubmit} className="question-form">
          <div className="input-wrapper">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to understand?"
              className="question-input"
              disabled={isProcessing}
            />
            <button type="submit" className="ask-btn" disabled={isProcessing}>
              {isProcessing ? 'Thinking...' : 'Ask'}
            </button>
          </div>
        </form>

        {/* Suggestions */}
        <div className="suggestions">
          <p>Try asking:</p>
          <div className="suggestion-chips">
            {suggestions.map((suggestion, idx) => (
              <button 
                key={idx}
                className="suggestion-chip"
                onClick={() => setQuestion(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Response Section */}
      {response && (
        <div className="response-section">
          <PaperCard variant="default">
            <div className="response-parchment">
              <div className="response-header">
                <h3>Wisdom from Tradition</h3>
                <div className="voice-controls">
                  {!textOnlyMode && (
                    <>
                      {!isSpeaking ? (
                        <button 
                          className="voice-btn play-btn"
                          onClick={() => speakResponse(`${response.simple} ${response.insight} ${response.practical}`)}
                          title="Play"
                        >
                          ▶
                        </button>
                      ) : (
                        <button 
                          className="voice-btn pause-btn"
                          onClick={stopSpeaking}
                          title="Pause"
                        >
                          ⏸
                        </button>
                      )}
                      <button 
                        className="voice-btn replay-btn"
                        onClick={() => speakResponse(`${response.simple} ${response.insight} ${response.practical}`)}
                        title="Replay"
                      >
                        🔁
                      </button>
                    </>
                  )}
                  <button 
                    className={`text-only-toggle ${textOnlyMode ? 'active' : ''}`}
                    onClick={() => setTextOnlyMode(!textOnlyMode)}
                    title="Text Only Mode"
                  >
                    📝
                  </button>
                </div>
              </div>

              <div className="response-content">
                <div className="response-section">
                  <h4>1️⃣ Simple Explanation</h4>
                  <p>{response.simple}</p>
                </div>

                <div className="response-section">
                  <h4>2️⃣ Deeper Insight</h4>
                  <p>{response.insight}</p>
                </div>

                <div className="response-section">
                  <h4>3️⃣ Practical Advice</h4>
                  <p>{response.practical}</p>
                </div>

                {/* Related Concepts */}
                <div className="related-concepts">
                  <h4>Related Concepts</h4>
                  <div className="concept-tags">
                    {response.relatedConcepts.map((concept, idx) => (
                      <span key={idx} className="concept-tag">
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Voice Wave Animation */}
              {isSpeaking && !textOnlyMode && (
                <div className="voice-wave">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              )}
            </div>
          </PaperCard>
        </div>
      )}

      {/* Voice Character Note */}
      <div className="voice-note">
        <p>🎙 Voice speaks with the warmth and wisdom of a village elder sharing knowledge with the next generation.</p>
      </div>
    </div>
  );
};

export default AITutor;
