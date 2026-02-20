import requests
from flask import current_app

OPENALEX_URL = "https://api.openalex.org/works"

def fetch_openalex_for_sentences(sentences):

    results = []

    for sentence in sentences:

        params = {
            "search": sentence,
            "per_page": 3,
            "mailto": current_app.config["OPENALEX_EMAIL"]
        }

        response = requests.get(OPENALEX_URL, params=params)

        if response.status_code != 200:
            continue

        data = response.json()

        for work in data.get("results", []):

            abstract = None

            if work.get("abstract_inverted_index"):
                tokens = []
                for word, positions in work["abstract_inverted_index"].items():
                    for pos in positions:
                        tokens.append((pos, word))
                tokens.sort()
                abstract = " ".join([w for _, w in tokens])

            results.append({
                "sentence": sentence,
                "title": work.get("display_name"),
                "abstract": abstract,
                "year": work.get("publication_year"),
                "doi": work.get("doi"),
                "pdfLink": work.get("open_access", {}).get("oa_url"),
                "authors": [
                    a["author"]["display_name"]
                    for a in work.get("authorships", [])
                ]
            })

    return results