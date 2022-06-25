---
title: "🧪 UI-TDD with Xcode"
date: 2018-08-14 08:46:00-0600
tags:
- testing
- video
category: General
---

Last week I had the opportunity to present at our local Cocoaheads meetup. At work, I have been focused on testing more as of late, and have been working to get our UI tests in much better shape.

I adapted an approach that our Test Engineering department has been taking with automated tests for our web apps. Essentially, we create a page object to represent each screen in the app, and include all of the elements, actions, and verifications needed for that screen. Then the actual UI tests just reference the page objects using the exposed API of actions and verifications. As an example, this has changed a call from this:

`XCUIApplication().tables.children(matching: .cell).element(boundBy: 0).staticTexts["2018-07-03 20:45:14 +0000"].tap()`

to this:

`.tapOnCell(at: 0)`.

I have really enjoyed the productivity boost this has given us, along with the safety and security of good test coverage and wanted to share this approach with the community. Included below is a PDF of my presentation.

[UI TDD Presentation (5 MB)](https://media.bennorris.org/images/bennorris/uploads/2019/7140e68aef.pdf)

*Update:* The talk was recorded and can be viewed here:

<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/MQID07Xn23o" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>