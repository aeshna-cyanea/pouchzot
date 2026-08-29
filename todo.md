opening crawl manual with ? should enable full keyboard overlay. if it wasn't enabled before opening manual, disable when exiting. same for when pressing = to adjust letters. however maybe better to detect them by output rather than by sent key

add an option to immediately resume last active character when launching

unify long press-right click handling. long presses should probably be sent to handlers as right clicks once detected. is that practical?

log panel input handling- should be transparent to everything except (single left clicks/taps in the left half of the panel). all other inputs go to the underlying map.

more robust reconnection - app seems kinda flaky. think about how to test
    add console logging for network stuff, send the logs somewhere remote?
    add a control (long press esc?) to force a reconnection
    seems like it v often disconnects/hangs after switching apps

tapping character sprites on main menu should resume that character's game

make the spell memorization menu have a special keyboard like the skills menu

allow specifying a hosted url for the offline rc (cache it permanently, but check for updates whenever starting/resuming a game). Also allow specifying a local external file for default rc

tapping own tile when standing on an interactive feature sends >, or < if standing on an up stair.

swap ctrl and shift in bottom bar

when editing controls, long pressing on a key enters a special swap state- outlines it orange, outlining other keys fainter orange. pressing on another key while in swap state swaps their bindings. then resumes normal state. tapping same key again removes swap state without doing anything. swap state should work between keyboard tabs as well (tapping on tab background lets you swap it with other tabs), and between keys in different tabs. 

single tapping on already selected controls set should toggle its three dot menu

more generous touch target for minimap, also prevent the auto explore (o) key (incl with modifiers) from closing the minimap

tapping the main screen when a description is open should close it

move name/title/row/God/piety display to HP row (hidden when atheist ofc). Also hide name/title when horizontal space is scarce.

weapon and quiver display to same row if they fit. add a period character after weapon if on same row.

move all stats, noise, and timer to same row if they fit as well. but if they do not fit, try hiding str int dex first, they're fairly static. hide sh too if it's 0 and the hud is cramped. 
    check what can be hidden with rc in options_guide, otherwise give option to hide.

tapping HP bar on hud should send @, tapping stats should send %, tapping MP bar should send I (or a if we have abilities that cost mp but no spells). Tapping wielded weapon should open wield menu (w), tapping quiver should open quiver menu (Q).

tapping a status should show the description of that status (gem overview for gem timer). style clickable statuses same as other clickable text (e.g. stat selection on level up).

religion screen still has horizontal scrolling. add --- dividers between abilities, and make costs display directly after ability description.

read list of safe/ignored monsters from rc. when an unsafe monster comes into view, auto switch to a combat controls tab (specified in settings). exploring (o) switches to an exploration tab (specified in settings).

show special keyboard when aiming (see contextual help). +/- keys above dpad, maybe other keys too.

show special keyboard when (P)utting on jewelery and asked to select one

if the camera is panned so player is off screen on input (and the input is movement or an action, not a modal) then move it back the minimum amount so the player is visible and 1 full tile away from the screen edge. not sure how to do this optimally, need to check.
