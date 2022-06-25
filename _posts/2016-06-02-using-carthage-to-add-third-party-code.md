---
title:          "Using Carthage to add third-party code"
date:           2016-06-02 10:30:00-0700
excerpt:        Simplify third-party dependencies using Carthage and Git submodules.
category:     	General
tags:
- code
- reference
---

In almost every project that I create, I bring in frameworks and libraries. After trying a number of different approaches to make this easier, I have landed on a system that uses [Carthage](https://github.com/Carthage/Carthage), and [Git submodules](https://git-scm.com/book/en/v2/Git-Tools-Submodules). The system basically comes from [a post by Bart Whiteley](https://gist.github.com/bwhiteley/aa571da100bca3a65c1f), but I wanted to record all of the steps so that I have them in one place for my own reference.

The advantage of this system that you have all the control of submodules, while having the ease of using Carthage to keep dependencies in sync. You can easily change the version number of the dependencies in Carthage, and then commit the update to the submodule, making it easy to work across teams.

## Pre-requisites
1. Create a workspace with your project included.
	- For help, look at [Apple’s instructions](https://developer.apple.com/library/ios/recipes/xcode_help-structure_navigator/articles/Creating_a_Workspace.html).
2. Set up a Cartfile with your dependencies.
	- For help, look at the [Carthage documentation](https://github.com/Carthage/Carthage/blob/master/Documentation/Artifacts.md#cartfile).
3. In Terminal, run the command `carthage bootstrap --no-build --use-submodules`.
	- Make sure that you have `carthage` installed ([documentation](https://github.com/Carthage/Carthage#installing-carthage)).
	- This will clone or fetch all of your dependencies, and check them out as git submodules in your project
	- *Note:* You only need to run `bootstrap` once in your project. After that, you will run `carthage update --no-build --use-submodules`.

## Bringing in a dependency
1. Find the FrameworkName.xcodeproj file for the dependency in .Carthage/Checkouts and add it to your workspace.
	- Make sure that you drag the project to the far left so that it becomes a workspace project instead of a subproject under an existing project.
2. In the General tab of your app target, add the framework to “Linked Frameworks and Libraries” by searching in the workspace.
3. The framework should show up in your Project Navigator. Drag it to a folder according to your project organization.
4. Add the same framework to “Embedded Binaries” in the General tab.
5. This will probably create a duplicate entry in “Linked Frameworks and Libraries” which you should remove.
6. Select the framework in the Project Navigator, and change the Location to “Relative to Build Products” in the File Inspector panel on the right.
7. Edit your project file (ProjectName.xcodeproj/project.pbxproj) in a text editor.
	- In the `PBXFileReference` section, find the entry for your framework.
	- Edit the `path` property to be simply `FrameworkName.framework`. You will probably be removing a long, absolute path reference.
	- The `sourceTree` property should be set to `BUILT_PRODUCTS_DIR`.
8. In the Build Settings tab of your app target, find the “Framework Search Paths” option. An entry pointing to the framework in .Carthage/Checkouts has probably been added, which you should remove.
9. Build the project and make sure there are no errors.

## Additional information
When someone else checks out the project, it is not necessary to run any `carthage` commands. Instead, they will update the submodules. This can be done in Terminal, if needed, using `git submodule update --init`.

## Conclusion
It is always a challenge to find the best way to incorporate third-party code in a consistent, repeatable way that works well for individual developers as well as automated build systems. This has worked well for us, and hopefully will help you and your team as well.
