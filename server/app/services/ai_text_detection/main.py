from detector import detect

text = """
I remember the day my grandmother taught me how to make bread. She didnt use a recipe or nothing, just kept adding flour till it felt right. Sometimes the bread came out great, other times it was kind of flat.
What I loved most was the smell filling up the whole house. My little brother would always sneak into the kitchen trying to grab a piece before it cooled down. 
Mom would yell at him but grandma just laughed and would cut him a slice anyway.
Thats the thing about family traditions I guess. 
They are not perfect and they dont need to be. The messy parts are what make them real.
"""


text2 = """
did they do it behind the scenes about the buried alive? like did they actually have to stay laying down in a prone position the entire time and how many hours were they there and what happened if they have to go to the bathroom, especially the women?

and were they given drinks and food although I would suspect drinks would make the situation much worse given the bathroom question ?

personally, I have family members who were claustrophobic and would think it would absolutely cause them to quit the show which would be unfair if that was the case, in my opinion. I mean, even if the coffin had a few extra feet on either side, it does seem an extreme position to put people in. This is not supposed to be fear factor. I’m wondering how many hours they have to be in those coffins, especially given the one guy who took until sunset to make his decision. I heard that it rained and that they had to dig up everyone and then rebury them Sounds awful, although maybe it gave them a chance to use the bathroom, at least??
"""


result = detect(text2)

print(result)