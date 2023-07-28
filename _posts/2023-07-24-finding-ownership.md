---
title: "Finding ownership"
date: 2023-07-24 17:12:00-0600
category: Wholehearted Ownership
tags:
- weekly update
- jocko
- leadership
- extreme ownership
---

We were hit last week with another major outage. I wanted to reflect on how I showed up and what I learned.

***

Near the end of work Tuesday, I was at the doctor’s office when I got a call from our site reliability team. I checked in as I left and saw that most of our legacy systems were impacted.

Over the next few hours, more and more people joined a call to investigate. We were seeing systems struggle sporadically across all our products. Nothing was completely down, but we had consistent failures.

After the first little bit, I told my engineers to drop off, and I would summon them if needed. There was nothing our team could do other than report on status, and I could do that.

We continued looking at things and trying different options until after 1:30am. Our CTO called it for the night, and asked the team in India to keep investigating while the rest of us got some sleep. We joined up again at 5:30am to get ahead of our east coast clients.

Hour after hour we kept looking and trying with no discernible effect. Our products continued to have intermittent issues.

Finally, around 10:20am, one of the outside experts that had joined our call found something the looked irregular. After we restarted that, all issues cleared up.

The whole outage was an interesting experience for me. On the one hand, it was less stressful than the situation [I wrote about a couple weeks ago](https://bennorris.com/2023/07/02/practicing-ownership). The problems spanned our entire system, so it was bigger than my team could address. I felt less responsible.

On the other hand, I felt powerless. Because my team couldn’t address the infrastructure issues, we were relegated to a spectator role.

Early on, I realized that the most value I could add was to monitor and report on the client-facing impact, particularly in the systems my team owns.

As I did that, I thought that it would also be valuable to share what I was seeing for the monitoring across other products. At first, I worried that others might feel I was stepping on toes, and I hesitated. I started slowly, and when I found that the data were well received, I increased frequency.

When we found the issue and restored service, I was able to share evidence from the monitoring that our products were performing properly.

In later meetings, other leaders asked me about where I was getting the data I had shared.

I realized that the true value of what I had done was more about ongoing benefits to other teams rather than specific data in that one instance.

As [Jocko](https://bennorris.com/tags/jocko/) says, taking ownership is contagious. There wasn’t much to do for most of us during the outage, but when we saw something of value we _could_ do, many people wanted to learn more for next time.

Many of those monitoring scripts, and all of my knowledge of them, came as a result of taking ownership after [my first outage](https://bennorris.com/2023/02/03/extreme-ownership). 

While I still have so far to go to practice [Extreme Ownership](https://bennorris.com/tags/extreme-ownership/) as I would like, these small wins are fuel to keep going on the path.



