---
title:          "Adding automation to open-source projects"
date:           2016-09-16 13:00:00-0700
excerpt:        Improving projects and increasing self-guilt with Travis, Slather and Codecov
category:       General
tags:
- code
- testing
- reference
---

One goal that I have had for all of my open-source projects is to have run automated builds and have complete test coverage. Achieving this goals is a slow process, but something that I have wanted to learn and get more comfortable with so that I can be more disciplined. I decide to post the build status and coverage data for all of my libraries on my site, to provide myself additional incentive to hurry and get everything updated.

At my day job, we are using [Jenkins](https://jenkins.io) and [Fastlane](https://fastlane.tools) to run all unit and UI tests after every commit that is pushed, and to submit to iTunes Connect after every merge to `master` following a successful pull request. For my open-source libraries, I just wanted something to make sure that they build and run all the tests after changes. For now, I landed on using [Travis](https://travis-ci.org) to run the automated builds, and [Codecov](https://codecov.io) to collect coverage reports. I wanted to capture some of the process to be able to refer back to it, and hopefully it can help others with similar goals.

## Steps
_All examples are using my [TextMagic](https://github.com/benjaminsnorris/TextMagic) framework. Remember to change the names to match your project._

1. Set up [Travis](https://travis-ci.org/profile) to start building your project
1. Add `travis.yml` to project (see sample below)
  - Make sure to build either project or workspace, as needed
1. Add `slather.yml` to to limit coverate reporting to `Sources` using [Slather](https://github.com/SlatherOrg/slather) (see sample below)
1. Include a call to [Codecov](https://codecov.io/) after the build in Travis to collect code coverage information (see sample below)
1. Test locally to make sure that it builds properly and then view the reports on Codecov
  - `xcodebuild -workspace TextMagic.xcworkspace -scheme TextMagic -sdk iphonesimulator9.3 -destination="OS=9.3,name=iPhone 6S Plus" -configuration Debug GCC_INSTRUMENT_PROGRAM_FLOW_ARCS=YES GCC_GENERATE_TEST_COVERAGE_FILES=YES ONLY_ACTIVE_ARCH=YES test | xcpretty -c`
  - `slather coverage -s --scheme TextMagic --workspace TextMagic.xcworkspace/ TextMagic.xcodeproj/`
1. Push to GitHub, and make sure Travis builds successfully
1. Include build and coverage information in your README.md file

<div class="badges">
  <a href="https://travis-ci.org/benjaminsnorris/TextMagic">![Build Status](https://img.shields.io/travis/benjaminsnorris/TextMagic.svg){:loading="lazy"}
  <br/>
  <code class="highlighter-rouge">
    [![Build Status](https://img.shields.io/travis/benjaminsnorris/TextMagic.svg)](https://travis-ci.org/benjaminsnorris/TextMagic){:loading="lazy"}
  </code>
  <br/>
  <br/>
  <a href="https://codecov.io/gh/benjaminsnorris/TextMagic">![Code Coverage](https://img.shields.io/codecov/c/github/benjaminsnorris/TextMagic.svg){:loading="lazy"}
  <br/>
  <code class="highlighter-rouge">
    [![codecov](https://img.shields.io/codecov/c/github/benjaminsnorris/TextMagic.svg)](https://codecov.io/gh/benjaminsnorris/TextMagic){:loading="lazy"}  </code>
</div>

## Sample `travis.yml` file

```yml
language: objective-c

before_install:
  - gem install xcpretty --no-rdoc --no-ri --no-document --quiet
  - gem install slather

env:
  global:
    - LC_CTYPE=en_US.UTF-8
    - LANG=en_US.UTF-8
    - PROJECT_NAME="TextMagic"
    - WORKSPACE_SUFFFIX=".xcworkspace"
    - FRAMEWORK_SCHEME="TextMagic"
    - IOS_SDK=iphonesimulator9.3

matrix:
  include:
    - osx_image: xcode7.3
      env: DESTINATION="OS=9.0,name=iPhone 6S Plus"  SCHEME="$FRAMEWORK_SCHEME" SDK="$IOS_SDK"
    - osx_image: xcode7.3
      env: DESTINATION="OS=9.1,name=iPhone 6S"       SCHEME="$FRAMEWORK_SCHEME" SDK="$IOS_SDK"
    - osx_image: xcode7.3
      env: DESTINATION="OS=9.3,name=iPad Pro"        SCHEME="$FRAMEWORK_SCHEME" SDK="$IOS_SDK"

script:
  - set -o pipefail
  - xcodebuild -version
  - xcodebuild -showsdks
  - xcodebuild
    -workspace "$PROJECT_NAME$WORKSPACE_SUFFFIX"
    -scheme "$SCHEME"
    -sdk "$SDK"
    -destination "$DESTINATION"
    -configuration Debug
    GCC_INSTRUMENT_PROGRAM_FLOW_ARCS=YES
    GCC_GENERATE_TEST_COVERAGE_FILES=YES
    ONLY_ACTIVE_ARCH=YES
    test
    | xcpretty -c

after_success:
  - slather
  - bash <(curl -s https://codecov.io/bash) -J "$PROJECT_NAME" -f ./test_reports/cobertura.xml
```

## Sample `slather.yml` file

```yml
# .slather.yml

coverage_service:   cobertura_xml
xcodeproj:          TextMagic.xcodeproj
workspace:          TextMagic.xcworkspace
scheme:             TextMagic
source_directory:   Sources
output_directory:   test_reports
```

## Sample call to Codecov

`bash <(curl -s https://codecov.io/bash) -J "$PROJECT_NAME" -f ./test_reports/cobertura.xml`

Even though this call is included already in the sample `travis.yml` file, I want to explain it a bit more.

`bash <(curl -s https://codecov.io/bash)` downloads the latest script from Codecov.

`-J "$PROJECT_NAME"` specifies  the packages to build coverage. This can significantly reduces time to build coverage reports.

`-f ./test_reports/cobertura.xml` targets the file that Slather created so that it is not searching for all reports.
