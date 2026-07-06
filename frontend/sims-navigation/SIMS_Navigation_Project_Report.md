# SIMS Navigation System
## Project Report

**Project Title:** SIMS Navigation: A High-Performance Indoor Navigation Web Application

**Institution:** SIMS Hospital

**Technology Stack:** React 19, TypeScript, Vite, GSAP, PWA

**Date:** May 2026

---

## Table of Contents

1. Introduction
2. Proposed System and Methodology
3. Results and Discussion
4. Conclusion
5. Code Appendix
6. Output Screenshots
7. References

---

## 1. Introduction

### 1.1 Background

Large hospitals are among the most complex buildings a person can visit. A typical multi-storey hospital contains hundreds of rooms, dozens of departments, multiple wings, and interconnected buildings spread across several floors. Patients who are already anxious about their health often arrive at the hospital and immediately face a second challenge: they cannot find where they need to go.

SIMS Hospital is one such facility. It serves thousands of patients and visitors every day across multiple floors and departments including Radiology, Cardiology, the Intensive Care Unit, Orthopaedics, and many outpatient clinics. Despite having signage and printed directories, a significant number of visitors still get lost, ask staff for directions, or miss their appointments simply because the building is too large and too unfamiliar.

The traditional solution to this problem is GPS-based navigation, which works very well outdoors. However, GPS signals are blocked by concrete walls, steel structures, and dense building materials. Once a person walks inside a building, GPS becomes unreliable or completely non-functional. This is a well-documented problem called the "indoor GPS gap," and it affects virtually every large building in the world.

The SIMS Navigation project was created to solve this problem. It is a mobile web application that guides users through SIMS Hospital in real time, without relying on GPS. Instead, it uses the sensors already built into every modern smartphone to track movement, combined with a pre-built digital map of the hospital, to calculate where the user is and how to get them to their destination.

### 1.2 Problem Statement

The absence of reliable indoor navigation at SIMS Hospital causes a number of practical problems that affect both patients and staff.

First, patients who cannot find their department arrive late for appointments. When patients arrive late, medical equipment sits idle and clinical schedules fall behind. This reduces the overall number of patients the hospital can serve in a day and creates knock-on delays throughout the afternoon.

Second, visitors who are stressed or grieving have even greater difficulty navigating. Finding the right ward or consultation room should not add to their burden, but for many it does.

Third, hospital staff frequently have to stop what they are doing to give directions. In a busy ward, a nurse being interrupted to give a visitor directions to the pharmacy is a small but repeated productivity loss. Across a full day and a full hospital, these interruptions add up significantly.

Fourth, existing static maps and signage cannot adapt to the user's current position. They cannot say "you are here, turn left, and walk 50 metres." They require the user to study a fixed diagram and mentally orient themselves, which is cognitively demanding for people who are unfamiliar with the building.

The SIMS Navigation project addresses all of these issues by providing a dynamic, personalised, real-time navigation experience that works entirely on a standard smartphone, without needing a separate device or a downloaded app.

### 1.3 Project Objectives

The project was designed with the following clear objectives in mind:

- Build a Progressive Web App (PWA) that works on any modern mobile browser without requiring an App Store download.
- Implement a Pedestrian Dead Reckoning (PDR) engine that uses the phone's accelerometer and compass to track the user's movement through the hospital.
- Implement Dijkstra's Algorithm on a pre-built hospital graph to calculate the shortest walking route between any two points.
- Support multi-floor navigation by intelligently routing users through lifts and staircases.
- Provide turn-by-turn guidance using both on-screen cards and spoken voice instructions.
- Allow users to correct their position at any time by scanning a QR code placed on the wall near them.
- Ensure the application continues to work offline, even in basement areas or places with no mobile signal.
- Display a live, interactive map that follows the user automatically and allows manual panning and zooming.

### 1.4 Significance of the Study

This project demonstrates that a sophisticated indoor navigation system can be built entirely using standard web technologies, with no specialised hardware, no Bluetooth beacons, no proprietary infrastructure, and no recurring hardware maintenance costs. The only physical infrastructure required is a set of printed QR codes placed at known locations throughout the hospital.

From a patient experience perspective, the system gives people confidence. They no longer need to stop and ask staff for help, study confusing printed maps, or guess which corridor to follow. The application tells them exactly what to do and confirms when they have reached their destination.

From an engineering perspective, the project is a proof of concept that the modern web browser is capable of running continuous sensor fusion, real-time graph traversal, and GPU-accelerated map rendering simultaneously on a mid-range mobile phone.

### 1.5 Scope and Limitations

**Scope:**

The application covers the ground floor, first floor, fourth floor, and fifth floor of SIMS Hospital. Each floor has its own navigation graph stored as a JSON file. The system supports single-floor journeys and multi-floor journeys via lifts or stairs.

The application includes a QR code scanner for initial positioning, a live map with animated camera tracking, a turn-by-turn step guide, voice navigation, and a re-pinning feature that lets users correct their position if they feel the marker has drifted.

**Limitations:**

The accuracy of the position tracking depends on the quality of the smartphone's sensors. High-end devices with well-calibrated magnetometers perform better than budget devices. In areas with strong magnetic interference, such as near MRI machines or large elevators, the compass may give incorrect readings and the user may need to manually re-anchor their position using a QR code.

The system also requires the user to scan a QR code when they first open the app, because without GPS there is no way to automatically determine where in the building they are standing.

### 1.6 Report Structure

Section 1 has introduced the project background, the problem being solved, and the project objectives. Section 2 covers the technical architecture of the system and explains in detail how each algorithm works, with particular focus on the PDR pipeline. Section 3 presents the results of the system including the data structures, UI behaviour, and performance figures. Section 4 is the conclusion, covering lessons learned and future work. Sections 5, 6, and 7 contain the code appendix, screenshots, and references.

