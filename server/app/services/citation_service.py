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

    return prediction == 1


def get_suspicious_with_context(text):

    sentences = split_sentences(text)
    suspicious_items = []

    for i, s in enumerate(sentences):

        if is_suspicious(s):

            context = ""

            if i > 0:
                context += sentences[i - 1] + " "

            context += sentences[i] + " "

            if i < len(sentences) - 1:
                context += sentences[i + 1]

            suspicious_items.append({
                "sentence": s,
                "context": context.strip()
            })

    return suspicious_items