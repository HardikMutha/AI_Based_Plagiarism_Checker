import re

def extract_query(chunk):
    acronyms = " ".join(re.findall(r'\b[A-Z]{2,6}\b', chunk))
    
    terms = " ".join(
        [w for w in chunk.split() if len(w) > 4][:5]
    )

    return f"{acronyms} {terms}"