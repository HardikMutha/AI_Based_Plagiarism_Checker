import requests
from flask import current_app
from app.utils.query_utils import extract_query

OPENALEX_URL = "https://api.openalex.org/works"

def fetch_openalex_papers(chunk):

    query = extract_query(chunk)

    params = {
        "search": query,
        "per_page": 10,
        "mailto": current_app.config["OPENALEX_EMAIL"]
    }

    response = requests.get(OPENALEX_URL, params=params)

    if response.status_code != 200:
        raise Exception(response.text)

    data = response.json()

    papers = []

    for work in data.get("results", []):
        abstract = None

        if work.get("abstract_inverted_index"):
            tokens = []
            for word, positions in work["abstract_inverted_index"].items():
                for pos in positions:
                    tokens.append((pos, word))
            tokens.sort()
            abstract = " ".join([w for _, w in tokens])

        papers.append({
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

    return papers, query