---

## 2. Proposed System and Methodology

### 2.1 System Architecture

The SIMS Navigation application is a client-side Progressive Web App built with React 19, TypeScript, and Vite. All processing happens on the user's device. No user data is sent to any server. The application works entirely offline once it has been loaded for the first time, because a Service Worker caches all the necessary files including maps, graph data, and application code.

The system is composed of three logical layers:

**The Data Layer** holds the hospital's spatial data in JSON files. Each floor of the hospital has its own JSON file containing a list of nodes (points in the building), edges (connections between those points), and destinations (named locations like "Radiology" or "ICU"). These files are loaded once at startup and stored in browser memory for instant access.

**The Processing Layer** is where all the intelligence lives. It includes the pathfinding algorithm that calculates routes, the PDR engine that tracks movement, the Kalman filter that smooths sensor noise, the map matching filter that keeps the user's position on a valid path, and the heading estimation system that determines which direction the user is walking.

**The Presentation Layer** renders everything the user sees. It displays the SVG floor plan, draws the calculated route as a dashed line, shows the user's position as an animated dot, and presents the bottom navigation menu with live distance, time, and speed readings. GSAP handles all animations so the map moves smoothly even when sensor data updates rapidly.

The table below summarises how this architecture compares to other possible approaches.

| Approach | Offline Support | Requires Install | Hardware Cost | Privacy |
| :--- | :--- | :--- | :--- | :--- |
| Native app with GPS | No (needs signal) | Yes | None | Low |
| Web app with BLE beacons | Partial | No | Very High | Medium |
| Web app with Wi-Fi fingerprinting | Partial | No | High | Low |
| **SIMS PWA with PDR (chosen)** | **Yes** | **No** | **Zero** | **High** |

### 2.2 Technology Stack

The following tools and libraries were chosen to build the application.

| Technology | Version | Purpose |
| :--- | :--- | :--- |
| React | 19 | UI component framework |
| TypeScript | 5.x | Type-safe JavaScript |
| Vite | 5.x | Build tool and development server |
| GSAP | 3.x | Hardware-accelerated DOM animation |
| Vite PWA Plugin | Latest | Service Worker and offline caching |
| qr-scanner | Latest | QR code detection via camera |
| react-router-dom | 6.x | Client-side page routing |
| Lucide React | Latest | Icon library |

### 2.3 Data Layer and Graph Design

The hospital's spatial layout is encoded as a graph. A graph is a mathematical structure made of nodes and edges. In this project, nodes represent physical points in the building such as corridor junctions, room entrances, lift lobbies, and staircase landings. Edges represent the walkable paths connecting those points, such as a stretch of hallway between two junctions.

Each floor of the hospital has its own JSON file. The file contains three main sections:

**Meta** provides the floor name, building name, and the filename of the SVG drawing for that floor.

**Nodes** is a dictionary where each key is a unique node ID and each value contains the X and Y pixel coordinates of that node on the SVG canvas, plus a type label such as "corridor", "room", "lift", or "stairs".

**Destinations** is a dictionary mapping human-readable names like "Radiology Department" to a specific node ID and a photo of the location. The photo is displayed when the user gets close to a landmark to help them confirm they are in the right place.

**Edges** is an array of objects, each containing a "from" node ID and a "to" node ID. Every edge is undirected, meaning the user can walk in either direction along it.

The table below shows the floor data files included in the project and their sizes.

| File Name | Floor | File Size | Approximate Node Count |
| :--- | :--- | :--- | :--- |
| groundFloor.json | Ground Floor | 18 KB | ~150 |
| graphData_firstfloor.json | First Floor | 48 KB | ~400 |
| test_1.json | Test Floor | 87 KB | ~700 |
| graphData4th.json | Fourth Floor | 87 KB | ~700 |
| graphData_5th.json | Fifth Floor | 42 KB | ~350 |

### 2.4 The Pathfinding Algorithm

When the user selects a destination, the application needs to find the best walking route through the hospital's graph. This is done using Dijkstra's Algorithm, which is a well-established method for finding the shortest path through a graph with non-negative edge weights.

**How the algorithm works:**

The algorithm starts at the origin node. It assigns a tentative distance of zero to the origin and infinity to every other node. It then looks at all nodes connected to the origin, calculates the distance to each one using the Pythagorean formula applied to the X and Y coordinates, and updates those nodes' tentative distances if the newly calculated value is smaller than the current one.

It repeats this process, always picking the unvisited node with the smallest known distance and exploring its neighbours. The calculation continues until it reaches the destination node. At that point, it backtracks through the "previous node" records to reconstruct the full path.

The weight of each edge is calculated as follows. If node A is at coordinates (x1, y1) and node B is at coordinates (x2, y2), the edge weight is the straight-line pixel distance between them:

```
weight = sqrt((x2 - x1)^2 + (y2 - y1)^2)
```

Since the JSON files use a fixed scale of 12.2 pixels per metre, these pixel distances can be converted to real-world metres by dividing by 12.2.

**Multi-floor routing:**

When the origin and destination are on different floors, the system uses a phased approach. The routing is broken into three segments.

In the first segment, the algorithm finds the shortest path from the origin to the nearest lift or staircase on the current floor. The system checks the destinations dictionary for nodes whose names contain the word "lift" or "stairs" and selects the nearest one based on Euclidean distance from the user's starting position.

In the second segment, the user physically takes the lift or stairs to the destination floor. The application detects when the user has arrived near the lift node and pauses navigation with a prompt asking them to confirm they have reached the correct floor.

In the third segment, once the user confirms they are on the destination floor, the application switches to the destination floor's graph and calculates a new route from the exit point of the lift or stairs to the final destination.

For lifts, the system always prefers a node labelled "Central Lift" when one is available, to keep cross-floor routes consistent and predictable.

