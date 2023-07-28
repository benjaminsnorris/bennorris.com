---
layout: page
title: Subscribe
---

You can subscribe via [RSS](/feed.xml), or by entering your email address below. Selecting categories will update your preferences so that you will receive only those emails.

<div id="subscribe-block">
  <form
    action="https://buttondown.email/api/emails/embed-subscribe/bennorris"
    method="post"
    onsubmit="submitUpdatedSubscriptionForm()"
    id="manage-subscription-form"
  >
    <label id="email-input-label" for="email-input" class="small">Subscribe to get updates delivered to your inbox</label>
    <div class="email-input-row">
      <input type="email" name="email" id="email-input" class="email-input" required placeholder="Your email" />
      <input type="submit" data-analytics='"Subscribe", {"props":{"location":"{{ include.location | default: "post" }}"}}' id="subscribe-button" class="btn" value="Subscribe" />
    </div>
    <div class="tag-input">
      <fieldset class="tag-input-set">
        <p class="small">Which articles do you want to receive in your inbox?</p>
        <span>
          <input type="checkbox" id="select-all" onClick="toggle(this)">
          <label for="select-all">All</label>
        </span>
        <span>
          <input type="checkbox" id="wholehearted-ownership" name="tag" onClick="updateCheckboxes()" value="Wholehearted Ownership">
          <label for="wholehearted-ownership">Wholehearted Ownership</label>
          <a href="#wholehearted-ownership-info">(ℹ)</a>
        </span>
        <span>
          <input type="checkbox" id="mental-work-health" name="tag" onClick="updateCheckboxes()" value="Mental Work Health">
          <label for="mental-work-health">Mental Work Health</label>
          <a href="#mental-work-health-info">(ℹ)</a>
        </span>
        <span>
          <input type="checkbox" id="sketchnotable" name="tag" onClick="updateCheckboxes()" value="Sketchnotable">
          <label for="sketchnotable">Sketchnotable</label>
          <a href="#sketchnotable-info">(ℹ)</a>
        </span>
        <span>
          <input type="checkbox" id="gospel-sketcher" name="tag" onClick="updateCheckboxes()" value="Gospel Sketcher">
          <label for="gospel-sketcher">Gospel Sketcher</label>
          <a href="#gospel-sketcher-info">(ℹ)</a>
        </span>
        <span>
          <input type="checkbox" id="general" name="tag" onClick="updateCheckboxes()" value="General">
          <label for="general">General</label>
          <a href="#general-info">(ℹ)</a>
        </span>
      </fieldset>
    </div>
    <input type="hidden" value="1" name="embed" />
  </form>
  <p id="subscribed-date-confirmation" class="small" style="display:none;">🎉 Thanks for joining me. Your subscription was last updated on <span id="subscribed-date">[date]</span>.</p>
</div>


## Category explanations

### [Wholehearted Ownership](/wholehearted-ownership/)
{:#wholehearted-ownership-info}

The purpose of this project is to share thoughts on leading and living with ownership, even [extreme ownership](/tags/extreme-ownership/), as well as being authentic and wholehearted.

[{{ site.data.text[site.locale].back_to_top | default: 'Back to Top' }} &uarr;](#main){:.back-to-top}


### [Mental Work Health](/mental-work-health/)
{:#mental-work-health-info}

My goal is to increase awareness and reduce stigma around mental health, especially at work. This project includes [weekly updates](/tags/weekly-update/) sharing my life with OCD, as well as other occasional articles.

[{{ site.data.text[site.locale].back_to_top | default: 'Back to Top' }} &uarr;](#main){:.back-to-top}


### [Sketchnotable](/sketchnotable/)
{:#sketchnotable-info}

One of my favorite hobbies is creating [sketchnotes](/tags/sketchnotes/). Subscribe to this category for visual notes from conferences and other business-related events.

[{{ site.data.text[site.locale].back_to_top | default: 'Back to Top' }} &uarr;](#main){:.back-to-top}


### [Gospel Sketcher](/gospel-sketcher/)
{:#gospel-sketcher-info}

Sketchnoting all started for me at church and [General Conference](/tags/general-conference/). Include this for sketchnotes from Christian messages.

[{{ site.data.text[site.locale].back_to_top | default: 'Back to Top' }} &uarr;](#main){:.back-to-top}


### [General](/general/)
{:#general-info}

This category is for any writing that doesn’t fall into another category. Examples include [Kid Quotes](/tags/kid-quotes/), [podcast clips](/tags/podcast-clips), and many others.

[{{ site.data.text[site.locale].back_to_top | default: 'Back to Top' }} &uarr;](#main){:.back-to-top}


<script>
  if (location.search) {
    var searchParams = new URLSearchParams(location.search);
    if (searchParams.has('email')) {
      var email = searchParams.get('email');
      window.localStorage.setItem('subscribedEmail', email);
      var date = new Date();
      window.localStorage.setItem('subscribedDate', date.toLocaleDateString());
    }
  }

  var subscribedEmail = window.localStorage.getItem('subscribedEmail');
  if (subscribedEmail) {
    document.getElementById("email-input-label").innerHTML = "Manage your newsletter subscription";
    document.getElementById("email-input").value = subscribedEmail;
    document.getElementById("subscribe-button").value = "Update";
  }

  var subscribedDate = window.localStorage.getItem('subscribedDate');
  if (subscribedDate) {
    document.getElementById("subscribed-date-confirmation").style.display = 'block';
    document.getElementById("subscribed-date").innerHTML = subscribedDate;
  }

  var checkboxes = document.getElementsByName('tag');
  var checkAll = document.getElementById('select-all');
  updateCategories();

  function updateCategories() {
    var tagsString = window.localStorage.getItem('tags');
    var tags = JSON.parse(tagsString);
    if (tags) {
      if (tags.length == checkboxes.length) {
        checkAll.checked = true;
        toggle(checkAll);
      } else {
        for (var i = 0; i < tags.length; i++) {
          var slug = tags[i].toLowerCase();
          slug = slug.replace(/\s/g, '-');
          var checkbox = document.getElementById(slug);
          checkbox.checked = true;
        }
      }
    }
  }

  function submitUpdatedSubscriptionForm() {
    var email = document.getElementById("email-input").value;
    window.localStorage.setItem('subscribedEmail', email);

    var date = new Date();
    window.localStorage.setItem('subscribedDate', date.toLocaleDateString());

    var tags = Array();
    for (var i = 0; i < checkboxes.length; i++) {
      var checkbox = checkboxes[i];
      if (checkbox.checked) {
        tags.push(checkbox.value);
      }
    }
    window.localStorage.setItem('tags', JSON.stringify(tags));
  }

  function updateCheckboxes() {
    var allChecked = true;
    for (var i = 0; i < checkboxes.length; i++) {
      if (checkboxes[i].checked == false) {
        allChecked = false;
      }
    }
    checkAll.checked = allChecked;
  }

  function toggle(selectAll) {
    for (var i = 0; i < checkboxes.length; i++) {
      checkboxes[i].checked = selectAll.checked;
    }
  }
</script>
