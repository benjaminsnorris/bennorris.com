---
title:          "Fixing local problems with a Carthage version number"
date:           2016-06-06 09:30:00-0700
update_date:    2016-10-04 12:48:00-0600
excerpt:        For those times when Carthage will not bend itself to your will.
category:       General
tags:
- code
- reference
---

As I [discussed previously](https://bennorris.org/2016/06/02/using-carthage-to-add-third-party-code/), we are using Carthage and Git submodules to manage our dependencies. Since many of the frameworks that we are pulling in are frameworks that we are writing, we sometimes run into an issue where we have changed the version number of a release for a framework to be the same as a previous version. This does not happen often, but can happen if you have made a release, and then later deleted the release and the tag and made a new release pointing to a different commit.

The problem is that when you update a framework via a Carthage dependency, a local cache of the repo is saved, along with the version number tags. If you change your Cartfile to reference a version number that was previously downloaded, Carthage will use the locally cached version instead of getting the latest update from GitHub.

## Solution
1. Using Terminal, navigate to the Carthage cache.
  - `cd /Users/[username]/Library/Caches/org.carthage.CarthageKit/dependencies`
2. Remove the directory matching the framework that you need to force to download.
  - `rm -rf FrameworkName/`
3. Back in your project directory, update again from Carthage.
  - `carthage update --no-build --use-submodules`
  - _Edit: `carthage checkout` works better for this. Thanks [Tim Shadel](https://twitter.com/timshadel)!_

## Summary
Your framework will download from GitHub at whatever version number you have specified, and you should be set. This is mostly a reference for myself for the next time that I need to remember how to do this, but hopefully it can help you as well.