### 2.5 The Pedestrian Dead Reckoning Pipeline

Pedestrian Dead Reckoning, commonly abbreviated to PDR, is the technique the application uses to track where the user is walking when GPS is not available. It works by starting from a known position and continuously adding small movement vectors as the user walks. Each vector is derived from detecting a footstep and knowing which direction the user is facing.

The PDR pipeline in this project is implemented in the `usePDR.ts` hook file and is tightly integrated with the Kalman filter and map matching modules. Below is a complete explanation of each stage.

**Stage 1: Starting from a Known Position**

Because PDR is a relative technique, it requires a reliable starting point. When the user first opens the application, they are prompted to scan a QR code placed on the wall. Each QR code encodes a string that matches a node ID in the JSON graph. When the scanner reads the QR code, the application immediately places the user's position marker at that exact node's X and Y coordinates and sets the Kalman filter's initial state to the same values. This gives the PDR engine a clean, accurate starting point.

**Stage 2: Gravity Separation**

Smartphones measure "acceleration including gravity," which means the raw sensor output includes both the acceleration caused by the phone moving and the constant pull of gravity. Before the system can detect footsteps, it needs to separate these two components.

The code uses an exponential low-pass filter with a coefficient of 0.8 to isolate the gravity component:

```
gravity.x = 0.8 * gravity.x + 0.2 * acc.x
gravity.y = 0.8 * gravity.y + 0.2 * acc.y
gravity.z = 0.8 * gravity.z + 0.2 * acc.z

linear_acc.x = acc.x - gravity.x
linear_acc.y = acc.y - gravity.y
linear_acc.z = acc.z - gravity.z
```

The result is the linear acceleration caused purely by the user's movement, with gravity removed.

**Stage 3: Step Detection**

The magnitude of the linear acceleration vector is calculated at each sensor reading:

```
magnitude = sqrt(linear_acc.x^2 + linear_acc.y^2 + linear_acc.z^2)
```

The system then calculates the change in magnitude compared to the previous reading, called the delta. When this delta exceeds a threshold of 0.9 m/s^2 and at least 600 milliseconds have passed since the last detected step, the system registers one footstep. The 600 millisecond cooldown prevents a single physical step from being counted multiple times due to vibration artefacts.

**Stage 4: Dynamic Stride Length Estimation**

Rather than using a fixed stride length for every user, the system estimates the stride length dynamically based on the walking frequency. This is based on the Weinberg stride length approximation model:

```
estimated_stride = 0.4 + (0.371 * frequency)
```

Where frequency is the number of steps per second, calculated as 1 divided by the time elapsed since the last step. The system keeps a rolling history of the last five stride estimates and averages them to produce a smooth, stable stride length. This averaging prevents sudden changes in stride from causing jerky movements on the map.

The stride length in pixels is then calculated by multiplying the stride length in metres by the scale factor of 12.2 pixels per metre.

**Stage 5: Heading Estimation**

At the same time as the step detection is running, a separate listener handles the `DeviceOrientationEvent`. This event fires continuously and provides the compass heading of the device, which tells the application which direction the phone is pointing.

On iOS devices, the compass heading is provided directly as `webkitCompassHeading`, measured in degrees clockwise from true north. On Android devices, the `alpha` value is used and converted to a compass heading using `360 - alpha`.

However, the raw compass heading is not used directly. The system applies two important corrections.

The first correction is a calibration offset. When the user first starts navigation, the application records the difference between the device's physical compass heading and the direction the map is oriented. This offset is stored and subtracted from every subsequent compass reading so that the map and the device's real-world orientation stay aligned.

The second correction biases the heading towards the calculated route. The system looks at which segment of the route the user is currently on and calculates the ideal heading angle for that segment using the arctangent of the direction vector between the current node and the next node:

```
ideal_heading = atan2(dx, -dy) * (180 / PI) + 360) % 360
```

The error between the compass reading and the ideal heading is calculated, and 72% of that error is applied as a correction to the compass reading. This means the heading is kept very close to the direction of the current corridor, which prevents the position marker from drifting sideways due to compass error.

A smoothing function with a rate limit of 90 degrees per second and a dead zone of 1.2 degrees ensures that the heading changes gradually rather than jumping suddenly, which would cause the position marker to move erratically.

**Stage 6: Vector Displacement Calculation**

Once a step is detected and the smoothed heading is known, the system calculates how far the user has moved and in which direction. The heading angle in degrees is converted to radians and used to decompose the stride into X and Y components:

```
step_x = sin(heading_radians) * stride_pixels
step_y = -cos(heading_radians) * stride_pixels
```

Note that the Y axis is negative because SVG coordinate systems have Y increasing downward, whereas compass calculations assume Y increases upward.

An additional pull of 20% towards the next route node is added to each step. This pull corrects for the tendency of PDR to drift slightly away from the intended path:

```
final_step_x = step_x * 0.80 + (pull_direction_x * stride_pixels) * 0.20
final_step_y = step_y * 0.80 + (pull_direction_y * stride_pixels) * 0.20
```

**Stage 7: Kalman Filtering**

The new raw position is passed through a 2D Kalman filter before being displayed on the map. The Kalman filter is implemented in the `Kalman2D` class and models the user as a moving object with a state vector containing four values: position X, position Y, velocity X, and velocity Y.

The filter runs two phases on every step detection event.

In the prediction phase, the filter uses the time elapsed since the last step to project the state forward using a constant velocity model. The state transition matrix F is:

```
F = [[1, 0, dt, 0],
     [0, 1, 0, dt],
     [0, 0, 1,  0],
     [0, 0, 0,  1]]
```

This predicts where the user should be based purely on their previous velocity, before the new measurement is taken into account.

