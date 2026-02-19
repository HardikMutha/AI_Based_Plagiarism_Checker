from app.extensions import mongo

def save_papers(papers):
    if papers:
        mongo.db.papers.insert_many(papers)