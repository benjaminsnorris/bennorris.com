---
title:          Carrier
date:           2022-08-05
store_link:     https://bsn.design/download/carrier
sub_title:      Messages on delay
app_image:      https://media.bsn.design/images/carrier/Carrier.png
app_id:         1027638921

---

Carrier grew from a need that I had to send messages to people at inconvenient times. I usually arise at 6:00am and would often think of messages I wanted to send to people, but wanted to wait until a more reasonable hour. Carrier allows for composing the message, choosing the recipient and the delivery time, and then a notification comes to allow you to send the message. The app also works great for scheduling messages for a birthday, or other special occasions. For Valentines Day, I scheduled a message every hour to go out to my wife, and then I was ready throughout the day to send her something thoughtful, even in the middle of a meeting.

<!--more-->

## Special problems

### Data management

I originally conceived of the idea to just make use of the pending `UNNotificationRequest` objects. I would schedule a notification for the message, and store all of the data that I needed, and then I could just display those as the messages waiting to go out. As I started to use the app myself, I quickly realized that there were times when you missed the notification or were not ready to send it when the original delivery time came. Relying on the pending requests meant that the data was lost once the notification fired. I could use the delivered notifications to get around some of that, but it was not as consistent as I wanted, so I needed to come up with a better way to store the data.


### CloudKit

In addition to the challenges in using the notification requests, I found myself wanting to move from one device to another. It was ideal to use my iPad in the morning to schedule the message, but when the delivery time came, my iPhone was the most convenient device to use. I wanted to get more familiar with CloudKit, so I decided to use that for storing the data. Combining subscriptions with background refresh has allowed me to keep the data and notifications in sync across multiple devices.
