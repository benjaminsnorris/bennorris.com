---
---

/*!
 * Basically Basic Jekyll Theme 1.4.4
 * Copyright 2017-2018 Michael Rose - mademistakes | @mmistakes
 * Free for personal and commercial use under the MIT license
 * https://github.com/mmistakes/jekyll-theme-basically-basic/blob/master/LICENSE
*/

var menuItems = document.querySelectorAll('#sidebar li');

// Get vendor transition property
var docElemStyle = document.documentElement.style;
var transitionProp = typeof docElemStyle.transition == 'string' ?
  'transition' : 'WebkitTransition';

// Animate sidebar menu items
function animateMenuItems() {
  for (var i = 0; i < menuItems.length; i++) {
    var item = menuItems[i];
    // Stagger transition with transitionDelay
    item.style[transitionProp + 'Delay'] = (i * 75) + 'ms';
    item.classList.toggle('is--moved');
  }
};

var myWrapper = document.querySelector('.wrapper');
var myMenu = document.querySelector('.sidebar');
var myToggle = document.querySelector('.toggle');
var myInitialContent = document.querySelector('.initial-content');
var mySearchContent = document.querySelector('.search-content');
var mySearchToggle = document.querySelector('.search-toggle');

// Toggle sidebar visibility
function toggleClassMenu() {
  myMenu.classList.add('is--animatable');
  if (!myMenu.classList.contains('is--visible')) {
    myMenu.classList.add('is--visible');
    myToggle.classList.add('open');
    myWrapper.classList.add('is--pushed');
  } else {
    myMenu.classList.remove('is--visible');
    myToggle.classList.remove('open');
    myWrapper.classList.remove('is--pushed');
  }
}

// Animation smoother
function OnTransitionEnd() {
  myMenu.classList.remove('is--animatable');
}

myMenu.addEventListener('transitionend', OnTransitionEnd, false);
myToggle.addEventListener('click', function () {
  toggleClassMenu();
  animateMenuItems();
}, false);
myMenu.addEventListener('click', function () {
  toggleClassMenu();
  animateMenuItems();
}, false);
if (mySearchToggle) {
  mySearchToggle.addEventListener('click', function () {
    toggleClassSearch();
  }, false);
}

// Toggle search input and content visibility
function toggleClassSearch() {
  mySearchContent.classList.toggle('is--visible');
  myInitialContent.classList.toggle('is--hidden');
  setTimeout(function () {
    document.querySelector('.search-content input').focus();
  }, 400);
}

let buttons = document.querySelectorAll("button[data-analytics]");
for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', handleFormEvent);
    buttons[i].addEventListener('auxclick', handleFormEvent);
}

function handleFormEvent(event) {
    event.preventDefault();
    let attributes = event.target.getAttribute('data-analytics').split(/,(.+)/);
    let events = [JSON.parse(attributes[0]), JSON.parse(attributes[1] || '{}')];
    plausible(...events);
    setTimeout(function () {
        event.target.form.submit();
    }, 150);
}

let links = document.querySelectorAll("a[data-analytics]");
for (var i = 0; i < links.length; i++) {
    links[i].addEventListener('click', handleLinkEvent);
    links[i].addEventListener('auxclick', handleLinkEvent);
}

function handleLinkEvent(event) {
    var link = event.target;
    var middle = event.type == "auxclick" && event.which == 2;
    var click = event.type == "click";
    while (link && (typeof link.tagName == 'undefined' || link.tagName.toLowerCase() != 'a' || !link.href)) {
        link = link.parentNode;
    }
    if (middle || click) {
        let attributes = link.getAttribute('data-analytics').split(/,(.+)/);
        let events = [JSON.parse(attributes[0]), JSON.parse(attributes[1] || '{}')];
        plausible(...events);
    }
    if (!link.target) {
        if (!(event.ctrlKey || event.metaKey || event.shiftKey) && click) {
            setTimeout(function () {
                location.href = link.href;
            }, 150);
            event.preventDefault();
        }
    }
}
