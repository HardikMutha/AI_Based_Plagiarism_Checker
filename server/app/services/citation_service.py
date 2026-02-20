from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import nltk

nltk.download("punkt")

MODEL_NAME = "copenlu/citebert-cite-only"

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)

model.eval()

def split_sentences(text):
    return nltk.sent_tokenize(text)

def is_suspicious(sentence):

    inputs = tokenizer(
        sentence,
        return_tensors="pt",
        truncation=True,
        padding=True
    )

    with torch.no_grad():
        outputs = model(**inputs)

    probs = torch.softmax(outputs.logits, dim=1)
    prediction = torch.argmax(probs).item()
    
    print(sentence)
    print(probs)
    print(prediction)
    print("-----------")

    return prediction == 1   # 1 = citation needed

def filter_suspicious_sentences(text):

    sentences = split_sentences(text)

    return [s for s in sentences if is_suspicious(s)]