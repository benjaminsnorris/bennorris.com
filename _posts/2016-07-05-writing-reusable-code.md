---
title:          "Writing reusable code"
date:           2016-07-05 14:10:00-0700
excerpt:        Make your own life easier by focusing on writing code that you can reuse in multiple projects
category:       General
tags:           code
---
At the beginning of this year, I was put on a new team at work. We had the chance to a build a project completely from scratch. When I joined the team, they had already spent a few months interviewing potential customers and learning about the market, and were ready to build a prototype. I was tasked with creating a quick, simple version of the app that stored all data locally. I knew that I would be rebuilding the app a couple times, or at least refactoring major portions of the app. So I set out to build portions of the app in ways that I could easily reuse them multiple times, and across multiple projects.

One thing that has made this easier is that my employer has been generous in allowing large portions of my work to be open-source. As I worked on my project, I was conscious to separate app-specific code from reusable pieces that could be made into frameworks or libraries.

One of the first areas that I tackled was to create a network stack built on top of `NSURLSession` that provided a simple interface to make network requests. The end result is somewhat specific to our projects at O.C. Tanner, but we made it open-source in case it is useful to anyone else: [ios-network-stack](https://github.com/octanner/ios-network-stack).

Since then, I have made a number of libraries that I use across different apps. Most of the libraries are not to the level that I would like yet—I need to add automated tests, better code documentation, and useful readme files. But I have learned a number of things in creating and using these libraries, and thought it would be useful to go through some of the pros and cons.


## Cons

### Dependency management
For a long time, I resisted adding any dependencies to my projects. It felt much simpler to just focus on the project at hand, and build anything that was needed specific to the project. Dealing with a system such as [Cocoapods](https://cocoapods.org/) or [Carthage](https://github.com/Carthage/Carthage) felt like too much overhead. Part of my reaction came from working on projects where previous developers had pulled in so many dependencies that the project became unwieldy and difficult to update and maintain. We experimented with different approaches and finally landed on using Carthage and Git submodules, which I [described earlier]((https://bennorris.com/2016/06/02/using-carthage-to-add-third-party-code/)).

Part of the key in managing dependencies reliably is being able to choose when to update those dependencies. If your code changes out from under you when you are not expecting it, development becomes much more difficult. Using Carthage and submodules means that I decide exactly when to update, and can choose which version of a given dependency to keep in my project. So if I need to use an older version for compatibility issues, or an experimental branch, that is easy to do.

### Extra time cost
One of the biggest frustrations with adding dependencies is the additional time investment at the beginning of a project. Especially if something goes wrong, it can be extremely frustrating to want to just start coding, and instead have to deal with dependency problems.

Again, this is one of the reasons that I have decided on the system that I currently use. I use [Tower](https://www.git-tower.com/) as a Git client, and it has made working with submodules extremely simple. If someone needs to check out the repo, they can just initialize the submodules, and they will have the entire project set up and ready to go. When starting a project, it is a simple process to set up the project, although there are a number of steps that can feel intimidating at first.

### Maintenance
One significant issue that you have to be aware of when creating open-source projects is the possibility that they will become successful. Once an open-source project starts being used by more people, and especially when they start contributing, it requires much more of a time investment. There will come pull requests to review and merge, issues to triage, and questions to answer. Hopefully this also comes with the benefit of having the code improved by getting more real-word usage, and contributions back to the project. But as the project creator, you have to evaluate whether the benefit will be worth the cost.

## Pros

### Quicker project spin up
In practice, I have found that the time balance comes out in favor of using dependencies. I only have a few third-party libraries that I am pulling in—many of my dependencies are internal libraries that I maintain and share across my projects. Splitting that code out into reusable libraries means that in each project, I can focus on the app-specific logic. I have been able to get new projects started much faster as a result.

### Increased testability
Since I am using mainly internal libraries, this is code that I would have written anyway for each app. But since I am creating libraries, by necessity, it is decoupled from app logic, and more modular, making it easier to test. This has the benefit of creating more maintainable code and spending less time down the road debugging and fixing issues.

### Community contribution
Even though many of my frameworks and libraries are only used by myself at this point, the fact that I am creating them as open-source projects means that they are available to the community. As I find interesting approaches to problems, or identify areas of boilerplate code that can easily be reused, it is a great feeling knowing that I am making it possible for others to benefit from that as well.

Of course, since I am still enjoying the [luxury of obscurity]({ %post_url 2016-05-31-the-luxury-of-launching-into-obscurity %}), I do not feel the pressure of having all of my projects perfectly documented, tested, and maintained. I still plan on working toward that goal, but I know I have time. At this point, creating reusable libraries has given me great personal benefit, and I look forward to helping others as well in the future.
