---
title: "Using Workflow to publish to GitHub Pages"
excerpt: Leverage the power of automation to reduce friction in publishing from anywhere
category: General
tags:
- reference
date: 2017-01-06 08:56:45-0700
update_date: 2017-11-14 17:00:54-0700
---

*Update: I published [a follow-up post](https://bennorris.org/2017/01/12/public-drafts-with-a-github-pages-blog/) about incorporating drafts into the process.*

## Microblog posts
This blog is hosted using [GitHub Pages](https://pages.github.com/), which has worked out extremely well for me. However, there can sometimes be too much friction to get content published, especially short-form microblog posts. Recently, I was talking with [Manton Reece](https://manton.org/) about how to publish Instagram posts to my microblog. He mentioned that he uses [Workflow](https://workflow.is/), a fantastic automation app for iOS, to take an Instagram photo and publish it to his WordPress blog. He wrote [a post](https://www.manton.org/2016/03/blogging-your-photos.html) about his process that was helpful as I looked at how to make this work for my needs. Another big help was a recent series about Workflow on [Canvas](https://www.relay.fm/canvas), a podcast about iPhone and iPad productivity.

I only recently started posting my professional content to Instagram, such as sketchnotes and drawings, and it feels like a great fit. I want to keep sharing there, but I want to make sure that I have my own record of the content I am posting as well. Using the workflow I created, here are the basic steps:

- While posting to Instagram, copy the caption text to the clipboard. This will be the default text for the microblog post, although I can edit it if I want.
- Select the image in Photos, or run the workflow and select the image later.
- Workflow creates a title for both the image and the post based on the date.
- Confirm the post text that Workflow creates, complete with the proper front matter for posting to GitHub.
- Workflow commits the image and, if that is successful, the text post to my blog repository using the GitHub API.
- Optionally compose a tweet with the image and text of the post.

I am pretty excited about how simple it is. I have made the workflow so that it can be launched from some text, an image, or even directly in Workflow and select the image and write the text later. This has helped reduce the friction and encourages me to post more frequently. You can still [follow me on Instagram](https://www.instagram.com/sketchnotable/).


## Full blog posts
After getting publishing working for microblog posts, I had to keep going. I have started most of my posts on the iPad using [iA Writer](https://ia.net/writer/), and up until now, I would sync them over to my computer to publish them to GitHub. I decided to make a few more workflows so that I could do all of my publishing from my iPad, or even my iPhone. They all work similarly to the workflow for microblog posts. Here are the workflows:

- Publish Blog Post
- Publish Photos
- Update Blog Post
- Publish Files
- Update Files

The update workflows will take in an existing file, find it on GitHub, and commit an update to the file. Adding the workflows for photos and files allows me to publish everything that the blog post will need. These have the side benefit of being able to upload any files to a repository, so their use is not limited to GitHub Pages blogs.


## Going meta
One of my favorite parts of writing this post describing my new process is using that process. I even added a step to publish and update drafts on my site so that I can preview them and make sure all of the links are working properly before publishing. So I have written this post in iA Writer, published a draft and a few updates to my blog using Workflow, and am now publishing and sharing the actual post using Workflow. 💥


## Onward
Part of my reason for posting this is to motivate my future self to be more consistent with posting. I have removed all of my excuses, and look forward to writing more regularly. Hopefully this has been helpful to you as well. If you have any thoughts or questions, feel free to [reach out on Twitter](https://twitter.com/bsndesign).
