"""
Layer 2 — XGBoost inference wrapper.

Loads the trained model + scaler once and exposes a lightweight
predict() function.  No GPU required.
"""

import os

import joblib
import numpy as np

from config import MODEL_PATH, SCALER_PATH
import feature_extractor

_model = None
_scaler = None


def _ensure_loaded():
    global _model, _scaler
    if _model is not None:
        return

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Trained model not found at {MODEL_PATH}. "
            "Run train_classifier.py first."
        )

    _model = joblib.load(MODEL_PATH)
    _scaler = joblib.load(SCALER_PATH)


def predict(features: dict[str, float]) -> dict:
    """
    Given a feature dict (from feature_extractor.extract), return
    {"probability": float, "label": int}.
    """
    _ensure_loaded()

    arr = np.array(
        [features[name] for name in feature_extractor.FEATURE_NAMES],
        dtype=np.float64,
    ).reshape(1, -1)

    arr_scaled = _scaler.transform(arr)
    prob = float(_model.predict_proba(arr_scaled)[0, 1])
    label = int(prob >= 0.5)

    return {"probability": prob, "label": label}


def predict_text(text: str) -> dict:
    """Convenience: extract features then predict in one call."""
    features = feature_extractor.extract(text)
    return predict(features)

if(__name__=="__main__"):
    text = """
    On a rainy Thursday afternoon, Mrs. Desai realized her necklace was gone.

It wasn’t just any necklace. The pendant was a small gold leaf, thin as a whisper, with a tiny emerald at its center. Her husband had given it to her on their first Diwali after marriage, saying, “So you’ll always carry a piece of spring, even in winter.” She had worn it almost every day for thirty years.

Now the spot at her collarbone felt unbearably light.

She noticed it in the kitchen when she reached up to straighten her dupatta. Her hand brushed skin instead of the cool, familiar gold. She froze. The world seemed to narrow: the ticking clock, the kettle hissing, the soft drum of rain on the window—all suddenly distant and irrelevant.

The necklace was gone.

She checked the obvious places first: the hook by the mirror, the jewelry box on her dresser, the bowl by the sink where she sometimes left it while washing dishes. Nothing. She began to retrace her steps, lips moving in a whisper.

“I wore it in the morning. I remember touching it when I watered the plants. I had it when I left for the market. I’m sure I did.”

Her seventeen-year-old daughter, Meera, found her on her knees in the living room, peering under the sofa.

“Maa? What happened?”

“My necklace,” Mrs. Desai said. “The gold one. I can’t find it.”

Meera blinked, sensing the tremor in her mother’s voice. That necklace, to her, was as much a part of her mother as her gentle scolding and soft hands. “Okay,” she said, setting her phone aside. “We’ll find it. Let’s think.”

They searched the house first. Cushions were lifted, carpets rolled back, laundry baskets tipped onto the bed. Meera crawled under the bed and came out with dust bunnies clinging to her hair.

“No,” Mrs. Desai said, more to herself than to her daughter. “It must be somewhere. Things don’t just vanish.”

But sometimes, they do, Meera thought, watching the worry carve deeper lines into her mother’s face.

“Where did you go today, Maa?” she asked gently.

“Just the market. Groceries. The tailor’s shop. And I stopped at the temple.”

Meera grabbed an umbrella. “I’ll come with you. We’ll ask around.”

The rain had softened to a drizzle as they stepped outside. The small lane leading to the main market smelled of wet dust and frying samosas. They walked quickly, eyes scanning the ground for any glint of gold, though they both knew the chances were thin.

They started at the vegetable stall.

“Namaste, Kaka,” Mrs. Desai said, trying to keep her voice steady. “I think I lost my necklace. Have you seen anything?”

The vegetable seller frowned kindly. “No, behenji. But I will look. Ask at the next stall too. Sometimes people leave things with us.”

At every stall they repeated the question, and at every stall they were met with sympathetic head shakes.

“It’s small, beta,” one woman said. “In this mess, who can say?”

At the tailor’s shop, the tailor paused his stitching and walked around the cramped space, checking the floor for them.

“I’m sorry, madam,” he said. “If anyone finds such a thing, they will surely sell it. Gold doesn’t stay lost for long.”

The words hit Mrs. Desai harder than he intended.

By the time they reached the temple at the end of the street, the drizzle had stopped. The steps were still damp, reflecting the faint orange glow of the lamps inside. They removed their shoes and stepped in.

The temple was quiet, the usual crowd thinned by the weather. Mrs. Desai pressed her palms together before the deity, trying to pray, but her thoughts kept circling back to the gold leaf that no longer rested at her throat. It wasn’t just its material worth; it was thirty years of mornings and evenings, festivals and quiet days. It was her husband’s younger smile, his nervousness when he had fastened it around her neck for the first time.

Beside her, Meera closed her eyes, not quite praying, but wishing fiercely.

When they stepped back outside, the sky was turning the color of wet cement fading into dusk.

“Maybe we should ask Panditji,” Meera suggested.

They found the priest sweeping water away from the temple steps.

“Panditji,” Mrs. Desai said, “I was here this morning. I might have lost my necklace. Could you ask if anyone—”

The priest’s eyes lit with recognition. “Gold leaf pendant?” he asked.

Mrs. Desai’s heart stopped. “Yes! Yes, that’s it.”

He nodded slowly. “A boy brought it to me around noon. Said he found it on the steps. I kept it with the donation box, but when I checked again an hour later, it was gone.”

“Gone?” Meera’s voice rose. “Someone took it?”

The priest spread his hands helplessly. “Many people come and go. I don’t know who. I am sorry, behenji. I thought someone might return to claim it.”

For a moment, the world tilted. The faint hope Mrs. Desai had been holding onto slipped away. She could almost see the necklace in someone else’s pocket now, weighing heavier as they walked away from the temple.

“Thank you, Panditji,” she managed, her voice small.

They walked home slowly this time, the streetlights flickering on above them. Meera kept glancing at her mother’s face, seeing the stiffness in her jaw, the glint of unshed tears in her eyes.

“Maa…” she began.

“It’s my fault,” Mrs. Desai said bluntly. “I should have been careful. Such an important thing, and I was careless.”

“It’s not your fault someone took it,” Meera said. “You didn’t drop it on purpose.”

“But I lost it,” her mother muttered.

They walked the rest of the way in silence.

That night, after dinner, Meera found her mother sitting on the edge of the bed, holding an old photo album. She had opened it to a picture of herself at twenty-five, wearing a simple sari and the new gold leaf pendant shining at her throat. Her husband stood beside her, his arm half-extended as if he had just stepped back after fastening the clasp.

“He didn’t have much money then,” Mrs. Desai said, without looking up. “But he saved for months. He said, ‘It’s not big, but it’s ours.’”

Meera sat down beside her. “Baba would say it’s just a thing,” she said quietly. “He’d say the important part is the person who gave it and the person who wore it.”

Mrs. Desai smiled faintly. “You’re starting to sound like him.”

“He always said it,” Meera went on. “Remember when I broke his favorite mug? You were so upset, but he laughed and said, ‘It’s just a mug. I still have the tea-drinkers.’”

Her mother huffed a small, reluctant laugh.

“That necklace… it felt like a piece of him,” Mrs. Desai admitted. “And of me. Of us.”

“It still is,” Meera said. “You just… carry it differently now.”

Her mother said nothing, but she closed the album and set it aside, her fingers lingering over the cover.

The next morning, the house was quieter than usual. Meera woke to the smell of cardamom tea and found her mother already dressed, hair neatly tied back, making parathas as if everything were normal. The absence of the necklace at her throat seemed louder than it had yesterday.

“Maa,” Meera said, “I’ve been thinking.”

“That sounds dangerous,” her mother replied automatically, and they both smiled.

“Seriously,” Meera said. “What if we… make a new one?”

Her mother frowned. “We can’t replace that necklace, beta.”

“I know,” Meera said. “But maybe we don’t have to ‘replace’ it. We can… continue it.”

“Continue it?”

“Like a second chapter,” Meera said. “We’ll design a pendant together. Something that still has a leaf. And maybe something of yours, something of mine.”

Her mother looked unconvinced. “Gold is expensive. We shouldn’t—”

“We’ll start small,” Meera interrupted. “I have some savings from my tutoring. You can add a little. It doesn’t have to be big. Baba’s first necklace wasn’t big either, right?”

Mrs. Desai stared at her daughter, caught between practicality and the unexpected warmth blooming in her chest.

“What would it look like?” she asked at last.

Meera’s face lit up. She pulled out a notebook from the counter and began to sketch clumsily. “Okay, so… a small leaf, like before. But this time, we add a second, smaller leaf next to it. For me. Two leaves hanging side by side. And maybe… inside the bigger leaf, we engrave a tiny ‘R’ for Rakesh. Inside the smaller one, an ‘M’ for Meera. Or for Maa. Or both.”

The drawing was messy, the lines uneven, but something about it made Mrs. Desai’s throat tighten.

“It’s not very good,” Meera said quickly, embarrassed. “We can ask a real jeweler to design it properly. I just mean… the idea. That we make something new together, that still remembers him.”

Mrs. Desai touched the page gently, tracing the two leaves with her fingertip.

“I lost the first necklace,” she said softly. “I don’t want to lose this one too.”

“You won’t,” Meera said. “Because this time, I’ll help you hold on to it.”

Over the next week, they visited jewelers, some too expensive, some impatient, some uninterested in anything so small. Finally they found a tiny shop at the far end of the bazaar, one that most people missed. The sign above the door was faded, but the glass inside was clean, and the man behind the counter listened more than he spoke.

Meera unfolded her sketch, and they tried to explain: the old necklace, the lost pendant, the husband who saved for months, the temple steps, the boy who found it, the hand that stole it, the empty space at her mother’s throat, the idea of two leaves instead of one.

The jeweler nodded slowly, then pulled out a blank sheet and began to sketch himself, refining the lines, making the leaves delicate but sturdy, the chain light but strong. He suggested a small emerald in the larger leaf, like the original pendant, and a tiny white stone—nothing too expensive—in the smaller one.

“This one for memory,” he said, pointing to the first. “And this one for tomorrow.”

Mrs. Desai swallowed hard. “How much will it cost?”

He named a price that made her wince, but before she could say anything, Meera spoke.

“We’ll manage,” she said. “We’ll give an advance today. The rest when it’s done.”

They counted money on the counter: Mrs. Desai’s careful notes, Meera’s crumpled ones, some coins, a quiet agreement.

As they walked home, the loss of the old necklace no longer felt like an empty ache, but like a bruise slowly fading.

Two weeks later, the new necklace was ready.

When the jeweler placed it in her palm, Mrs. Desai stopped breathing for a moment. It was simple, lighter than the old one, but in its own way, just as precious: two leaves, one slightly larger, one tucked close beside it, an emerald shining softly, a smaller stone catching the light.

“Try it on,” he said.

Her fingers trembled as she fastened the clasp. The metal lay cool against her skin, then slowly warmed. She saw herself in the small mirror behind the counter: older than in the photos, lines at the corners of her eyes, streaks of gray in her hair—but still herself, and now with something new resting where the old necklace had once been.

“How does it feel?” Meera asked.

Different, she thought. And yet… right.

“It feels,” she said carefully, “like I have not lost everything. Like… I have carried something forward.”

That evening, standing by the window, watching the sky turn from gold to violet, she reached up and touched the pendant instinctively. For a heartbeat, her fingers expected the old gold leaf. But they met new shapes instead—two leaves instead of one, two stories overlapping.

She thought of her husband, of his laughter, his awkwardness, his serious face when he fastened the first necklace around her neck. She thought of the boy who had found it and done the right thing, only for someone else to take it. She thought of the priest’s helpless shrug, the wet temple steps, the ache in her chest.

Most of all, she thought of Meera, kneeling on the dusty floor searching under the bed, walking beside her in the rain, sketching shaky leaves on a page, saying, “We can continue it.”

She realized, slowly, that what she had really lost was not the gold itself, but the illusion that memories needed objects to survive.

The first necklace was gone. It might lie in a drawer somewhere, or have been melted into something unrecognizable. But the moment it was given, the years she wore it, the way her husband’s fingers had fumbled with the clasp—that all still lived, unchanged, inside her.

Now, when people noticed the new necklace and asked about it, she would smile and say, “It’s a story of two leaves. One for what I had, and one for what I still have.”

She no longer said, “I lost my necklace,” the way she had that first day, with panic and regret. Instead, if the past came up, she’d say, “Once, I lost a necklace on the temple steps. It found a different life, I suppose. And I found this one.”

The loss had not vanished. It never would. But it had shifted, becoming part of a longer tale—one where a stolen piece of gold, a rainy afternoon, and a daughter’s insistence on beginning again turned grief into something quieter, something that, like the pendant at her throat, rested gently instead of weighing her down.
    """
    data = predict_text(text)
    print(data)