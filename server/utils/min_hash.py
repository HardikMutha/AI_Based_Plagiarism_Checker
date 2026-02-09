
from datasketch import MinHash
from typing import List

class MinHashUtils:
    
    def __init__(self, num_perms: int = 128, k: int = 5, docs: List[str] = None):
        if docs is None or len(docs) == 0:
            print("Need Docs!")
            raise ValueError("At least one document is required")

        self.k = k 
        self.docs = []

        for doc in docs:
            self.docs.append((self.shingle(doc)))
        self.num_perms = num_perms
        self.hashes = []

    def shingle(self, text: str) -> set:
        """
            Convert text to a set of k-shingles (character n-grams).
        """
        text = text.lower().replace('\n', ' ').replace('\t', ' ')
        text = ' '.join(text.split())
        
        if len(text) < self.k:
            return {text}
        
        return list(set(text[i:i+self.k] for i in range(len(text) - self.k + 1)))


    def get_hashes(self):
        self.hashes = []
        for doc in self.docs:
            m = MinHash(num_perm=self.num_perms)
            for d in doc:
                m.update(d.encode('utf8'))
            self.hashes.append(m)
    
    def get_pairwise_similarity(self):

        """
            Returns jaccard similarity between each document
        """

        # Compute MinHash signatures for all documents
        self.get_hashes()
        similarities = {}
        for i in range(len(self.hashes)):
            for j in range(i + 1, len(self.hashes)):
                sim = self.hashes[i].jaccard(self.hashes[j])
                similarities[(i, j)] = sim
        
        return similarities


def main():
    doc1 = 'minhash is a probabilistic data structure for estimating the similarity between datasets'
    doc2 = 'minhash is a probability data structure for estimating the similarity between documents'
    doc3 = "the dog in the fog"
    
    utils = MinHashUtils(docs=[doc1, doc2, doc3])
    similarities = utils.get_pairwise_similarity()
    
    print("Pairwise Jaccard Similarities:")
    print(similarities)

    # utils = MinHashUtils(docs=[])
    # similarities = utils.get_pairwise_similarity()

if(__name__ == "__main__"):
    main()