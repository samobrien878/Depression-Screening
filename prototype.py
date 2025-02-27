from flask import Flask, render_template, request, session, jsonify
from transformers import pipeline
from textblob import TextBlob

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'  # Replace with a secure key

# Load GPT-2 model for generating text
llm = pipeline('text-generation', model='gpt2')

# PHQ-9 Questions
questions = [
    "Do you have little interest or pleasure in doing things?",
    "Are you feeling down, depressed, or hopeless?",
    "Do you have trouble falling or staying asleep, or sleeping too much?",
    "Are you feeling tired or having little energy?",
    "Do you have poor appetite or are you overeating?",
    "Are you feeling bad about yourself — or that you are a failure or have let yourself or your family down?",
    "Do you have trouble concentrating on things, such as reading the newspaper or watching television?",
    "Are you moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual?",
    "Do you have thoughts that you would be better off dead, or of hurting yourself in some way?"
]

# Depression-related keywords for analysis
keywords = ["sad", "depressed", "hopeless", "tired", "failure", "concentrate", "restless", "dead", "hurt"]

def generate_question(original_question):
    prompt = f"Rephrase this question in a conversational, therapist-like way: {original_question}"
    response = llm(prompt, max_length=50, num_return_sequences=1)
    return response[0]['generated_text'].strip()

def generate_acknowledgment(sentiment):
    if sentiment < -0.2:
        prompt = "Generate an empathetic response for a negative sentiment."
    elif sentiment > 0.2:
        prompt = "Generate a positive acknowledgment."
    else:
        prompt = "Generate a neutral acknowledgment."
    response = llm(prompt, max_length=30, num_return_sequences=1)
    return response[0]['generated_text'].strip()

def analyze_text(text):
    blob = TextBlob(text)
    sentiment = blob.sentiment.polarity  # Range: -1 (negative) to 1 (positive)
    keyword_count = sum(1 for word in keywords if word in text.lower())
    return sentiment, keyword_count

@app.route('/question', methods=['GET'])
def get_question():
    if 'question_index' not in session:
        session['question_index'] = 0
        session['rankings'] = []
        session['sentiments'] = []
        session['keyword_counts'] = []
    index = session['question_index']
    if index < 9:
        question = generate_question(questions[index])
        return jsonify({'message': question, 'is_summary': False})
    else:
        total_score = sum(session['rankings'])
        negative_count = sum(1 for s in session['sentiments'] if s < -0.2)
        total_keywords = sum(session['keyword_counts'])
        if total_score <= 4:
            severity = "minimal depression"
        elif 5 <= total_score <= 9:
            severity = "mild depression"
        elif 10 <= total_score <= 14:
            severity = "moderate depression"
        elif 15 <= total_score <= 19:
            severity = "moderately severe depression"
        else:
            severity = "severe depression"
        suggestion = f"Based on your PHQ-9 score of {total_score}, you may be experiencing {severity}. Your responses showed {negative_count} negative sentiments and {total_keywords} keywords. Please consult a professional."
        session.clear()
        return jsonify({'message': suggestion, 'is_summary': True})

@app.route('/response', methods=['POST'])
def process_response():
    response = request.json['response']
    sentiment, keyword_count = analyze_text(response)
    session['sentiments'].append(sentiment)
    session['keyword_counts'].append(keyword_count)
    acknowledgment = generate_acknowledgment(sentiment)
    return jsonify({'acknowledgment': acknowledgment})

@app.route('/ranking', methods=['POST'])
def process_ranking():
    ranking = int(request.json['ranking'])
    session['rankings'].append(ranking)
    session['question_index'] += 1
    return jsonify({'status': 'success'})

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

if __name__ == "__main__":
    app.run(debug=True)