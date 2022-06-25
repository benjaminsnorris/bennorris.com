---
title:          "The value of iOS test-driven development (TDD)"
date:           2016-09-02 13:00:00-0700
excerpt:        Starting with tests helps you write better code
category:       General
tags:
- code
- testing
---

This will not come as a surprise to most people—writing tests makes your code better. I have come to appreciate this more over the past few months, as I wrote about [previously](https://bennorris.com/2016/07/14/leveling-up-with-automated-testing/). Also not a surprise—writing tests first makes your code even better. From my experience with iOS developers, while we might know this, most of us do not do it. Even after coming to see the value, it is easy to skip straight to writing the code. I had an experience this week that highlighted the value of this for me again, and wanted to pause and reflect before allowing myself to lose the lesson.

## The story
I wrote earlier this week about [handling live text reload elegantly](https://bennorris.com/2016/08/31/handling-live-text-reload-elegantly/), and wanted to share a bit more about the process I went though. It went something like this:

1. 💡 Think of a great idea to add to the app
1. 🖥 Write the code to update text and preserve cursor position
1. ⌨️ Write tests to verify my code worked properly
1. 🎊 Bask in the illusion of completion
1. 🙄 Step away from the project and realize I should probably support text selection as well
1. ⌨️ Write failing tests for all the scenarios I could think of
1. 🖥 Implement the logic for text selection
1. 😒 Run the tests and realize I had broken cursor position support
1. 😅 Repeat previous two steps until everything passed
1. 🎉 Write an exultant blog post

## The realization
After I was done, it hit me how different it was to write the code before the tests instead of vice versa. When the code came first, my tests just verified my code. I had come up with all the scenarios I thought I needed to support, and had coded them, so I just made sure that they worked as I intended.

However, when I wrote the tests first, it was a completely different mental exercise. I was not worried about how I was going to implement the different scenarios—I was just focused on thinking of all possible scenarios. Not only did I think of many different cases for text selection, but I realized that I had omitted a number of cases for cursor position as well.

## The takeaway
My adherence to [TDD](https://en.wikipedia.org/wiki/Test-driven_development) has ebbed and flowed over time. It is easy to want to jump straight into writing the code and seeing something work in the simulator. But taking the time at the beginning to consider the desired behavior, and writing tests for that behavior makes for better code and fewer rewrites and regressions.

Sometimes, it can feel impossible to start with tests. Your tests will not compile if the objects they are testing do not exist yet. One approach that has worked well for me is to start by writing descriptive function names for tests, and then moving on to writing the rest of everything. The process looks something like this:

1. Create a test case class and write empty test functions
1. Create objects with properties and stubbed functions
1. Fill in failing tests to verify behavior
1. Implement the functions and logic needed for the tests to pass
1. Adjust tests and code as needed

One of the most exciting aspects to programming is how much you learn while you are working through something. Invariably, you will have to make changes to the tests as you think through the implementation details. The trick is to make sure that your tests remain focused on the behavior, and not the actual implementation details. That way, if you refactor the implementation, your tests can still verify that the behavior remains intact.

## The conclusion
A major benefit to using this approach is that it helps you write more reusable code, which has been a [focus of mine](https://bennorris.com/2016/07/05/writing-reusable-code/) lately. You still need to learn about good design patterns and best practices. But starting with your tests means that you are exercising the API from the beginning, and that will help you think through having a good API as you build it.

Part of my purpose in writing this post is to help myself recommit to TDD in all of my projects. It is too easy to get lazy and skip the tests altogether. That is part of why I have put build, coverage and version badges on all of my open-source project pages on this site. I am hoping that the shame of not having tests and builds and coverage will help motivate me to get this done quickly. My future self will thank me later.
