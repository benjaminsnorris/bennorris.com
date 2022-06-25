---
title:          "Handling live text reload elegantly"
date:           2016-08-31 13:00:00-0700
update_date:    2016-09-02 06:20:00-0700
excerpt:        Easy steps to support concurrent editing without losing cursor position or text selection in UITextView
category:       General
tags:
- code
- reference
---

In my current project at my day job, we are using [Firebase](https://firebase.google.com) and [ReSwift](https://github.com/ReSwift/ReSwift). I plan to write more about this powerful combination soon. One of the major advantages is that it allows us to easily support live reloading of concurrent editing. However, I ran into a problem in long-form text editing. It was impressive to see the text update while someone else edited the same data, but if you were also trying to type, it would get extremely frustrating. With every reload, your cursor would jump to the end of the text, making it nearly impossible to keep working.

One of my favorite podcasts, [Runtime](https://spec.fm/podcasts/runtime), recently mentioned approaches to diffing text. I reached out to [Sam Soffes](https://twitter.com/soffes), who pointed me to a simple library he created for this, [diff](https://github.com/soffes/diff).

Using that library, I was ready to tackle preserving the cursor position and text selection when the underlying text changed. In the hopes that others can benefit from or improve this work, here is the code that I am using:

```swift
func updateText(with newString: String?) {
    guard let textView = textView, newString = newString,
      (diffRange, changedText) = diff(textView.text, newString) else { return }
    guard let selectedRange = textView.selectedTextRange else { textView.text = newString; return }
    textView.text = newString

    let cursorOffset = textView.offsetFromPosition(textView.beginningOfDocument, toPosition: selectedRange.start)
    let selectedEndOffset = textView.offsetFromPosition(textView.beginningOfDocument, toPosition: selectedRange.end)
    let selectedRangeLength = selectedEndOffset - cursorOffset

    if selectedEndOffset < diffRange.startIndex {
        // Change is after current cursor
        moveCursorRelativeToBeginning(with: cursorOffset, rangeLength: selectedRangeLength)
    } else if cursorOffset < diffRange.startIndex && selectedEndOffset > diffRange.endIndex {
        // Change occurs within selection
        moveCursorRelativeToBeginning(with: cursorOffset, rangeLength: selectedRangeLength + changedText.characters.count - diffRange.count)
    } else if cursorOffset >= diffRange.endIndex {
        // Change occurs completely before current cursor
        moveCursorRelativeToBeginning(with: cursorOffset + changedText.characters.count - diffRange.count, rangeLength: selectedRangeLength)
    } else if diffRange.startIndex < selectedEndOffset && diffRange.startIndex > cursorOffset {
        // Change starts in middle of selection
        moveCursorRelativeToBeginning(with: cursorOffset, rangeLength: selectedRangeLength - (selectedEndOffset - diffRange.startIndex))
    } else if diffRange.startIndex <= cursorOffset && cursorOffset < diffRange.endIndex {
        // Change is a removal/change over the current cursor position
        let rangeLength = selectedRangeLength - (diffRange.endIndex - cursorOffset)
        moveCursorRelativeToBeginning(with: cursorOffset - (cursorOffset - diffRange.startIndex) + changedText.characters.count, rangeLength: rangeLength > 0 ? rangeLength : 0)
    }
}

private func moveCursorRelativeToBeginning(with offset: Int, rangeLength: Int = 0) {
    guard let textView = textView, startPosition = textView.positionFromPosition(textView.beginningOfDocument, offset: offset), endPosition = textView.positionFromPosition(startPosition, offset: rangeLength) else { return }
    textView.selectedTextRange = textView.textRangeFromPosition(startPosition, toPosition: endPosition)
}
```

This is even more useful when combined with the automated tests that ensure that it is working properly. Here are all of the tests:

```swift
import XCTest
import Nimble
import Diff
@testable import align

class TextEditingSpec: XCTestCase {

    var textEditing: TextEditing!

    override func setUp() {
        super.setUp()
        textEditing = TextEditing.initializeFromStoryboard()
        let _ = textEditing.view
        textEditing.textView = UITextView()
    }

    /// test that it loads properly
    func testThatItLoadsProperly() {
        expect(self.textEditing.textView).toNot(beNil())
        expect(self.textEditing.textView?.text) == ""
        expect(self.textEditing.title).to(beNil())
    }


    // MARK: - Cursor position tests

    // Original text: "Watch Bugger attack videos together and discuss strategy."

    /// test that cursor position does not change if state changes but agenda is unchanged
    func testThatCursorPositionDoesNotChangeIfStateChangesButAgendaIsUnchanged() {
        textEditing.textView?.text = "Watch Bugger attack videos together and discuss strategy."
        textEditing.textView?.becomeFirstResponder()
        moveCursorRelativeToBeginning(with: 10)
        expect(self.cursorOffset()) == 10
        expect(self.selectedRangeLength()) == 0

        textEditing.updateText(with: "Watch Bugger attack videos together and discuss strategy.")
        expect(self.cursorOffset()) == 10
        expect(self.selectedRangeLength()) == 0
}

    /// test that cursor position does not change when agenda has changes after cursor
    func testThatCursorPositionDoesNotChangeWhenAgendaHasChangesAfterCursor() {
        textEditing.textView?.text = "Watch Bugger attack videos together and discuss strategy."
        textEditing.textView?.becomeFirstResponder()
        moveCursorRelativeToBeginning(with: 10)
        expect(self.cursorOffset()) == 10
        expect(self.selectedRangeLength()) == 0

        textEditing.updateText(with: "Watch Bugger attack videos together.")
        expect(self.cursorOffset()) == 10
        expect(self.selectedRangeLength()) == 0
    }

    /// test that cursor position changes when agenda has removed text before current cursor position
    func testThatCursorPositionChangesWhenAgendaHasRemovedTextBeforeCurrentCursorPosition() {
        textEditing.textView?.text = "Watch Bugger attack videos together and discuss strategy."
        textEditing.textView?.becomeFirstResponder()
        moveCursorRelativeToBeginning(with: 10)
        expect(self.cursorOffset()) == 10
        expect(self.selectedRangeLength()) == 0

        textEditing.updateText(with: "Bugger attack videos together and discuss strategy.")
        expect(self.cursorOffset()) == 4
        expect(self.selectedRangeLength()) == 0
    }

    /// test that cursor position changes when agenda has changed text before current cursor position
    func testThatCursorPositionChangesWhenAgendaHasChangedTextBeforeCurrentCursorPosition() {
        textEditing.textView?.text = "Watch Bugger attack videos together and discuss strategy."
        textEditing.textView?.becomeFirstResponder()
        moveCursorRelativeToBeginning(with: 10)
        expect(self.cursorOffset()) == 10
        expect(self.selectedRangeLength()) == 0

        textEditing.updateText(with: "View Bugger attack videos together and discuss strategy.")
        expect(self.cursorOffset()) == 9
        expect(self.selectedRangeLength()) == 0
    }

    /// test that cursor position changes when agenda has removed text that includes current cursor position
    func testThatCursorPositionChangesWhenAgendaHasRemovedTextThatIncludesCurrentCursorPosition() {
        textEditing.textView?.text = "Watch Bugger attack videos together and discuss strategy."
        textEditing.textView?.becomeFirstResponder()
        moveCursorRelativeToBeginning(with: 10)
        expect(self.cursorOffset()) == 10
        expect(self.selectedRangeLength()) == 0

        textEditing.updateText(with: "Watch attack videos together and discuss strategy.")
        expect(self.cursorOffset()) == 6
        expect(self.selectedRangeLength()) == 0
    }

    /// test that cursor position changes when agenda has changed text that includes current cursor position
    func testThatCursorPositionChangesWhenAgendaHasChangedTextThatIncludesCurrentCursorPosition() {
        textEditing.textView?.text = "Watch Bugger attack videos together and discuss strategy."
        textEditing.textView?.becomeFirstResponder()
        moveCursorRelativeToBeginning(with: 10)
        expect(self.cursorOffset()) == 10
        expect(self.selectedRangeLength()) == 0

        textEditing.updateText(with: "View recorded Bugger attack videos together and discuss strategy.")
        expect(self.cursorOffset()) == 18
        expect(self.selectedRangeLength()) == 0
    }


    // MARK: - Selected text tests

    /// test that text selection does not changes when text does not change
    func testThatTextSelectionDoesNotChangesWhenTextDoesNotChange() {
        textEditing.textView?.text = "Watch Bugger attack videos together and discuss strategy."
        textEditing.textView?.becomeFirstResponder()
        moveCursorRelativeToBeginning(with: 6, length: 6)
        expect(self.cursorOffset()) == 6
        expect(self.selectedRangeLength()) == 6

        textEditing.updateText(with: "Watch Bugger attack videos together and discuss strategy.")
        expect(self.cursorOffset()) == 6
        expect(self.selectedRangeLength()) == 6
    }

    /// test that text selection does not change when text changes occur after selection
    func testThatTextSelectionDoesNotChangeWhenTextChangesOccurAfterSelection() {
        textEditing.textView?.text = "Watch Bugger attack videos together and discuss strategy."
        textEditing.textView?.becomeFirstResponder()
        moveCursorRelativeToBeginning(with: 6, length: 6)
        expect(self.cursorOffset()) == 6
        expect(self.selectedRangeLength()) == 6

        textEditing.updateText(with: "Watch Bugger attack videos and discuss strategy.")
        expect(self.cursorOffset()) == 6
        expect(self.selectedRangeLength()) == 6
    }

    /// test that text selection remains same but moves when text is added before selection
    func testThatTextSelectionRemainsSameButMovesWhenTextIsAddedBeforeSelection() {
        textEditing.textView?.text = "Watch Bugger attack videos together and discuss strategy."
        textEditing.textView?.becomeFirstResponder()
        moveCursorRelativeToBeginning(with: 6, length: 6)
        expect(self.cursorOffset()) == 6
        expect(self.selectedRangeLength()) == 6

        textEditing.updateText(with: "Watch the Bugger attack videos together and discuss strategy.")
        expect(self.cursorOffset()) == 10
        expect(self.selectedRangeLength()) == 6
    }

    /// test that text selection adjusts to include changes that occur within the selection
    func testThatTextSelectionAdjustsToIncludeChangesThatOccurWithinTheSelection() {
        textEditing.textView?.text = "Watch Bugger attack videos together and discuss strategy."
        textEditing.textView?.becomeFirstResponder()
        moveCursorRelativeToBeginning(with: 6, length: 6)
        expect(self.cursorOffset()) == 6
        expect(self.selectedRangeLength()) == 6

        textEditing.updateText(with: "Watch Bear attack videos together and discuss strategy.")
        expect(self.cursorOffset()) == 6
        expect(self.selectedRangeLength()) == 4
    }

    /// test that text selection expands to include additions that occur within the selection
    func testThatTextSelectionExpandsToIncludeAdditionsThatOccurWithinTheSelection() {
        textEditing.textView?.text = "Watch Bugger attack videos together and discuss strategy."
        textEditing.textView?.becomeFirstResponder()
        moveCursorRelativeToBeginning(with: 6, length: 6)
        expect(self.cursorOffset()) == 6
        expect(self.selectedRangeLength()) == 6

        textEditing.updateText(with: "Watch Big bad bugger attack videos together and discuss strategy.")
        expect(self.cursorOffset()) == 6
        expect(self.selectedRangeLength()) == 14
    }

    /// test that text selection is truncated when the end of the selection is removed
    func testThatTextSelectionIsTruncatedWhenTheEndOfTheSelectionIsRemoved() {
        textEditing.textView?.text = "Watch Bugger attack videos together and discuss strategy."
        textEditing.textView?.becomeFirstResponder()
        moveCursorRelativeToBeginning(with: 6, length: 6)
        expect(self.cursorOffset()) == 6
        expect(self.selectedRangeLength()) == 6

        textEditing.updateText(with: "Watch Bug attack videos together and discuss strategy.")
        expect(self.cursorOffset()) == 6
        expect(self.selectedRangeLength()) == 3
    }

    /// test that text selection is truncated when the end of the selection is changed
    func testThatTextSelectionIsTruncatedWhenTheEndOfTheSelectionIsChanged() {
        textEditing.textView?.text = "Watch Bugger attack videos together and discuss strategy."
        textEditing.textView?.becomeFirstResponder()
        moveCursorRelativeToBeginning(with: 6, length: 6)
        expect(self.cursorOffset()) == 6
        expect(self.selectedRangeLength()) == 6

        textEditing.updateText(with: "Watch Bug vehicle attack videos together and discuss strategy.")
        expect(self.cursorOffset()) == 6
        expect(self.selectedRangeLength()) == 3
    }

    /// test that text selection is truncated when the beginning of the selection is removed
    func testThatTextSelectionIsTruncatedWhenTheBeginningOfTheSelectionIsRemoved() {
        textEditing.textView?.text = "Watch Bugger attack videos together and discuss strategy."
        textEditing.textView?.becomeFirstResponder()
        moveCursorRelativeToBeginning(with: 6, length: 6)
        expect(self.cursorOffset()) == 6
        expect(self.selectedRangeLength()) == 6

        textEditing.updateText(with: "Watch er attack videos together and discuss strategy.")
        expect(self.cursorOffset()) == 6
        expect(self.selectedRangeLength()) == 2
    }

    /// test that text selection is truncated and moved when the beginning of the selection is changed
    func testThatTextSelectionIsTruncatedAndMovedWhenTheBeginningOfTheSelectionIsChanged() {
        textEditing.textView?.text = "Watch Bugger attack videos together and discuss strategy."
        textEditing.textView?.becomeFirstResponder()
        moveCursorRelativeToBeginning(with: 6, length: 6)
        expect(self.cursorOffset()) == 6
        expect(self.selectedRangeLength()) == 6

        textEditing.updateText(with: "Watching some tiger attack videos together and discuss strategy.")
        expect(self.cursorOffset()) == 16
        expect(self.selectedRangeLength()) == 3
    }

    /// test that cursor does not move when the exact selection is removed
    func testThatCursorDoesNotMoveWhenTheExactSelectionIsRemoved() {
        textEditing.textView?.text = "Watch Bugger attack videos together and discuss strategy."
        textEditing.textView?.becomeFirstResponder()
        moveCursorRelativeToBeginning(with: 6, length: 6)
        expect(self.cursorOffset()) == 6
        expect(self.selectedRangeLength()) == 6

        textEditing.updateText(with: "Watch attack videos together and discuss strategy.")
        expect(self.cursorOffset()) == 6
        expect(self.selectedRangeLength()) == 0
    }

    /// test that cursor is moved when entire selection is removed
    func testThatCursorIsMovedWhenEntireSelectionIsRemoved() {
        textEditing.textView?.text = "Watch Bugger attack videos together and discuss strategy."
        textEditing.textView?.becomeFirstResponder()
        moveCursorRelativeToBeginning(with: 6, length: 6)
        expect(self.cursorOffset()) == 6
        expect(self.selectedRangeLength()) == 6

        textEditing.updateText(with: "Wattack videos together and discuss strategy.")
        expect(self.cursorOffset()) == 3
        expect(self.selectedRangeLength()) == 0
    }

    /// test that cursor is moved when entire selection is changed
    func testThatCursorIsMovedWhenEntireSelectionIsChanged() {
        textEditing.textView?.text = "Watch Bugger attack videos together and discuss strategy."
        textEditing.textView?.becomeFirstResponder()
        moveCursorRelativeToBeginning(with: 6, length: 6)
        expect(self.cursorOffset()) == 6
        expect(self.selectedRangeLength()) == 6

        textEditing.updateText(with: "Watching attack videos together and discuss strategy.")
        expect(self.cursorOffset()) == 8
        expect(self.selectedRangeLength()) == 0
    }

}


// MARK: - Private functions

private extension TextEditingSpec {

    private func cursorOffset() -> Int {
        guard let textView = textEditing.textView, selectedRange = textView.selectedTextRange else { return 0 }
        return textView.offsetFromPosition(textView.beginningOfDocument, toPosition: selectedRange.start)
    }

    private func selectedRangeLength() -> Int {
        guard let textView = textEditing.textView, selectedRange = textView.selectedTextRange else { return 0 }
        return textView.offsetFromPosition(textView.beginningOfDocument, toPosition: selectedRange.end) - cursorOffset()
    }

    private func moveCursorRelativeToBeginning(with offset: Int, length: Int = 0) {
        guard let textView = textEditing.textView, startPosition = textView.positionFromPosition(textView.beginningOfDocument, offset: offset), endPosition = textView.positionFromPosition(startPosition, offset: length) else { return }
        textView.selectedTextRange = textView.textRangeFromPosition(startPosition, toPosition: endPosition)
    }

}
```

And in case it is easier to consume, I created a [Gist](https://gist.github.com/benjaminsnorris/710d22ef066ae249156f7f959be7debe) with all of the code.

*Edit: Since writing this, I decided to pull all of this code into a simple library: [TextMagic](https://github.com/benjaminsnorris/TextMagic).*
