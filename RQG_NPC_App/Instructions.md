# Instructions — Usage, House Rules & GitHub Pages Deployment Guide

This guide covers how to run the **RuneQuest: Roleplaying in Glorantha** companion apps offline, how to upload and publish them online with **GitHub Pages**, and how to use all character, house-rule, and NPC features.

---

## 1. Running the Apps Offline (No Setup Needed)

You do **not** need to install Node.js, Python, or any web server to use the apps on your computer or tablet:

1. **Full Character Companion & Campaign Manager**:
   - Open [`runequest_app.html`](./runequest_app.html) (or [`index.html`](./index.html)) in any modern web browser (Chrome, Edge, Firefox, Safari).
2. **Standalone NPC Character Sheet & Generator**:
   - Open [`runequest_npc_app.html`](./runequest_npc_app.html) (or `RQG_NPC_App/runequest_npc_app.html`) in your browser.

---

## 2. Uploading to GitHub & Publishing with GitHub Pages

Both the root project folder and the individual app folders (`RQG_client/` and `RQG_NPC_App/`) are configured so you can upload them directly to GitHub and host them online with **GitHub Pages** without needing any build pipeline.

### Scenario A: Publishing Both Apps in One Repository (Recommended)
1. Create a new repository on [GitHub](https://github.com/new).
2. Upload or push the root project folder (`RQG`):
   ```bash
   git init
   git add .
   git commit -m "Initial commit: RQG Character Companion and NPC App"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
   *(Note: `.gitignore` automatically excludes `node_modules/` and any local `.pdf` files in `Material/` while keeping the pre-built HTML apps included.)*
3. On GitHub, open your repository and go to **Settings → Pages**.
4. Under **Build and deployment**:
   - **Source**: Select **Deploy from a branch**
   - **Branch**: Select **`main`** and folder **`/ (root)`**
   - Click **Save**.
5. After 1–2 minutes, your apps will be live at:
   - **Full Character Companion**: `https://<your-username>.github.io/<your-repo>/` (or `/runequest_app.html`)
   - **Standalone NPC App**: `https://<your-username>.github.io/<your-repo>/runequest_npc_app.html`

### Scenario B: Publishing Only the Standalone NPC App (`RQG_NPC_App`) in Its Own Repository
If you want a dedicated repository containing **only** the NPC Creator:
1. Create a new GitHub repository and upload/push the contents of the **`RQG_NPC_App`** folder.
2. Go to **Settings → Pages**, choose **Deploy from a branch**, select **`main`** and **`/ (root)`**, and click **Save**.
3. Visiting `https://<your-username>.github.io/<npc-repo>/` will automatically load `runequest_npc_app.html`.

### Scenario C: Publishing Only the Full Character App (`RQG_client`) in Its Own Repository
1. Create a new GitHub repository and upload/push the contents of the **`RQG_client`** folder.
2. Enable GitHub Pages from **`main` / `(root)`**.
3. Visiting `https://<your-username>.github.io/<client-repo>/` will automatically load `runequest_app.html`.

---

## 3. Using the Character Companion (`runequest_app.html`)

### Creating a New Adventurer (`New Hero` Wizard)
1. **Step 1 — Homeland**: Select your adventurer's homeland (Sartar, Esrolia, Grazelands, Praxian Tribes, Lunar Tarsh, Old Tarsh) and enter Tribe/Clan.
2. **Step 2 — Runes**: Choose Primary (`60%`), Secondary (`40%`), and Tertiary (`20%`) Elemental Runes and set Power/Form Rune dualities (`75% / 25%` or `50% / 50%`).
3. **Step 3 — Characteristics & Editable Category Bonuses**:
   - Roll `3D6` / `2D6+6` or type your 7 Characteristics (`STR`, `CON`, `SIZ`, `DEX`, `INT`, `POW`, `CHA`) directly.
   - **House Rule — Editable Skill Category Bonuses**: Below the characteristics, all 7 Skill Category Bonuses (`Agility`, `Communication`, `Knowledge`, `Magic`, `Manipulation`, `Perception`, `Stealth`) are calculated per the RQG rulebook. You can type any custom `%` bonus directly into any category box (and click `↺` at any time to reset back to the rulebook value).
4. **Step 4 — Profession Skill % Allocation (House Rules)**:
   - No preset profession is forced. Enter any custom `%` bonuses into the skills of your choice (and add custom skills if needed).
   - You can also adjust your **Skill Category Bonuses** right at the top of Step 4 and see all skill totals recalculate live.
5. **Step 5 — Cult & Magic**: Choose your deity and starting Special Rune Spells & Spirit Magic.
6. **Step 6 — Personal Skills & Details**: Select your `+25%` and `+10%` personal skills, heirloom, name, age, and background notes, then click **Complete Adventurer & Open Sheet**.

### Interactive Character Sheet Features
- **Editable Characteristics & Category Bonuses**: Adjust stats with `-` / `+` or edit any **Skill Category Bonus** directly in either the **Characteristics & Runes** tab or at the top of the **Skills** tab. All skills in that category automatically adjust by the change.
- **Directly Editable Skill %**: Type any number directly into a skill's `%` input box on the **Skills** tab.
- **Skill Experience & Level-Up Rolls**:
  - Click the checkbox next to a skill name to mark an experience check during an adventure.
  - Choose **Roll +1D6% (Standard RQG)** or **Flat +3% (Optional RQG)** at the top of the Skills tab.
  - Click **`⬆ Exp`** on an individual skill card or **`Level Up Checked`** to roll `1D100 + Category Bonus > Current Skill %` (or natural `100`) and automatically apply the increase.

---

## 4. Using the NPC Character Sheet & Generator (`runequest_npc_app.html`)

- **Always Starts Blank**: The sheet opens clean and blank so you can immediately type in an NPC from scratch.
- **Saved NPC Dropdown**: Click **Save NPC** in the top bar to save the current NPC to your browser. Select any saved NPC from the **Select NPC** dropdown menu, or choose **`+ [ Blank / New NPC ]`** to start a fresh sheet.
- **Manual Creator vs. Automatic Random Generator**:
  - **Manual Mode**: Every non-derived field on the sheet is directly editable. Changing `STR`, `CON`, `SIZ`, `DEX`, `INT`, `POW`, or `CHA` automatically updates Damage Bonus, SIZ SR, DEX SR, Hit Points, Magic Points, Hit Location Max HPs, and Skill Category Bonuses. You can also override any **Skill Category Bonus** in the top Manual Creator panel.
  - **Automatic Mode**: Pick an **Archetype**, **Power Tier** (`Novice`, `Veteran`, `Elite`, `Master`), optional Homeland/Cult/Gender, and click **Roll Random NPC**.
- **Equipment & Notes**: Use the multi-line **EQUIPMENT & NOTES** box at the bottom of the sheet for gear, treasure, mounts, and tactics.
- **Printing**: Click **Print** to print a clean tabletop sheet where Hit Points are formatted as `____ / Max` with space to write current HP in pen or pencil.
- **Backup & Sharing**: Use **Export Roster** / **Import Roster** (or **To PC Roster**) to save and share `.json` files locally.

---

## 5. Developer Build Instructions (Optional)

If you modify the React source code in `RQG_client/src/` or `RQG_NPC_App/src/` and want to rebuild the standalone HTML files:

### Rebuild Full Character Companion (`RQG_client`)
```bash
cd RQG_client
npm install
npm run build
```
This updates `RQG_client/dist/index.html`, `RQG_client/runequest_app.html`, `runequest_app.html`, and `index.html`.

### Rebuild Standalone NPC App (`RQG_NPC_App`)
```bash
cd RQG_NPC_App
npm install
npm run build
```
This updates `RQG_NPC_App/dist/index.html`, `RQG_NPC_App/runequest_npc_app.html`, and `runequest_npc_app.html`.
