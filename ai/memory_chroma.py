import chromadb
from sentence_transformers import SentenceTransformer

# modelo de embeddings
model = SentenceTransformer("all-MiniLM-L6-v2")

# cliente Chroma (guarda datos localmente)
client = chromadb.Client(
    settings=chromadb.Settings(
        persist_directory="./ai/chroma_db"
    )
)
client.persist()
# colección (tu memoria)
collection = client.create_collection(name="hotel_memory")

def add_memory(text, id):
    embedding = model.encode(text).tolist()
    collection.add(
        documents=[text],
        embeddings=[embedding],
        ids=[id]
    )

def search_memory(query):
    embedding = model.encode(query).tolist()
    results = collection.query(
        query_embeddings=[embedding],
        n_results=3
    )
    return results["documents"]

# ejemplo
add_memory("El sistema usa PIN por habitación", "1")
add_memory("Backend en Node.js con Express", "2")

print(search_memory("cómo validamos consumos"))