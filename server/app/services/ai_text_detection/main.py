from detector import detect

text = """
I hate the indifferent. I believe that living means taking sides. Those who really live cannot help being a citizen and a partisan. Indifference and apathy are parasitism, perversion, not life. That is why I hate the indifferent.

The indifference is the dead weight of history. The indifference operates with great power on history. The indifference operates passively, but it operates. It is fate, that which cannot be counted on. It twists programs and ruins the best-conceived plans. It is the raw material that ruins intelligence. That what happens, the evil that weighs upon all, happens because the human mass abdicates to their will; allows laws to be promulgated that only the revolt could nullify, and leaves men that only a mutiny will be able to overthrow to achieve the power.

The mass ignores because it is careless and then it seems like it is the product of fate that runs over everything and everyone: the one who consents as well as the one who dissents; the one who knew as well as the one who didn’t know; the active as well as the indifferent. Some whimper piously, others curse obscenely, but nobody, or very few ask themselves: If I had tried to impose my will, would this have happened?

I also hate the indifferent because of that: because their whimpering of eternally innocent ones annoys me. I make each one liable: how they have tackled with the task that life has given and gives them every day, what have they done, and especially, what they have not done. And I feel I have the right to be inexorable and not squander my compassion, of not sharing my tears with them. I am a partisan, I am alive, I feel the pulse of the activity of the future city that those on my side are building is alive in their conscience. And in it, the social chain does not rest on a few; nothing of what happens in it is a matter of luck, nor the product of fate, but the intelligent work of the citizens. Nobody in it is looking from the window of the sacrifice and the drain of a few. Alive, I am a partisan.

That is why I hate the ones that don’t take sides, I hate the indifferent.

Indifference is actually the mainspring of history. But in a negative sense. What comes to pass, either the evil that afflicts everyone, or the possible good brought about by an act of general valour, is due not so much to the initiative of the active few, as to the indifference, the absenteeism of the many. What comes to pass does so not so much because a few people want it to happen, as because the mass of citizens abdicate their responsibility and let things be. They allow the knots to form that in time only a sword will be able to cut through; they let men rise to power whom in time only a mutiny will overthrow. The fatality that seems to dominate history is precisely the illusory appearance of this indifference, of this absenteeism. Events are hatched off-stage in the shadows; unchecked hands weave the fabric of collective life – and the masses know nothing. The destinies of an epoch are manipulated in the interests of narrow horizons, of the immediate ends of small groups of activists – and the mass of citizens know nothing.

But eventually the events that are hatched come out into the open; the fabric woven in the shadows is completed, and then it seems that fatality overwhelms everything and everybody. It seems that history is nothing but an immense natural phenomenon, an eruption, an earthquake, and that we are all its victims, both those who wanted it to happen as well as those who did not, those who knew it would happen and those who did not, those who were active and those who were indifferent. And then it is the indifferent ones who get angry, who wish to dissociate themselves from the consequences, who want it made known that they did not want it so and hence bear no responsibility. And while some whine piteously, and others howl obscenely, few people, if any, ask themselves this question: had I done my duty as a man, had I sought to make my voice heard, to impose my will, would what came to pass have ever happened? But few people, if any, see their indifference as a fault – their skepticism, their failure to give moral and material support to those political and economic groups that were struggling either to avoid a particular evil or to promote a particular good. Instead such people prefer to speak of the failure of ideas, of the definitive collapse of programmes, and other like niceties. They continue in their in-indifference and their skepticism.

"""


text2 = """
🚀 *INSPIRON 5.0 IS LIVE!* 🚀
*CSI COEP’s flagship hackathon is back bigger than ever!*

Get ready to solve real-world problems, build innovative solutions, and compete for a *₹1,00,000 prize pool* 💻🔥

👥 *Team Size:* 2–4 members (inter-branch, inter-year, inter-college allowed)

 📅 Important Dates

📝 *Registration Deadline:* 18 March 2026
📤 *Idea Submission (Round 1):* 21 March 2026
📢 *Shortlist Announcement:* 28 March 2026
🏁 *Final Hackathon (Offline @ COEP):* 4-5 April 2026 (36 hours)

✨ Tracks include AI, ML, Software Systems & Smart City Solutions
🎯 Open to all UG/PG/Diploma students

🔗 Register now: [https://unstop.com/o/T4JOqXW]

Build. Innovate. Pitch. Win.
Don’t miss COEP’s biggest tech showdown! 🚀
"""


text3 = """
To bait fish withal. If it will feed nothing else, it will feed my revenge. He hath disgraced me, and hindered me half a million; laughed at my losses, mocked at my gains, scorned my nation, thwarted my bargains, cooled my friends, heated mine enemies, and what’s his reason? I am a Jew.

Hath not a Jew eyes? Hath not a Jew hands, organs, dimensions, senses, affections, passions? Fed with the same food, hurt with the same weapons, subject to the same diseases, healed by the same means, warmed and cooled by the same winter and summer, as a Christian is? If you prick us, do we not bleed? If you tickle us, do we not laugh? If you poison us, do we not die? And if you wrong us, shall we not revenge? If we are like you in the rest, we will resemble you in that.

If a Jew wrong a Christian, what is his humility? Revenge. If a Christian wrong a Jew, what should his sufferance be by Christian example? Why, revenge. The villainy you teach me, I will execute, and it shall go hard but I will better the instruction.

"""



result = detect(text3)

print(result)