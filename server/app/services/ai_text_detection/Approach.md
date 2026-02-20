### Approach

Firstly we can -> Have a look at common traits like em-dashes and emojis and some more stuff which AI generally does in the output (parameters are configurable).
Then the following things come into play :-

### 1. Advanced NLP (The "Texture" Layer)

Instead of one big model, use small scripts to extract these features:

- **Token Frequency Ratios:** AI has "favorite" transition words (e.g., _furthermore, in conclusion, notably_). Build a dictionary of these and calculate their density.
- **Syllable Dispersion:** Humans have erratic rhythms. AI tends to balance sentence complexity. Measure the standard deviation of syllables per word across the text.
- **Punctuation DNA:** Look for "perfect" hyphenation and consistent Oxford comma usage. AI is almost never inconsistent with its own style guide; humans are.

### 2. Machine Learning (The "Ensemble" Layer)

Don't use a heavy LLM to classify. Use a **Random Forest** or **XGBoost** classifier.

- **Why?** These are lightning-fast and run on a CPU in milliseconds.
- **Input:** Feed it the "Texture" features you extracted in step 1 (numbers like Syllable Variance, Punctuation Density, and Word Frequency).
- **Output:** A probability score.

### 3. Pattern Recognition (The "Logic" Layer)

This is where you catch the big models like Gemini 3.

- **Semantic Drift:** AI often stays "too on-topic." Use a tiny embedding model (like `all-MiniLM-L6-v2`) to check the similarity between the first and last paragraph. If the "semantic distance" is too uniform, it’s likely AI.
- **Logic Loops:** AI tends to restate the prompt's premise in the middle of the response. A simple "Cosine Similarity" check between the input query and segments of the output can flag this.

⇒ Some Limitations -

- Perplexity is **model-dependent** (GPT-style text may look human to another model). Also the problem of trust is highlighted here. “How can you trust another AI to tell whether a text is AI or not”.

→ Tools like copyleak - use the above defined metrics only to check for ai-plag but with larger models and better compute. They are also behind a huge paywall. This makes there results somewhat more accurate.

So the best we can achieve as of now is flagging “Potentially AI-generated content” and then marking it for human review. This will filter out a large chunk of the assignments and reduce the evaluators work.