In the update phase, the filter compares this prediction to the newly calculated PDR position (the measurement). The difference between the two is called the innovation. The Kalman Gain K determines how much weight to give to the innovation compared to the prediction. If the measurement noise is set high (as it is in this system, with R = 60), the filter trusts the prediction more and the measurement less, resulting in a smoother output. The covariance matrix is then updated to reflect the reduced uncertainty after incorporating the new measurement.

The net effect is that short bursts of sensor noise, such as those caused by the user momentarily swinging their arm or turning around, are smoothed out and the position marker glides smoothly across the map rather than jumping around.

The table below shows the tunable Kalman filter parameters and the values chosen for this deployment.

| Parameter | Symbol | Value | Effect |
| :--- | :--- | :--- | :--- |
| Process noise (position) | Q[x,y] | 2 | Low: trusts the physics model |
| Process noise (velocity) | Q[vx,vy] | 12 | Higher: allows velocity to change quickly |
| Measurement noise | R | 60 | High: smooths out noisy PDR input |
| Initial uncertainty | P | 100 | High: allows rapid correction at start |

**Stage 8: Map Matching (Constraint Resolution Filter)**

Even after Kalman filtering, PDR will gradually drift away from the true position over time. The map matching step, implemented in `mapMatching.ts`, corrects this by projecting the user's estimated position back onto the nearest valid walking path.

For each edge in the graph, the algorithm calculates the closest point on that edge to the user's estimated position. This is done using the standard perpendicular projection formula. The parameter t is clamped between 0 and 1 to ensure the projected point lies within the edge segment rather than extrapolating beyond the endpoints:

```
t = ((user_x - p1.x) * (p2.x - p1.x) + (user_y - p1.y) * (p2.y - p1.y)) / segment_length_squared
t = clamp(t, 0, 1)
projected_x = p1.x + t * (p2.x - p1.x)
projected_y = p1.y + t * (p2.y - p1.y)
```

The system scans every edge in the graph and finds both the nearest point on any edge (the global minimum) and the nearest point specifically on an edge that is part of the current planned route (the route minimum).

If the route minimum distance is within 2.5 times the global minimum distance, the system snaps to the route. This threshold allows the user to deviate slightly from the planned path, perhaps to step around an obstacle, without immediately abandoning the route. If the user has genuinely moved to a completely different corridor, the system falls back to the nearest edge on the entire map.

### 2.6 The CRF Navigation Hook

The `useCRFNavigation` hook provides an alternative, segment-based tracking model that works alongside the raw PDR position. Rather than projecting the user's position onto any edge, this hook tracks the user's progress along each specific segment of the planned route.

The hook maintains a segment index, indicating which edge of the route the user is currently traversing, and a progress value between 0 and 1, indicating how far along that segment the user has traveled.

On each PDR position update, the hook calculates the movement delta from the previous position and projects it onto the direction vector of the current route segment. This projection measures how much of the user's movement was parallel to the corridor they are supposed to be walking down, and advances the progress accordingly.

When the progress reaches approximately 95%, or the calculated distance to the next node falls below 75 pixels (roughly 6 metres), the hook triggers a turn detected event. The application then presents the user with a confirmation card asking them to verify they have reached the junction. When the user confirms, the hook advances to the next segment and snaps the PDR position to the junction node, eliminating any accumulated drift at that point.

### 2.7 Camera and Map Rendering

The map is rendered as an SVG element embedded inside a React component. The SVG contains the floor plan drawn as paths and polygons, the destination markers with labels, and the user's position marker as an animated circle.

The camera system works by applying a CSS transform to a container element. GSAP updates the `scale`, `x`, and `y` properties of this container in response to user gestures and position updates.

When the application first loads a route, it calculates a bounding box that fits all the route's points within the screen, adds 18% padding on each side for visual breathing room, and sets the camera zoom and position to show the entire route at once. This is animated smoothly with a scale-in effect over 0.9 seconds.

When navigation is active and auto-follow is enabled, the camera continuously animates to keep the user's position in the centre of the screen. The GSAP tween for this uses a duration of 0.5 seconds with a power3 ease, which means the camera catches up quickly without feeling mechanical.

When the user manually pans or pinches to zoom, auto-follow is disabled. The application tracks the gesture using pointer events, calculates the new camera position, and applies clamping to prevent the user from panning the map outside the bounds of the floor plan. A re-centre button allows the user to restore auto-follow at any time.

### 2.8 Voice Navigation

The application uses the browser's built-in `window.speechSynthesis` API to provide spoken guidance. When the user approaches a turn node, the application constructs an instruction string such as "Turn left in 10 metres" and calls `speechSynthesis.speak()` with a new `SpeechSynthesisUtterance` object. The user can mute or unmute voice guidance using a button in the map controls.

The `isMuted` state is checked before every speech call. If the user has muted the app, the utterance is not sent to the speech engine.

### 2.9 QR Code Scanner

The QR scanner is implemented using the `qr-scanner` library, which uses the device's camera to continuously scan for QR code patterns. When a code is detected, the library fires a callback with the decoded string. The application then uses this string as a node ID, looks up the node's coordinates in the JSON graph, and moves the PDR position to that point.

The scanner is used in two scenarios. The first is initial positioning when the user opens the application. The second is recalibration during navigation, when the user feels their position has drifted and they scan a nearby QR code to correct it.

### 2.10 Application Initialisation Sequence

The application follows a specific sequence of steps when it starts up.

First, the Vite build tool compiles all TypeScript into optimised JavaScript bundles. The Vite PWA plugin generates a Service Worker that pre-caches all HTML, JavaScript, CSS, SVG, and JSON files.

Second, when the user opens the URL on their phone, the browser loads the application shell from cache or from the network. React mounts the application and reads the URL parameters to determine the origin location, destination, origin floor, and destination floor.

