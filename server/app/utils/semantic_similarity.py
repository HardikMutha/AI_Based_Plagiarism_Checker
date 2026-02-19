from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

class SemanticUtils:
    def __init__(self):
        self.modelName = 'sentence-transformers/all-mpnet-base-v2'
        self.model = SentenceTransformer(self.modelName)

    def sliding_window_chunk(self, text, window_size=800, overlap=200):
        text = text.strip()
        if len(text) <= window_size:
            return [text]

        chunks = []
        start = 0
        n = len(text)

        while start < n:
            end = start + window_size
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            start += (window_size - overlap)

        return chunks

    def similarity_matrix(self, text1, text2):
        c1 = self.sliding_window_chunk(text1)
        c2 = self.sliding_window_chunk(text2)

        e1 = self.model.encode(c1, batch_size=16, show_progress_bar=True)
        e2 = self.model.encode(c2, batch_size=16, show_progress_bar=True)

        return cosine_similarity(e1, e2)

    def aggregate_similarity(self, S, tau=0.8, top_frac=0.05):
        max_sim = S.max()

        k = max(1, int(top_frac * S.size))
        topk_mean = np.mean(np.sort(S.flatten())[-k:])

        cov_ab = (S.max(axis=1) >= tau).mean()
        cov_ba = (S.max(axis=0) >= tau).mean()
        coverage = 0.5 * (cov_ab + cov_ba)

        return {
            "max": float(max_sim),
            "topk_mean": float(topk_mean),
            "coverage": float(coverage)
        }

def main():
    with open("./testcases/tc1/A.txt", "r") as f:
        text1 = f.read()
    with open("./testcases/tc1/B.txt", "r") as f:
        text2 = f.read()
    utils = SemanticUtils()

    S = utils.similarity_matrix(text1, text2)
    scores = utils.aggregate_similarity(S)

    print(scores)


if __name__ == "__main__":
    main()
    