---
title:          "Installing on iOS 10 with Xcode 7"
date:           2016-08-26 14:00:00-0700
excerpt:        Keep working on your production-ready apps, even while running the iOS beta on your phone
category:       General
tags:
- code
- reference
---

Like many developers, I was anxious to install iOS 10 on my devices. This summer, I went all in and installed iOS 10 beta on my primary iPhone, iPad, as well as watchOS 3 beta on my Apple Watch. I have had remarkably few issues, but one of the major problems was installing apps that I still needed to work on that needed to be shipped before iOS 10 came out.


## The problem
By default, you cannot install an app from Xcode 7 on a device running iOS 10. You will see an error that reads, “Could not find Developer Disk Image” as shown below.

![Xcode 7 iOS 10 error](https://media.bennorris.org/images/posts/xcode7-error-ios10.png){:loading="lazy"}

The problem is that Xcode 7 does not have support for iOS 10. Using Terminal, you can easily see which operating systems Xcode is able to support.

```
$ cd /Applications/Xcode.app/Content/Developer/Platforms/iPhoneOS.platform/DeviceSupport
$ ls
```

![Xcode 7 device support](https://media.bennorris.org/images/posts/xcode-device-support.png){:loading="lazy"}


## The solution
In order for Xcode 7 to install apps on your device running iOS 10, you first need to make sure that it works with Xcode 8. Download the beta, and open a project with your device connected. Typically, you will need to wait for the symbol files to install, and then you should be able to install. In some cases, restarting your device is necessary, or even resetting the network settings (`Settings -> General -> Reset -> Reset Network Settings`).

Once that it working, you can look in the Xcode beta device support folder to find iOS 10 support.

![Xcode beta device support](https://media.bennorris.org/images/posts/xcode-beta-device-support.png){:loading="lazy"}

There are a couple options to give Xcode 7 the information that it needs. You could copy over the folder containing 10.0 support, but the simplest option is to create a [symbolic link](https://en.wikipedia.org/wiki/Symbolic_link) using the `ln` command in Terminal ([documentation](https://developer.apple.com/legacy/library/documentation/Darwin/Reference/ManPages/man1/ln.1.html)). As you type this out in Terminal, be sure to use `Tab` to help autocomplete the directory names in order to avoid typos. And naturally, if either Xcode app is in a different place, or the exact version of iOS 10 is different, you will make adjustments for your environment.

```
$ ln -s
   /Applications/Xcode-beta.app/Contents/Developer/Platforms/iPhoneOS.platform/DeviceSupport/10.0\ \(14A5339a\)/
   /Applications/Xcode.app/Contents/Developer/Platforms/iPhoneOS.platform/DeviceSupport/10.0
```

![Xcode device support with link](https://media.bennorris.org/images/posts/xcode-device-support-with-link.png){:loading="lazy"}

After adding the link, you will need to quit and restart Xcode 7. Connect your iOS 10 device, and you should now be able to install and run your app!

![Xcode 7 running on iOS 10](https://media.bennorris.org/images/posts/xcode7-running-on-ios10.png){:loading="lazy"}