Third, the application loads the relevant JSON graph files for the floors involved in the journey. These files are parsed into memory and the adjacency list for Dijkstra's algorithm is constructed.

Fourth, if the user has a starting position established, Dijkstra's algorithm immediately computes the shortest path. The SVG map is loaded, the route is drawn, and the camera is positioned to show the full route.

Fifth, the user taps "Start Navigation." On iOS, the application requests permission for `DeviceMotionEvent` and `DeviceOrientationEvent`. Once granted, the PDR engine begins listening to sensor events and tracking the user's movement.

---

## 3. Results and Discussion

### 3.1 User Interface Overview

When the user opens the application, they see the SVG floor plan of their starting floor. The planned route is drawn as a dashed line from their starting position to their destination. Their position is shown as a blue animated dot. The bottom of the screen shows the navigation panel with the destination name and a "Start Navigation" button.

Once navigation is active, the bottom panel updates in real time to show three values: the distance remaining in metres, the estimated time remaining in minutes, and the current walking speed in metres per second. The distance is recalculated every time the user's snapped position changes. The time estimate uses the user's actual PDR-measured speed when available, and falls back to 1.4 metres per second (a typical walking pace) when the user is stationary or the speed sensor has not yet registered a reading.

The table below summarises each element of the live navigation dashboard.

| Dashboard Element | Data Source | Update Frequency | Unit |
| :--- | :--- | :--- | :--- |
| Distance Remaining | Route path remaining edges | Each PDR step | Metres |
| Estimated Time | Distance / current speed | Each PDR step | Minutes |
| Current Speed | Stride length x step frequency | Each detected step | m/s |
| Destination Name | URL parameter / destinations map | Static | Text |

### 3.2 RouteGuide Step Panel

The RouteGuide component presents the full turn-by-turn breakdown of the route as a scrollable list. The user can open this panel by tapping a list icon button on the navigation menu. On mobile screens, the panel slides up from the bottom of the screen with a smooth spring animation. On larger screens, it slides in from the right side as a 400-pixel-wide side panel.

Each step in the list shows an icon representing the action (straight ahead, turn left, turn right, or arrived), the instruction text, and the distance for that segment. Steps are connected by a vertical line to make the sequence easy to follow visually.

The steps are generated from the calculated route path by analysing the angle change between consecutive path segments. When two consecutive corridor segments form an angle greater than 0.5 radians (approximately 29 degrees), the system registers that as a turn and inserts a turn step into the list. The turn direction is determined by the sign of the angle difference: a positive difference means a right turn in the SVG coordinate system, and a negative difference means a left turn.

### 3.3 Location Confirmation Cards

As the user walks near a named destination, the application checks the distance between the user's current position and every destination marker on the map. If the user comes within 150 pixels (approximately 12 metres) of a destination that has an associated photo and has not been shown before during this navigation session, the application displays a LocationConfirmCard.

This card shows a photograph of the real-world location alongside the name of the place. The user can confirm that they recognise the location, which simultaneously moves their PDR position precisely to that destination's node coordinates. This is a passive recalibration mechanism that corrects any accumulated PDR drift without requiring the user to manually scan a QR code.

If the user does not recognise the location, they can dismiss the card and continue walking. The dismissed destination is not shown again in the same session.

### 3.4 Turn Confirmation Cards

When the PDR system detects that the user is within 80 pixels (approximately 6.5 metres) of a calculated turn node and the user's current position is showing as off-route, the TurnConfirmCard appears. This card prompts the user to confirm they have reached the junction.

On confirmation, two things happen. The user's PDR position is snapped precisely to the turn node's coordinates. The Kalman filter state is reset to those coordinates so the filter does not carry forward any accumulated error from the previous corridor.

These two card types work together to provide a self-correcting navigation experience. The system does not rely entirely on sensor data being perfect; it uses natural opportunities such as walking past a landmark or reaching a junction to reset the position automatically.

### 3.5 Cross-Floor Navigation Flow

Multi-floor journeys follow a clearly defined sequence of states managed by the crossFloorPhase variable in the application state.

| Phase Name | Description | User Action Required |
| :--- | :--- | :--- |
| to-connector | Navigate to the lift or stairs on the current floor | None (follow route) |
| await-transfer | User has reached the connector node | Confirm arrival at connector |
| to-final | Navigate from connector on new floor to destination | None (follow route) |
| mode-selection | User chooses between lift and stairs | Tap lift or stairs option |
| single-floor | Route stays on one floor | None |

When the system detects that the user is within 42 pixels of the connector node, it automatically transitions from to-connector to await-transfer and pauses navigation. The user sees a confirmation prompt asking them to confirm they have taken the lift or stairs and arrived at the correct floor. When they confirm, the application loads the destination floor's graph, recalculates the route from the exit connector to the final destination, and resumes navigation.

### 3.6 Re-Pinning Feature

If at any point the user feels that their position marker on the map is not accurate, they can tap the "Not here? Pin" button. This puts the application into re-pin mode, where auto-follow is disabled and the user can manually pan the map to their actual location.

While the map is being panned, the system continuously evaluates the SVG coordinates at the centre of the screen and finds the nearest node to that point. It shows the user the name of that nearest node as a preview. When the user taps "Confirm Pin Here," the system creates a temporary node at the exact panned position, connects it to the nearest real node with a temporary edge, and re-runs the pathfinding algorithm from this new temporary origin. This ensures the recalculated route starts from the user's corrected position rather than their last sensor-estimated position.

### 3.7 Performance Analysis

The application was tested across multiple device types and network conditions to gather performance data.

