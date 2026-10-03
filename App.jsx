import React, { useState } from "react";

import {
    ArrowRight,
    Brain,
    Check,
    ChevronDown,
    Copy,
    Globe2,
    Languages,
    Loader2,
    ShieldCheck,
    Sparkles,
    Zap,
    AlertCircle
} from "lucide-react";


const TARGET_LANGUAGES = [
    "Hindi",
    "English",
    "French",
    "Spanish",
    "German",
    "Japanese",
    "Korean",
    "Russian",
    "Chinese",
    "Portuguese",
    "Turkish"
];


function App() {

    const [inputText, setInputText] =
        useState("");

    const [targetLanguage, setTargetLanguage] =
        useState("Hindi");

    const [detectedLanguage, setDetectedLanguage] =
        useState("Auto Detect");

    const [confidence, setConfidence] =
        useState(null);

    const [confidenceLevel, setConfidenceLevel] =
        useState("");

    const [translation, setTranslation] =
        useState("");

    const [warning, setWarning] =
        useState("");

    const [error, setError] =
        useState("");

    const [loading, setLoading] =
        useState(false);

    const [copied, setCopied] =
        useState(false);


    // ==========================================================
    // TRANSLATE
    // ==========================================================

    const handleTranslate = async () => {

        if (!inputText.trim()) {

            setError(
                "Please enter some text."
            );

            return;
        }

        setLoading(true);
        setError("");
        setWarning("");
        setTranslation("");
        setCopied(false);

        try {

            const response = await fetch(
                "/api/translate",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        text: inputText,
                        target_language: targetLanguage
                    })
                }
            );


            let data;

            try {
                data = await response.json();
            }

            catch {
                throw new Error(
                    "Invalid response from server."
                );
            }


            if (!response.ok) {

                throw new Error(
                    data.detail ||
                    "Translation failed."
                );
            }


            setDetectedLanguage(
                data.detected_language ||
                "Unknown"
            );

            setConfidence(
                data.confidence ?? null
            );

            setConfidenceLevel(
                data.confidence_level ||
                ""
            );

            setTranslation(
                data.translation ||
                ""
            );

            setWarning(
                data.warning ||
                ""
            );

        }

        catch (error) {

            console.error(
                "Translation error:",
                error
            );

            setError(
                error.message ||
                "Unable to connect to the backend."
            );

        }

        finally {

            setLoading(false);

        }
    };


    // ==========================================================
    // COPY
    // ==========================================================

    const copyTranslation = async () => {

        if (!translation) {
            return;
        }

        try {

            await navigator.clipboard.writeText(
                translation
            );

            setCopied(true);

            setTimeout(
                () => setCopied(false),
                2000
            );

        }

        catch {

            setError(
                "Could not copy translation."
            );

        }
    };


    // ==========================================================
    // CLEAR
    // ==========================================================

    const clearAll = () => {

        setInputText("");
        setTranslation("");

        setDetectedLanguage(
            "Auto Detect"
        );

        setConfidence(null);
        setConfidenceLevel("");

        setWarning("");
        setError("");
        setCopied(false);
    };


    const percentage =
        confidence !== null
            ? Math.min(
                Math.max(
                    confidence * 100,
                    0
                ),
                100
            )
            : 0;


    return (

        <div className="app">


            {/* =====================================================
          NAVBAR
      ===================================================== */}

            <nav className="navbar">

                <div className="nav-container">

                    <div className="logo">

                        <div className="logo-box">
                            <Languages size={21} />
                        </div>

                        <span>
                            Lingua<span className="logo-ai">
                                AI
                            </span>
                        </span>

                    </div>


                    <div className="online-status">

                        <span className="online-dot"></span>

                        AI Translation Online

                    </div>

                </div>

            </nav>


            {/* =====================================================
          HERO
      ===================================================== */}

            <main>

                <section className="hero">

                    <div className="hero-badge">

                        <Sparkles size={15} />

                        AI-Powered Translation

                    </div>


                    <h1>

                        Break language barriers

                        <span>
                            with AI
                        </span>

                    </h1>


                    <p>

                        Automatically detect the language
                        of your text and translate it using
                        machine learning and NLLB-200.

                    </p>

                </section>


                {/* ===================================================
            TRANSLATOR
        =================================================== */}

                <section className="translator-section">

                    <div className="translator-grid">


                        {/* INPUT */}

                        <div className="translator-panel">

                            <div className="panel-top">

                                <div>

                                    <div className="panel-label">
                                        INPUT
                                    </div>

                                    <div className="detected-language">

                                        <Globe2 size={17} />

                                        {detectedLanguage}

                                    </div>

                                </div>


                                <span className="auto-tag">
                                    AUTO DETECT
                                </span>

                            </div>


                            <textarea
                                value={inputText}
                                onChange={(e) =>
                                    setInputText(
                                        e.target.value
                                    )
                                }
                                placeholder="Type or paste your text here..."
                            />


                            <div className="panel-bottom">

                                <span>
                                    {inputText.length} characters
                                </span>


                                {inputText && (

                                    <button
                                        onClick={clearAll}
                                    >
                                        Clear
                                    </button>

                                )}

                            </div>

                        </div>


                        {/* ARROW */}

                        <div className="middle-arrow">

                            <ArrowRight size={20} />

                        </div>


                        {/* OUTPUT */}

                        <div className="translator-panel">

                            <div className="panel-top">

                                <div>

                                    <div className="panel-label">
                                        TRANSLATE TO
                                    </div>


                                    <div className="select-container">

                                        <select
                                            value={targetLanguage}
                                            onChange={(e) =>
                                                setTargetLanguage(
                                                    e.target.value
                                                )
                                            }
                                        >

                                            {TARGET_LANGUAGES.map(
                                                (language) => (

                                                    <option
                                                        key={language}
                                                        value={language}
                                                    >
                                                        {language}
                                                    </option>

                                                )
                                            )}

                                        </select>

                                        <ChevronDown
                                            size={17}
                                        />

                                    </div>

                                </div>

                            </div>


                            <div className="output">

                                {loading ? (

                                    <div className="loading">

                                        <Loader2
                                            size={30}
                                            className="spin"
                                        />

                                        <span>
                                            Translating with NLLB-200...
                                        </span>

                                    </div>

                                ) : translation ? (

                                    <div className="translation">
                                        {translation}
                                    </div>

                                ) : (

                                    <div className="placeholder">
                                        Your translation will
                                        appear here...
                                    </div>

                                )}

                            </div>


                            <div className="panel-bottom">

                                <span>
                                    NLLB-200 Translation
                                </span>


                                {translation && (

                                    <button
                                        onClick={copyTranslation}
                                    >

                                        {copied ? (

                                            <>
                                                <Check size={14} />
                                                Copied
                                            </>

                                        ) : (

                                            <>
                                                <Copy size={14} />
                                                Copy
                                            </>

                                        )}

                                    </button>

                                )}

                            </div>

                        </div>

                    </div>


                    {/* ERROR */}

                    {error && (

                        <div className="alert error">

                            <AlertCircle size={17} />

                            {error}

                        </div>

                    )}


                    {/* WARNING */}

                    {warning && !error && (

                        <div className="alert warning">

                            <AlertCircle size={17} />

                            {warning}

                        </div>

                    )}


                    {/* CONFIDENCE */}

                    {confidence !== null && !error && (

                        <div className="confidence-card">

                            <div className="confidence-header">

                                <div>

                                    <span>
                                        Language Detection
                                    </span>

                                    <strong>
                                        {detectedLanguage}
                                    </strong>

                                </div>


                                <div
                                    className={`confidence-badge ${confidenceLevel.toLowerCase()}`}
                                >

                                    {confidenceLevel}

                                </div>

                            </div>


                            <div className="confidence-row">

                                <div className="confidence-track">

                                    <div
                                        className="confidence-progress"
                                        style={{
                                            width: `${percentage}%`
                                        }}
                                    />

                                </div>


                                <strong>
                                    {percentage.toFixed(1)}%
                                </strong>

                            </div>


                            {confidence < 0.5 && (

                                <p className="confidence-note">

                                    The model has low confidence
                                    for this input. A longer
                                    sentence usually gives more
                                    reliable language detection.

                                </p>

                            )}

                        </div>

                    )}


                    {/* BUTTON */}

                    <button
                        className="translate-btn"
                        onClick={handleTranslate}
                        disabled={
                            loading ||
                            !inputText.trim()
                        }
                    >

                        {loading ? (

                            <>
                                <Loader2
                                    size={19}
                                    className="spin"
                                />

                                Translating...

                            </>

                        ) : (

                            <>
                                <Sparkles size={19} />

                                Translate

                                <ArrowRight size={18} />

                            </>

                        )}

                    </button>

                </section>


                {/* ===================================================
            FEATURES
        =================================================== */}

                <section className="features">

                    <div className="section-title">

                        <span>
                            WHY LINGUAAI
                        </span>

                        <h2>
                            Intelligent translation
                            architecture
                        </h2>

                        <p>
                            A complete machine-learning
                            and neural machine translation
                            pipeline.
                        </p>

                    </div>


                    <div className="feature-grid">


                        <div className="feature">

                            <div className="feature-icon">
                                <Brain />
                            </div>

                            <h3>
                                ML Language Detection
                            </h3>

                            <p>
                                Character-level TF-IDF
                                features with Logistic
                                Regression identify the
                                input language.
                            </p>

                        </div>


                        <div className="feature">

                            <div className="feature-icon">
                                <Zap />
                            </div>

                            <h3>
                                NLLB-200
                            </h3>

                            <p>
                                Meta's multilingual NLLB-200
                                model performs neural machine
                                translation.
                            </p>

                        </div>


                        <div className="feature">

                            <div className="feature-icon">
                                <ShieldCheck />
                            </div>

                            <h3>
                                Full-Stack API
                            </h3>

                            <p>
                                React communicates with a
                                FastAPI backend through a
                                clean REST architecture.
                            </p>

                        </div>

                    </div>

                </section>


                {/* ===================================================
            TECHNOLOGY
        =================================================== */}

                <section className="technology">

                    <span>
                        TECHNOLOGY STACK
                    </span>

                    <div className="tech-items">

                        <div>React</div>
                        <div>Vite</div>
                        <div>FastAPI</div>
                        <div>Python</div>
                        <div>Scikit-learn</div>
                        <div>TF-IDF</div>
                        <div>Logistic Regression</div>
                        <div>NLLB-200</div>
                        <div>PyTorch</div>

                    </div>

                </section>

            </main>


            {/* =====================================================
          FOOTER
      ===================================================== */}

            <footer>

                <div className="footer-container">

                    <div className="logo">

                        <div className="logo-box">
                            <Languages size={18} />
                        </div>

                        <span>
                            Lingua<span className="logo-ai">
                                AI
                            </span>
                        </span>

                    </div>


                    <p>
                        AI-powered multilingual
                        language detection and translation.
                    </p>

                </div>

            </footer>

        </div>
    );
}


export default App;