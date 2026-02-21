import requests
import xmltodict
from sentence_transformers import SentenceTransformer, util

ARXIV_URL = "http://export.arxiv.org/api/query"

embedder = SentenceTransformer("all-mpnet-base-v2")


def fetch_arxiv_for_contexts(items):

    results = []

    for item in items:

        original_sentence = item["sentence"]
        context_query = item["context"]

        query_embedding = embedder.encode(
            context_query,
            convert_to_tensor=True
        )

        params = {
            "search_query": f"all:{context_query}",
            "start": 0,
            "max_results": 15
        }

        try:
            response = requests.get(ARXIV_URL, params=params)

            if response.status_code != 200:
                continue

            data = xmltodict.parse(response.text)

            entries = data.get("feed", {}).get("entry", [])

            if not isinstance(entries, list):
                entries = [entries]

            for entry in entries:

                abstract = entry.get("summary", "")
                title = entry.get("title", "")
                pdfLink = ""

                for link in entry.get("link", []):
                    if link.get("@type") == "application/pdf":
                        pdfLink = link.get("@href")

                abs_embedding = embedder.encode(
                    abstract,
                    convert_to_tensor=True
                )

                score = util.cos_sim(
                    query_embedding,
                    abs_embedding
                ).item()

                if score < 0.45:
                    continue

                results.append({
                    "matched_sentence": original_sentence,
                    "title": title,
                    "abstract": abstract,
                    "year": entry.get("published", "")[:4],
                    "doi": entry.get("id"),
                    "pdfLink": pdfLink,
                    "authors": [
                        a["name"]
                        for a in entry.get("author", [])
                    ],
                    "similarity": score,
                    "source": "arxiv"
                })

        except Exception:
            continue

    results.sort(key=lambda x: x["similarity"], reverse=True)

    return results[:5]