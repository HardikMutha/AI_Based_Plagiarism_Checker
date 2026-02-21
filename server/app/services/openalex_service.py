import requests
from flask import current_app
from sentence_transformers import SentenceTransformer, util

OPENALEX_URL = "https://api.openalex.org/works"

# Load embedding model once
embedder = SentenceTransformer("all-mpnet-base-v2")


def reconstruct_abstract(inverted_index):

    tokens = []

    for word, positions in inverted_index.items():
        for pos in positions:
            tokens.append((pos, word))

    tokens.sort()
    return " ".join([w for _, w in tokens])


def fetch_openalex_for_contexts(items):

    results = []

    for item in items:

        original_sentence = item["sentence"]
        context_query = item["context"]

        # Embed query once
        query_embedding = embedder.encode(context_query, convert_to_tensor=True)

        params = {
            "search": context_query,
            "per_page": 20,   # INCREASED FOR BETTER RECALL
            "mailto": current_app.config["OPENALEX_EMAIL"]
        }

        try:
            response = requests.get(OPENALEX_URL, params=params)

            if response.status_code != 200:
                continue

            data = response.json()

            for work in data.get("results", []):

                abstract = None
                score = 0

                if work.get("abstract_inverted_index"):
                    abstract = reconstruct_abstract(
                        work["abstract_inverted_index"]
                    )

                # Apply semantic similarity only if abstract exists
                if abstract:

                    abs_embedding = embedder.encode(
                        abstract, convert_to_tensor=True
                    )

                    score = util.cos_sim(
                        query_embedding, abs_embedding
                    ).item()

                    # RELAXED THRESHOLD
                    if score < 0.45:
                        continue

                results.append({
                    "matched_sentence": original_sentence,
                    "title": work.get("display_name"),
                    "abstract": abstract,
                    "year": work.get("publication_year"),
                    "doi": work.get("doi"),
                    "pdfLink": work.get("open_access", {}).get("oa_url"),
                    "authors": [
                        a["author"]["display_name"]
                        for a in work.get("authorships", [])
                    ],
                    "similarity": score
                })

        except Exception:
            continue

    # Rank by similarity (best first)
    results.sort(key=lambda x: x["similarity"], reverse=True)

    # Keep only top 5 best matches
    return results[:5]