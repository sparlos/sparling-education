# General notes from a human
## Founder notes
- accessibility - will need to be audited a fair few times by AI, probably against each game, the main site, etc etc
- accessibility features that are in modern games - think high contrast, color blindness modes, etc etc. probably need to do a grill session with the LLM to determine what would be good candidates, and then bake that into the game shell so all games can support it
- A prototype for /design-game should always have a short modal at the beginning explaining the rules of the game and anything that might be confusing to a first time player. I almost always DON'T like a prototype game at first, because it's unclear as to what I'm even supposed to do
- FE site specifically to allow everyone to try all of the games. can be separate deployment that just consumes all of the games. grid renders all playable games, maybe with a short description of each (new metadata on the game itself?) underneath
- need analytics in general so that we can track what teachers/students are doing, where things might be confusing, and how it all ties together
- need email integration (resend) to handle marketing emails & transactional
- need error handling & altering, so we can know what's going wrong behind the scenes

## Bingo Notes
- demo class should just be a 3/4, NO 5 included
- ditch learning skills, not useful information
- make it clear that misconceptions are NOT a "for sure" - perhaps "possible" in front or something like that. don't want teachers taking it at face value when the game is really just making its best guess as to why the student is struggling
  - make it clear to teachers for misconceptions that are about what the student might have been thinking (ex. "thinks a fraction with a bigger bottom number is a bigger piece") as to WHY that is - early feedback was "how can it (kindling) really know that?"
  - "what to work on next" should also be something different I think...maybe "what they could be struggling with"? something like that
- "Recognise", when an option is already checked, should show "you have already recognised --- during this term for ---". currently, it shows the default text, which is "___  recognised for ____. They'll see a sticker in their locker."
- thumbs up and thumbs down instead of smiley and sad for yes and no RE: modals. we should also make this consistent across all modals - ex. for the shell, the exit game uses a play button and a exit sign, which is very confusing

## Fraction Hop
- the guided state doesn't really help at all - counting up to the fraction that it is adds literally no value. especially since that's not what they're inputting. I think we just scratch that, and say "I added the first hop for you". and then if they fail again, clear their board, and add the second hop, etc etc.
- I think dragging is a good thing to add - I believe that will be the default interaction most students will attempt, even with the tutorial. the tutorial should be updated to show dragging. tapping should still be supported though for accessibility reasons. should also be able to drag to re-order. use whatever react library is hot for that (I think dnd kit last time I checked but look into it to see what people are using these days)
- we need to build the polish-game skill
- improper or mixed fractions as an extension/enhancement - would need to tie it to curriculum

## Cargo Line
- instead of bird's eye, from the side like the original prototype. should make more of a journey. maybe it can climb a mountain or something? that would be neat. it needs to have a defined beginning and end
## Game polish
- All games need music & punchy SFX, created by a human!
- All art will need to be swapped with better art - probably AI for now, but then eventually would like to get a real artist to make the stuff