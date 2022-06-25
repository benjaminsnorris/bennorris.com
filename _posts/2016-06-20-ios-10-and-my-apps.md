---
title:          "iOS 10 and my apps"
date:           2016-06-20 08:20:00-0700
excerpt:        Some raw thoughts on how the new possibilities announced at WWDC 2016 might affect my apps
category:       General
tags:           code
---

After consuming much of WWDC last week, I wanted to take a few minutes and consider how my apps could be affected by the new announcements. Since I mostly sat in my office at home and watched live session videos, some effort is required to make sure that the videos can translate into action and improvement. I thought I would take each of my active projects in turn, or rather active and semi-active projects, and consider the state of the app, and how I might incorporate some new technologies. Most of this will be “thinking out loud” so that I can try and process some of what I learned.


## Align
Align is a new app that I am helping create in my day job at [Tanner Labs](http://labs.octanner.com/). Our focus is to make managers better by leveraging the one-on-one. The tool will start out simple, as a way for managers to track one-on-ones and help them prepare, execute, and follow up. We will be launching this with both an iOS app and a web app, built on Firebase as a back end.

### [SiriKit](https://developer.apple.com/sirikit/)
One of the first thing that I thought of is the possibilities of integrating with Siri. As Apple expands Siri to be integrated with third-party apps, they are starting with six domains: messaging, voice/video calls, payment, ride sharing, workouts, and photo search. Of those, I think that messaging could potentially be a good fit.

#### Comments
One of the keys with a one-on-one is the comments that can go back and forth between the manager and team member leading up to the meeting. That can help the team member to feel engaged and empowered to affect the content of the meeting, and to avoid anxiety or the “called-to-the-principal’s-office” feeling. Part of the challenge with integrating with SiriKit would be identifying which one-on-one to add comments to, so I think I would either have to default to the next one coming up, or consider scheduling one through the interaction. This kind of experience is not exactly what Apple seemed to have in mind, so I will have to explore it more and see how it might feel.

#### Coaching Items
An interaction that we have considered for Align is the ability for a manager to create a coaching item for a team member. This would be essentially a note that the manager creates to follow up with the team member on some point, whether to praise and recognize or to provide correction. The idea is that it should be an extremely quick interaction to capture something that would then be discussed later with the team member. This was actually one of the first things that came to my mind with SiriKit and Align, but as I think about it more, I think that it might not be the right fit. For the messaging domain, Siri is expecting to get a recipient from the user. The voice prompt would be something like, “Tell John using Align that…” The problem that I see is that the resulting action would be to create a coaching item for the manager to discuss with the employee later. It makes sense as a use case, but we will have to see if the interaction feels natural.

### [iMessage App](https://developer.apple.com/imessage/)
Making Messages into a platform allows for much richer interactions that start while messaging with someone, and never leave that experience. I anticipate that some of the best implementations of this will be collaborative experiences, where the participants can go back and forth on something before it is finalized. This seems like it might be a great fit for preparing for a one-on-one. It would allow for a manager to send a team member the proposed agenda and other details for the one-on-one, and for the team member to have an easy way to provide input, or make suggestions to the agenda. This kind of interaction would require the team member to have the app as well, so we may or may not want to pursue this, but I think it could be powerful.

### [Notification Service Extension](https://developer.apple.com/notifications/)
With iOS 10, notifications are now a powerful interaction point, and I want to make sure that we take full advantage of this. We will need to think through the design of a custom UI to show with notifications. We will have different kinds of notifications that users will receive, and each will have to be considered separately. One of the main things that should be featured in our notifications is the images of the team members involved in the notification. That will make it easy for a user to connect with the information and to encourage a personal approach.

### [Search](https://developer.apple.com/ios/search/)
In iOS 9, Spotlight integration was added, and this is definitely a feature that we should take advantage of. It should be simple for a user to find their one-on-one information by searching on the phone. With the addition of app search integration into Spotlight, this becomes even more compelling. As we build search into the app, I need to make sure that we do it in a way that we can easily facilitate this powerful interaction.

### [watchOS 3](http://www.apple.com/watchos-preview/)
I have been planning on building some kind of Apple Watch app, although I am not sure exactly what the focus should be. However, with some of the changes in watchOS 3, I think the focus is much clearer. Since apps will stay “active” for eight minutes after launching them, it becomes much more feasible to have a Watch app be a reference point. If you are in a one-on-one, it could be powerful to have your agenda easily glanceable on your wrist so that you can be checking as you go to make sure that you both stay on time with the meeting, and cover everything you intended. A natural complication would be to see the next or current one-on-one, and that would make it easy to launch the app and be ready to execute the one-on-one. An implication of that interaction could be to make the agenda points completable, so that you could check them off as you go, in order to remember what is left. We will have to see where that goes.

### Final Thoughts
Many of the system-level integrations in iOS 10 are focused around location- and communication-type apps, which does not exactly fit Align. For example, it would not make sense for Align to become the preferred messaging app for communicating with someone, and so I would not want to provide that information to Contacts. I need to make sure that I appropriately tag any input fields so that I can get meaningful Quick Type suggestions for things like people, contact information, or locations. I should also take advantage of the Universal Clipboard, and make sure that I am a good citizen there. I think that is about it for Align. Good stuff!


## Pointedly
[Pointedly](https://bsn.design/pointedly) is actually my first app released to the App Store, and continues to be one of my favorites to work on. It is a simple app to keep score in board games, or card games, or anything else that could use tracking. In many ways, it has served the purpose of being a playground for me to try out new technologies as they make sense for the app. It is currently a stand-alone app on the iPhone with the data not synced or shared in any way.

### [CloudKit Sharing](https://developer.apple.com/icloud/)
This is huge for me. I have been wanting to build a back-end syncing mechanism for Pointedly so that you can easily track all of your games across your devices, but I have not implemented one yet. Part of the reason was that I wanted to be able to share games, and had not decided on the easiest way to do that yet. This feature is exactly what I was hoping for in CloudKit, without even thinking of it as a possibility. I had wanted to explore different options for collaborating on a pointcard, such as having it be public, and allowing anyone to join, or sharing with an individual. From the session explaining this, I think that I can accomplish exactly what I want while keeping the data private and only shared as needed. You can either share with a specified individual, or else anyone with the link so that you could post the link in some place like Slack for anyone to join that had access. There are still a number of things that I need to think through here, like how to share the players that are involved in a game, but this is definitely the answer for me.

### [iMessage App](https://developer.apple.com/imessage/)
I am not completely sure about this yet, but I have been thinking that it would be fun to send someone a pointcard in Messages, and collaborate with them that way. It seems that there are a limited set of scenarios when this would make sense, and most of them would probably be better served by using CloudKit Sharing from within the app, but it remains an intriguing possibility. This is also a technology that I want to understand better, so in some ways I want to explore adding this just to gain experience with it.

### [watchOS 3](http://www.apple.com/watchos-preview/)
Now that Apple Watch will have directly CloudKit support, and I will probably be adding CloudKit, this makes more sense. Combined with the enhancements to keep the app running for longer, using your watch to quickly enter the score for a game feels like a great feature. The crucial thing would be to figure out how to allow for a score entry that can easily be done in under two seconds. You have to select the player and input the score in the way that makes sense and then easily get an overview of the game progress. I will have to decide about creating a pointcard, and whether to allow that on the watch, or to require the iPhone for that. It seems like it would make more sense on the iPhone, but if I can find a fast way to do it on the watch, that would be nice. Finally, I think I would definitely want to use Handoff and encourage the user to go back to the phone to share the results at the end of the game.

### [tvOS 10](http://www.apple.com/tvos-preview/)
No customers have asked for this, and it would not make too much sense to invest a lot of time in developing this, but again, since tvOS supports CloudKit, it should be fairly simple to create a version to run on the Apple TV. I would have to possibly rethink some of the interactions to make them simpler, and consider having different views for the TV. For example, it might make more sense to have the Apple TV version be a display of the score that is entered from people’s iPhones or Apple Watches. But since they would all be getting their data from the same place, this could be compelling. Maybe I could develop simple charts that show the progress of the game in a meaningful way, or simply have a fun visualization of the current status of the game. It is at least something to consider.

### Final Thoughts
Most of the newly announced technologies in iOS 10 are not a great fit for Pointedly. One of my goals is to keep the app extremely focused and avoid letting it become bloated by trying accommodate everyone’s needs or adding features gratuitously.


## Whimmy
[Whimmy](https://bennorris.com/apps/whimmy/) is an app I created together with [Stotion](http://stotion.com/) to make it easier to get together with the people that matter in your life. You can send an invite with a fuse that fills up once the capacity is reached and avoid the back-and-forth of text or email. The app is on iPhone, Apple Watch, web, and an Android beta.

### [SiriKit](https://developer.apple.com/sirikit/)
I was so excited to hear some of the details for SiriKit because I knew it would be a great fit for Whimmy. You would not necessarily use Whimmy as your preferred messaging app to contact someone because it is more focused around events. We designed it from the beginning to streamline the process of creating and responding to invites, and integrating with Siri is a natural extension of that. My only concern is honing the experience to get all of the right information through Siri. Currently, an invite includes recipients, message, location, capacity limit, and an expiration limit. That feels like a large number of data points to capture through Siri, so we will have to see how it feels.

One of the features that we have been thinking about adding to Whimmy is the ability to comment on an event. That would make for a powerful and quick interaction to use Siri to reply to an invite, or continue the conversation. Part of the challenge would be correctly identifying the correct invite for the comment from Siri, but that is something that we could hone through testing.

### [Notification Service Extension](https://developer.apple.com/notifications/)
The ability to add custom UI to a notification when the user views the details is extremely exciting. For Whimmy, this would give us the ability to provide rich information when a recipient receives an invite, such as the people attending, potentially a map view of the location, and a visualization of the time remaining to respond. I love the challenge of figuring out how to build the designs that Stotion comes up with, and this would be another prime opportunity.

### [Custom Notification Responses](https://developer.apple.com/notifications/)
One of the demos with the advances in notifications included a user responding to an invite. The actions for the notification were: Accept, Decline, and Reply. In the Reply action, the user could send a textual reply. One of the advances this year is that in addition to the text, I could build UI to allow the user to also accept or decline the invite. This is definitely something that I want to take advantage of with Whimmy as we build the commenting feature.

### [iMessage App](https://developer.apple.com/imessage/)
If you already have a group message going with your friends, integrating Whimmy to create an event is a logical next step. As I mentioned earlier, we are planning to add comments to an invite, but that feature would not be needed in the context of the iMessage App version of Whimmy. You would already be chatting with your friends in Messages, and Whimmy would serve as a way for you to create an invite and easily allow your friends to respond.

It could make sense to send an invite to an individual person as well through Messages. You would want to be able to send the same invite to multiple people, so you would have to be able to choose from existing invites, or to create a new one. In some ways, this could easily feel redundant. Whimmy already allows you to send invites to people, even if they are not users of the app. I think we would need to do some user research to see how people would want to use the app.

### [SpriteKit](https://developer.apple.com/spritekit/)
This is not a new technology, but it is newly available on the Apple Watch, and something that I think we could take advantage of in Whimmy. With the expansion of SpriteKit to be on all iOS-based platforms (iOS, watchOS, and tvOS), this is a technology that I want to become more experienced with, even in UIKit-based apps. There are a number of animations that we use in the Apple Watch app of Whimmy, particularly in notifications, and we could convert those all to SpriteKit, and expand them to the rest of the app with good results.

### Final Thoughts
Whimmy has not been under active development for quite some time, but the potential is huge. I love the concept and believe in the purpose of getting people together more. It also serves as a great playground for me to experiment with different technologies and push myself as a developer. It does not make sense to invest a ton of time and effort into this app, but it is one that I really enjoy working on, and plan to consider for many of the announced changes.


## Recite
[Recite](https://bennorris.com/apps/recite/) is an iOS app to facilitate memorizing scriptures, quotes, and other short passages. It is currently an iPhone app with an Apple Watch app, again with completely local data.

### [CloudKit Sharing](https://developer.apple.com/icloud/)
This is another app for which I have wanted to add some kind of syncing. I built the app for my family to use in our morning devotional, and it has worked really well for that, as long as I am home. However, since it cannot be shared, my wife is not able to use it if I am not there, and I have wanted to fix that. So I think CloudKit Sharing will be a great fit here as well.

I am currently storing content packs as downloadable in-app purchases through Apple, and have been thinking that I might change the business model a bit. If I do, the public CloudKit database might be the right place to store the data to make it easily accessible to everyone. I want to think through this more, but I feel like CloudKit will play a large role in this app moving forward.


## Summary
iOS 10 and watchOS 3 provide some great opportunities for me to enhance the apps that I am working on already. It is probable that I will not be able to implement all of the ideas that I have had in this post, but this has been an extremely helpful exercise for me to consider each app in turn and think through the possible implications. I look forward to mastering some of these new technologies and adding them to my toolbelt so that I am ready to make use of them as I continue to create new apps.
