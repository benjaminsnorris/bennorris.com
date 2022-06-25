---
title: "Creating a magical menu"
date: 2011-12-21 07:07:54-0700
category: General
---

Over the past couple months, I have been playing around in <a href="http://www.wordpress.com">WordPress</a> to try and create the site that I had in my mind. I was referred to WordPress by a friend and have been thrilled with what I found. I thought I would chronicle my journey to finally creating the menu of my dreams.
<h2>Step 1: Picture the dream</h2>
The first step was to create an image to upload as a header image. I knew that I wanted to eventually create a menu with fun images for each page (menu item), so I began by creating some sketches and combining them into a single image in Photoshop. The theme I was using in WordPress allowed me to upload a header image, so with a bit of fiddling, I finally got it so that the sketches lined up over the menu items. The problem was that the entire image was a big link to the home page. Through some basic usability testing, I found that everyone who used the site tried first to click on the image to get to a page, but then was taken back to the home page.

![Plain menu](https://media.bennorris.com/images/posts/menu/header-menu-plain.png){:loading="lazy"}

<h2>Step 2: Stop the trickery</h2>
Now I had feedback that people enjoyed the sketches, but the site wasn't terribly usable. So I set out to remove the link from the image so that if people tried to click the images, they at least wouldn't be taken to the wrong place. Fortunately, there is a great support forum for WordPress, and I was able to quickly get some help in overriding the CSS. Basically, I removed the header image through the admin console, and then put it back with the following CSS code. And, voila! A non-clickable addition to my menu items looked fun and stopped tricking people.

<code>#menu {
background: url("[benjaminsnorris.files.wordpress.com/2011/12/p...](http://benjaminsnorris.files.wordpress.com/2011/12/presentations-design-sketchnotes-header.png)") no-repeat scroll 5px -40px transparent;
height: 125px;
}</code>

<code>.menu-navigation-container {
margin-top: 95px;
}</code>
<h2>Step 3: Enter the magic</h2>
Life felt much better. My site no longer offended me, Christmas was fast approaching, and Santa had finished early. I set out to transform a static, dead menu into one that had a bit of sizzle and pop. I decided to go for the image sprite model, so I searched for some tutorials, found some great help, and then tinkered with the CSS to make it work in WordPress. Hopefully others can benefit from my short struggle.
<h3>1. Assemble the sprite</h3>
My first task was to create in a single image everything that I wanted to be in the menu. I found the right font, and added the page titles underneath my little sketches. This would become the first row and would represent the menu items in a non-selected, non-rollover state.

Next, I extended the canvas of my image by a factor of three (for me that meant going from 140 pixels to 420 pixels). Then I selected everything that I had created so far and duplicated it twice. I took one of the duplicates and dragged it to the very bottom, and the other went in the middle. Tis meant I ended up with three rows of my images and page titles.

Finally, I got down to the real work. The final row was going to become the selected state for me, and that was going to be easier. I just wanted to change the color of the image as well as the page title. The middle row was to become the rollover state. I changed the color of the text, but the images we more complex. This needed to be fun to use, so I wanted to add a little something to each of the images. I sketched out ideas in paper with a Sharpie, and then when I had what I liked, I scanned it in, played in Photoshop until it worked with what I already had, and then I was set. That was the fun part!

![Full menu](https://media.bennorris.com/images/posts/menu/header-menu-full.png){:loading="lazy"}

If you're trying this as well, it's important to note the size of each piece of your sprite. I already knew the height of each row, but I needed to determine the width of each menu item as well. You'll want to write down the width for each item, as you need it in the final step.
<h3>2. Prepping the page</h3>
Since I am using a hosted WordPress blog, the theme already handles the menu, but it can be overridden with CSS. I first needed to clear out the menu that was already being displayed as text links, and get the size of the menu right for the images I was going to use. I don't claim to be a CSS ninja, so this might not be the most elegant way to accomplish this goal, but it worked for me. I added the following lines to my CSS.

<code>#menu li {
float:left;
position:relative;
display:inline;
}</code>

<code>#menu li:hover &gt; a,#menu ul ul :hover &gt; a {
color:transparent;
}</code>

<code>#menu ul li.current_page_item &gt; a,#menu ul li.current_page_ancestor &gt; a,#menu ul li.current-menu-item &gt; a {
color:transparent;
}</code>

<code>#menu {
width:800px;
list-style:none;
height:140px;
}</code>

<code>#menu li a {
height:140px;
float:left;
color:transparent;
}</code>

<h3>3. Putting it all together</h3>
The last step is to actually construct the menu in CSS. I viewed my page's source (as easy as right-clicking on the page and selecting View Page Source) in order to get the IDs of each menu time. Essentially, I had to tell the browser to show a particular piece of your sprite depending on whether the menu item is just being displayed, is selected, or is rolled-over. For each menu item, you need code in the CSS specifying which piece should be shown. Included here is the code that worked in WordPress—if you are trying this as well but using something other than WordPress the code might change slightly, but the basic idea is the same.

<code>/*Specify the piece of the image that should display for the Home menu item in its normal state*/
#menu-item-59 a {
width:75px;
background:url('http://benjaminsnorris.files.wordpress.com/2011/12/presentation-design-sketchnote-menu.png') no-repeat scroll 0 0 transparent;
}</code>

<code>/*When the user rolls over Home, the image should jump down to the second line*/
#menu-item-59 a:hover {
background-position:0 -140px;
/*These are X, Y coordinates. So the image starts from 0 (the left edge), but down 140 pixels, and is going to show 75 pixels over since that is the width*/
}</code>

<code>/*And finally when Home is selected, the image should jump to the third line*/
#menu-item-59.current-menu-item a {
background-position:0 -280px;
}</code>

You do the same thing for each menu item. The only thing that will change for each is the X coordinate for each item. It will simply be the X coordinate of the previous item minus that item's width. So, my second menu item is at -75px 0px, or 75 pixels to the right of the top left corner. My third menu item is at -200px 0px, and so on. Do that for each item, and you are set!

The finishing touch was spacing out the menu items, and making sure that only the right pieces of the image were displayed. My last bit of CSS code did just that.

<code>#menu a {
margin:4px 6px;
padding:0;
}</code>

<h2>Basking in the goodness</h2>
In the end, I was finally able to enjoy the menu I had dreamed about. Thanks to a lot of help, and a fair amount of trial and error, my sketches came to life!

![Menu rollover](https://media.bennorris.com/images/posts/menu/header-menu-rollover.png){:loading="lazy"}
