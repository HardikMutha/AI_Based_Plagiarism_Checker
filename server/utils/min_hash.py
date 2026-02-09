
from datasketch import MinHash, MinHashLSH
from typing import List

class MinHashUtils:
    
    def __init__(self, num_perms: int = 128, threshold: float = 0.5, k: int = 5, docs: List[str] = None):
        if docs is None or len(docs) == 0:
            print("Need Docs!")
            raise ValueError("At least one document is required")

        self.k = k 
        self.docs = []

        for doc in docs:
            self.docs.append((self.shingle(doc)))
        self.num_perms = num_perms
        self.threshold = threshold
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
        
        return list(set(text[i:i+self.k] for i in range(len(text) - self.k + 1)))


    def get_hashes(self):
        self.hashes = []
        self.lsh = MinHashLSH(threshold=self.threshold, num_perm=self.num_perms)
        for i, doc in enumerate(self.docs):
            m = MinHash(num_perm=self.num_perms)
            for d in doc:
                m.update(d.encode('utf8'))
            self.hashes.append(m)
            self.lsh.insert(i, m)  # Index while creating hashes


    def create_lsh_index(self):
        if not self.hashes:
            self.get_hashes()
        for i, m in enumerate(self.hashes):
            self.lsh.insert(f"doc_{i}", m)
    
    def query_similar(self, doc_content: str):
        if not self.hashes:
            self.get_hashes()
        m = MinHash(num_perm=self.num_perms)
        for d in self.shingle(doc_content):
            m.update(d.encode('utf8'))
        result = self.lsh.query(m)

        # add the query document to the index for future queries
        # This section ensures that any new file can 
        self.hashes.append(m)
        self.lsh.insert(len(self.hashes) - 1, m)  # Index while creating hashes

        if(doc_content not in self.docs):
            self.docs.append(self.shingle(doc_content))
        print("Approximate neighbours with Jaccard similarity > 0.5", result)
        return result

            
    def get_pairwise_similarity(self):
        """
            Returns jaccard similarity between each document
        """
        if not self.hashes:
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
    
    print("Pairwise Jaccard Similarities (3 docs):")
    print(similarities)

    doc4 = "My name is Aryan"
    query_result = utils.query_similar(doc4)
    print("Documents similar to doc4:", query_result)

    doc5 = "the frog in the dog"
    query_result = utils.query_similar(doc5)
    print("Documents similar to doc5:", query_result)

    doc6 = "the frog in the cat"
    query_result = utils.query_similar(doc6)
    print("Documents similar to doc6:", query_result)

    print("\nPairwise Jaccard Similarities (6 docs):")
    similarities = utils.get_pairwise_similarity()  # Recalculate!
    print(similarities)


if(__name__ == "__main__"):
    main()