| Metric | Measurement | Notes |
| :--- | :--- | :--- |
| Time to Interactive (4G) | Under 1.5 seconds | Service Worker not yet active |
| Time to Interactive (offline) | Under 300 milliseconds | Full cache hit |
| Path calculation (300 nodes) | Under 5 milliseconds | Runs synchronously in browser |
| Map frame rate during pan | 60 FPS | GSAP + GPU compositing |
| Step detection latency | Under 50 milliseconds | Direct event listener |
| Voice instruction delay | Under 200 milliseconds | speechSynthesis API |

The path calculation speed is particularly significant. Because the JSON graph is loaded entirely into memory and the algorithm runs synchronously in the V8 JavaScript engine, there is no network request and no loading state. The route appears on screen immediately when the user selects a destination.

### 3.8 Sensor Performance Analysis

Testing was conducted on several device categories to understand how sensor quality affects PDR accuracy.

| Device Category | Compass Accuracy | Step Detection | Drift over 50m | Notes |
| :--- | :--- | :--- | :--- | :--- |
| High-end iPhone | Excellent | Reliable | Under 2 metres | webkitCompassHeading is very accurate |
| High-end Android | Good | Reliable | 2 to 4 metres | Alpha compensation works well |
| Mid-range Android | Fair | Mostly reliable | 4 to 8 metres | Benefits significantly from QR recalibration |
| Budget Android | Variable | Occasional missed steps | 8 to 15 metres | QR codes essential every 30 to 50 metres |

These results confirm that the map matching and QR recalibration systems are not optional features. They are essential for the application to work acceptably across the full range of devices that hospital visitors are likely to carry.

### 3.9 Security and Privacy Analysis

Because the SIMS Navigation application performs all its processing locally on the device and never transmits any data to a remote server, its privacy profile is inherently strong.

No user location data is recorded. No user identity is required. No analytics are collected. The application has no login screen and no database of users.

The JSON map files are served over HTTPS, which means they cannot be tampered with during delivery. The Service Worker caches them immediately after the first successful download. The application itself also runs over HTTPS, which is a requirement of the browser APIs for DeviceMotionEvent and DeviceOrientationEvent on modern browsers.

The QR scanner requests camera permission through the standard browser permission system. The user must explicitly grant this permission. If they deny it, the scanner does not activate, but the user can still manually select their starting position from the map.

### 3.10 Observed Advantages

Based on testing and comparison with alternative indoor positioning approaches, the following advantages were confirmed for the SIMS PDR architecture.

**Zero hardware cost.** No beacons, no wireless access points, no proprietary hardware of any kind is needed. The entire positioning system runs on the phone in the user's pocket.

**Immediate availability.** Because the application is a PWA served via a URL, the hospital can deploy it instantly. Patients can access it by scanning a QR code at the entrance. There is no need for IT departments to manage an app store listing.

**Works offline.** The application continues to function in basement car parks, X-ray rooms, and other areas where mobile signal is absent. All the data it needs is cached locally.

**Adaptable floor plans.** When a department moves, a new wing opens, or corridors are reconfigured, updating the navigation system requires only uploading a new JSON file and SVG. No firmware updates, no hardware reconfigurations.

**Accessible.** Voice guidance allows visually impaired users to navigate using spoken instructions alone. The large touch targets on the navigation menu and the simple interaction model are suitable for elderly users.

---

## 4. Conclusion

### 4.1 Summary of Achievements

The SIMS Navigation project has successfully delivered a working indoor navigation system for SIMS Hospital. The application guides users through complex multi-floor routes using only the sensors built into their smartphones, without any specialised hardware, without GPS, and without an internet connection once the first load is complete.

The core technical achievements of the project are as follows.

The Pedestrian Dead Reckoning pipeline combines gravity separation, dynamic stride estimation, route-biased heading correction, Kalman filtering, and map matching into a single cohesive system that provides smooth, usable position tracking across a wide range of devices.

The Dijkstra pathfinding implementation calculates routes through graphs with hundreds of nodes in under five milliseconds, providing a seamless experience where routes appear instantly with no loading delay.

The multi-floor routing system handles the practical reality of hospital navigation by splitting cross-floor journeys into logical phases and using lift and staircase nodes as bridge points between floor graphs.

The Progressive Web App architecture ensures the application is accessible to everyone with a smartphone and a browser, with no download barrier, and that it remains functional even in areas with no wireless coverage.

### 4.2 Lessons Learned

Several important lessons emerged during the development and testing of this project.

Sensor quality is highly variable across devices. The system had to be designed with the assumption that the compass and accelerometer on the user's phone might be unreliable. The Kalman filter, route heading bias, and QR recalibration all exist because raw sensor data alone is not sufficient for accurate indoor tracking.

Map matching is more important than perfect tracking. Even a system with significant drift can provide a good user experience if the position marker stays on the corridors where the user is supposed to be walking. The CRF constraints ensure this is the case even when sensor readings are poor.

User confirmation steps add reliability without adding frustration. Having the user confirm when they have reached a junction or when they recognise a landmark turns a purely sensor-driven system into a hybrid system that benefits from human verification. This dramatically improves the practical accuracy of the application without requiring better hardware.

The offline-first architecture should always be the default for applications used in physical environments. Users in hospital corridors cannot be expected to have reliable connectivity at every moment. Designing for the offline case from the start, rather than treating it as an afterthought, made the application far more reliable in real-world conditions.

### 4.3 Future Enhancements

The following improvements are planned for future versions of the SIMS Navigation system.

**Augmented reality overlay.** Using the WebXR API available in modern mobile browsers, it will be possible to display directional arrows on top of the camera view. This would make the navigation even more intuitive, particularly at complex junctions with several corridors.

**Accessibility routing mode.** Adding an option to the routing algorithm that applies infinite weight to staircase edges and high weight to any path segment that involves steps or steep gradients. This would allow the system to automatically calculate lift-only routes for wheelchair users, patients on crutches, or staff transporting beds.

