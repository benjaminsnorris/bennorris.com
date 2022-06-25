---
layout:         app
title:          Pointedly
date:           2016-12-20
release_date:   2014-12-09
external_link:  https://bsn.design/pointedly
store_link:     https://bsn.design/download/pointedly
sub_title:      Keep score
app_image:      https://media.bsn.design/images/pointedly/pointedly.png
app_id:         933257819
permalink:      /apps/pointedly/
---

## Backstory
Pointedly is the first iOS app that I ever made, and continues to be one of my favorite projects to work on. I had the idea to make a small sample project into a real app as I found that my family needed something to keep score for our board and card games. I worked together with my oldest son, who was six at the time, to come up with the features that should be included in the app.

![Pointedly designs](https://media.bsn.design/images/pointedly/Pointedly-design-progression.png){:loading="lazy"}
_Progression of designs in Pointedly_

Initially, I designed the entire app, including the look and feel. Fortunately, before I released, I worked with [Stotion](http://stotion.com), a design agency owned by one of my good friends. They provided a new visual design that has helped the app feel much more polished and professional.


## Special problems

### Custom collection view layout
One of the key features in the app is the ability to view the history of a game, and make adjustments to rounds if needed. In order to support this view, I went through a number of different approaches. I started with a `UITableView` that included a `UICollectionView` in each cell and synchronizing the scrolling. I ended with a pure `UICollectionView` and created a custom layout. That allows for the players to stay fixed on the left, the total score fixed to the right, the round headers fixed to the top, and the rounds to scroll together.

![Pointedly history view](https://media.bsn.design/images/pointedly/pointedly-history-view.png){:loading="lazy"}

### Location integration
This is an interesting feature, because after I built it and had it working properly, I removed it. I wanted to learn more about the `CoreLocation` framework, and I thought it could be fun to have the location where you played a game saved in Pointedly. I got so caught up in learning how to build the feature that I never stopped to evaluate whether I wanted it in the app. The deciding factor for me was thinking about the kinds of reviews that I hoped to see for Pointedly. I want someone to be able to say, “It has everything you need for keeping score, and nothing else.” I realized that location fit in to the “nothing else” category, and ripped it out before shipping.
