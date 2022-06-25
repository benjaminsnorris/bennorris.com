---
layout:         app
title:          Align
date:           2018-03-28
release_date:   2016-12-19
update_date:    2018-03-28
sub_title:      Simple and powerful one-on-one tool for managers
permalink:      /apps/align/
---

## Backstory
[Tanner Labs](http://labs.octanner.com) is a research and development group inside of [O.C. Tanner](http://www.octanner.com), which is a global rewards and recognition company. The purpose of Tanner Labs is to explore new product opportunities that could one day fit in with our existing offerings at O.C. Tanner to help companies recognize and encourage great work. Starting around October 2015, a team was formed to investigate building a tool for employee sentiment surveys. After more than 50 interviews with potential customers, the original product plan was pivoted to focus on improving managers by leveraging the one on one. Our focus is to make managers better leaders by helping them prepare for, deliver, and follow up on meaningful one on ones.

In January 2016, I was brought on the team as the sole iOS developer, along with a frontend web developer to join the product manager, designer, and backend developer that comprised the team up to that point. Our first responsibility was to meet with potential customers and assist in interviews to make sure that we understood our users and their problems thoroughly. I was tasked with creating a quick prototype that would include some of the features that we were considering. I started work on January 18, and by January 27, I had a working version using Core Data that we could deploy to start learning. In February, we started a beta version of the app using a custom Ruby on Rails backend with a React web frontend as well as the iOS app. Both the initial prototype and the beta version were distributed only to internal users at O.C. Tanner, although we continued to meet with potential customers to validate the features we were building and designing.

On April 19, we started work on the [MVP](https://en.wikipedia.org/wiki/Minimum_viable_product) of Align with a new design, and a new approach. Our backend developer moved to a different team, and instead of replacing him, we decided to hire an additional frontend web developer and use [Firebase](https://firebase.google.com) as our backend. We continued to iterate and build new features, and released version 1.0 to the App Store on September 7, 2016, as well as launched our web app.

## My role
As the sole iOS developer, it was naturally my responsibility to build the iOS app. Although a sole developer on my team, I have four other iOS developers on different product teams in O.C. Tanner that are on the mobile team with me. All of our code goes through pull requests and code reviews, to ensure that we are adhering to our style guide. I have worked to get our code building in continuous integration using [Jenkins](https://jenkins.io) and [Fastlane](https://fastlane.tools). On every commit that is pushed to GitHub, all unit and UI tests are run, and on every commit to `master`, which usually occurs via PR, a build is submitted to iTunes Connect for distribution through TestFlight.

Due to my previous experience as a UX Designer, I often work closely with our product manager and product designer to help refine the user experience of the app. Usually my main focus in this regard is to help make sure that our app is a good platform citizen, while still retaining a unique and distinctive personality.

## Special problems

### Data flow
One of the exciting challenges that we tackled with Align was the flow of data. With our decision to use Firebase, we had the opportunity to leverage socket connections to get blazing fast updates of our data. In order to take advantage of this better, I used [ReSwift](https://github.com/ReSwift/ReSwift) to manage the state of the app. This has allowed to support features such as real-time collaboration, so that managers and team members can work together in preparing agendas.

### Live text reload
One of the issues that we discovered as we tested the real-time collaboration features is that two people editing text at the same time can be extremely difficult. I wanted to make this a more magical experience, and so I took some time to investigate a better solution. I wrote two blog posts about the experience—one focused on [handling the text updating](https://www.bennorris.com/2016/08/31/handling-live-text-reload-elegantly), and one on the [automated testing involved](https://www.bennorris.com/2016/09/02/the-value-of-ios-test-driven-development-tdd).

### Split view
As with most modern projects, our designer created designs for desktop and mobile experiences. As I evaluated different options, I decided to use a `UISplitViewController` to manage app navigation. One of the user experience challenges that I wanted to tackle was to preserve the correct detail screen when adapting to different environments. I have a blank-by-design screen that is used as the detail screen until selecting an individual one on one record. Both the master and the detail views use a `UINavigationController` as needed. Once a non-blank detail screen is presented, it will continue to be presented, even when rotating from portrait to landscape or vice versa on an iPhone 6 Plus, or when changing the width in iPad split-screen multitasking. Finally, one touch that I felt strongly about was the ability to dismiss the detail view at any time. In most split view implementations, including Apple's Mail app, it is too easy to get stuck in a situation where the master and the detail do not coincide, and there is nothing the user can do about it. I was extremely pleased with how it turned out in Align.

### Authentication
Since our users will be logging in to both the web app, and the iOS app, I felt that it was important to streamline the authentication process. The app is integrated with Safari using Shared Web Credentials, something that I [wrote about](https://www.bennorris.com/2016/08/05/retrieving-ios-shared-web-credentials) so that I will not forget how to do it on future projects. It is also integrated with [1Password](https://1password.com). No matter whether users start in the iOS app, or on the web, moving from one platform to another is much easier.