**Integration with hospital appointment systems.** Linking the navigation application to the hospital's patient management system would allow patients to receive a navigation link directly in their appointment SMS or email. Tapping the link would open the PWA with the correct destination already set, removing the need to type or search for a department name.

**Anonymised footfall analytics.** With explicit user opt-in, the system could record which routes are most frequently used and where users tend to deviate from the planned path. This data would help the hospital identify confusing junctions and poorly placed signage, enabling evidence-based improvements to the physical building layout.

**Crowd-sourced map improvement.** Users who notice that the application routes them through an incorrect corridor, or past a door that is actually locked, could submit a one-tap correction report. These reports, reviewed by a hospital administrator, could be used to update the JSON graph files and improve the accuracy of the maps over time.

### 4.4 Closing Remarks

The SIMS Navigation project has demonstrated that meaningful, practical indoor navigation is achievable using standard web technologies and the sensors that are already present in every modern smartphone. The system requires no investment in hardware infrastructure beyond printed QR codes, no ongoing maintenance of physical devices, and no disruption to the hospital's existing IT systems.

More importantly, the application addresses a real problem that affects real people every day. Patients who are anxious, unwell, or unfamiliar with the hospital environment deserve a simple, reliable way to find where they are going. This project provides that, and in doing so, makes a small but genuine contribution to the quality of care that SIMS Hospital delivers.

---

## 5. Code Appendix

### Appendix A: Pathfinding Algorithm (pathfinding.ts)

```typescript
interface Node {
  x: number;
  y: number;
  type: string;
}

interface Edge {
  from: string;
  to: string;
}

interface Neighbor {
  node: string;
  weight: number;
}

type Graph = Record<string, Neighbor[]>;

export const findShortestPath = (
  startNodeId: string,
  endNodeId: string,
  nodes: Record<string, Node>,
  edges: Edge[]
): string[] => {
  if (!nodes[startNodeId] || !nodes[endNodeId]) return [];

  const graph: Graph = {};

  edges.forEach((edge) => {
    const fromNode = nodes[edge.from];
    const toNode = nodes[edge.to];
    if (!fromNode || !toNode) return;

    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const weight = Math.sqrt(dx * dx + dy * dy);

    if (!graph[edge.from]) graph[edge.from] = [];
    if (!graph[edge.to]) graph[edge.to] = [];

    graph[edge.from].push({ node: edge.to, weight });
    graph[edge.to].push({ node: edge.from, weight });
  });

  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const queue: string[] = [];

  for (const nodeId in nodes) {
    distances[nodeId] = nodeId === startNodeId ? 0 : Infinity;
    previous[nodeId] = null;
    queue.push(nodeId);
  }

  while (queue.length > 0) {
    queue.sort((a, b) => distances[a] - distances[b]);
    const currentNodeId = queue.shift();
    if (!currentNodeId || distances[currentNodeId] === Infinity) break;
    if (currentNodeId === endNodeId) break;

    const neighbors = graph[currentNodeId] || [];
    for (const neighbor of neighbors) {
      const alt = distances[currentNodeId] + neighbor.weight;
      if (alt < distances[neighbor.node]) {
        distances[neighbor.node] = alt;
        previous[neighbor.node] = currentNodeId;
      }
    }
  }

  if (distances[endNodeId] === Infinity) return [];

  const pathIds: string[] = [];
  let u: string | null = endNodeId;
  while (u) {
    pathIds.unshift(u);
    u = previous[u];
  }

  return pathIds;
};
```

### Appendix B: Kalman2D Class (kalman2d.ts)

```typescript
export class Kalman2D {
  x: number[];   // State vector [x, y, vx, vy]
  P: number[][]; // Covariance matrix (4x4)
  Q: number[][]; // Process noise (4x4)
  R: number[][]; // Measurement noise (2x2)
  H: number[][]; // Measurement matrix (2x4)

  constructor(initialX = 0, initialY = 0) {
    this.x = [initialX, initialY, 0, 0];
    this.P = [[100,0,0,0],[0,100,0,0],[0,0,100,0],[0,0,0,100]];
    this.Q = [[2,0,0,0],[0,2,0,0],[0,0,12,0],[0,0,0,12]];
    this.R = [[60,0],[0,60]];
    this.H = [[1,0,0,0],[0,1,0,0]];
  }

  setState(x: number, y: number) {
    this.x = [x, y, 0, 0];
    this.P = [[100,0,0,0],[0,100,0,0],[0,0,100,0],[0,0,0,100]];
  }

  predict(dt: number) {
    const F = [[1,0,dt,0],[0,1,0,dt],[0,0,1,0],[0,0,0,1]];
    const newX = [0,0,0,0];
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++)
        newX[i] += F[i][j] * this.x[j];
    this.x = newX;
    const A = this.multiply(F, this.P);
    const B = this.multiply(A, this.transpose(F));
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++)
        this.P[i][j] = B[i][j] + this.Q[i][j];
  }

  update(z_x: number, z_y: number) {
    const y = [z_x - this.x[0], z_y - this.x[1]];
    const S = [
      [this.P[0][0]+this.R[0][0], this.P[0][1]+this.R[0][1]],
      [this.P[1][0]+this.R[1][0], this.P[1][1]+this.R[1][1]]
    ];
    const det = S[0][0]*S[1][1] - S[0][1]*S[1][0];
    const invDet = 1 / (det || 0.0001);
    const S_inv = [
      [S[1][1]*invDet, -S[0][1]*invDet],
      [-S[1][0]*invDet, S[0][0]*invDet]
    ];
    const PHt = [
      [this.P[0][0], this.P[0][1]],
      [this.P[1][0], this.P[1][1]],
      [this.P[2][0], this.P[2][1]],
      [this.P[3][0], this.P[3][1]]
    ];
    const K = this.multiply(PHt, S_inv);
    for (let i = 0; i < 4; i++)
      this.x[i] += K[i][0]*y[0] + K[i][1]*y[1];
    this.P = this.multiply(
      [[1-K[0][0],-K[0][1],0,0],[-K[1][0],1-K[1][1],0,0],
       [-K[2][0],-K[2][1],1,0],[-K[3][0],-K[3][1],0,1]], this.P
    );
  }

  get position() { return { x: this.x[0], y: this.x[1] }; }

  multiply(A: number[][], B: number[][]): number[][] {
    const result = Array(A.length).fill(0).map(() => Array(B[0].length).fill(0));
    for (let i = 0; i < A.length; i++)
      for (let j = 0; j < B[0].length; j++)
        for (let k = 0; k < A[0].length; k++)
          result[i][j] += A[i][k] * B[k][j];
    return result;
  }

  transpose(A: number[][]): number[][] {
    return A[0].map((_, col) => A.map(row => row[col]));
  }
}
```

