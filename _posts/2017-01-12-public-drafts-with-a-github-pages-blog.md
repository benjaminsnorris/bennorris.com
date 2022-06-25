---
title: "Public drafts with a GitHub Pages blog"
excerpt: Improve the process of publishing from anywhere by previewing drafts on your actual site
category: General
tags:
- reference
date: 2017-01-12 08:09:26-0700
---


I wrote [last week](https://bennorris.org/2017/01/06/using-workflow-to-publish-to-github-pages/) about publishing to a GitHub Pages blog using [Workflow](https://workflow.is) on the iPad. As I worked on writing that post, I realized there was one piece missing from my process: previewing the draft. When I write locally on my computer, I compile the site using [Jekyll commands](https://jekyllrb.com/docs/usage/) and include drafts. Then I can work on a post and make sure that the links all work properly and do a final check before publishing the post. With the Workflow process I created, a post would go straight from iA Writer to being published on my site, and that made me a bit nervous.

## Displaying drafts
Jekyll [already supports drafts](https://jekyllrb.com/docs/drafts/), but the only way to see them is when building locally. As I looked into the easiest way to display drafts on my published site, I realized that I already have a model that would work well. For my [apps](/apps/) and libraries, I am using the [collections feature](https://jekyllrb.com/docs/collections/) of Jekyll. In order to extend the default functionality of drafts to make them public, only a few small changes are needed:

1. Add drafts collection
2. Specify default layout
3. Make an index page
4. Prevent indexing

### 1. Add drafts collection
In your `_config.yml` file, add a few lines to enable the drafts collection:

{% gist benjaminsnorris/1248c19efce6da007d5017d7b3cfaf1e _config-collections.yml %}


### 2. Specify default layout
Also in `_config.yml`, it is easiest to provide a default layout for all drafts. This way, you can omit the layout from the front matter of the actual post, and it will display correctly when it is a draft, as well as when you publish the post.

{% gist benjaminsnorris/1248c19efce6da007d5017d7b3cfaf1e _config-defaults.yml %}


### 3. Make an index page
At this point, the individual drafts will display correctly, but it is much easier to have a list page to access them. It can be as simple as this:

{% gist benjaminsnorris/1248c19efce6da007d5017d7b3cfaf1e draft.html %}


### 4. Prevent indexing
You may have noticed an entry in the front matter of the drafts index page with the key `meta_robots`. I have something similar in the `draft.html` default layout:

{% gist benjaminsnorris/1248c19efce6da007d5017d7b3cfaf1e draft-layout.html %}

These insert the correct metadata in the `head` using the following code:

{% gist benjaminsnorris/1248c19efce6da007d5017d7b3cfaf1e head.html %}

This ensures that the drafts can be posted without impacting the site or having incorrect links show up in search results. It is still possible for someone to find one of these posts and link to it, which will result in a 404 after publishing, but the likelihood of that is low enough to not be a real concern.


## Add workflows
All of this work is nice, but without some additions and updates to the workflows I [posted previously](https://bennorris.org/2017/01/06/using-workflow-to-publish-to-github-pages/), this would still require publishing from a computer. As I looked into support for publishing drafts using Workflow, the one piece missing was the ability to send a `DELETE` message to the GitHub API. I asked Workflow support if there was any way to do this and got a fantastic response with a workaround.

<blockquote class="twitter-tweet" data-theme="dark"><p lang="en" dir="ltr"><a href="https://twitter.com/bsndesign">@bsndesign</a> Here&#39;s a workaround in the mean time: <a href="https://t.co/SeyLjr7Ixr">pic.twitter.com/SeyLjr7Ixr</a></p>&mdash; Workflow (@WorkflowHQ) <a href="https://twitter.com/WorkflowHQ/status/817639735183036416">January 7, 2017</a></blockquote> <script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>

Armed with this workaround, I was able to create a few additional workflows:

- Publish draft
- Update draft
- Delete files


### Improved post publishing
Finally, I wanted to handle the draft well when publishing the blog post. The workflow to publish a post will hit GitHub first to see if a draft is there with the same name, and if so, the draft will be deleted and the post will be published with the correct date. This completes the draft process, allowing you to start by publishing a draft, update it one or more times for review, and then actually publishing the post.

- Publish post
