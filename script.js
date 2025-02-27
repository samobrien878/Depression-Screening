// PHQ-9 Questions
const questions = [
    "Over the last two weeks, how often have you been bothered by little interest or pleasure in doing things?",
    "Over the last two weeks, how often have you been bothered by feeling down, depressed, or hopeless?",
    "Over the last two weeks, how often have you been bothered by trouble falling or staying asleep, or sleeping too much?",
    "Over the last two weeks, how often have you been bothered by feeling tired or having little energy?",
    "Over the last two weeks, how often have you been bothered by poor appetite or overeating?",
    "Over the last two weeks, how often have you been bothered by feeling bad about yourself — or that you are a failure or have let yourself or your family down?",
    "Over the last two weeks, how often have you been bothered by trouble concentrating on things, such as reading the newspaper or watching television?",
    "Over the last two weeks, how often have you been bothered by moving or speaking so slowly that other people could have noticed, or being so fidgety or restless that you have been moving around a lot more than usual?",
    "Over the last two weeks, how often have you been bothered by thoughts that you would be better off dead, or of hurting yourself in some way?"
];

// Standard responses for confirmation
const standardResponses = [
    "Not at all",
    "Several days",
    "More than half the days",
    "Nearly every day"
];

// Map responses to scores
function getScoreFromResponse(text) {
    text = text.toLowerCase();
    if (text.includes("not at all") || text.includes("never") || text.includes("no")) return 0;
    if (text.includes("several days") || text.includes("sometimes") || text.includes("a little")) return 1;
    if (text.includes("more than half") || text.includes("often") || text.includes("frequently")) return 2;
    if (text.includes("nearly every day") || text.includes("always") || text.includes("all the time")) return 3;
    return -1; // Unclear response
}

// Speech synthesis setup
const synth = window.speechSynthesis;
let voice;
synth.onvoiceschanged = () => {
    const voices = synth.getVoices();
    voice = voices.find(v => v.name === "Google US English") || voices[0];
};

// Speech recognition setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
    alert("Speech recognition is not supported in this browser. Please use a supported browser like Chrome.");
} else {
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    // State variables
    let scores = [];
    let currentQuestion = 0;
    let expectingConfirmation = false;
    let currentScore;

    // Start button event listener
    document.getElementById("start-btn").addEventListener("click", () => {
        scores = [];
        currentQuestion = 0;
        expectingConfirmation = false;
        const intro = new SpeechSynthesisUtterance("Hello, I'm here to help you assess your mood. Let's begin.");
        intro.voice = voice;
        synth.speak(intro);
        intro.onend = askQuestion;
    });

    // Ask the next question
    function askQuestion() {
        if (currentQuestion < questions.length) {
            const utterance = new SpeechSynthesisUtterance(questions[currentQuestion]);
            utterance.voice = voice;
            synth.speak(utterance);
            utterance.onend = () => {
                expectingConfirmation = false;
                startRecognition();
            };
        } else {
            calculateScore();
        }
    }

    // Start speech recognition
    function startRecognition() {
        recognition.start();
        document.getElementById("status").textContent = "Listening...";
    }

    // Handle recognition results
    recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        document.getElementById("status").textContent = `You said: ${text}`;
        
        if (expectingConfirmation) {
            if (text.toLowerCase().includes("yes")) {
                scores.push(currentScore);
                currentQuestion++;
                expectingConfirmation = false;
                askQuestion();
            } else {
                const repeat = new SpeechSynthesisUtterance("Please repeat your response to the question.");
                repeat.voice = voice;
                synth.speak(repeat);
                repeat.onend = startRecognition;
            }
        } else {
            const score = getScoreFromResponse(text);
            if (score === -1) {
                const retry = new SpeechSynthesisUtterance("I'm sorry, I didn't understand your response. Please repeat.");
                retry.voice = voice;
                synth.speak(retry);
                retry.onend = startRecognition;
            } else {
                currentScore = score;
                confirmResponse(score);
            }
        }
    };

    // Confirm the interpreted response
    function confirmResponse(score) {
        const responseText = standardResponses[score];
        const confirm = new SpeechSynthesisUtterance(`So, you feel it is "${responseText}". Is that accurate? Please say yes or no.`);
        confirm.voice = voice;
        synth.speak(confirm);
        confirm.onend = () => {
            expectingConfirmation = true;
            startRecognition();
        };
    }

    // Calculate and provide feedback
    function calculateScore() {
        const totalScore = scores.reduce((a, b) => a + b, 0);
        let feedback;
        if (totalScore <= 4) {
            feedback = "Your responses suggest minimal or no depression. Keep monitoring your mood and seek help if you notice any changes.";
        } else if (totalScore <= 9) {
            feedback = "Your responses suggest mild depression. Consider talking to a mental health professional or a trusted person about your feelings.";
        } else if (totalScore <= 14) {
            feedback = "Your responses suggest moderate depression. It is recommended to seek help from a mental health professional.";
        } else if (totalScore <= 19) {
            feedback = "Your responses suggest moderately severe depression. Please seek help from a mental health professional as soon as possible.";
        } else {
            feedback = "Your responses suggest severe depression. It is crucial to seek immediate help from a mental health professional or a crisis hotline.";
        }
        const outro = new SpeechSynthesisUtterance(`Thank you for completing the assessment. ${feedback}`);
        outro.voice = voice;
        synth.speak(outro);
        document.getElementById("status").textContent = feedback;
    }

    // Handle recognition errors
    recognition.onerror = (event) => {
        document.getElementById("status").textContent = "Error occurred in recognition: " + event.error;
        const errorMsg = new SpeechSynthesisUtterance("There was an error. Please try again.");
        errorMsg.voice = voice;
        synth.speak(errorMsg);
        errorMsg.onend = startRecognition;
    };
}