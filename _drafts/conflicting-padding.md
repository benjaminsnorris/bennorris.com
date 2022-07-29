---
title: "Conflicting padding"
date: 2022-07-28 19:00:55-0600

---

As a designer, I want developers to be on the same page with our basic standards so that we don’t waste time squabbling about minutiae.


## Explanation

Something that frustrates most developers is when designs are inconsistent. 12 pixels of padding in one place, and 16 pixels in another. 10 pixel margins sometimes, and 15 pixels at others.

Now, I recognize that this bothers me more than most people, thanks to my [OCD](https://bennorris.com/tags/ocd). But I have heard similar concerns from enough developers throughout my career to know it’s not just me.

Equally frustrating for designers is when developer don’t follow the details of a design. The designer spends time and effort ensuring that the designs feel simple and approachable, while also being clear and effective, and the developer just throws things together with seemingly no regard for the designer’s hard work.

This situation can easily happen when multiple designers work on a project. It also happens when the same designer works on different parts of a project at different times. Designers will often work on new screens, and the spacing, or sometimes even the colors or fonts, are slightly off from previous designs.

One of the best ways I have seen in my career to solve these problems (and many others!) is to develop a clear design system.

This can be as extensive as a style guide, or as simple as defining standard options for things like and spacing padding.


## Illustration

When I started working at [O.C. Tanner](https://www.octanner.com), we had a few different mobile apps, and each one looked completely different. They used different fonts, different colors, and different styles. Moving from one project to another meant significant time in coming up to speed on the unique designs of the new app.

Additionally, when a new feature was designed and developed, it was treated almost as custom one-off work. The designs (which were initially in Adobe Illustrator, later in Sketch, and then Figma) were created and considered in isolation.

As developers, we would get a design file and would start coding to match it. Much more than designers, developers are accustomed to use variables to represent values such as spacing and padding. We would inspect the design file and discover that the sizes didn’t match our existing variables. If we were to be strict about following the designs, that would mean that we could reuse code that we had already built, without taking time to make it adjustable.

At the least, this was a minor inconvenience. We would have to think about and deduce or decide which value it should be. Without standards, we were never sure exactly what the designer intended. Rarely did the mean to have the designs inconsistent with the rest of the project. But these small errors were easy to slip in.

Often times, we would waste time going back and forth trying to get things right. The worst was when the developer and designer would end up fight about it. “It has to match the rest of the app!” “No! More spacing looks better here!”

When our design leader insisted that we develop a standard, all of these issues went away. Even when the designs weren’t pixel-perfect, the developer knew what to use. Instead of treating each design as an infallible blueprint, they served to convey intent, and the developers could readily and accurate interpret the desired details.

==Weak story==


## Implementation

### Designers

If you are a designer, with the next new designs you create, start by defining a simple system. Establish your standard padding and spacing values, and give them names. It can be as simple as default, small, and large.

Even if only your new screens respect those standards, start there. It is so much easier than trying to go back through all existing designs and update them to conform.

Just define the standard and let that be a reference point.

In most design tools, you can easily change the large nudge amount to match your default spacing. So if you have things spaced by 16px, you can change the default 10px to be 16px. That way, when you nudge something using `⇧`+`Arrow`, it will be spaced by your standard amount.

In Figma, follow these steps:

In Sketch, follow these steps:

In Adobe XD, follow these steps:


### Developers

If you are a developer on a team without a designer, or if your designer doesn’t want to define and follow standards, take a stab at it yourself. Look through the designs and come up with three standard values that are often used for padding and spacing.

Document the values and the names that you give them and share that documentation with your designer and product manager. Let them know that unless they insist you break the pattern, you will be using one of those standard values. If they do insist, consider making a new standard value or discussing to see if one of the chosen options could work instead.

Then define those standards in your code and never use the numbers again. Always reference the variables by name so that if your designer decides to open things up and increase the default up to 20px, you only have to do that in one place.


## Conclusion

This is a small example, and intentionally so. I hoped to point out how even something this small can be an opportunity to demonstrate and express compassion for those with whom you work.

If you a designer, show your developers that you recognize that they don’t get to be approximate. They have to code in an exact value. You can think through what should be just as well, and often better, than they can.

As a developer, realize that your designer doesn’t always need to take the time to make pixel-perfect designs in many ways. Their time and energy are better spent being creative and exploring how to delight and empower your users. Use your naturally pattern-based mind to simplify your interactions.

Always remember that your coworkers are people who matter like you do. Treat them with kindness and compassion, and that will come back to you. We’re all in this together.

