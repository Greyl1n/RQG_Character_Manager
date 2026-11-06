# RuneQuest: Roleplaying in Glorantha — Character Companion & NPC Creator

A local-first, offline-capable web application suite for **RuneQuest: Roleplaying in Glorantha (RQG)**, featuring both a full **Adventurer Character Companion & Campaign Manager** (`RQG_client` / `runequest_app.html`) and a dedicated **Standalone NPC Character Sheet & Generator** (`RQG_NPC_App` / `runequest_npc_app.html`).

See **[Instructions.md](./Instructions.md)** for full step-by-step usage guides and GitHub Pages deployment instructions.

---

## 📦 Two Ready-to-Use Applications Included

| Application | Standalone File | Source Folder | Purpose |
| :--- | :--- | :--- | :--- |
| **1. Full Character Companion** | [`runequest_app.html`](./runequest_app.html) (and [`index.html`](./index.html)) | [`RQG_client/`](./RQG_client) | Complete Player Character sheet, 6-step Adventurer Creation Wizard, Roster Manager, Printable PC Sheet, and integrated NPC Generator. |
| **2. Standalone NPC App** | [`runequest_npc_app.html`](./runequest_npc_app.html) | [`RQG_NPC_App/`](./RQG_NPC_App) | Dedicated lightweight app containing **only** the interactive NPC Character Sheet & Generator for Gamemasters. |

---

## 🚀 Quick Start (Zero Installation Required)

### Option A: Run Directly Offline (Double-Click)
Both apps are pre-compiled into self-contained single-file HTML bundles that work completely offline without Node.js or a web server:
- Double-click **`runequest_app.html`** (or **`index.html`**) to launch the **Full Character Companion**.
- Double-click **`runequest_npc_app.html`** to launch the **Standalone NPC Sheet & Generator**.

### Option B: Publish Online with GitHub Pages
This repository and its subfolders (`RQG_client` and `RQG_NPC_App`) are pre-configured for direct upload to GitHub and 1-click hosting on **GitHub Pages**:
1. Upload the project folder to a GitHub repository.
2. Go to **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Select branch **`main`** (or `master`) and folder **`/ (root)`**, then click **Save**.
4. Your app will be live at:
   - `https://<your-username>.github.io/<repo-name>/` (Full Character Companion)
   - `https://<your-username>.github.io/<repo-name>/runequest_npc_app.html` (Standalone NPC App)
   - *(If you upload `RQG_client` or `RQG_NPC_App` as its own separate repository, its `index.html` automatically redirects to the self-contained app bundle!)*

---

## ⚔️ Key Features

### 1. Core RQG Rules + House-Rule Flexibility
- **Characteristics & Derived Stats**: Automatic live calculation of Hit Points (CON + SIZ mod + POW mod), Magic Points (POW), Healing Rate, Melee & Thrown Damage Bonus, Spirit Combat Damage, Maximum ENC, DEX SR, SIZ SR, Melee SR, and D20 Hit Location HPs.
- **Rulebook + Editable Skill Category Bonuses**: All 7 Skill Category Modifiers (`Agility`, `Communication`, `Knowledge`, `Magic`, `Manipulation`, `Perception`, `Stealth`) are automatically calculated from Characteristics per the RQG Core Rules—and **every category bonus is directly editable** for house rules, automatically updating all skills in that category.
- **Free Profession Skill % Allocation (House Rules)**: Step 4 of the Character Creation Wizard lets you freely assign any Profession Skill `%` bonuses without forcing a preset occupation, while keeping Homeland, Cultural Weapon, and Cult skill bonuses automatic per the rulebook.
- **Directly Editable Skills & Experience Level-Up**:
  - Every skill `%` can be edited directly on the sheet.
  - Check off skills during play and roll official RQG Experience Level-Up checks (`1D100 + Category Bonus > Current Skill %` or natural `100`) for **`+1D6%`** or flat **`+3%`** gains.

### 2. Interactive NPC Character Sheet & Generator
- **Always Starts Blank**: Opens to a clean, blank NPC sheet ready for manual creation; saved NPCs can be loaded anytime from the top dropdown menu.
- **Every Non-Derived Field is Editable**: Freely edit Characteristics, Armor Points, Hit Locations, Cults & Rune Points (`0–12`), Hit Points (`0–24`), Magic Points (`0–24`), Skills, Spirit & Rune Magic, Melee & Missile Weapons, and bottom **Equipment & Notes**.
- **Automatic Archetype & Tier Generator**: Instantly roll complete NPCs across 11 Gloranthan archetypes and 4 power tiers (`Novice`, `Veteran`, `Elite`, `Master`).
- **Print-Optimized Layout**: Dedicated print styling (`@media print`) formats HP fields with blank pen lines and max HP (`____ / Max`) for tabletop pencil/pen tracking.

### 3. Interactive D100 & D20 Dice Roller
- Evaluates **Critical Success** (5% of skill), **Special Success** (20% of skill), **Normal Success** (up to 95%), **Failure** (96–100 automatic failure), and **Fumble** thresholds.
- Accurate **D20 Hit Location** roller (`01–04` Right Leg, `05–08` Left Leg, `09–11` Abdomen, `12` Chest, `13–15` Right Arm, `16–18` Left Arm, `19–20` Head) with live re-roll support.

---

## 🔒 Privacy & Security Policy
- **100% Local-First**: All character and NPC data is stored strictly in your browser's `localStorage` and exported/imported via local `.json` files.
- **Zero Telemetry**: Contains zero tracking, zero analytics, and zero external network requests.

---

## ⚖️ Legal Notice, Copyrights & Trademarks
- *RuneQuest*, *Glorantha*, *HeroQuest*, and their associated logos, runes, deity names, and setting elements are registered trademarks and/or copyrights of **Moon Design Publications LLC** and **Chaosium Inc.** All rights reserved.
- This project is an independent, unofficial, non-commercial fan-made companion utility used without formal permission under **Chaosium Inc.’s Fan Material Policy**. It is **not** affiliated with, endorsed, sponsored, or specifically approved by Chaosium Inc. or Moon Design Publications LLC.
- Official rulebooks and supplements are available from [Chaosium Inc. (www.chaosium.com)](https://www.chaosium.com).
