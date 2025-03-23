NOTES
---

# Things I Learnt

* A WebArchive is just a binary plist.
* Apple has its own Epoch set to `2001-01-01T00:00:00Z`. A date is the number of **seconds** since this Epoch. (Contrary to JS where it’s in milliseconds.)
* In JavaScript, you can convert a number to its binary or hex representation with `(1024).toString(2)` or `(1024).toString(16)`.
* Using `padStart`, you can print a clean binary representation. Ex: `marker.toString(2).padStart(8, "0")`.