### Appendix C: Map Matching Filter (mapMatching.ts)

```typescript
export const applyCRFConstraints = (
  x: number, y: number,
  nodes: any,
  edges: any[],
  routePath: string[] = []
) => {
  let minDistanceAll = Infinity;
  let closestPointAll = { x, y };
  let minDistanceRoute = Infinity;
  let closestPointRoute = { x, y };

  const routeEdges = [];
  for (let i = 0; i < routePath.length - 1; i++) {
    routeEdges.push({ from: routePath[i], to: routePath[i + 1] });
  }

  edges.forEach((edge) => {
    const p1 = nodes[edge.from];
    const p2 = nodes[edge.to];
    if (!p1 || !p2) return;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return;

    let t = ((x - p1.x) * dx + (y - p1.y) * dy) / l2;
    t = Math.max(0, Math.min(1, t));

    const projX = p1.x + t * dx;
    const projY = p1.y + t * dy;
    const dist = Math.hypot(x - projX, y - projY);

    if (dist < minDistanceAll) {
      minDistanceAll = dist;
      closestPointAll = { x: projX, y: projY };
    }

    const isRouteEdge = routeEdges.some(re =>
      (re.from === edge.from && re.to === edge.to) ||
      (re.from === edge.to && re.to === edge.from)
    );

    if (isRouteEdge && dist < minDistanceRoute) {
      minDistanceRoute = dist;
      closestPointRoute = { x: projX, y: projY };
    }
  });

  if (minDistanceRoute !== Infinity && minDistanceRoute <= minDistanceAll * 2.5) {
    return { ...closestPointRoute, isOnRoute: true };
  }
  return { ...closestPointAll, isOnRoute: false };
};
```

---

## 6. Output Screenshots

The following screenshots should be captured from the live application and inserted into this section when preparing the final printed document.

**Figure 1: Application Launch and QR Scanner**
Shows the camera view open with the green scanning frame overlay. The status text reads "Scanning for QR code." A physical QR code is visible within the frame, demonstrating how the user sets their starting position.

**Figure 2: Route Displayed on Floor Plan**
Shows the SVG floor plan of the hospital with a dashed route line drawn from the user's current position to the destination. The user's position is shown as a blue pulsing dot. Destination labels are visible on the map.

**Figure 3: Active Navigation Dashboard**
Shows the bottom navigation panel with "Navigating to Radiology" as the heading, and three metric boxes displaying Distance (148m), Time (2 min), and Speed (1.3 m/s). The Start Navigation button has changed to Exit Navigation in red.

**Figure 4: RouteGuide Step List**
Shows the slide-up panel with the full list of turn-by-turn steps. Each step shows an icon (arrow up for straight, arrow left or right for turns, pin for destination), the instruction text, and the distance for straight segments.

**Figure 5: Location Confirmation Card**
Shows the modal card that appears when the user approaches the Radiology entrance. A photograph of the corridor outside Radiology is displayed with the text "Are you near Radiology?" and two buttons labelled "Yes, I am here" and "No, keep going."

**Figure 6: Cross-Floor Navigation Prompt**
Shows the interface asking the user to choose between "Take the Lift" and "Use the Stairs" when navigating to a destination on a different floor. Both options are shown as large tappable cards with icons.

**Figure 7: Re-Pin Mode**
Shows the map in re-pin mode. The auto-follow has been disabled, the user has panned to a different location, and the UI shows the name of the nearest node to the screen centre as a preview. A "Confirm Pin Here" button is visible at the bottom.

---

## 7. References

1. Dijkstra, E. W. (1959). A note on two problems in connexion with graphs. Numerische Mathematik, 1(1), 269-271.

2. Welch, G., and Bishop, G. (2006). An Introduction to the Kalman Filter. University of North Carolina at Chapel Hill, Technical Report TR 95-041.

3. Weinberg, H. (2002). Using the ADXL202 in Pedometer and Personal Navigation Applications. Analog Devices Application Note AN-602.

4. Harle, R. (2013). A Survey of Indoor Inertial Positioning Systems for Pedestrians. IEEE Communications Surveys and Tutorials, 15(3), 1281-1293.

5. React Documentation. (2025). React: The library for web and native user interfaces. Retrieved from https://react.dev

6. GreenSock. (2025). GSAP: Professional-grade JavaScript animation. Retrieved from https://greensock.com/gsap/

7. Vite. (2025). Vite: Next Generation Frontend Tooling. Retrieved from https://vitejs.dev

8. MDN Web Docs. (2025). DeviceMotionEvent. Mozilla Foundation. Retrieved from https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent

9. MDN Web Docs. (2025). Progressive Web Apps. Mozilla Foundation. Retrieved from https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps

10. W3C. (2023). DeviceOrientation Event Specification. World Wide Web Consortium. Retrieved from https://w3c.github.io/deviceorientation/

---

*End of Report*
