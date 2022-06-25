---
title: "Automating Scripture Quotes"
excerpt: Using Workflow to extract markdown quotes of scriptures
category: General
tags: reference
date: 2018-03-21 16:02:05-0600
---

Part of being a [Mormon](mormon.org) is regularly speaking or teaching in church. The official [Gospel Library app](https://www.lds.org/pages/mobileapps/gospellibrary?lang=eng) makes it really simple to find resources to use in those talks and lessons. I like to have all of my content in [markdown](https://en.wikipedia.org/wiki/Markdown), which makes creating and referencing the content easy. But getting the quotes into markdown is not always easy. This morning, I created a few [Workflow](https://workflow.is) recipes to simplify the process.

## Converting links

The first workflow allows you to select any text in the Gospel Library app and extracts the web link and converts it. The link start as something like this:

```
https://www.lds.org/scriptures/dc-testament/dc/130?lang=eng
```

The workflow converts the link from a web link to a link that will open the Gospel Library app directly to the content. The converted link looks like this:

```
gospellibrary://content/scriptures/dc-testament/dc/130?lang=eng
```


## Create markdown link

The second workflow builds on the first in some important ways. One of the most important pieces is grabbing the title and creating a formatted markdown link.

The other important piece is grabbing the verses and inserting them in the link if needed. As you might notice above, a link from Gospel Library will be to the chapter of scripture, but not the verses. One note here: if you are grabbing a link to content that does not have chapter and verses, the link will not be changed.

The markdown link looks like this:

```
[Doctrine and Covenants 130:18-19](gospellibrary://content/scriptures/dc-testament/dc/130.18-19?lang=eng)
```


## Extracting the entire quote

The final piece is getting out the actual text of the quote. This last workflow uses the previous two in order to capture a formatted markdown quote. The output looks like this:

```
> 18 Whatever principle of intelligence we attain unto in this life, it will rise with us in the resurrection.
>
> 19 And if a person gains more knowledge and intelligence in this life through his diligence and obedience than another, he will have so much the advantage in the world to come.
>
> [Doctrine and Covenants 130:18-19](gospellibrary://content/scriptures/dc-testament/dc/130.18-19?lang=eng)
```

All three workflows have to be downloaded and installed in order to get the final quote. When they are, it is just one touch to take selected text and get a nicely formatted quote.

> 18 Whatever principle of intelligence we attain unto in this life, it will rise with us in the resurrection.
>
> 19 And if a person gains more knowledge and intelligence in this life through his diligence and obedience than another, he will have so much the advantage in the world to come.
>
> [Doctrine and Covenants 130:18-19](gospellibrary://content/scriptures/dc-testament/dc/130.18-19?lang=eng)
