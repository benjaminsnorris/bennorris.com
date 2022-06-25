# Searches

## glightbox

### Example
{{< glightbox src="https://media.bennorris.org/images/gospelsketcher/uploads/2020/7eda015c96.jpg" alt="Conference sketchnotes" gallery="apr-2020">}}

### Regex
#### Find
\{\{< glightbox src="(.+?)".+?alt="(.+?)".+?>\}\}

#### Replace
![$2]($1){:loading="lazy"}


## Image links

### Example
<img src="https://media.bennorris.org/images/gospelsketcher/uploads/2020/7eda015c96.jpg" alt="Conference sketchnotes" />

### Regex
#### Find
<img src="(.+?)".+?alt="(.+?)".+?>

#### Replace
![$2]($1){:loading="lazy"}


## Old MWH Links

### Example
(https://www.mentalworkhealth.org/2020/11/02/loss-and-uncertainty.html) and more things with (testing.html)

### Regex
#### Find
\(https://www\.mentalworkhealth\.org/(\d{4})/(\d{2})/(\d{2})/([^.]*)\.html[^)]*\)

#### Replace
({% post_url $1-$2-$3-$4 %})


## New MWH Links

### Example
(https://www.mentalworkhealth.org/2020/11/02/loss-and-uncertainty.html) and more things with (testing.html)

### Regex
#### Find
\(https://www\.mentalworkhealth\.org/(\d{4}/\d{2}/\d{2}/[^.]+?)\.html[^)]*\)

#### Replace
(https://bennorris.org/$1)


## Post URL Links

### Example
{% post_url 2013-12-08-my-own-cars-moment %} With more things {% testing %}

### Regex
#### Find
\{% post_url (\d{4})-(\d{2})-(\d{2})-(\S*) %\}

#### Replace
https://bennorris.org/$1/$2/$3/$4/


## Wrong date

(Have to then manually look at each one and replace the date and hour)

### Example
date:       2020-05-05 03:02:47-0000
date: 2020-05-06 03:02:47-0700
date: 2020-05-06 03:02:47-0000

### Regex
#### Find
(date:\s*\d{4}-\d{2}-)(\d{2})\s(\d{2})(:\d{2}:\d{2})-0000

#### Replace
$1XX XX$4-0700


## Blog links

### Example
<a href="http://www.bennorris.blog/2012/02/08/humancomputer-interaction-part.html">
href="https://www.bennorris.blog/2012/04/05/lds-general-conference.html"
[Day one](https://www.bennorris.blog/2020/11/20/today-i-am.html)
The start of a new year has traditionally been a time I look forward to and enjoy greatly. In the past, I used to set all manner of detailed goals for the new year. For the past couple of years, I have taken an entirely new approach. My [2019 goals](https://www.bennorris.blog/2019/01/01/my-goals.html) were to **be intentional**, **be present** and **be curious**. My [2020 goals](https://www.bennorris.blog/2020/01/01/my-goals.html) were to **make more mistakes**, and **carry less to give more**.

### Regex
#### Find
(http|https)://www\.bennorris\.blog(.+?)\.html

#### Replace
https://bennorris.org$2


## Gallery Thumbs

### Example
gallery_thumb: https://media.bennorris.org/images/gospelsketcher/general/feb-19-organ-window.png
gallery_thumb: https://media.bennorris.org/images/gospelsketcher/general-conference/apr-2021/apr-21-1-sat-am.jpg
gallery_thumb:
- https://media.bennorris.org/images/gospelsketcher/general-conference/oct-2012/oct-12-1-sat-am-00.jpg
- https://media.bennorris.org/images/gospelsketcher/general-conference/oct-2012/oct-12-1-sat-am.jpg
---

### Regex
#### Find
(gallery_thumb: https://media\.bennorris\.org/images/gospelsketcher/).*/(.*)

#### Replace
$1thumbs/$2


## Mindful Sketch Image links

### Example
![Mindful sketch](https://media.bennorris.org/images/mindfulsketch/posts/2022-03-09-1834-mindfulsketch.jpg)

### Regex
#### Find
!\[Mindful sketch\]\(https://media.bennorris.org/images/mindfulsketch/posts/.+?\)

#### Replace
$0{:loading="lazy"}


## Move Mindful Sketch Images

### Example
https://media.bennorris.org/images/mentalworkhealth/mindfulsketch/2022-03-07-0730-mindfulsketch.jpg

### Regex
#### Find
https://media.bennorris.org/images/mentalworkhealth/mindfulsketch/(.+?)-mindfulsketch\.jpg

#### Replace
https://media.bennorris.org/images/mindfulsketch/posts/$1-mindfulsketch.jpg