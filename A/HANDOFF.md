# MEDIA MAZE VIEWER - TECHNICAL HANDOFF & SYSTEM CONTEXT

## 1. PROJECT OVERVIEW
The **MediaMaze Viewer** is a high-performance, Single Page Application (SPA) for viewing digital photo albums. It is built with **Vanilla JavaScript** (no frameworks), CSS, and a lightweight PHP entry point for SEO. 

It is the frontend component of the "MediaMaze Ecosystem". The backend is the **Photo Album Builder** (an AI-assisted tool that generates the JSON data consumed by this viewer).

---

## 2. ARCHITECTURE & FILE STRUCTURE

### **Entry Points**
* **`LP.php`**: The primary entry point.
    * **Role:** Server-side logic for SEO. It fetches the JSON data *before* the DOM loads to inject OpenGraph (OG) and Twitter Card tags dynamically based on the query string.
    * **Structure:** PHP logic block at the top -> HTML shell -> JS/CSS imports.
* **`LP.html`**: The client-side fallback.
    * **Role:** Identical structure to LP.php but with hardcoded metadata (Tony Nahra branding). Used for static hosting or testing without PHP.

### **Core Assets (`common/`)**
* **`LP.js`**: The Monolith. Contains 100% of the application logic.
* **`LP.css`**: Centralized styling. Handles dark mode, Masonry grid, Modals, and Animation classes.
* **`LP_end.js`**: "End Screen" logic. Fetches sibling albums via `list_albums.php` and handles the grid display of other albums.
* **`view_counts.js`**: Placeholder for future analytics. Sets a required integrity flag.

### **Server Helper**
* **`list_albums.php`**: Scans the server directory for other `.json` files to populate the End Screen.

---

## 3. KEY FEATURES & DESIGN CONCEPTS

### **A. Navigation & Input**
* **Philosophy:** Keyboard-first. The mouse is supported, but the "power user" experience is via keys.
* **Keys:**
    * `Right/Left/Space`: Navigation.
    * `Up/Down`: Info Mode cycling (Hidden -> Bottom Bar -> Modal).
    * `PageUp/PageDown`: Cycle Categories.
    * `Home/End`: Reset / End Screen.
    * `1-9`: Slideshow (3s - 11s).
    * `F`: Fullscreen.
    * `E`: Toggle Effect (Random vs Fade).
    * `A`: Assistant (Link Generator).
    * `N`: Notes.
    * `M`: Music.

### **B. The "Notes" System**
* **Concept:** Photos can have "Annotated Notes" (alternate versions, e.g., diagrams).
* **Data:** Defined in JSON: `"notes": ["url1.png", "url2.png"]`.
* **Logic:** * `currentNoteIndex` tracks state (-1 = Original).
    * The **Indicator** (top-right) shows "Original / X" or "Note 1 / X".
    * The **Info Modal** acts as the logical "Last Page" of the note stack when using Up/Down arrows.

### **C. Link Assistant & Hash Options**
* **Feature:** Users can generate deep links to start the album in a specific state.
* **Format:** `.../Album#Option1,Option2`.
* **Supported Flags:**
    * `S` (Silent), `N` (Notes), `R` (Random), `F` (Fullscreen), `I` (Info), `E` (End).
    * `CAT-[Name]`, `KW-[Word]`, `ID`.
    * `[Digit]` (Slideshow speed).
* **UI:** The 'A' key opens a modal with Tabs (Flags, Filters, Slideshow) to visually build these links.

### **D. Audio System**
* **Hybrid Playlist:** Supports mixed MP3 files and YouTube Video IDs in the same playlist.
* **Logic:** Auto-plays unless `isSilentMode` is true. `M` toggles state.

### **E. Security & Integrity**
* **Dead Man's Switch:** `LP.js` checks for `window.lpEndLoaded` and `window.viewCountsLoaded` on init. If missing, it renders a "System Error".
* **Private Mode:** If JSON contains `_security: { mode: "Private" }`, a blocking overlay prevents viewing.

---

## 4. CRITICAL LOGIC FLOWS (For Future Devs)

1.  **Initialization (`init()` in `LP.js`):**
    1.  Parse URL (Query string = Album Name).
    2.  Fetch JSON.
    3.  Check Security (Private Mode?).
    4.  Parse Hash Options (Apply Filters/Flags).
    5.  Populate Data (Categories, Dropdowns).
    6.  Render Initial Image.

2.  **State Suspension (Modals):**
    * When *any* modal opens (Help, Grid, Assistant), `suspendState()` is called.
    * This pauses the Slideshow and Music.
    * When closed, `restoreState()` resumes them *only if* they were running before.

3.  **Dropdown Populator:**
    * In the Assistant, Dropdowns for Categories and IDs are populated *dynamically* based on the loaded JSON.
    * **Constraint:** The ID/Title dropdown text is truncated to **50 characters** (`DROPDOWN_TEXT_LIMIT`) to prevent UI overflow.

---

## 5. FUTURE MODIFICATION RULES
* **Do NOT remove** the Integrity Checks in `LP.js`.
* **Do NOT remove** the `parseHashOptions` logic; it is central to the user experience.
* **Styling:** Always use `common/LP.css`. Use the defined CSS variables (`--accent`, `--bg-dark`) for consistency.
* **Z-Index Hierarchy:**
    * HUD: 100
    * Info Overlay: 90
    * Modals: 2000
    * Note Indicator: 2100 (Must stay on top).
