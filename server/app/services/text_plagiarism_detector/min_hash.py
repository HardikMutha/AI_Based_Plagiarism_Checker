from datasketch import MinHash, MinHashLSH
from typing import List
import textract
import json
from app.utils.extract_files import extract_text


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
        self.num_perms = num_perms
        self.threshold = threshold
        self.k = k
        self.hashes = []
        self.lsh = MinHashLSH(threshold=self.threshold, num_perm=self.num_perms)
        # self.results = []

    def shingle(self, text: str) -> set:
        """
        Convert text to a set of k-shingles (character n-grams).
        """
        text = text.lower().replace('\n', ' ').replace('\t', ' ')
        text = ' '.join(text.split())

        if len(text) < self.k:
            return {text}

        return set(text[i:i+self.k] for i in range(len(text) - self.k + 1))

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

        m = MinHash(num_perm=self.num_perms)
        for shingle in shingles:
            m.update(shingle.encode('utf8'))

        result = self.lsh.query(m)
        # Optionally add new document into index
        if filepath not in self.filepaths:
            self.filepaths.append(filepath)
            self.docs.append(shingles)
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
        Returns Jaccard similarity between each document.
        """
        if not self.hashes:
            self.get_hashes()

        ret = []
        for i in range(len(self.hashes)):
            for j in range(i + 1, len(self.hashes)):
                sim = self.hashes[i].jaccard(self.hashes[j])
                res = {
                    "file_a": self.filepaths[i],
                    "file_b": self.filepaths[j],
                    "type": "text",
                    "overall_score": sim,
                    "similar_lines": []
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
            self.docs.append(shingles)
            self.filepaths.append(path)

        ret = self.get_pairwise_similarity()
        return ret
    
def main():
    file1 = "../../utils/testcases/tc1/A.txt"
    file2 = "../../utils/testcases/tc1/B.txt"
    file3 = "../../utils/testcases/tc1/C.txt"

    utils = MinHashUtils()

    print(json.dumps(utils.compare_files([file1, file2, file3]), indent=2))
    print(json.dumps(utils.query_similar(file1), indent=2))


if __name__ == "__main__":
    main()