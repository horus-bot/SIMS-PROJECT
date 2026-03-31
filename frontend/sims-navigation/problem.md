# Map View UI/UX Issues Audit

Date: 2026-03-31
Scope: Map view page and related components.

## High Severity

1. Sensor permission failure has no user-facing feedback.
- Impact: Start navigation can look broken when permission is denied.
- Evidence:
	- src/pages/MapVIew.tsx:374
	- src/pages/MapVIew.tsx:378

2. Location confirmation auto-dismisses too quickly (3 seconds).
- Impact: Users can miss the decision window, especially in real hospital movement.
- Evidence:
	- src/components/map-view/LocationConfirmCard.tsx:21
	- src/components/map-view/LocationConfirmCard.tsx:23
	- src/components/map-view/LocationConfirmCard.tsx:123

3. Turn confirmation auto-dismisses in 3 seconds and offers only one explicit action.
- Impact: User has weak control and can miss critical alignment confirmation.
- Evidence:
	- src/components/map-view/TurnConfirmCard.tsx:13
	- src/components/map-view/TurnConfirmCard.tsx:15
	- src/components/map-view/TurnConfirmCard.tsx:118

4. Invalid route state is a dead end.
- Impact: User cannot recover (no back/retry/redirect action).
- Evidence:
	- src/pages/MapVIew.tsx:639

## Medium Severity

5. Empty-state guidance in navigation menu is misleading.
- Impact: Text says to tap map to choose, but destination selection is not map-driven here.
- Evidence:
	- src/components/map-view/NavigationMenu.tsx:101

6. Previous/Next controls are active even when navigation is not active.
- Impact: Buttons can be pressed in non-meaningful states and confuse users.
- Evidence:
	- src/components/map-view/NavigationMenu.tsx:112
	- src/components/map-view/NavigationMenu.tsx:177

7. Any touch on map disables auto-follow immediately.
- Impact: Camera behavior changes unexpectedly after simple interactions.
- Evidence:
	- src/pages/MapVIew.tsx:536

8. Recalibrate icon button has no accessible name.
- Impact: Screen-reader users may not understand the button purpose.
- Evidence:
	- src/pages/MapVIew.tsx:649

9. Repin floating button label is too small.
- Impact: Readability is poor in mobile and motion conditions.
- Evidence:
	- src/pages/MapVIew.tsx:717

10. Destination image modal lacks explicit close control.
- Impact: Discoverability and accessibility are reduced (backdrop-tap only).
- Evidence:
	- src/pages/MapVIew.tsx:922
	- src/pages/MapVIew.tsx:923

11. Repin warning advises QR scan but provides no direct action.
- Impact: User is told what to do but not given an immediate control.
- Evidence:
	- src/pages/MapVIew.tsx:871

## Low Severity

12. Fixed vertical placements can create overlap on short screens.
- Impact: Cards and controls may crowd each other on smaller devices.
- Evidence:
	- src/components/map-view/MapControls.tsx:47
	- src/components/map-view/LocationConfirmCard.tsx:31
	- src/components/map-view/TurnConfirmCard.tsx:23

13. touchAction none blocks native gestures globally in map area.
- Impact: Can reduce expected platform behavior and gesture discoverability.
- Evidence:
	- src/pages/MapVIew.tsx:660

14. No visible loading state while SVG map is fetched.
- Impact: Users may experience a blank/unclear loading moment.
- Evidence:
	- src/components/map/testMap.tsx:38
	- src/components/map/testMap.tsx:84

## Notes

- This list is focused on user-facing UI/UX behavior, not algorithmic correctness.
- Recommended next step: address high severity items first, then medium issues that reduce control and clarity.
