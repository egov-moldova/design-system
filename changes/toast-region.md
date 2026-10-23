---
type: Added
title: "`mud-toast-region`, and `dismiss()` on `mud-toast`"
---

`mud-toast-region` places, stacks and dismisses `mud-toast` messages as the Figma Toast Message page shows them
(14830:13653): top-right on desktop with the newest on top, along the bottom on mobile with the newest nearest the
bottom, 12px apart. Info and success toasts with no action close after `duration` (5 s), pausing while hovered or
focused; warnings, errors and toasts with an action stay until closed; a closed toast is removed. Add toasts with
`show()`.

`mud-toast` gains a `dismiss()` method that closes it with its fade-out.
