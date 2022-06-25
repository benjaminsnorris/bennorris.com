---
layout:         app
title:          Whimmy
date:           2015-04-18
release_date:   2015-03-06
sub_title:      Invites with a fuse
app_image:      https://media.bsn.design/images/apps/Whimmy.png
permalink:      /apps/whimmy/
---

## Backstory

One of my good friends is a designer and entrepreneur, and he had the idea to build an app to encourage people to get together in person more often and more easily. We collaborated on the UX, and he did the visual design, while I did all of the coding. The custom UI that we came up with was both exciting and challenging to implement.


## Special problems

### Apple Watch app

As we built the iPhone app, the Apple Watch was announced. We knew that this app was a perfect fit for the quick interactions and rich notifications that the watch offered. I was lucky enough to attend an Apple Watch Lab that Apple offered for select developers to come prepare their apps for the new watch hardware before it was publicly announced. It was a thrilling opportunity that shaped my decision to become a full-time iOS developer.

Most of my time at the Lab was spent identifying some of the bugs in the Apple frameworks and figuring out ways to work around them. One example that I remember was related to animations. We had created a number of animations, especially for the rich notifications. At the time, the only possibility for animations was to use a series of images, but the animations did not start properly, so I had to work with some of the Apple developers there to figure out how to kick off the animations.


### Layout inception

When I built Whimmy, `UIStackView` had not yet been introduced. Similar to early web development, one of the easiest approaches to laying out the UI was to make use of tables. I ended up with a collection view, where each cell was comprised of a table view, and a couple of the table view cells in turn had a collection view. Managing all of the state and interactions was a challenge, particularly to respond to user touches on the collection view cells that were at the lowest level. In the end, I decided to use `NSNotification` to broadcast the touch event, and then allow the proper objects to respond to the touches.
