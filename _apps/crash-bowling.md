---
title:          Crash Bowling
date:           2015-11-25
release_date:   2015-10-28
sub_title:      Best multiplayer bowling game on Apple TV
app_image:      https://media.bsn.design/images/apps/bowling-tv.png

---

In October 2015, I participated in my first [Startup Weekend](https://en.wikipedia.org/wiki/Startup_Weekend_(organization)) in Salt Lake City. The new Apple TV had been released to developers, but was not yet available to the general public. My group decided we should make a bowling game for the new Apple TV after doing some quick market research into the success of bowling games on the iOS App Store.

<!--more-->

Starting on Thursday evening, we did interviews with potential customers to help identify our personas and likely buyers. We set up a website and a Facebook marketing campaign, as well as reached out to multiple bloggers and tech news sites to get the app features. Since we were so close to the University of Utah, we were able to get a model of a case for the Siri remote 3D printed. And, naturally, we had to make the app as well. When the demos came on Saturday afternoon, we were able to have a young boy play our bowling game, and he jumped around after getting his first strike.

Following the Startup Weekend, I continued to work on the app with one of my friends, and we finalized it and had it in the Apple TV App Store on launch day. We were able to support single player, as well as live multiplayer mode so that you could play together with a friend from around the world.

## My role
We started with a team of twelve people, of which five were iOS developers. I was the senior iOS developer, and I was assigned to create the game part of the app. Someone else was going to handle getting the gyroscopic input from the Siri remote, and I needed to take those inputs and make the ball roll down the lane and knock over the pins and figure out what happened. I had never done a game before, or even worked with `SpriteKit` or `SceneKit`. Initially, we had planned on doing a flat, sticker-style bowling, but we decided that we wanted a full 3D experience, so I had to learn `SceneKit` in a hurry. It was an exciting challenge to figure out a new framework and implement a working game in under two days.

## Special problems

### Game play
Obviously the first issue to tackle in making a game was to figure out how to enable people to play the game. Using `SceneKit`, it was fairly simple to simulate the physics of a ball moving on a lane and crashing into pins. One of the challenges was to figure out what had happened, and when a throw was complete.

### State machine
One approach that assisted with establishing game play was creating a state machine. That was one of the keys in determining when a throw was complete by detecting where the ball was in relation to the lane. We had to account for things like gutter balls, or throws that were so soft that the ball took much longer to reach the pins. I took advantage of `GKStateMachine` to track all of the different states the player could be in while playing, and used that to drive all game logic. It was a wonderful discovery, and left me thinking of how I could use something similar for other apps I was building.
