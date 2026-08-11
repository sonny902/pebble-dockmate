# Pebble Companion

Build the frontend for a premium consumer hardware/software product called “Pebble”.

Pebble is a small physical device that a user carries between different magnetic docks. When the Pebble is placed on a dock, the dock identifies itself to the Pebble, and the Pebble communicates that dock information to the companion app over Bluetooth.

The app lets users configure what happens when Pebble is placed on each dock.

IMPORTANT:

This should feel like a polished Apple-quality consumer app, NOT a generic SaaS dashboard and NOT a developer/admin panel.

The visual language should be inspired by the qualities of Apple's best software:

- extremely clean

- premium

- calm

- minimal

- excellent typography

- generous spacing

- subtle depth

- restrained borders

- smooth animations

- excellent hierarchy

- intuitive without instructions

Do NOT copy Apple's UI directly. Create an original Pebble design language.

==================================================

CORE PRODUCT EXPERIENCE

==================================================

The primary user journey is:

1. User opens Pebble

2. App detects their Pebble

3. User sets up a dock

4. User places Pebble on the dock

5. App detects the dock

6. User names the dock

7. User chooses what should happen when Pebble is placed there

8. User saves the configuration

9. Whenever Pebble is placed on that dock in the future, those actions automatically run

The user should NEVER need to understand internal dock IDs.

For example, internally a dock might have ID 3015, but the user should simply see:

“Desk Dock”

==================================================

RESPONSIVE DESIGN

==================================================

This is primarily a MOBILE app.

Design mobile first.

On mobile:

- bottom tab navigation

- thumb-friendly controls

- large touch targets

- compact but spacious layouts

- beautiful full-screen navigation

- sheets/modals where appropriate

- avoid desktop-style sidebars

On desktop:

- use a refined left sidebar

- larger content area

- comfortable max-width

- two-column layouts where useful

- do NOT simply stretch the mobile interface

- desktop should feel intentionally designed

The same product should feel native and polished on both phone and desktop.

Support:

- small phones

- large phones

- tablets

- laptop screens

- large desktop screens

Avoid horizontal scrolling.

==================================================

VISUAL DESIGN SYSTEM

==================================================

Create a complete design system using reusable components and design tokens.

Typography:

- modern, highly legible sans-serif

- use Inter or a similarly polished system-friendly font

- strong hierarchy without excessive font weights

- avoid huge marketing-style headings inside the actual app

Corners:

- generously rounded but not cartoonishly rounded

- consistent radius system

Surfaces:

- clean background

- subtle cards

- very restrained borders

- subtle shadows only where useful

- no excessive gradients

- no glassmorphism everywhere

Animations:

- subtle spring-like transitions

- smooth page transitions

- buttons should have tactile feedback

- toggles should animate smoothly

- dock connection states should transition elegantly

- avoid flashy animations

Icons:

- use a consistent modern icon library such as Lucide

- icons should be simple and purposeful

- never use emoji as primary UI icons

==================================================

THEME SYSTEM

==================================================

Pebble must be highly customizable.

Build the UI around a proper theme/token system.

Include:

1. Light mode

2. Dark mode

3. System appearance

Allow the user to choose an accent colour.

Include several beautiful preset themes, for example:

- Pebble — clean neutral default

- Midnight — dark and sophisticated

- Arctic — cool, bright and minimal

- Forest — subtle green

- Ocean — deep blue

- Rose — soft warm accent

The themes should change the actual design tokens, not just randomly recolour individual components.

Create a Settings → Appearance screen where users can:

- choose Light / Dark / System

- choose an accent colour

- choose a preset theme

- preview the theme immediately

The UI must remain readable and accessible across all themes.

==================================================

APP STRUCTURE

==================================================

Create these primary areas:

HOME

DOCKS

ACTIVITY

APPEARANCE

SETTINGS

Mobile navigation:

Home

Docks

Activity

Settings

Desktop sidebar:

Pebble logo/name

Home

Docks

Activity

Settings

Appearance can live inside Settings on navigation, but should have its own polished screen.

==================================================

HOME SCREEN

==================================================

The home screen should immediately communicate the state of the user's Pebble.

Example connected state:

Pebble

● Connected

Desk Dock

Battery

96%

Charging

Yes

A clean visual representation of the Pebble should appear here.

Do NOT make it look like a generic smart-home dashboard.

The home screen should feel calm and premium.

Possible states:

CONNECTED

“Pebble is ready”

NOT CONNECTED

“Pebble isn't nearby”

DOCKED

“Desk Dock”

“Pebble is active”

NOT DOCKED

“Pebble is ready”

“No dock detected”

Use subtle status indicators.

==================================================

DOCKS SCREEN

==================================================

Show the user's configured docks.

Example:

Your Docks

Desk Dock

2 actions

Meeting Room

3 actions

Car Dock

2 actions

Each dock should be represented by a beautiful compact card/list item.

Show:

- dock name

- number of configured actions

- active/inactive state if useful

Include:

+ Add Dock

A dock should NEVER primarily be represented by its raw ID.

==================================================

DOCK SETUP FLOW

==================================================

This is one of the most important parts of the app.

Design this as a beautiful guided setup flow.

STEP 1:

“Set up your dock”

“Place Pebble on the dock to continue.”

