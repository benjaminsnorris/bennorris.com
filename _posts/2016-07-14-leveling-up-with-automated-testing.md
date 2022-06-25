---
title:          "Leveling Up with Automated Testing"
date:           2016-07-14 09:20:00-0700
excerpt:        My latest focus in self-improvement as a software engineer
category:       General
tags:
- code
- testing
---
As I approached the end of 2015, I was thinking of my goals for 2016, and how I wanted to grow and improve as a developer. One of the main areas in which I felt like I was lacking was in automated testing. That is a topic that many developers talk about, usually with a slight sense of shame, or a tinge of regret. There is almost always a tacit acknowledgement that it is important, and we should be doing it, but for many reasons, it is not happening.

As an iOS development community, we seem to largely have not yet embraced testing. There are many notable developers who are huge proponents of testing, but there seem to be even more who are not. I was talking with a Ruby developer about why that is. He commented that without tests, he has no way to know if his code is working—there is nothing he can easily pull up to see the code in action. With iOS development, we launch the simulator, and immediately conduct a manual test. So writing automated tests feels unnecessary.

One of the most common refrains that I hear is that writing automated tests feels like writing the app a second time, but with no obvious value to the end user. The conclusion to that line of thinking is that the time would be better spent building out more features that _do_ benefit customers.

One experience that I had in late 2015 started to change my thinking about this. I participated in a [Startup Weekend](https://startupweekend.org) event in Salt Lake City, and was on a team that built a bowling app for the then-yet-to-be-released Apple TV. I had never built a game before, and I was tasked with creating the actual game play—the bowling lane, pin, balls, and logic of the game. After diving into SceneKit and figuring out how to get the ball to go down the lane and knock over pins, I had to implement scoring logic, and reset the pins correctly based on the results of the frame. The logic was fairly simple, up until the tenth frame. I realized that it was going to be extremely difficult to manually test all of the different options. So I wrote a suite of automated tests to make sure that everything worked properly. That suite saved me a number of times as I would make a tweak for something like a strike or a spare, only to find out that I had broken part of the tenth frame logic.

At the beginning of 2016, I started on a new team at my day job, and began working on a new project, [Align](/apps/align). We started with a quick prototype that had no automated testing. But as we began work on the real app, I took the time to set up a continuous integration build with [Jenkins](https://jenkins.io) and [Fastlane](https://fastlane.tools) that would run all of my tests and push to iTunes Connect for Test Flight. Then I began writing tests for every single thing that I implemented.

As I worked to maintain high test coverage, I found that writing automated tests, and thinking about writing automated tests did at least three things for me:

1. Knowing that I was writing tests made me write my code to be more testable, which helped it to be more modular and self-contained
2. Actually writing the tests helped me think of edge cases and error handling that I had not yet considered
3. Having tests already written helped me find small regressions as I made changes in the app

I worked hard to make sure that all non-UI code was as completely covered with unit tests as possible. And then I wrote UI tests both to test the UI code, and also to serve as integration tests for the whole app. There were a number of configuration things that I had to set up, and I hope to discuss those in future posts. Having a comprehensive suite of unit and UI tests has already saved me from some major bugs. I have made significant changes to the architecture and organization of the project, and have been able to verify within seconds where I had introduced problems in the app, or verify with confidence that everything was still working.

One practice that I have been pushing myself to adopt more is [test-driven development](https://en.wikipedia.org/wiki/Test-driven_development) or TDD. This has been most useful when discovering or hearing about a bug in the app. I write a failing test that highlights where the error is, and then write the code to fix the behavior. That way, I know when it is fixed, and that it will not break again in the future. When writing new code, TDD is often more difficult. I will create the basic objects that I need, and then write test methods whose names describe the behavior I want to have in the app. I will then add the property and functions necessary to define the API and write failing tests that illustrate what I expect to happen. Finally, I actually fill our the functions so that the tests pass. Invariably, there is some back and forth as I tweak the tests and tweak the code before everything is working properly.

Having a project with a robust test suite is such a comfort that I never want to go back. When I work on other projects that do not have tests in them, I start to get anxious and worry that I am breaking things without knowing about it. I have found that starting by adding some simple tests around any new behavior, or to illustrate bugs that are found is a great way to get started. You do not have to have the perfect project with complete test coverage in order to start reaping the benefits of automated tests. I look forward to learning more about testing and sharing more of what I am learning along the way.
