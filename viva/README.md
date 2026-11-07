# Viva · Clear the fog

A small, fog-themed popup that sits in the bottom-right corner of a workspace.
**A gentle nudge → one question → a small fog-clearing reward → back to work.**
The neutral page behind it is only a preview host, not a dashboard.

A little hooded explorer carries a lantern along an eight-stop trail. Completing reviews lights lanterns and unlocks collectible badges: **Bug spotter**, **First light**, and **Lightkeeper**. Explorer ranks advance from **Scout** to **Pathfinder** at six cleared areas, and **Lightkeeper** at eight. Small sparkle celebrations and tactile buttons add feedback inside the same compact popup. Badges persist; retries and skips never add progress, and repeating a completed review cannot earn duplicate rewards.

## Open

Open `index.html` in a browser. No install or build is required.
Alternatively, from this directory run `python3 -m http.server 4173`
and visit `http://localhost:4173`.

## Try the story

1. Choose **Clear the fog** in the popup to review Payments.
2. Type why the card is charged again before the duplicate check, or choose **Try a sample**. **Peek at the code** expands the relevant lines.
3. Choose **Fix with demo agent**, then review the fix.
4. Explain both safeguards to clear Payments and light another lantern.
5. Choose **Back to work** to minimise, or **Next quest** for the next change.

The close button, **Later**, or Escape minimises the popup. Click the floating Viva button to reopen it; your current answer stays in place.

Completed progress is saved in this browser. Use **Badges & discoveries → Reset demo progress** to start again.

## Scope

This uses a sample repository. Voice is a simulated transcript; it does not access the microphone. Answer checking is a limited local rule set, not semantic AI grading. Agent fixes, test results, and Git pushes are simulated. No real repository or external service is modified.

The popup adapts to narrow screens and short viewports, with internal scrolling, keyboard controls, reduced motion, and visible focus states. Fonts use Google Fonts when available, with local fallbacks.

## Verify

Run `node check.mjs` to check the prototype's state transitions and persistence. This does not replace browser visual or accessibility testing.
