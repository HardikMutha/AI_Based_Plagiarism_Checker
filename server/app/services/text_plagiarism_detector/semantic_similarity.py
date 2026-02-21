import json
from sentence_transformers import SentenceTransformer
import textract
import os
import sys
from pathlib import Path
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from app.utils.extract_files import extract_text

sys.path.append(str(Path(__file__).resolve().parents[3]))

class SemanticUtils:
    def __init__(self):
        self.modelName = 'sentence-transformers/all-mpnet-base-v2'
        self.model = SentenceTransformer(self.modelName)
        self.chunks1 = []
        self.chunks2 = []

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

    # def similarity_matrix(self, text1, text2):
    #     c1 = self.sliding_window_chunk(text1)
    #     c2 = self.sliding_window_chunk(text2)

    #     self.chunks1 = c1
    #     self.chunks2 = c2

    #     e1 = self.model.encode(c1, batch_size=16, show_progress_bar=True)
    #     e2 = self.model.encode(c2, batch_size=16, show_progress_bar=True)

    #     return cosine_similarity(e1, e2).tolist()

    # def aggregate_similarity(self, S, tau=0.8, top_frac=0.05):
    #     S = np.array(S)
        
    #     max_sim = float(S.max())
        
    #     k = max(1, int(top_frac * S.size))
    #     topk_mean = float(np.mean(np.sort(S.flatten())[-k:]))
        
    #     cov_ab = (S.max(axis=1) >= tau).mean()
    #     cov_ba = (S.max(axis=0) >= tau).mean()
    #     coverage = float(0.5 * (cov_ab + cov_ba))
        
    #     # Weighted composite  tune weights to your use case
    #     overall = (
    #         0.2 * max_sim +
    #         0.5 * topk_mean +
    #         0.3 * coverage
    #     )
        
    #     return {
    #         "max": max_sim,
    #         "topk_mean": topk_mean,
    #         "coverage": coverage,
    #         "overall": round(overall, 4)
    #     }
    
    # def compare_files(self, filepaths: list):
    #     ret = []
    #     for i in range(len(filepaths)):
    #         for j in range(i + 1, len(filepaths)):
    #             text1 = self.extract_text(filepaths[i])
    #             text2 = self.extract_text(filepaths[j])

    #             S = self.similarity_matrix(text1, text2)

    #             res = {
    #                 "file_a": filepaths[i],
    #                 "file_b": filepaths[j],
    #                 "type": "text",
    #                 "overall_score": S
    #                 # "similar_lines": []
    #             }

    #             ret.append(res)
    #     return ret
    def similarity_matrix(self, text1, text2):
        c1 = self.sliding_window_chunk(text1)
        c2 = self.sliding_window_chunk(text2)
        
        e1 = self.model.encode(c1, batch_size=16, show_progress_bar=True)
        e2 = self.model.encode(c2, batch_size=16, show_progress_bar=True)

        return cosine_similarity(e1, e2).tolist(), c1, c2  # return chunks

    def aggregate_similarity(self, S, chunks1, chunks2, tau=0.8, top_frac=0.05):
        S = np.array(S)
        
        max_sim = float(S.max())
        
        k = max(1, int(top_frac * S.size))
        topk_mean = float(np.mean(np.sort(S.flatten())[-k:]))
        
        cov_ab = (S.max(axis=1) >= tau).mean()
        cov_ba = (S.max(axis=0) >= tau).mean()
        coverage = float(0.5 * (cov_ab + cov_ba))
        
        overall = (
            0.2 * max_sim +
            0.5 * topk_mean +
            0.3 * coverage
        )

        similar_chunks = []
        for i, best_j in enumerate(S.argmax(axis=1)):
            score = float(S[i, best_j])
            similar_chunks.append({
                "similarity": round(score, 4),
                "text_a": chunks1[i],
                "text_b": chunks2[best_j]
            })
        similar_chunks.sort(key=lambda x: x["similarity"], reverse=True)
        
        return {
            "max": max_sim,
            "topk_mean": topk_mean,
            "coverage": coverage,
            "overall_score": round(overall, 4),
            "similar_chunks": similar_chunks
        }

    def compare_files(self, filepaths: list):
        ret = []
        for i in range(len(filepaths)):
            for j in range(i + 1, len(filepaths)):
                text1 = extract_text(filepaths[i])
                text2 = extract_text(filepaths[j])

                S, c1, c2 = self.similarity_matrix(text1, text2)
                scores = self.aggregate_similarity(S, c1, c2)

                ret.append({
                    "file_a": filepaths[i],
                    "file_b": filepaths[j],
                    "type": "text",
                    **scores
                })
        return ret
    

def main():
    file1 = "../../utils/testcases/tc1/A.txt"
    file2 = "../../utils/testcases/tc1/B.txt"
    file3 = "../../utils/testcases/tc1/C.txt"

    utils = SemanticUtils()
    results = utils.compare_files([file1, file2, file3])

    # print(json.dumps(results, indent=2))

if __name__ == "__main__":
    main()
    