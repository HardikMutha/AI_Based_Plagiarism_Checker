from datasketch import MinHash, MinHashLSH
from typing import List
import json
import sys
from pathlib import Path
from app.utils.extract_files import extract_text

sys.path.append(str(Path(__file__).resolve().parents[3]))


class MinHashUtils:

    """
        USAGE:

        import MinHashUtils from min_hash

        minHash = MinHashUtils()
        minHash.compare_files([filePath1, filePath2, filePath3])
        minHash.query_similar(newFilePath)
    """

    def __init__(self, num_perms: int = 128, threshold: float = 0.5, k: int = 5):
        self.docs = []              # stores shingled documents
        self.filepaths = []         # stores filepaths
        self.raw_lines = []         # stores sentence-split lines per document
        self.num_perms = num_perms
        self.threshold = threshold
        self.k = k
        self.hashes = []
        self.lsh = MinHashLSH(threshold=self.threshold, num_perm=self.num_perms)

    def shingle(self, text: str) -> set:
        """
        Convert text to a set of k-shingles (character n-grams).
        """
        text = text.lower().replace('\n', ' ').replace('\t', ' ')
        text = ' '.join(text.split())

        if len(text) < self.k:
            return {text}

        return set(text[i:i + self.k] for i in range(len(text) - self.k + 1))

    def shingle_line(self, line: str) -> set:
        """
        Shingle a single line/sentence using word-level bigrams rather than
        character shingles, which are more robust for short text.
        """
        line = line.lower().strip()
        words = line.split()
        if not words:
            return set()
        if len(words) == 1:
            return {words[0]}
        return set(f"{words[i]} {words[i+1]}" for i in range(len(words) - 1))

    def extract_lines(self, text: str) -> List[str]:
        """
        Split text into meaningful chunks. Handles both well-formatted text
        (newline-separated) and extracted blobs (sentence-split by punctuation).
        Falls back to sentence splitting if few/no newlines are detected.
        """
        lines = [l.strip() for l in text.splitlines() if l.strip()]

        # If the text came out as a blob (e.g. from PDF extraction),
        # there will be very few lines relative to word count.
        word_count = len(text.split())
        if len(lines) < max(3, word_count // 50):
            import re
            sentences = re.split(r'(?<=[.?!])\s+', text.strip())
            lines = [s.strip() for s in sentences if s.strip()]

        # Filter out lines that are too short to be meaningful (< 4 words)
        return [l for l in lines if len(l.split()) >= 4]

    def get_similar_lines(
        self,
        lines_a: List[str],
        lines_b: List[str],
        min_line_similarity: float = 0.25
    ) -> List[dict]:
        """
        Find lines that are similar between two documents using word-bigram
        Jaccard similarity. Each line from file_a is matched to its single
        best counterpart in file_b (if above threshold).
        """
        similar = []
        seen_a = set()

        for i, line_a in enumerate(lines_a):
            shingles_a = self.shingle_line(line_a)
            if not shingles_a or line_a in seen_a:
                continue

            best_match = None
            best_match_idx = None
            best_score = 0.0

            for j, line_b in enumerate(lines_b):
                shingles_b = self.shingle_line(line_b)
                if not shingles_b:
                    continue

                intersection = len(shingles_a & shingles_b)
                union = len(shingles_a | shingles_b)
                score = intersection / union if union else 0.0

                if score >= min_line_similarity and score > best_score:
                    best_score = score
                    best_match = line_b
                    best_match_idx = j

            if best_match:
                seen_a.add(line_a)
                similar.append({
                    "line_a": i + 1,
                    "line_b": best_match_idx + 1,
                    "similarity": round(best_score, 4),
                    "text_a": line_a,
                    "text_b": best_match,
                })

        return similar

    def get_hashes(self):
        """
        Create MinHashes and build LSH index.
        """
        self.hashes = []
        self.lsh = MinHashLSH(threshold=self.threshold, num_perm=self.num_perms)

        for i, shingles in enumerate(self.docs):
            m = MinHash(num_perm=self.num_perms)
            for shingle in shingles:
                m.update(shingle.encode('utf8'))

            self.hashes.append(m)
            self.lsh.insert(i, m)

    def query_similar(self, filepath: str):
        """
        Query similar documents using a new file.
        """
        if not self.hashes:
            self.get_hashes()

        text = extract_text(filepath)
        shingles = self.shingle(text)
        lines = self.extract_lines(text)

        m = MinHash(num_perm=self.num_perms)
        for shingle in shingles:
            m.update(shingle.encode('utf8'))

        result = self.lsh.query(m)

        if filepath not in self.filepaths:
            self.filepaths.append(filepath)
            self.docs.append(shingles)
            self.raw_lines.append(lines)
            self.hashes.append(m)
            self.lsh.insert(len(self.hashes) - 1, m)

        similar_docs = {
            "similar_files": [self.filepaths[i] for i in result],
            "count": len(result)
        } if result else {
            "similar_files": [],
            "count": 0
        }

        return similar_docs

    def get_pairwise_similarity(self):
        """
        Returns Jaccard similarity and similar lines between each document pair.
        """
        if not self.hashes:
            self.get_hashes()

        ret = []
        for i in range(len(self.hashes)):
            for j in range(i + 1, len(self.hashes)):
                sim = self.hashes[i].jaccard(self.hashes[j])
                similar_lines = self.get_similar_lines(
                    self.raw_lines[i],
                    self.raw_lines[j]
                )

                verdict = "LIKELY NOT PLAGIARISED"
                overall = round(sim, 4)
                print(overall)
                if overall >= 0.40:
                    verdict = "POSSIBLY PLAGIARISED"
                if overall >= 0.75:
                    verdict = "LIKELY PLAGIARISED"
                if overall >= 0.90:
                    verdict = "ALMOST CERTAINLY PLAGIARISED"

                res = {
                    "file_a": self.filepaths[i],
                    "file_b": self.filepaths[j],
                    "type": "text",
                    "overall_score": overall,
                    "verdict": verdict,
                    "similar_lines": similar_lines
                }
                ret.append(res)

        return ret

    def compare_files(self, filepaths: list):
        """
        Accept filepaths, extract text, shingle, and store.
        """
        if not filepaths:
            raise ValueError("At least one file path is required")

        for path in filepaths:
            text = extract_text(path)
            shingles = self.shingle(text)
            lines = self.extract_lines(text)
            self.docs.append(shingles)
            self.filepaths.append(path)
            self.raw_lines.append(lines)

        return self.get_pairwise_similarity()


def main():
    file1 = "../../utils/testcases/tc1/A.txt"
    file2 = "../../utils/testcases/tc1/B.txt"
    file3 = "../../utils/testcases/tc1/C.txt"

    utils = MinHashUtils()

    print(json.dumps(utils.compare_files([file1, file2, file3]), indent=2))
    print(json.dumps(utils.query_similar(file1), indent=2))


if __name__ == "__main__":
    main()