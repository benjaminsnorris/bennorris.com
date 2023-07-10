---
title: "Practicing ownership"
date: 2023-07-02 21:59:00-0600
category: General
tags:
- weekly update
- mental health
- ocd
- toatc
- extreme ownership
---

In addition to being an emotional roller coaster, this week was a wake up call for me. It was a good exercise in extreme ownership. And I saw clearly where I need to improve.

***

## Background

Last week, I spent a few days “camping” in a cabin with about eighteen teenage boys, including my 14yo son, and around six other men. We had a great time, and I especially appreciated the special time I had with my boy.

A few months back, I decided that my team did not need to be [on-call](https://en.m.wikipedia.org/wiki/On-call) outside of work hours. They would sometimes get woken up in the middle of the night to look at issues that could have waited until the work day. I assumed responsibility for being on-call outside of work hours and said we would adjust if needed.

To make matters worse, I adjusted our alerting to come through as low urgency by default.

At the time, these seemed like reasonable decisions. Our stability had been pretty reliable, and issues were resolved by restarting things that were slow or stuck.

However, all of this came together to bite me in the ass this week.


## The incident

As I returned to work on Monday, I discovered that I had missed a couple alerts from work over the weekend that one of the products I own failed to run and many client events were missed. This product is responsible for a large portion of the revenue our company brings in, so this kind of outage is significant and can have a major impact.

We started digging in, and the situation seemed straightforward. We ran the processes manually, and it looked like we were good. I gave it only cursory attention, and the next day, we had some delays again. I checked in enough to see that people were busy, but my attention went elsewhere.

Monday evening, I had the chance to reconnect with one of my best friends from middle and high school who married another of my best friends from high school. We hadn’t seen each other in over a decade, and I hadn’t stayed in touch like I wanted. Our reunion was glorious—the four of us adults enjoyed each other, and our kids hit it off. That was definitely the highlight of my week.

The next day, I was able to grab an impromptu lunch with my best friend and chat for a bit without constant child interruptions.

When I got back to work, thankfully my boss alerted me to the seriousness of the outage situation. He kindly asked me to start providing scheduled updates, even if we had no new information.


## Taking ownership

Tuesday afternoon, I started digging in more earnestly to wrap my head around everything, and communicating clear updates.

I reached out to our Client Success leaders who were the most impacted by the situation to let them know where we were at, and to take ownership of the failures.

> Hello all. I know this is a little outside the preferred communication channels. We will continue to provide updates through the proper channels, but I wanted to reach out and take ownership of the issue we are facing right now.
> 
> The root of the problem we have, separate from the technical root cause, is me. I was on-call this weekend and failed to respond to the monitoring alerts that came through.
> 
> I had incorrectly configured the alerts to come through as low urgency instead of high. Part of getting the technical issues resolved will be making updates and adjustments to monitoring to ensure the appropriate level of alarm is sounded for failures.
> 
> We thought we had everything wrapped up and working properly yesterday, and I failed to follow through and monitor the situation all the way to a successful conclusion. That won’t happen again.
> 
> We have all the right people involved right now in solving and monitoring our current situation, which appears favorable. We will continue to provide updates through the proper channels, and look forward to providing all the details when the situation is resolved and our investigation is complete.
> 
> I understand how serious the situation is and know that a mere apology is grossly insufficient. With that knowledge, I offer my sincere apologies that I have let you and our customers down. We are committed to doing everything we can to resolve the situation, and will put processes in place to avoid any repeats of these failures.

It felt like a gut punch to write and send that kind of message acknowledging serious and impactful failures were all my fault.

At the same time, I felt great. I knew it really *was* my fault, not just as the leader of the team, but also as the individual who missed the initial alerts. Being authentic and honest, even about something painful, felt amazing.

And if I’m being honest, I was pretty pleased with myself. “Way to practice Extreme Ownership!” I said to myself. “Good job not blaming anyone else.”


## Finding the fix

The team worked all day Tuesday until a little after 2am. I followed along and provided regular updates on our progress and made a plan of next steps to tackle on Wednesday.

As we checked in on the situation Wednesday morning at 6am, it looked promising. As the work day began a few hours later, we investigated the full impact of the outage.

After I finally set clear priorities, we focused and made significant progress.

We were optimistic that we had addressed the problems and the Wednesday night midnight scheduled run would succeed.

My lead engineer and I got up and watched processing hang again. We manually pushed things through until 3am or so, and then checked back in around 6am and saw that everything had succeeded.

My engineer sent me a message during our back-and-forth that went straight in my Yay Me file.

> Thanks for being the kind of boss who won’t ask us to do things he won’t do himself; rare quality 🙂

Thursday we continued to investigate. I had a number of meetings throughout the morning, so just checked in on Slack. In the afternoon, I asked the team to join a Zoom call and we researched together. That evening, I was feeling defeated. A bit after 6pm, I sent out:

> Situation Report:
>  
> The scheduled processing is likely to stall again tonight. We will monitor and plan on manually triggering all events to process. We have a clear next step for exploration tomorrow, but I am calling it for today.
>  
> Next update planned for tomorrow morning.

Sure enough, as we checked in on things in the middle of Thursday night, we had to manually run the processing that hung.

But we were finally able to reproduce the problems on my engineer’s computer. So on Friday, we were much more hopeful.

Finally, Friday evening around 5:30, he let me know that he thought they had found the issue. They found a rogue process running on one of our servers that was interfering with each processing run. Once that was killed, our processing was successful.

> SITREP: All clear!
>  
> We have just successfully run our processing. We have every reason to believe the automated nightly process will run successfully tonight. If there is a failure, at this point, it would be for a different issue. We will of course look at everything in the morning to ensure success.
>  
> We have some clear next steps to clean up our code, our logging, and our event processing structure to make any future troubleshooting much easier.
>  
> Thank you all for your support and patience!


## Lessons learned

### Clumsy communication

One of my biggest takeaways from the events of this week is a stark realization of just how far I have to go in my quest of ownership.

My boss let me know that one of the people to whom I had sent the note I shared above reached out to him. She was concerned that I was beating myself up too much for what had happened, and wondered what my boss had been coaching me on that I was so sure it was all my fault. He told her that I am trying to learn and practice Extreme Ownership, and shared some of the principles and resources.

As we talked about the exchange, it was clear to me that my poor communication of my ownership of the mistakes was getting in the way of working effectively together on the problems. Rather than focus us on solutions, I was bringing too much attention to myself. I made it sound like I was responsible for everything, and that I would fix everything.

Instead, I need to work on the balance of taking clear ownership of the problem and acknowledging the help I will need in solving the issue.

I’m glad to have a clear area of improvement to focus on.


### Root mistake

My next lesson was to learn what I had actually done wrong. There were a few false leads on my path to discovery.

First, I thought the problem was that I had missed the alerts.

While that certainly was an issue, that was easily addressable, and solved early Monday morning by getting visibility into our outage. I will need to address the alerting and monitoring, but that was not the cause of the trouble.

Second, I thought that the problem was that I had neglected this one of my three teams, and that had resulted in the poor performance of our systems. But that wasn’t it either.

Back in May, I had told my boss that I was turning my attention to this team and its products, now that we had successfully handled our major client launch with the other two teams.

I realized that I had prioritized properly, and had I chosen differently, we could have been in a much worse situation.

Finally, I learned the true root of the problem. Within the scope of this third team, I had chosen incorrectly. I had prioritized the wrong thing.

Ironically, the top priority that I should have focused on was our top company and department goal—stability. Instead, I had elevated improving our ability to deliver more work quickly.

In some ways, the reason I made this mistake was that I think too much in patterns and fail to see the context differences. Part of my OCD is a rigid approach and a mindset that the same thing will work in all scenarios. Because my other two teams had improved by increasing their capacity to deliver, I mistakenly thought that was the answer again with this third team.

In the end, the problem was that I had not taken the time to think through the situation clearly and make sure that I was following the principle Prioritize and Execute.


### Vulnerability factors

One of my last lessons was a reminder of how real OCD still is in my everyday life. At this point in my recovery, my life is seriously impaired much less frequently. It can be deceptively easy to forget that I am still managing a significant mental illness.

Due to the long hours, late nights, and early mornings, my sleep suffered.

When I was at my [treatment center](https://bennorris.com/tags/toatc), one of the principles we learned was the importance of vulnerability factors. Mental health is intimately connected with physical health. When some of the basics like sleep, nutrition, or movement are not managed carefully, symptoms become more difficult and pronounced.

I certainly saw the truth of that this week. I became much more rigid in my thinking. I fact-checked people, including myself, with alarming frequency. I worried about phrasing things perfectly and corrected myself over and over, trying to be as accurate as possible.

The distress I felt mounted and I became more overwhelmed and miserable.

All of the little things in my journey to recovery play a crucial role in successfully navigating my daily life.


## Summary

I am grateful for this experience.

My team performed admirably. We established better relationships with those who depend on us, and on whom we depend to successfully deliver value to our clients.

I exercised my Extreme Ownership muscles and identified a clear area of focus to improve.

While painful, failure is often the best teacher. I am confident we will emerge stronger from this.

We have clear steps moving forward, and visceral understanding of the importance of prioritizing them correctly.

As long as we continue to improve, failure does not condemn us. It shapes and molds and refines us.



