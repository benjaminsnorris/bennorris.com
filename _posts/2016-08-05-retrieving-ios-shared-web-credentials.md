---
title:          "Retrieving iOS Shared Web Credentials"
date:           2016-08-05 14:00:00-0700
excerpt:        Simplify authentication for your users
category:       General
tags:
- code
- reference
---

## The problem
One of the most annoying interactions with any app or service is logging in. None of us likes having to remember usernames and passwords, and often they are difficult to type in. Even if they are easy, it is never what you actually want to do. You are accessing an app or service in order to accomplish a task, and logging in is a barrier to success. However, none of us want to feel like our sensitive information is not secure, so logging in is something of a necessary evil.

## The solution
One thing that you can do as a developer is to make this experience as simple and painless as possible. One option, which I plan to discuss in the future, is to integrate with [1Password](https://1password.com/). This is a popular password management app, and integration is quite simple.

Another approach is what I want to cover today: integrating with Shared Web Credentials, or from a user’s perspective, integrating with Safari saved passwords. This is available since iOS 8, and is an effective way to simplify life for your users. You should read the [official documentation](https://developer.apple.com/library/ios/documentation/Security/Reference/SharedWebCredentialsRef/), but I will go through the steps that I did in order to retrieve passwords successfully. In a future post, I will address creating an account and saving a new password.

## The steps
1. Add entitlement and configure app
1. Upload site association file to server
1. Add password to Safari on Simulator or device
1. Add code to retrieve password
1. Run app


### Entitlement
Xcoce does a great job of simplifying the process of adding entitlements. In order to use shared web credentials, you need to enable the `Associated Domains` entitlement:

![Associated Domains entitlement](https://media.bennorris.org/images/posts/associated-domains.png){:loading="lazy"}

Then in place of `example.com`, you need to put your domain. Read through the [documentation](https://developer.apple.com/library/ios/documentation/Security/Reference/SharedWebCredentialsRef/#//apple_ref/doc/uid/TP40014989-CH1-DontLinkElementID_5) for this section to make sure that you do not miss anything.


### Site association file
In order for the association to work, you have to upload a simple JSON file to your server. Even if you do not have a web app that users will sign in to, as long as you have a website for your app, you can upload the file and make it easier for your users to log in on additional devices. The file should be named `apple-app-site-association` with no extension, and is simple JSON. It should look like this:

```json
{
  "webcredentials": {
    "apps": [
      "D3KQX62K1A.com.example.DemoApp"
    ]
  }
}
```

Inside the `apps` array, you should list all of the bundle identifiers for apps that should be able to share passwords from this site. The prefix to the bundle identifier is usually your Team ID. To be sure, pull up the app in [developer.apple.com](https://developer.apple.com/account/ios/identifier/bundle) and copy the prefix from the App ID information.

![App Prefix](https://media.bennorris.org/images/posts/app-prefix.png){:loading="lazy"}


### Safari password
Since we are focusing on retrieving passwords, and not saving them from the app, it will make testing easier to manually add the password to the device you are going to test on. I will include instructions for using the Simulator, but the same basic steps apply if you are using a physical device.

1. Open the Settings app
1. Tap on “Safari”
1. Tap on “Passwords”
1. Enter `1234` for the passcode
1. Tap on “Add Password”
1. Enter your website and a user name and password

![Safari passwords in Simulator](https://media.bennorris.org/images/posts/safari-passwords.jpg){:loading="lazy"}


### Code
There are many approaches to retrieving the shared password. The method I have chosen is to make the call to retrieve the shared password when the user taps on the username or password field in the login form. That way, it is not as jarring for the user when first navigating to the form, but it is still helpful at the moment the user wants to take action.

The actual code for retrieving the credentials is fairly simple. Here is an example with a completion closure that returns an optional username and password.

```swift
func requestSharedPassword(completion: (username: String?, password: String?) -> ()) {
  SecRequestSharedWebCredential(nil, nil) { credentials, error in
    dispatch_async(dispatch_get_main_queue()) {
      guard error == nil else {
        completion(username: nil, password: nil)
        return
      }
      guard let unwrappedCredentials = credentials else {
        completion(username: nil, password: nil)
        return
      }
      let arrayCredentials = unwrappedCredentials as [AnyObject]
      guard let typedCredentials = arrayCredentials as? [[String: AnyObject]] else {
        completion(username: nil, password: nil)
        return
      }
      guard let credential = typedCredentials.first else {
        completion(username: nil, password: nil)
        return
      }
      guard let username = credential[String(kSecAttrAccount)] as? String,
                password = credential[String(kSecSharedPassword)] as? String else {
        completion(username: nil, password: nil)
        return
      }
      completion(username: username, password: password)
    }
  }
}

func textFieldDidBeginEditing(textField: UITextField) {
  requestSharedPassword { username, password in
    guard let username = username, password = password else { return }
    usernameField.text = username
    passwordField.text = password
    self.submit()
  }
}
```


### Execution
Finally, with the code in place, you can run the app again. When the user taps in the username or password field, call your `requestSharedPassword` function, and if everything is set up properly, you will see something like this example from an app I am currently working on:

![Retrieving shared web credentials](https://media.bennorris.org/images/posts/shared-credentials.png){:loading="lazy"}


## Summary
And that is it! These steps really are simple and straightforward, but the effect on the user experience of your app is tremendous.