Show an elegant animated Pebble/dock illustration.

When a dock is detected:

“Dock detected”

Do not show “Dock 3015” prominently.

You can show a small technical identifier in an advanced/details section if necessary.

STEP 2:

“Name your dock”

Input:

Desk Dock

Suggestions:

Desk

Bedroom

Office

Meeting Room

Car

Home

STEP 3:

“What should happen when Pebble is placed here?”

This should be the core configuration screen.

Have a prominent search field:

Search apps and actions...

Then show results.

Examples:

Visual Studio Code

Spotify

Google Chrome

Discord

Slack

Notion

Terminal

Microsoft Teams

Each result should have:

- app icon

- app name

- toggle/add button

Users can select multiple actions.

Example:

When Pebble is placed here:

✓ Open Visual Studio Code

✓ Open Spotify

✓ Open Google Chrome

+ Add action

STEP 4:

Review:

Desk Dock

When Pebble is placed here:

Open Visual Studio Code

Open Spotify

Open Google Chrome

[Save Dock]

STEP 5:

Success state:

“Desk Dock is ready”

“Place Pebble here anytime to activate your workspace.”

==================================================

ACTION SYSTEM

==================================================

Architect the UI so actions are extensible.

For V1, support:

Open App

But design the UI so future actions can easily be added:

Open App

Open Website

Open Folder

Run Command

Change Volume

Mute Microphone

Start Focus Mode

Open Workspace

etc.

Do NOT implement every future action now.

Create a clean action model/component system so additional action types can be added later.

Each configured action should be reorderable eventually.

==================================================

ACTIVE DOCK EXPERIENCE

==================================================

When Pebble is placed on a configured dock:

Show a beautiful state change.

Example:

✓ Desk Dock

Pebble is docked

Activating workspace...

Then:

Workspace active

✓ Visual Studio Code

✓ Spotify

✓ Chrome

This should feel satisfying but subtle.

Do not make it feel like a notification-heavy automation dashboard.

==================================================

ACTIVITY

==================================================

Create an Activity screen showing recent Pebble events.

Example:

Today

12:42

Desk Dock

Workspace activated

12:18

Pebble removed

Desk Dock disconnected

Yesterday

18:04

Car Dock

Workspace activated

Keep this minimal and useful.

==================================================

SETTINGS

==================================================

Create a polished settings area.

Sections:

Pebble

- Pebble name

- Connection status

- Battery

- Firmware version

Docks

- Manage docks

- Add dock

Appearance

- Theme

- Accent colour

- Light/Dark/System

Actions

- Manage available actions

Advanced

- Developer information

- Device identifier

- Bluetooth information

About

- Pebble version

- Support

- Privacy

- Terms

Keep advanced technical information hidden from normal users.

==================================================

EMPTY STATES

==================================================

Design beautiful empty states.

No Pebble:

“Welcome to Pebble”

“Connect your Pebble to get started.”

No docks:

“Your docks will appear here.”

“Place Pebble on a dock to set one up.”

No actions:

“Make this dock useful.”

“Choose what should happen when Pebble arrives.”

==================================================

MICROINTERACTIONS

==================================================

Add polished microinteractions:

- dock detection animation

- Pebble connected indicator

- smooth toggle animations

- save confirmation

- action added animation

- dock activated animation

- subtle haptic-style visual feedback

- skeleton/loading states

- graceful connection errors

Keep animations fast and understated.

==================================================

IMPORTANT TECHNICAL REQUIREMENTS

==================================================

Use:

- React

- TypeScript

- Tailwind

- shadcn/ui where appropriate

- Lucide icons

- reusable components

- clean component architecture

- proper design tokens

- responsive layouts

Do not build everything inside one component.

Create reusable components for:

- DockCard

- PebbleStatus

- ActionRow

- ActionPicker

- DockSetup

- ThemePicker

- StatusIndicator

- AppShell

- MobileNavigation

- DesktopSidebar

Use mock/local data for the Pebble hardware initially.

DO NOT attempt to implement Bluetooth hardware communication yet.

The existing hardware/backend will be connected later.

Create a clean abstraction for device state so real Bluetooth data can replace the mock data later without redesigning the UI.

Example device state:

{

  connected: true,

  battery: 100,

  charging: false,

  dock: 3015

}

Example dock:

{

  id: 3015,

  name: "Desk Dock",

  actions: [

    {

      type: "open_app",

      app: "Visual Studio Code"

    },

    {

      type: "open_app",

      app: "Spotify"

    }

  ]

}

==================================================

DATA / STATE

==================================================

For now, use realistic local mock data and in-memory state.

Make the architecture ready for persistent storage later.

Do not build authentication unless required.

Do not add unnecessary backend infrastructure.

==================================================

QUALITY BAR

==================================================

The result should feel like a real consumer product that could ship.

Avoid:

- generic SaaS dashboards

- excessive cards

- excessive gradients

- giant headings

- neon colors

- developer-looking interfaces

- clutter

- unnecessary charts

- unnecessary statistics

- fake complexity

Think:

Premium hardware companion app.

Calm.

Minimal.

Fast.

Personal.

Beautiful.

The user should understand what to do without reading documentation.

Build the complete responsive frontend and all of the screens and flows described above.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4d758d28-a38a-4c67-a638-a27dd3c5bd20).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
