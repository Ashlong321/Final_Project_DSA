/* ============================================================================
   TRAINING TO WAR — PYTHON OOP & DSA TACTICAL SIMULATOR ENGINE
   Created by Ashley Castillo • Separated JavaScript Module (script.js)
   ============================================================================ */

const APP_VERSION = "3.2-WAR-OOP";

/* =====================================================
   CONSTANTS & 15 SELECTABLE SOLDIER SUBCLASSES
   ===================================================== */
const GRID_SIZE = 25;
const WATER_NEED = 35; // Stamina threshold
const WATER_DRAIN = 1.25;
const WATER_MAX_SECS = (100 - WATER_NEED) / WATER_DRAIN;
const TRIM_INTERVAL = 70; // Combat Drill interval
const PEST_INTERVAL = 95; // Injury / Medkit interval
const GROW_STAGE1 = 35;
const CLIMATE_INTERVAL = 24;
const DAY_LENGTH = 60;
const STAGE_NAMES = ["Recruit", "Trooper", "Elite Veteran"];

// 15 Selectable Soldier Subclasses (inheriting from base class `Soldier`)
// Scaled Elite Veteran deployment rewards: reward = cost * 2 + 10
const CROPS = {
    "Rifleman": {
        emoji: "🎖️", cost: 5, reward: 20, growMult: 1.0,
        subclass: "InfantryRifleman", role: "Frontline Assault",
        perk: "Balanced stamina & fast basic drill progression"
    },
    "Sniper": {
        emoji: "🎯", cost: 10, reward: 30, growMult: 1.15,
        subclass: "ReconSniper", role: "Long-Range Precision",
        perk: "High precision XP gain during marksmanship drills"
    },
    "Combat Medic": {
        emoji: "🩺", cost: 8, reward: 26, growMult: 1.05,
        subclass: "FieldMedic", role: "Platoon Triage Support",
        perk: "Enhanced self-triage & faster trauma recovery"
    },
    "Heavy Gunner": {
        emoji: "🛡️", cost: 12, reward: 34, growMult: 1.25,
        subclass: "ArmorGunner", role: "Suppression Fire",
        perk: "Heavy ballistic plating reduces injury damage"
    },
    "Demolitionist": {
        emoji: "💣", cost: 14, reward: 38, growMult: 1.25,
        subclass: "BreachDemo", role: "Explosive Ordnance",
        perk: "High-impact breaching & munitions specialist"
    },
    "Paratrooper": {
        emoji: "🪂", cost: 11, reward: 32, growMult: 1.15,
        subclass: "AirborneTrooper", role: "Rapid Air Drop",
        perk: "Airborne endurance reduces stamina drain rate"
    },
    "Tank Commander": {
        emoji: "🚜", cost: 20, reward: 50, growMult: 1.5,
        subclass: "ArmoredDivision", role: "Heavy Mechanized Spearhead",
        perk: "Armored hull protection & high Frontline payout (50c)"
    },
    "Cyber Operator": {
        emoji: "💻", cost: 15, reward: 40, growMult: 1.2,
        subclass: "CyberWarfareSpec", role: "Electronic Jamming & Comms",
        perk: "Digital telemetry integration with DSA radar sweeps"
    },
    "Drone Pilot": {
        emoji: "🛸", cost: 13, reward: 36, growMult: 1.2,
        subclass: "UAVOperator", role: "Aerial Recon & Strike",
        perk: "Remote recon reduces frontline injury frequency"
    },
    "Scout Ranger": {
        emoji: "🗡️", cost: 9, reward: 28, growMult: 1.05,
        subclass: "JungleRanger", role: "Stealth Infiltration",
        perk: "Superior field survival & low ration consumption"
    },
    "Artillery Spotter": {
        emoji: "🔭", cost: 11, reward: 32, growMult: 1.15,
        subclass: "ForwardObserver", role: "Target Coordinates",
        perk: "Coordinates fire missions & rangefinder drills"
    },
    "Flame Trooper": {
        emoji: "🔥", cost: 16, reward: 42, growMult: 1.3,
        subclass: "ThermalTrooper", role: "Bunker Clearing",
        perk: "High-payout assault specialist (42c Veteran reward)"
    },
    "K9 Handler": {
        emoji: "🐕", cost: 10, reward: 30, growMult: 1.1,
        subclass: "TacticalK9Unit", role: "Perimeter Detection",
        perk: "Boosts sector morale & early ambush detection"
    },
    "Signal Corps": {
        emoji: "📡", cost: 7, reward: 24, growMult: 1.0,
        subclass: "RelaySpecialist", role: "Encrypted Uplink",
        perk: "Fast training cycle & reliable HQ dispatch comms"
    },
    "Special Forces": {
        emoji: "⚡", cost: 25, reward: 60, growMult: 1.65,
        subclass: "TierOneCommando", role: "Black-Ops Apex Unit",
        perk: "Apex Tier-1 operator — highest Veteran payout (60c)"
    }
};

const DEFAULT_SEED_BAG = Object.keys(CROPS).map(name => [
    name,
    CROPS[name].emoji,
    CROPS[name].cost
]);

const CROP_EMOJI_MAP = {};
Object.keys(CROPS).forEach(k => {
    CROP_EMOJI_MAP[k] = CROPS[k].emoji;
});

const STATUS_META = {
    "Recruit": { icon: "🥾" },
    "In Training": { icon: "⚔️" },
    "Combat Ready": { icon: "✅" },
    "Low Stamina": { icon: "🍖" },
    "Injured": { icon: "🩸" },
    "Needs Drill": { icon: "🎯" },
    "Critical": { icon: "🚨" },
    "Elite Veteran": { icon: "🏅" }
};

const CARE_META = {
    water: { icon: "🍖", label: "ISSUE RATIONS (-5 Rations, -1 Ammo)", tool: "water", color: "#38bdf8", short: "Ration" },
    pest: { icon: "🩺", label: "APPLY MEDKIT (+30 HP, Cure Injury)", tool: "pest", color: "#f43f5e", short: "Medkit" },
    trim: { icon: "🎯", label: "COMBAT DRILL (-4 Ammo, +15% XP)", tool: "trim", color: "#f59e0b", short: "Drill" },
    recover: { icon: "🩺", label: "EMERGENCY MEDKIT (Critical HP)", tool: "pest", color: "#ef4444", short: "Medkit" }
};

const EVENT_POOL = [
    "📦 Supply Air-Drop (+35 Rations, +20 Ammo)",
    "🎖️ High Command Inspection (+15c Bonus, +4 Morale)",
    "🌧️ Night Ambush Simulation (-8 Stamina, +10% XP)"
];

/* =====================================================
   RUNTIME STATE
   ===================================================== */
let pyodideInstance = null;
let pyodidePromise = null;

const RES = { water: 180, seeds: 45, energy: 110, hope: 80, coins: 60 };
const RES_MAX = { water: 200, seeds: 100, energy: 120, hope: 100 };

let gardenPlants = {}; // Active Soldier OOP instances by sector index 0..24
let tiles = [];
let displayActionHistory = [];
let undoSnapshotStack = [];
let climateQueue = EVENT_POOL.slice();
let climateCountdown = CLIMATE_INTERVAL;
let activeTool = "plant";
let selectedPos = null;
let dashboardNote = null;
let day = 1;
let dayTimer = 0;
let lastTick = Date.now();
let donationGiven = false;

/* =====================================================
   SPLASH & MODAL HELPERS
   ===================================================== */
function enterCommandCenter() {
    const splash = document.getElementById("splash-screen");
    if (splash) splash.classList.add("hidden-splash");
}

function showSplashScreen() {
    const splash = document.getElementById("splash-screen");
    if (splash) splash.classList.remove("hidden-splash");
}

function toggleGuideModal(show) {
    const modal = document.getElementById("guide-modal");
    if (!modal) return;
    if (show) {
        modal.classList.remove("hidden");
        modal.classList.add("flex");
    } else {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
    }
}

/* =====================================================
   UTILITIES & VISUAL FX
   ===================================================== */
function rand(a, b) {
    return a + Math.random() * (b - a);
}

function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
}

function toJS(v) {
    return (v && typeof v.toJs === "function")
        ? v.toJs({ dict_converter: Object.fromEntries })
        : v;
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function mmss(s) {
    s = Math.max(0, Math.ceil(s));
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}

function shortTime(s) {
    s = Math.max(0, Math.ceil(s));
    return s < 60 ? s + "s" : Math.floor(s / 60) + "m " + String(s % 60).padStart(2, "0") + "s";
}

function playAnim(el, cls, ms) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), ms || 800);
}

function spawnFx(pos, text, kind, o) {
    o = o || {};
    const t = tiles[pos];
    if (!t) return;
    const s = document.createElement("span");
    s.className = "fx-p fx-" + kind;
    s.textContent = text;
    s.style.left = (o.x !== undefined ? o.x : 50) + "%";
    s.style.top = (o.y !== undefined ? o.y : 50) + "%";
    s.style.setProperty("--dx", (o.dx || 0) + "px");
    s.style.setProperty("--dy", (o.dy || 0) + "px");
    if (o.size) s.style.fontSize = o.size + "px";
    s.style.animationDelay = (o.delay || 0) + "ms";
    if (o.dur) s.style.animationDuration = o.dur + "ms";
    t.fx.appendChild(s);
    setTimeout(() => s.remove(), (o.delay || 0) + (o.dur || 1000) + 150);
}

function sparkle(pos, n, txt) {
    for (let i = 0; i < (n || 5); i++) {
        spawnFx(pos, txt || "⭐", "burst", {
            x: rand(30, 70),
            y: rand(30, 60),
            dx: rand(-38, 38),
            dy: rand(-50, -15),
            delay: i * 55,
            dur: 850
        });
    }
}

function weatherFx(type) {
    const layer = document.getElementById("weather-layer");
    if (!layer) return;
    const sym = { sun: "🎖️", rain: "📦", wind: "💥" }[type];
    const n = type === "sun" ? 5 : 14;
    for (let i = 0; i < n; i++) {
        const s = document.createElement("span");
        s.className = "wx " + type;
        s.textContent = sym;
        s.style.left = (type === "wind" ? -8 : rand(2, 96)) + "%";
        if (type !== "rain") s.style.top = rand(8, 85) + "%";
        s.style.animationDelay = (i * (type === "sun" ? 140 : 65)) + "ms";
        layer.appendChild(s);
        setTimeout(() => s.remove(), 2500);
    }
}

function setTool(tool) {
    activeTool = tool;
    ["plant", "water", "trim", "pest", "remove"].forEach(t => {
        const btn = document.getElementById(`tool-${t}`);
        if (btn) btn.classList.toggle("tool-btn-active", t === tool);
    });
}

/* =====================================================
   RESOURCES (`BaseEconomy` OOP State)
   ===================================================== */
function changeRes(key, delta) {
    let v = RES[key] + delta;
    v = RES_MAX[key] !== undefined ? clamp(v, 0, RES_MAX[key]) : Math.max(0, v);
    RES[key] = v;
}

function updateResources(water, seeds, energy, hope, coins) {
    water = toJS(water);
    if (typeof water === "object" && water !== null) {
        const args = water;
        ["water", "seeds", "energy", "hope", "coins"].forEach(k => {
            if (args[k] !== undefined) RES[k] = Number(args[k]);
        });
    } else {
        if (water !== undefined) RES.water = Number(water);
        if (seeds !== undefined) RES.seeds = Number(seeds);
        if (energy !== undefined) RES.energy = Number(energy);
        if (hope !== undefined) RES.hope = Number(hope);
        if (coins !== undefined) RES.coins = Number(coins);
    }
    renderResources();
}

function getResources() {
    return {
        water: RES.water,
        seeds: RES.seeds,
        energy: RES.energy,
        hope: RES.hope,
        coins: RES.coins
    };
}

function quartermasterResupply() {
    const COST = 10;
    if (RES.coins < COST) {
        pushAction("⚠️ Need 10c War Funds for Quartermaster Resupply!");
        return;
    }
    saveUndoSnapshot("Quartermaster Resupply");
    changeRes("coins", -COST);
    changeRes("water", 45);
    changeRes("seeds", 10);
    changeRes("energy", 35);
    changeRes("hope", 5);
    weatherFx("rain");
    renderResources();
    pushAction("📦 BaseEconomy.resupply() -> +45 Rations, +35 Ammo, +10 Dog Tags (-10c)");
}

function renderResources() {
    const w = Math.round(RES.water),
        s = Math.round(RES.seeds),
        e = Math.round(RES.energy),
        h = Math.round(RES.hope),
        c = Math.round(RES.coins);

    document.getElementById("water-text").innerText = `${w} / ${RES_MAX.water}`;
    document.getElementById("water-bar").style.width = `${clamp((w / RES_MAX.water) * 100, 0, 100)}%`;
    document.getElementById("seeds-text").innerText = `${s} / ${RES_MAX.seeds}`;
    document.getElementById("seeds-bar").style.width = `${clamp((s / RES_MAX.seeds) * 100, 0, 100)}%`;
    document.getElementById("energy-text").innerText = `${e} / ${RES_MAX.energy}`;
    document.getElementById("energy-bar").style.width = `${clamp((e / RES_MAX.energy) * 100, 0, 100)}%`;
    document.getElementById("hope-text").innerText = `${h} / ${RES_MAX.hope}`;
    document.getElementById("hope-bar").style.width = `${clamp((h / RES_MAX.hope) * 100, 0, 100)}%`;
    document.getElementById("coins-text").innerText = `${c}c`;
    renderMiniGridStatus();
}

/* =====================================================
   SOLDIER OOP INSTANCE MODEL & SUBCLASS POLYMORPHISM
   ===================================================== */
function getUnitReward(unitName) {
    const u = CROPS[unitName];
    if (!u) return 20;
    return u.reward || (u.cost * 2 + 10);
}

function createPlant(name, emojiOverride) {
    const unit = CROPS[name];
    return {
        name: name,
        subclass: unit ? unit.subclass : "CombatUnit",
        role: unit ? unit.role : "Tactical Infantry",
        perk: unit ? unit.perk : "Standard Infantry Training",
        cost: unit ? unit.cost : 5,
        reward: getUnitReward(name),
        finalEmoji: emojiOverride || (unit && unit.emoji) || CROP_EMOJI_MAP[name] || "🎖️",
        growMult: unit ? unit.growMult : 1,
        health: 100,
        water: 100, // Stamina
        progress: 0,
        stage: 0,
        status: "Recruit",
        lastAction: "__init__()",
        trimTimer: rand(50, 75), // Drill timer
        pestTimer: rand(75, 105), // Injury timer
        needsTrim: false,
        infested: false,
        removing: false,
        next: { type: "water", secs: WATER_MAX_SECS, max: WATER_MAX_SECS, now: false }
    };
}

function computeStatus(p) {
    if (p.health < 30) return "Critical";
    if (p.infested) return "Injured";
    if (p.water < WATER_NEED) return "Low Stamina";
    if (p.needsTrim) return "Needs Drill";
    if (p.stage >= 2) return "Elite Veteran";
    if (p.stage === 0) return "Recruit";
    return p.health >= 75 ? "Combat Ready" : "In Training";
}

function computeNext(p) {
    // Priority 1: Critical HP immediately requests Medkit
    if (p.health < 30) {
        return { type: "recover", secs: 0, max: 1, now: true, all: ["pest"] };
    }
    const needs = [];
    if (p.infested) needs.push("pest");
    if (p.water < WATER_NEED) needs.push("water");
    if (p.needsTrim) needs.push("trim");
    if (needs.length) {
        return { type: needs[0], secs: 0, max: 1, now: true, all: needs };
    }
    const cands = [
        { type: "water", secs: (p.water - WATER_NEED) / WATER_DRAIN, max: WATER_MAX_SECS },
        { type: "pest", secs: p.pestTimer, max: PEST_INTERVAL },
        { type: "trim", secs: p.trimTimer, max: TRIM_INTERVAL }
    ];
    cands.sort((a, b) => a.secs - b.secs);
    const c = cands[0];
    return { type: c.type, secs: Math.max(0, c.secs), max: c.max, now: false, all: [] };
}

function emojiFor(p) {
    if (p.status === "Critical") return "🚨";
    return p.finalEmoji;
}

function tickPlant(pos, p, dt) {
    // Subclass stamina efficiency perk for Paratrooper & Scout Ranger
    const drainFactor = (p.name === "Paratrooper" || p.name === "Scout Ranger") ? 0.85 : 1.0;
    p.water = Math.max(0, p.water - WATER_DRAIN * drainFactor * dt);

    if (!p.needsTrim) {
        p.trimTimer -= dt;
        if (p.trimTimer <= 0) {
            p.trimTimer = 0;
            p.needsTrim = true;
        }
    }
    if (!p.infested) {
        p.pestTimer -= dt;
        if (p.pestTimer <= 0) {
            p.pestTimer = 0;
            p.infested = true;
            animPestAppear(pos);
        }
    }

    let dmg = 0;
    if (p.water < 20) dmg += 1.5;
    else if (p.water < WATER_NEED) dmg += 0.4;
    if (p.infested) {
        // Heavy Gunner & Tank Commander take less injury damage due to armor
        const armorMitigation = (p.name === "Heavy Gunner" || p.name === "Tank Commander") ? 0.65 : 1.0;
        dmg += 1.0 * armorMitigation;
    }
    if (p.needsTrim) dmg += 0.35;

    if (dmg > 0) {
        p.health = Math.max(0, p.health - dmg * dt);
    } else {
        const regenRate = p.name === "Combat Medic" ? 1.25 : 0.85;
        p.health = Math.min(100, p.health + regenRate * dt);
    }

    let grew = false;
    if (p.stage < 2 && p.health >= 50 && p.water >= WATER_NEED && !p.infested) {
        p.progress = Math.min(100, p.progress + (100 / (70 * p.growMult)) * dt);
        const ns = p.progress >= 100 ? 2 : (p.progress >= GROW_STAGE1 ? 1 : 0);
        if (ns > p.stage) {
            p.stage = ns;
            grew = true;
        }
    }
    return grew;
}

function evaluatePlant(pos) {
    const p = gardenPlants[pos];
    if (!p) return;
    p.next = computeNext(p);
    const s = computeStatus(p);
    if (s !== p.status) {
        const old = p.status;
        p.status = s;
        onStatusChange(pos, p, old, s);
    }
}

function onStatusChange(pos, p, oldS, newS) {
    const t = tiles[pos];
    if (t) playAnim(t.status, "a-status", 750);
    const e = emojiFor(p);
    if (newS === "Low Stamina") pushAction(`🍖 Sector #${pos} (${p.name}) needs MRE Rations!`);
    else if (newS === "Injured") pushAction(`🩸 Sector #${pos} (${p.name}) sustained training injury!`);
    else if (newS === "Needs Drill") pushAction(`🎯 Sector #${pos} (${p.name}) ready for Combat Drill!`);
    else if (newS === "Critical") pushAction(`🚨 Sector #${pos} (${p.name}) HP critical — Apply Medkit!`);
    else if (newS === "Elite Veteran") pushAction(`🏅 ${e} ${p.name} (#${pos}) promoted to Elite Veteran! (Deploy for +${p.reward}c)`);
    else if (newS === "Combat Ready" && ["Low Stamina", "Injured", "Needs Drill", "Critical"].includes(oldS)) {
        pushAction(`✅ Sector #${pos} (${p.name}) restored to Combat Ready`);
        sparkle(pos, 3);
    }
}

/* =====================================================
   5x5 BARRACKS GRID RENDERING & ANIMATIONS
   ===================================================== */
function createTiles() {
    const grid = document.getElementById("garden-grid");
    if (!grid) return;
    grid.innerHTML = "";
    tiles = [];
    for (let i = 0; i < GRID_SIZE; i++) {
        const row = Math.floor(i / 5), col = i % 5;
        const b = document.createElement("button");
        b.type = "button";
        b.className = "tile";
        b.onclick = () => onGridCellClick(i);
        b.innerHTML =
            `<div class="tile-empty"><span>🛡️</span><small>Sec #${i} [${row},${col}]</small></div>` +
            `<div class="tile-body" style="display:none">` +
            `<div class="badges"></div>` +
            `<div class="plant-emoji" data-stage="0"></div>` +
            `<div class="plant-name"></div>` +
            `<div class="plant-status"></div>` +
            `<div class="plant-health"></div>` +
            `<div class="plant-timer"><div class="tbar"><i></i></div><span></span></div>` +
            `</div>` +
            `<div class="fx-layer"></div>`;
        grid.appendChild(b);
        tiles.push({
            root: b,
            empty: b.querySelector(".tile-empty"),
            body: b.querySelector(".tile-body"),
            badges: b.querySelector(".badges"),
            emoji: b.querySelector(".plant-emoji"),
            name: b.querySelector(".plant-name"),
            status: b.querySelector(".plant-status"),
            health: b.querySelector(".plant-health"),
            timer: b.querySelector(".plant-timer"),
            bar: b.querySelector(".tbar i"),
            timerText: b.querySelector(".plant-timer span"),
            fx: b.querySelector(".fx-layer")
        });
    }
}

function updateCell(pos) {
    const t = tiles[pos];
    if (!t) return;
    const p = gardenPlants[pos];
    t.root.classList.toggle("selected", pos === selectedPos && !!p);
    if (!p) {
        t.empty.style.display = "";
        t.body.style.display = "none";
        t.root.removeAttribute("data-status");
        return;
    }
    t.empty.style.display = "none";
    t.body.style.display = "flex";
    t.root.dataset.status = p.status;
    t.emoji.textContent = emojiFor(p);
    t.emoji.dataset.stage = p.stage;
    t.name.textContent = p.name;
    const meta = STATUS_META[p.status] || { icon: "🎖️" };
    t.status.textContent = `${meta.icon} ${p.status}`;
    t.status.dataset.status = p.status;
    t.health.textContent = `HP ${Math.round(p.health)}% · STA ${Math.round(p.water)}%`;

    let badges = "";
    if (p.water < WATER_NEED) badges += "<span title='Needs MRE Ration'>🍖</span>";
    if (p.infested || p.health < 30) badges += "<span title='Needs Medkit'>🩸</span>";
    if (p.needsTrim) badges += "<span title='Needs Combat Drill'>🎯</span>";
    t.badges.innerHTML = badges;

    const n = p.next;
    if (n.type === "recover") {
        t.bar.style.width = "100%";
        t.bar.style.background = "#ef4444";
        t.timerText.textContent = "🚨 Medkit now!";
        t.timer.classList.add("urgent");
    } else if (n.now) {
        t.bar.style.width = "100%";
        t.bar.style.background = "#ef4444";
        t.timerText.textContent = `⚠️ ${CARE_META[n.type].short} now!`;
        t.timer.classList.add("urgent");
    } else if (p.stage >= 2) {
        t.bar.style.width = "100%";
        t.bar.style.background = "#f59e0b";
        t.timerText.textContent = `🏅 Deploy (+${p.reward}c)`;
        t.timer.classList.remove("urgent");
    } else {
        t.bar.style.width = (clamp(n.secs / n.max, 0, 1) * 100) + "%";
        t.bar.style.background = CARE_META[n.type].color;
        t.timerText.textContent = `${CARE_META[n.type].icon} ${mmss(n.secs)}`;
        t.timer.classList.remove("urgent");
    }
}

function selectPlant(pos) {
    selectedPos = pos;
    dashboardNote = null;
    for (let i = 0; i < GRID_SIZE; i++) updateCell(i);
    renderDashboard();
    renderMiniGridStatus();
}

function animPlant(pos) {
    const t = tiles[pos];
    if (!t) return;
    t.emoji.classList.add("hidden-emoji");
    spawnFx(pos, "🪂", "seed", { x: 50, y: 52, dur: 480 });
    setTimeout(() => {
        t.emoji.classList.remove("hidden-emoji");
        playAnim(t.emoji, "a-grow-in", 700);
        sparkle(pos, 5, "⭐");
        playAnim(t.root, "a-glow-green", 900);
    }, 420);
}

function animWater(pos) {
    const t = tiles[pos];
    if (!t) return;
    for (let i = 0; i < 5; i++) {
        spawnFx(pos, "🍖", "fall", { x: rand(20, 80), y: 38, delay: i * 65, dur: 780 });
    }
    playAnim(t.emoji, "a-bounce", 700);
    playAnim(t.root, "a-glow-blue", 900);
}

function animTrim(pos) {
    const t = tiles[pos];
    if (!t) return;
    spawnFx(pos, "🎯", "snip", { x: 50, y: 45, dur: 850 });
    for (let i = 0; i < 4; i++) {
        spawnFx(pos, "💥", "burst", {
            x: 50, y: 45,
            dx: rand(-45, 45), dy: rand(-30, 30),
            delay: 220 + i * 55, dur: 750
        });
    }
    playAnim(t.emoji, "a-shake", 480);
}

function animPest(pos, hadInjury) {
    const t = tiles[pos];
    if (!t) return;
    if (hadInjury) {
        for (let i = 0; i < 4; i++) {
            spawnFx(pos, "💚", "bug", {
                x: rand(25, 75), y: rand(35, 65),
                dx: rand(-55, 55), dy: rand(-55, -20),
                delay: i * 80, dur: 1000
            });
        }
        sparkle(pos, 4, "🩺");
    } else {
        spawnFx(pos, "🛡️", "pop", { x: 50, y: 45, dur: 850 });
    }
    playAnim(t.emoji, "a-pop", 600);
    playAnim(t.root, "a-glow-green", 900);
}

function animPestAppear(pos) {
    for (let i = 0; i < 3; i++) {
        spawnFx(pos, "🩸", "bugstay", {
            x: rand(22, 78), y: rand(30, 70),
            delay: i * 110, dur: 1300
        });
    }
}

function animRemove(pos) {
    const t = tiles[pos];
    if (!t) return;
    spawnFx(pos, "🚁", "dig", { x: 50, y: 62, dur: 900 });
    playAnim(t.emoji, "a-shake", 450);
    setTimeout(() => {
        t.emoji.classList.add("a-shrink-out");
    }, 350);
}

function animGrow(pos) {
    const t = tiles[pos];
    if (!t) return;
    playAnim(t.emoji, "a-grow-up", 900);
    playAnim(t.root, "a-glow-gold", 1000);
    sparkle(pos, 6, "🏅");
}

function animDeny(pos) {
    if (tiles[pos]) playAnim(tiles[pos].root, "a-deny", 420);
}

/* =====================================================
   COMMAND ACTIONS & REVERSIBLE LIFO STACK SNAPSHOTS
   ===================================================== */
function saveUndoSnapshot(label) {
    const snap = {
        label,
        res: { ...RES },
        plants: JSON.parse(JSON.stringify(gardenPlants))
    };
    undoSnapshotStack.push(snap);
    if (undoSnapshotStack.length > 12) undoSnapshotStack.shift();
}

function triggerStackUndo() {
    if (!undoSnapshotStack.length) {
        pushAction("⚠️ Stack underflow: No command snapshot to pop()!");
        return;
    }
    const snap = undoSnapshotStack.pop();
    Object.assign(RES, snap.res);
    gardenPlants = snap.plants;
    for (let i = 0; i < GRID_SIZE; i++) updateCell(i);
    renderResources();
    renderDashboard();
    renderAssistant();
    displayActionHistory.pop();
    pushAction(`↩️ CommandStack.pop() -> Reverted "${snap.label}"`);
}

function triggerQueueDequeue() {
    if (!climateQueue.length) return;
    const ev = climateQueue.shift();
    processClimateEvent(ev);
    while (climateQueue.length < 3) {
        climateQueue.push(EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)]);
    }
    climateCountdown = CLIMATE_INTERVAL;
    renderClimate();
    renderResources();
}

function spawnPlant(pos, name, emoji) {
    gardenPlants[pos] = createPlant(name, emoji);
    evaluatePlant(pos);
    updateCell(pos);
    animPlant(pos);
    renderMiniGridStatus();
}

function removePlantState(pos, animate) {
    const p = gardenPlants[pos];
    if (!p) return;
    const finish = () => {
        delete gardenPlants[pos];
        if (selectedPos === pos) selectedPos = null;
        if (tiles[pos]) tiles[pos].emoji.classList.remove("a-shrink-out");
        updateCell(pos);
        renderDashboard();
        renderAssistant();
        renderMiniGridStatus();
    };
    if (animate) {
        p.removing = true;
        animRemove(pos);
        setTimeout(finish, 800);
    } else {
        finish();
    }
}

function doPlant(pos, unitName) {
    const p = gardenPlants[pos];
    if (p) {
        pushAction(`⚠️ Sector #${pos} already occupied by ${p.name}!`);
        animDeny(pos);
        return false;
    }
    const known = CROPS[unitName];
    const cost = known ? known.cost : 5;
    const emoji = known ? known.emoji : (CROP_EMOJI_MAP[unitName] || "🎖️");
    if (RES.seeds < 1) {
        pushAction("⚠️ Out of Recruit Dog Tags! Click Quartermaster Resupply.");
        animDeny(pos);
        return false;
    }
    if (RES.coins < cost) {
        pushAction(`⚠️ Need ${cost}c War Funds to deploy ${unitName}!`);
        animDeny(pos);
        return false;
    }
    saveUndoSnapshot(`Deploy ${unitName} (#${pos})`);
    changeRes("coins", -cost);
    changeRes("seeds", -1);
    spawnPlant(pos, unitName, emoji);
    pushAction(`🪖 ${known ? known.subclass : "Soldier"}("${unitName}") deployed at #${pos} (-${cost}c)`);
    selectPlant(pos);
    renderResources();
    return true;
}

function doWater(pos) {
    const p = gardenPlants[pos];
    if (!p) {
        pushAction("⚠️ Sector is empty! Select Deploy Unit first.");
        animDeny(pos);
        return false;
    }
    if (RES.water < 5) {
        pushAction("⚠️ MRE Ration stockpile low! Use Quartermaster Resupply.");
        animDeny(pos);
        return false;
    }
    if (RES.energy < 1) {
        pushAction("⚠️ Insufficient logistics fuel!");
        animDeny(pos);
        return false;
    }
    saveUndoSnapshot(`Ration ${p.name} (#${pos})`);
    if (p.water >= 90) {
        changeRes("water", -1);
        changeRes("coins", 1);
        p.water = 100;
        p.lastAction = "issue_rations() [topped]";
        pushAction(`🍖 ${p.name} (#${pos}) stamina topped off (+1c)`);
    } else {
        changeRes("water", -5);
        changeRes("energy", -1);
        changeRes("coins", 3);
        p.water = 100;
        p.lastAction = "issue_rations()";
        pushAction(`🍖 unit[${pos}].issue_rations() -> STA 100% (+3c)`);
    }
    animWater(pos);
    return true;
}

function doTrim(pos) {
    const p = gardenPlants[pos];
    if (!p) {
        pushAction("⚠️ Sector is empty! Select Deploy Unit first.");
        animDeny(pos);
        return false;
    }
    const ammoCost = p.needsTrim ? 4 : 2;
    if (RES.energy < ammoCost) {
        pushAction(`⚠️ Need ${ammoCost} Munitions & Fuel to run Combat Drill!`);
        animDeny(pos);
        return false;
    }
    saveUndoSnapshot(`Drill ${p.name} (#${pos})`);
    changeRes("energy", -ammoCost);
    if (p.needsTrim) {
        changeRes("coins", 4);
        p.needsTrim = false;
        p.health = Math.min(100, p.health + 6);
        const xpGain = p.name === "Sniper" ? 18 : 15;
        p.progress = Math.min(100, p.progress + xpGain);
        pushAction(`🎯 unit[${pos}].run_drill() -> +${xpGain}% XP, +4c (-4 Ammo)`);
    } else {
        changeRes("coins", 2);
        p.progress = Math.min(100, p.progress + 6);
        pushAction(`🎯 Extra live-fire practice for ${p.name} (+6% XP, +2c, -2 Ammo)`);
    }
    if (p.stage < 2) {
        const ns = p.progress >= 100 ? 2 : (p.progress >= GROW_STAGE1 ? 1 : 0);
        if (ns > p.stage) {
            p.stage = ns;
            animGrow(pos);
        }
    }
    p.trimTimer = TRIM_INTERVAL;
    p.lastAction = "run_drill()";
    animTrim(pos);
    return true;
}

function doPest(pos) {
    const p = gardenPlants[pos];
    if (!p) {
        pushAction("⚠️ Sector is empty! Select Deploy Unit first.");
        animDeny(pos);
        return false;
    }
    saveUndoSnapshot(`Medkit ${p.name} (#${pos})`);
    const wasUrgent = p.infested || p.health < 30;
    if (wasUrgent) {
        changeRes("coins", 5);
        changeRes("hope", 2);
        p.infested = false;
        p.health = Math.min(100, Math.max(55, p.health + 30));
        pushAction(`🩺 unit[${pos}].apply_medkit() -> HP ${Math.round(p.health)}% (+5c, +2 Morale)`);
    } else {
        changeRes("coins", 1);
        p.health = Math.min(100, p.health + 10);
        pushAction(`🩺 Field triage check on ${p.name} -> HP ${Math.round(p.health)}% (+1c)`);
    }
    p.pestTimer = PEST_INTERVAL;
    p.lastAction = "apply_medkit()";
    animPest(pos, wasUrgent);
    return true;
}

function doRemove(pos) {
    const p = gardenPlants[pos];
    if (!p) {
        pushAction("⚠️ Sector is already empty!");
        animDeny(pos);
        return false;
    }
    saveUndoSnapshot(`Deploy/Discharge ${p.name} (#${pos})`);
    if (p.stage >= 2) {
        const payout = p.reward || getUnitReward(p.name);
        changeRes("coins", payout);
        changeRes("seeds", 2);
        changeRes("hope", 5);
        pushAction(`🏅 Deployed Elite Veteran ${p.name} to Frontline (+${payout}c, +2 Dog Tags, +5 Morale)`);
    } else {
        const COST = RES.coins >= 5 ? 5 : 0;
        changeRes("coins", -COST);
        pushAction(`🚁 Reassigned trainee ${p.name} from Sector #${pos}${COST ? ` (-${COST}c)` : ""}`);
    }
    removePlantState(pos, true);
    return true;
}

function performAction(pos, cropName, tool) {
    const p = gardenPlants[pos];
    if (p && p.removing) return false;
    if (tool === "plant") return doPlant(pos, cropName);
    if (tool === "water") return doWater(pos);
    if (tool === "trim") return doTrim(pos);
    if (tool === "pest") return doPest(pos);
    if (tool === "remove") return doRemove(pos);
    return false;
}

function notifyPython(pos, crop, tool, ok) {
    if (!pyodideInstance) return;
    try {
        const hook = pyodideInstance.globals.get("py_on_tile_event");
        if (hook) {
            hook(pos, crop, tool, ok);
            if (typeof hook.destroy === "function") hook.destroy();
        }
    } catch (e) {
        console.warn("Python tile hook error:", e);
    }
}

function onGridCellClick(index) {
    const crop = document.getElementById("crop-selector").value || "Rifleman";
    const tool = activeTool;
    const existing = gardenPlants[index];
    if (existing && !existing.removing) selectPlant(index);
    const ok = performAction(index, crop, tool);
    if (ok) {
        evaluatePlant(index);
        updateCell(index);
        renderDashboard();
        renderAssistant();
        renderResources();
    }
    notifyPython(index, crop, tool, ok);
}

/* =====================================================
   PYTHON <-> JS BRIDGE FUNCTIONS
   ===================================================== */
function addPlantToGrid(pos, name, emoji) {
    pos = Number(pos);
    if (isNaN(pos) || pos < 0 || pos >= GRID_SIZE) return;
    name = name ? String(name) : "";
    emoji = emoji ? String(emoji) : "";
    if (!name) {
        removePlantState(pos, !!gardenPlants[pos]);
    } else {
        if (gardenPlants[pos]) removePlantState(pos, false);
        spawnPlant(pos, name, emoji);
    }
}

function plantAt(pos, name) {
    pos = Number(pos);
    name = String(name);
    if (isNaN(pos) || pos < 0 || pos >= GRID_SIZE || gardenPlants[pos]) return false;
    spawnPlant(pos, name, "");
    pushAction(`🐍 Python deployed ${name} at Sector #${pos}`);
    return true;
}

function findPlantPos(name) {
    name = String(name);
    for (let i = 0; i < GRID_SIZE; i++) {
        const p = gardenPlants[i];
        if (p && !p.removing && p.name === name) return i;
    }
    return -1;
}

function getGridSnapshot() {
    const out = [];
    for (let i = 0; i < GRID_SIZE; i++) {
        const p = gardenPlants[i];
        out.push(p && !p.removing ? p.name : "");
    }
    return out;
}

function getGardenState() {
    const out = [];
    for (let pos = 0; pos < GRID_SIZE; pos++) {
        const p = gardenPlants[pos];
        const plant = p && !p.removing ? p : null;
        const careNeeds = [];
        if (plant) {
            if (plant.water < WATER_NEED) careNeeds.push("water");
            if (plant.infested) careNeeds.push("pest");
            if (plant.needsTrim) careNeeds.push("trim");
            if (plant.health < 30) careNeeds.push("recover");
        }
        const row = Math.floor(pos / 5), col = pos % 5;
        const neighbors = [];
        if (row > 0) neighbors.push(pos - 5);
        if (col < 4) neighbors.push(pos + 1);
        if (row < 4) neighbors.push(pos + 5);
        if (col > 0) neighbors.push(pos - 1);
        out.push({
            pos,
            plant: plant ? plant.name : "",
            unit: plant ? plant.name : "",
            subclass: plant ? plant.subclass : "",
            health: plant ? Math.round(plant.health) : null,
            water: plant ? Math.round(plant.water) : null,
            status: plant ? computeStatus(plant) : "Empty",
            needs_care: careNeeds.length > 0,
            care_needs: careNeeds,
            neighbors
        });
    }
    return out;
}

function updatePlantStatus(pos, status) {
    pos = Number(pos);
    status = String(status);
    const p = gardenPlants[pos];
    if (!p || p.removing) return false;
    if (status === "Low Stamina" || status === "Needs Water") p.water = Math.min(p.water, 25);
    else if (status === "Injured" || status === "Infested") {
        p.infested = true;
        animPestAppear(pos);
    } else if (status === "Needs Drill" || status === "Needs Trimming") p.needsTrim = true;
    else if (status === "Critical" || status === "Wilting") p.health = 20;
    else if (status === "Combat Ready" || status === "Healthy") {
        p.health = Math.max(p.health, 90);
        p.water = Math.max(p.water, 80);
        p.infested = false;
        p.needsTrim = false;
    }
    p.lastAction = "🐍 update_status()";
    evaluatePlant(pos);
    updateCell(pos);
    renderDashboard();
    renderAssistant();
    renderMiniGridStatus();
    pushAction(`🐍 Python set Sector #${pos} (${p.name}) → ${p.status}`);
    return true;
}

function updatePlantHealth(pos, health) {
    pos = Number(pos);
    const p = gardenPlants[pos];
    if (!p || p.removing) return false;
    health = Number(health);
    if (isNaN(health)) return false;
    p.health = clamp(health, 0, 100);
    p.lastAction = "🐍 set_health()";
    evaluatePlant(pos);
    updateCell(pos);
    renderDashboard();
    renderAssistant();
    renderMiniGridStatus();
    return true;
}

function updatePlantTimer(pos, seconds) {
    pos = Number(pos);
    const p = gardenPlants[pos];
    if (!p || p.removing) return false;
    seconds = Number(seconds);
    if (isNaN(seconds)) return false;
    p.water = clamp(WATER_NEED + Math.max(0, seconds) * WATER_DRAIN, 0, 100);
    evaluatePlant(pos);
    updateCell(pos);
    renderDashboard();
    renderAssistant();
    return true;
}

function showPlantInfo(name, health, water, status) {
    name = String(name);
    health = Number(health);
    water = Number(water);
    status = status === undefined ? "" : String(status);
    let pos = findPlantPos(name);
    if (pos < 0) {
        for (let i = 0; i < GRID_SIZE; i++) {
            if (!gardenPlants[i]) {
                pos = i;
                break;
            }
        }
        if (pos < 0) return -1;
        spawnPlant(pos, name, "");
    }
    const p = gardenPlants[pos];
    if (!isNaN(health)) p.health = clamp(health, 0, 100);
    if (!isNaN(water)) p.water = clamp(water, 0, 100);
    if (status === "Injured" || status === "Infested") p.infested = true;
    else if (status === "Needs Drill" || status === "Needs Trimming") p.needsTrim = true;
    else if (status === "Combat Ready" || status === "Healthy") {
        p.infested = false;
        p.needsTrim = false;
    }
    p.lastAction = "🐍 Synced from Python OOP";
    evaluatePlant(pos);
    selectedPos = pos;
    dashboardNote = { text: `🐍 Synced from Python Soldier("${name}")`, until: Date.now() + 20000 };
    for (let i = 0; i < GRID_SIZE; i++) updateCell(i);
    renderDashboard();
    renderAssistant();
    renderMiniGridStatus();
    playAnim(tiles[pos].root, "a-glow-gold", 1000);
    return pos;
}

function addPlantsToDropdown(plants) {
    plants = toJS(plants);
    const select = document.getElementById("crop-selector");
    if (!select) return;
    const previous = select.value;
    select.innerHTML = "";
    if (!plants) return;
    plants.forEach(([name, emoji, cost]) => {
        if (!CROPS[name]) {
            CROPS[name] = {
                emoji,
                cost: Number(cost),
                reward: Number(cost) * 2 + 10,
                growMult: 1,
                subclass: "CombatUnit",
                role: "Combat Specialist",
                perk: "Custom Python Soldier Subclass"
            };
        } else {
            CROPS[name].emoji = emoji;
            CROPS[name].cost = Number(cost);
            CROPS[name].reward = Number(cost) * 2 + 10;
        }
        const reward = CROPS[name].reward;
        const option = document.createElement("option");
        option.value = name;
        option.textContent = `${emoji} ${name} (Cost: ${cost}c → Vet: +${reward}c)`;
        select.appendChild(option);
    });
    if (previous && Array.from(select.options).some(o => o.value === previous)) {
        select.value = previous;
    }

    // Populate the BST Soldier Search dropdown (Topic 12)
    const bstSelect = document.getElementById("bst-soldier-input");
    if (bstSelect) {
        const prevBst = bstSelect.value;
        bstSelect.innerHTML = "";
        plants.forEach(([name, emoji]) => {
            const opt = document.createElement("option");
            opt.value = name;
            opt.textContent = `${emoji} ${name}`;
            bstSelect.appendChild(opt);
        });
        if (prevBst && Array.from(bstSelect.options).some(o => o.value === prevBst)) {
            bstSelect.value = prevBst;
        }
    }
}

/* =====================================================
   STACK, QUEUE & MINI GRID STATUS UI
   ===================================================== */
function pushAction(action) {
    displayActionHistory.push(String(action));
    if (displayActionHistory.length > 10) displayActionHistory.shift();
    renderActionStack();
    renderMiniGridStatus();
}

function renderActionStack() {
    const container = document.getElementById("action-stack");
    if (!container) return;
    container.innerHTML = "";
    [...displayActionHistory].reverse().forEach((act, idx) => {
        const div = document.createElement("div");
        div.className = "bg-slate-950 border-l-2 px-2.5 py-1.5 rounded text-[11px] code-font " +
            (idx === 0 ? "border-amber-400 text-amber-200 font-semibold" : "border-slate-700 text-slate-300");
        div.textContent = `${idx === 0 ? "TOP ▲ " : "      "}${act}`;
        container.appendChild(div);
    });
}

function renderMiniGridStatus() {
    const strip = document.getElementById("mini-grid-strip");
    if (!strip) return;
    const activeEntries = Object.keys(gardenPlants)
        .map(k => ({ pos: Number(k), p: gardenPlants[k] }))
        .filter(e => !e.p.removing);
    const lastLog = displayActionHistory.length
        ? displayActionHistory[displayActionHistory.length - 1]
        : "Ready for Python execution";

    if (!activeEntries.length) {
        strip.innerHTML = `<span class="text-slate-400">No active units on 5×5 grid. Run Topic 1 or Topic 4 to instantiate units from Python!</span>`;
        return;
    }

    const pills = activeEntries.map(({ pos, p }) => {
        return `<span onclick="selectPlant(${pos}); switchTab('game');" class="mini-sector-pill" title="Click to inspect Sector #${pos} on Barracks Grid">${emojiFor(p)} #${pos} ${p.name} (${Math.round(p.health)}% HP)</span>`;
    }).join(" ");

    strip.innerHTML = `
        <div class="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <span class="text-[11px] font-bold text-amber-300">📡 Live 5×5 Barracks Sync (${activeEntries.length}/25 Sectors Active • 💰 ${Math.round(RES.coins)}c):</span>
            <span class="text-[10.5px] code-font text-emerald-300 truncate max-w-md">${lastLog}</span>
        </div>
        <div class="flex flex-wrap gap-1.5">${pills}</div>
    `;
}

function updateClimateQueue(events) {
    events = toJS(events);
    climateQueue = (events ? Array.from(events) : []).map(String);
    renderClimate();
}

function processClimateEvent(ev) {
    const e = String(ev).toLowerCase();
    const units = Object.values(gardenPlants).filter(p => !p.removing);
    if (e.includes("inspection") || e.includes("bonus")) {
        changeRes("coins", 15);
        changeRes("hope", 4);
        weatherFx("sun");
    } else if (e.includes("supply") || e.includes("drop")) {
        changeRes("water", 35);
        changeRes("energy", 20);
        units.forEach(p => { p.water = Math.min(100, p.water + 25); });
        weatherFx("rain");
    } else if (e.includes("ambush") || e.includes("night")) {
        changeRes("hope", -4);
        units.forEach(p => {
            p.water = Math.max(0, p.water - 8);
            p.progress = Math.min(100, p.progress + 10);
        });
        weatherFx("wind");
    }
    pushAction(`📡 MissionQueue.popleft(): ${ev}`);
}

function renderClimate() {
    const container = document.getElementById("climate-queue");
    if (!container) return;
    container.innerHTML = "";
    const cd = document.getElementById("climate-countdown");
    if (cd) cd.textContent = `dispatch in ${Math.ceil(climateCountdown)}s`;
    climateQueue.forEach((event, idx) => {
        const div = document.createElement("div");
        div.className = "p-2.5 bg-slate-950 border rounded-xl text-xs " +
            (idx === 0 ? "border-amber-500/70" : "border-slate-800 opacity-75");
        const label = idx === 0
            ? `<div class="text-[9px] font-bold text-amber-400 mb-0.5 code-font">▶ FRONT [0] — Next Dispatch</div>`
            : "";
        div.innerHTML = label + `<div class="font-bold text-slate-100"></div>`;
        div.lastChild.textContent = event;
        container.appendChild(div);
    });
}

/* =====================================================
   SOLDIER INSPECTOR DASHBOARD & DRILL SERGEANT ALERTS
   ===================================================== */
function bar(pct, color) {
    return `<div class="dbar"><i style="width:${clamp(pct, 0, 100)}%;background:${color}"></i></div>`;
}

function renderDashboard() {
    const el = document.getElementById("plant-dashboard");
    if (!el) return;
    const p = selectedPos !== null ? gardenPlants[selectedPos] : null;
    if (!p) {
        el.innerHTML = `<p class="text-xs text-slate-400 leading-relaxed">Click any occupied Sector on the 5×5 grid to inspect its live Python <code class="text-amber-300">Soldier</code> instance attributes (<code class="text-sky-300">self.__dict__</code>).</p>`;
        return;
    }
    const meta = STATUS_META[p.status] || { icon: "🎖️" };
    const n = p.next;
    let nextText = n.type === "recover"
        ? `🩺 <b class="text-rose-400">EMERGENCY MEDKIT NOW</b>`
        : (n.now
            ? `${CARE_META[n.type].icon} <b class="text-rose-400">${CARE_META[n.type].short} NOW</b>`
            : `${CARE_META[n.type].icon} ${CARE_META[n.type].short} in <b>${shortTime(n.secs)}</b>`);
    const note = (dashboardNote && Date.now() < dashboardNote.until)
        ? `<div class="mt-2 text-[10px] text-amber-300 bg-amber-950/50 border border-amber-700 rounded-lg px-2 py-1">${dashboardNote.text}</div>`
        : "";

    const deployBtn = p.stage >= 2
        ? `<button onclick="doRemove(${selectedPos}); renderResources();" class="mt-2 w-full py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow">🏅 Deploy Elite Veteran (+${p.reward}c, +2 Tags)</button>`
        : `<div class="text-[10.5px] text-amber-300/90 bg-amber-950/30 border border-amber-500/20 rounded-lg px-2 py-1 mt-1">🏅 Veteran Payout at 100% Rank: <b>+${p.reward}c</b> (Cost: ${p.cost}c)</div>`;

    el.innerHTML =
        `<div class="flex items-center justify-between mb-2">
            <div>
                <div class="text-sm font-extrabold text-white">${emojiFor(p)} ${p.name} <span class="text-[10px] text-amber-400 code-font">#${selectedPos}</span></div>
                <div class="text-[10px] code-font text-emerald-400">class ${p.subclass}(Soldier)</div>
                <div class="text-[10px] text-slate-400">${p.role}</div>
            </div>
            <span class="status-chip" data-status="${p.status}">${meta.icon} ${p.status}</span>
        </div>
        <div class="space-y-2 text-xs">
            <div><div class="flex justify-between"><span>❤️ self.health (HP)</span><b class="code-font">${Math.round(p.health)}%</b></div>${bar(p.health, "linear-gradient(90deg,#ef4444,#10b981)")}</div>
            <div><div class="flex justify-between"><span>🍖 self.stamina</span><b class="code-font">${Math.round(p.water)}%</b></div>${bar(p.water, "linear-gradient(90deg,#0284c7,#38bdf8)")}</div>
            <div><div class="flex justify-between"><span>🎖️ self.rank (${STAGE_NAMES[p.stage]})</span><b class="code-font">${p.stage >= 2 ? "100" : Math.round(p.progress)}%</b></div>${bar(p.stage >= 2 ? 100 : p.progress, "linear-gradient(90deg,#10b981,#f59e0b)")}</div>
            <div class="text-[10.5px] text-sky-300 bg-slate-950/90 border border-slate-800 rounded-lg px-2 py-1">⚡ <b>OOP Subclass Perk:</b> ${p.perk}</div>
            <div class="pt-1 border-t border-slate-800 flex justify-between"><span>⏱️ Next Order:</span><span>${nextText}</span></div>
            <div class="text-[11px] text-slate-400 code-font">Last method: ${p.lastAction}</div>
            ${deployBtn}
        </div>` + note;
}

function renderAssistant() {
    const el = document.getElementById("care-assistant");
    if (!el) return;
    const entries = Object.keys(gardenPlants)
        .map(k => ({ pos: Number(k), p: gardenPlants[k] }))
        .filter(e => !e.p.removing);
    if (!entries.length) {
        el.innerHTML = `<p class="text-slate-400">🪖 All Barracks Sectors are empty. Select <b>🪖 Deploy Unit</b> and click any tile on the 5×5 grid.</p>`;
        return;
    }
    const needy = entries
        .filter(e => e.p.next.now || e.p.next.type === "recover")
        .sort((a, b) => a.p.health - b.p.health);
    let html = "";
    needy.slice(0, 3).forEach(e => {
        const p = e.p;
        const c = CARE_META[p.next.type];
        const btn = c.tool
            ? `<button onclick="focusRecommendation(${e.pos}, '${c.tool}')" class="mt-1 px-2.5 py-0.5 rounded border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 text-[10px] font-bold">Select ${c.short} Tool →</button>`
            : "";
        html += `<div class="bg-slate-950 border-l-2 rounded-lg px-2.5 py-2" style="border-color:${c.color}">
            <div class="text-white font-semibold">${emojiFor(p)} Sector #${e.pos} (${p.name}): ${p.status}</div>
            <div class="text-[11px] text-slate-300">Order: <b style="color:${c.color}">${c.icon} ${c.label}</b></div>${btn}
        </div>`;
    });
    if (!needy.length) {
        entries.slice(0, 2).forEach(e => {
            const vetNote = e.p.stage >= 2
                ? `🏅 Ready for Frontline Deployment (+${e.p.reward}c)`
                : "All combat readiness metrics nominal.";
            html += `<div class="bg-slate-950 border-l-2 border-emerald-500 rounded-lg px-2.5 py-2">
                <div class="text-white font-semibold">${emojiFor(e.p)} Sector #${e.pos} (${e.p.name}) Ready</div>
                <div class="text-[11px] text-slate-400">${vetNote}</div>
            </div>`;
        });
    }
    el.innerHTML = html;
}

function focusRecommendation(pos, tool) {
    setTool(tool);
    selectPlant(pos);
    if (tiles[pos]) playAnim(tiles[pos].root, "a-glow-gold", 1000);
}

function renderScore() {
    const units = Object.values(gardenPlants).filter(p => !p.removing);
    let score = 0;
    if (units.length) {
        const avg = units.reduce((s, p) => s + p.health, 0) / units.length;
        score = avg * 0.7 + clamp(RES.hope, 0, 100) * 0.3;
    }
    document.getElementById("stewardship-counter").textContent = `${Math.round(score)}%`;
    document.getElementById("day-counter").textContent = day;
}

function gameTick() {
    const now = Date.now();
    let dt = clamp((now - lastTick) / 1000, 0, 5);
    lastTick = now;
    if (dt <= 0) return;

    let healthyCount = 0, criticalCount = 0;
    Object.keys(gardenPlants).forEach(k => {
        const pos = Number(k);
        const p = gardenPlants[pos];
        if (!p || p.removing) return;
        const grew = tickPlant(pos, p, dt);

        // 0 HP Auto-Medevac so Critical HP has real tactical consequence
        if (p.health <= 0) {
            changeRes("hope", -8);
            pushAction(`🚨 Emergency Medevac: ${p.name} (#${pos}) evacuated at 0% HP (-8 Morale)`);
            removePlantState(pos, true);
            return;
        }

        evaluatePlant(pos);
        updateCell(pos);
        if (grew) {
            animGrow(pos);
            pushAction(`🎖️ Sector #${pos} (${p.name}) promoted to ${STAGE_NAMES[p.stage]}!`);
        }
        if (p.status === "Critical") criticalCount++;
        else if (p.health >= 75) healthyCount++;
    });

    climateCountdown -= dt;
    if (climateCountdown <= 0) {
        triggerQueueDequeue();
    }

    dayTimer += dt;
    if (dayTimer >= DAY_LENGTH) {
        dayTimer -= DAY_LENGTH;
        day++;
        pushAction(`🌅 Campaign Day ${day} commenced`);
    }

    changeRes("energy", 0.35 * dt);
    changeRes("water", 0.2 * dt);
    changeRes("hope", (healthyCount - criticalCount * 2) * 0.02 * dt);

    const count = Object.values(gardenPlants).filter(p => !p.removing).length;
    if (count === 0 && RES.coins < 5 && !donationGiven) {
        donationGiven = true;
        changeRes("coins", 20);
        pushAction("📦 HQ Emergency War Chest: +20c added");
    }
    if (count > 0) donationGiven = false;

    renderDashboard();
    renderAssistant();
    renderClimate();
    renderResources();
    renderScore();
}

/* =====================================================
   TREE & SOLDIER BST VISUALIZER (SVG)
   ===================================================== */
const TREES = {
    general: {
        label: "(Military Rank & Specialization Hierarchy — N-ary Tree)",
        vb: [440, 260], w: 132, h: 30,
        nodes: {
            "Basic Recruit": { x: 220, y: 28, emoji: "🥾" },
            "Infantry Rifleman": { x: 135, y: 95, emoji: "🎖️" },
            "Recon Scout": { x: 335, y: 95, emoji: "🔭" },
            "Squad Leader": { x: 75, y: 165, emoji: "🛡️" },
            "Heavy Gunner": { x: 205, y: 165, emoji: "💣" },
            "Special Forces": { x: 75, y: 232, emoji: "⚡" }
        },
        edges: [
            ["Basic Recruit", "Infantry Rifleman"],
            ["Basic Recruit", "Recon Scout"],
            ["Infantry Rifleman", "Squad Leader"],
            ["Infantry Rifleman", "Heavy Gunner"],
            ["Squad Leader", "Special Forces"]
        ]
    },
    binary: {
        label: "(Binary Search Tree — Alphabetical Soldier Class Index)",
        vb: [440, 200], w: 102, h: 30,
        nodes: {
            "Heavy Gunner": { x: 220, y: 28, emoji: "🛡️" },
            "Combat Medic": { x: 105, y: 95, emoji: "🩺" },
            "Rifleman": { x: 332, y: 95, emoji: "🎖️" },
            "Cyber Operator": { x: 52, y: 165, emoji: "💻" },
            "Drone Pilot": { x: 162, y: 165, emoji: "🛸" },
            "Paratrooper": { x: 275, y: 165, emoji: "🪂" },
            "Sniper": { x: 388, y: 165, emoji: "🎯" }
        },
        edges: [
            ["Heavy Gunner", "Combat Medic"],
            ["Heavy Gunner", "Rifleman"],
            ["Combat Medic", "Cyber Operator"],
            ["Combat Medic", "Drone Pilot"],
            ["Rifleman", "Paratrooper"],
            ["Rifleman", "Sniper"]
        ]
    }
};
let currentTree = "general";
let travToken = 0;

function drawTree(key) {
    const T = TREES[key];
    if (!T) return;
    currentTree = key;
    const svg = document.getElementById("tree-svg");
    if (!svg) return;
    svg.setAttribute("viewBox", `0 0 ${T.vb[0]} ${T.vb[1]}`);
    let out = "";
    T.edges.forEach(([a, b]) => {
        const A = T.nodes[a], B = T.nodes[b];
        out += `<line class="tedge" x1="${A.x}" y1="${A.y + T.h / 2}" x2="${B.x}" y2="${B.y - T.h / 2}"></line>`;
    });
    Object.keys(T.nodes).forEach(name => {
        const n = T.nodes[name];
        out += `<g class="tnode" data-name="${name}">
            <rect x="${n.x - T.w / 2}" y="${n.y - T.h / 2}" width="${T.w}" height="${T.h}" rx="8"></rect>
            <text class="tlabel" x="${n.x}" y="${n.y}">${n.emoji} ${name}</text>
            <g class="tbadge"><circle cx="${n.x + T.w / 2 - 4}" cy="${n.y - T.h / 2 + 2}" r="9"></circle><text x="${n.x + T.w / 2 - 4}" y="${n.y - T.h / 2 + 2}"></text></g>
        </g>`;
    });
    svg.innerHTML = out;
    const kindEl = document.getElementById("tree-kind");
    if (kindEl) kindEl.textContent = T.label;
}

function nodeEl(name) {
    return Array.from(document.querySelectorAll("#tree-svg .tnode")).find(
        g => g.getAttribute("data-name") === name
    );
}

function clearVisual() {
    document.querySelectorAll("#tree-svg .tnode").forEach(g => {
        g.classList.remove("visited", "current");
        const t = g.querySelector(".tbadge text");
        if (t) t.textContent = "";
    });
    const orderEl = document.getElementById("trav-order");
    if (orderEl) orderEl.textContent = "";
}

function clearTraversal() {
    travToken++;
    clearVisual();
    const titleEl = document.getElementById("trav-title");
    if (titleEl) {
        titleEl.textContent = "Execute a Tree/BST topic or click 'Search Soldier' to animate nodes.";
    }
}

function pickTree(order) {
    for (const key of Object.keys(TREES)) {
        if (order.length && order.every(n => TREES[key].nodes[n])) return key;
    }
    return null;
}

function highlightTraversal(order, label) {
    order = toJS(order);
    label = toJS(label);
    order = order ? Array.from(order).map(String) : [];
    label = label ? String(label) : "Traversal";
    const key = pickTree(order);
    const token = ++travToken;
    if (key && key !== currentTree) drawTree(key);
    clearVisual();
    runTraversal(order, label, token);
}

async function runTraversal(order, label, token) {
    const title = document.getElementById("trav-title");
    const orderEl = document.getElementById("trav-order");
    if (!title || !orderEl) return;
    title.textContent = `▶ ${label}`;
    let shown = [];
    let prev = null;
    for (let i = 0; i < order.length; i++) {
        if (token !== travToken) return;
        if (prev) prev.classList.remove("current");
        const g = nodeEl(order[i]);
        if (g) {
            g.classList.add("visited", "current");
            const t = g.querySelector(".tbadge text");
            if (t) t.textContent = String(i + 1);
            prev = g;
        }
        shown.push(`${i + 1}. ${order[i]}`);
        orderEl.textContent = shown.join("  →  ");
        await sleep(450);
    }
    if (token !== travToken) return;
    if (prev) prev.classList.remove("current");
    title.textContent = `✅ ${label} (${order.length} nodes visited)`;
}

/* =====================================================
   ALL 19 PYTHON OOP & DSA TOPICS (ENRICHED WITH OOP PILLARS & STEP TRACES)
   ===================================================== */
const topicTemplates = {
    1: {
        title: "Topic 1: Python OOP — Soldier Class Blueprint & Inheritance",
        pillar: "OOP Pillar: Encapsulation & Inheritance",
        classes: ["class Soldier", "class ReconSniper(Soldier)", "__init__(self)", "issue_rations(self)"],
        tree: null,
        concept: "Encapsulation & Inheritance: A base Python class (`Soldier`) bundles troop attributes (`self.name`, `self.health`, `self.stamina`, `self.status`) with tactical methods (`issue_rations()`, `update_status()`). Subclasses like `ReconSniper(Soldier)` inherit base behavior and extend it with specialized combat perks.",
        game: "Every unit on the 5×5 Barracks Grid is an instance of `Soldier` (or one of its 15 subclasses). Running this code instantiates `Soldier` and `ReconSniper` objects in Python and syncs them directly onto your live Barracks Grid.",
        arch: "• <b>class Soldier</b>: Base blueprint encapsulating state (`health`, `stamina`, `status`).<br>• <b>__init__(self, name, health, stamina)</b>: Constructor initializing instance attributes.<br>• <b>class ReconSniper(Soldier)</b>: Inherits from `Soldier` via `super().__init__()` and overrides `issue_rations()` (Polymorphism).<br>• <b>showPlantInfo(...)</b>: Bridge call that syncs Python objects to the live 5×5 DOM grid.",
        steps: [
            "Define the base class `Soldier` with `__init__`, `issue_rations`, and `update_status`.",
            "Define subclass `ReconSniper(Soldier)` using `super().__init__()` to inherit base attributes.",
            "Instantiate `rifleman = Soldier('Rifleman')` and `sniper = ReconSniper('Sniper')`.",
            "Call `showPlantInfo(...)` to project both Python object instances onto the 5×5 Barracks Grid."
        ],
        complexity: "O(1) time & space per Soldier instance creation and attribute mutation.",
        code: `# Topic 1: Python OOP — Soldier Class Blueprint & Subclass Inheritance
from js import showPlantInfo, pushAction

class Soldier:
    """Base OOP Blueprint for every trainee deployed in Training to War."""

    def __init__(self, name: str, health: int = 100, stamina: int = 100):
        self.name = name
        self.health = health
        self.stamina = stamina
        self.status = "Combat Ready"
        self.update_status()

    def issue_rations(self):
        self.stamina = min(100, self.stamina + 40)
        self.update_status()
        print(f"🍖 {self.name}.issue_rations() -> stamina={self.stamina}%")

    def update_status(self):
        if self.health < 30:
            self.status = "Critical"
        elif self.stamina < 35:
            self.status = "Low Stamina"
        else:
            self.status = "Combat Ready"

    def report_status(self):
        print(f"[{self.name}] HP={self.health}% | STA={self.stamina}% | Status={self.status}")

class ReconSniper(Soldier):
    """Subclass inheriting from Soldier and adding marksmanship specialization."""

    def __init__(self, name="Sniper", health=90, stamina=28):
        super().__init__(name, health, stamina)
        self.optic_range = "1200m"

# Instantiate base & subclass Soldier objects
rifleman = Soldier("Rifleman", health=98, stamina=92)
sniper = ReconSniper("Sniper", health=88, stamina=24)

print("=== Instantiated Platoon OOP Objects ===")
rifleman.report_status()
sniper.report_status()

# Sync both Python OOP instances directly to the 5x5 Barracks Grid
for unit in [rifleman, sniper]:
    sec_id = showPlantInfo(unit.name, unit.health, unit.stamina, unit.status)
    print(f"Synced {unit.name} -> Sector #{sec_id}")

pushAction("🐍 Topic 1: Soldier & ReconSniper OOP instances synced to grid")`
    },
    2: {
        title: "Topic 2: Soldier Status & Combat Readiness State Machine",
        pillar: "OOP Pillar: Polymorphism & State Encapsulation",
        classes: ["Soldier.STAMINA_LIMIT", "update_status(self)", "march_time(self)", "apply_medkit(self)"],
        tree: null,
        concept: "State Machines & Class Attributes: Shared constants like `STAMINA_LIMIT = 35` belong to the class namespace, while instance methods (`march_time`, `apply_medkit`, `issue_rations`) transition each individual soldier between readiness states.",
        game: "Simulates endurance marching and training injuries on a `Combat Medic` instance, then pushes the resulting state (`Injured`), HP, and timer onto the live 5×5 Barracks Grid.",
        arch: "• <b>Soldier.STAMINA_LIMIT = 35</b>: Class-level attribute shared across all 15 unit types.<br>• <b>update_status(self)</b>: Deterministic priority chain (`Critical` > `Injured` > `Low Stamina` > `Needs Drill` > `Combat Ready`).<br>• <b>march_time(self, seconds)</b>: Mutates `self.stamina` and applies fatigue damage if stamina drops below 20%.",
        steps: [
            "Instantiate `medic = Soldier('Combat Medic')` with full 100% HP and Stamina.",
            "Execute `medic.march_time(45)` to simulate stamina drain during a forced march.",
            "Evaluate `medic.update_status()` which detects `Low Stamina` (`stamina < 35`).",
            "Restore rations, trigger a simulated injury, and sync the updated status to the live grid."
        ],
        complexity: "O(1) state transition evaluation per game tick.",
        code: `# Topic 2: Soldier Readiness State Machine & Lifecycle Methods
from js import findPlantPos, showPlantInfo, updatePlantStatus, updatePlantHealth, updatePlantTimer, pushAction

class Soldier:
    STAMINA_LIMIT = 35  # Class attribute shared by all soldiers

    def __init__(self, name: str):
        self.name = name
        self.health = 100
        self.stamina = 100
        self.is_injured = False
        self.needs_drill = False

    def update_status(self) -> str:
        if self.health < 30:
            return "Critical"
        if self.is_injured:
            return "Injured"
        if self.stamina < Soldier.STAMINA_LIMIT:
            return "Low Stamina"
        if self.needs_drill:
            return "Needs Drill"
        return "Combat Ready"

    def march_time(self, seconds: int):
        self.stamina = max(0, self.stamina - seconds * 1.5)
        if self.stamina < 20:
            self.health = max(0, self.health - 12)

    def issue_rations(self):
        self.stamina = 100

    def apply_medkit(self):
        self.is_injured = False

medic = Soldier("Combat Medic")
medic.march_time(45)
print("After 45s forced march:", medic.update_status(), "| STA:", medic.stamina)

medic.issue_rations()
medic.is_injured = True
print("Shrapnel injury sustained:", medic.update_status())

pos = findPlantPos("Combat Medic")
if pos < 0:
    pos = showPlantInfo("Combat Medic", medic.health, medic.stamina, medic.update_status())
else:
    updatePlantStatus(pos, medic.update_status())
    updatePlantHealth(pos, medic.health)
    updatePlantTimer(pos, 25)

pushAction(f"🐍 Topic 2: Sector #{pos} Combat Medic -> {medic.update_status()}")`
    },
    3: {
        title: "Topic 3: Python OOP — BaseEconomy Logistics Manager",
        pillar: "OOP Pillar: Encapsulation & Manager Class Pattern",
        classes: ["class BaseEconomy", "grant_war_funds(self)", "resupply_base(self)", "sync(self)"],
        tree: null,
        concept: "Manager Class Encapsulation: `BaseEconomy` encapsulates command-wide logistics (`coins`, `rations`, `dog_tags`, `ammo`, `morale`) inside a single controller object and validates War Funds before authorizing base operations.",
        game: "Directly controls the **📦 Base Logistics (`BaseEconomy`)** panel on the left. Running this code grants `+20c` War Funds and resupplies `+25` MRE Rations and `+15` Munitions.",
        arch: "• <b>BaseEconomy.__init__(state_dict)</b>: Hydrates Python attributes from the live JS state.<br>• <b>grant_war_funds(amount, reason)</b>: Encapsulates treasury increments and logs to the LIFO Command Stack.<br>• <b>resupply_base(rations_add, ammo_add)</b>: Clamps logistics within maximum depot capacity.",
        steps: [
            "Read current resource state from the game via `getResources().to_py()`.",
            "Instantiate `hq_economy = BaseEconomy(current)`.",
            "Call `grant_war_funds(20, ...)` and `resupply_base(25, 15)`.",
            "Synchronize updated values back to the UI progress bars via `self.sync()`."
        ],
        complexity: "O(1) time & space for logistics validation and synchronization.",
        code: `# Topic 3: Python OOP — BaseEconomy Logistics Manager
from js import updateResources, getResources, pushAction

class BaseEconomy:
    """Encapsulates and validates all War Funds & Base Logistics transactions."""

    def __init__(self, state_dict):
        self.coins = int(state_dict["coins"])
        self.rations = int(state_dict["water"])
        self.dog_tags = int(state_dict["seeds"])
        self.ammo = int(state_dict["energy"])
        self.morale = int(state_dict["hope"])

    def grant_war_funds(self, amount: int, reason: str):
        self.coins += amount
        pushAction(f"💰 +{amount}c ({reason})")
        self.sync()

    def resupply_base(self, rations_add: int, ammo_add: int):
        self.rations = min(200, self.rations + rations_add)
        self.ammo = min(120, self.ammo + ammo_add)
        self.sync()

    def sync(self):
        updateResources({
            "coins": self.coins,
            "water": self.rations,
            "seeds": self.dog_tags,
            "energy": self.ammo,
            "hope": self.morale
        })

current = getResources().to_py()
hq_economy = BaseEconomy(current)
hq_economy.grant_war_funds(20, "Defense Appropriations Grant")
hq_economy.resupply_base(25, 15)
print(f"War Funds: {hq_economy.coins}c | Rations: {hq_economy.rations} | Ammo: {hq_economy.ammo}")`
    },
    4: {
        title: "Topic 4: 2D Barracks Matrix & Command Dispatcher",
        pillar: "OOP Pillar: Abstraction & 2D Array Mapping",
        classes: ["class BarracksDispatcher", "sync_from_game(self)", "render_ascii(self)", "py_on_tile_event()"],
        tree: null,
        concept: "2D Matrix Abstraction: Converts a flat 1D sector index `0..24` into 2D row/column coordinates using integer division (`row = pos // 5`) and modulo (`col = pos % 5`), encapsulated inside `BarracksDispatcher`.",
        game: "Registers all **15 Soldier Subclasses** into your deployment dropdown, deploys `Special Forces` at Sector #24 `[4,4]` if empty, and hooks `py_on_tile_event` so every grid click prints live coordinates to the Python console.",
        arch: "• <b>BarracksDispatcher.matrix</b>: `5×5` 2D list-of-lists (`[[None]*5 for _ in range(5)]`).<br>• <b>sync_from_game(self)</b>: Maps 1D index `pos` to `self.matrix[pos // 5][pos % 5]`.<br>• <b>py_on_tile_event(...)</b>: Event listener invoked automatically whenever you click a sector.",
        steps: [
            "Load the 15-unit roster (`ROSTER_15`) into the UI dropdown.",
            "Initialize `BarracksDispatcher` with a 5×5 2D matrix.",
            "Map each 1D tile index `0..24` into `matrix[r][c]` using `pos // 5` and `pos % 5`.",
            "Render a 5×5 tactical ASCII map and bind `py_on_tile_event` for live click logging."
        ],
        complexity: "O(R × C) = O(25) for full matrix sync; O(1) for 2D coordinate lookup.",
        code: `# Topic 4: 2D Barracks Matrix Controller & 15-Unit Roster
from js import addPlantsToDropdown, getGridSnapshot, plantAt, pushAction

# All 15 Selectable Soldier Classes
ROSTER_15 = [
    ["Rifleman", "🎖️", 5], ["Sniper", "🎯", 10], ["Combat Medic", "🩺", 8],
    ["Heavy Gunner", "🛡️", 12], ["Demolitionist", "💣", 14], ["Paratrooper", "🪂", 11],
    ["Tank Commander", "🚜", 20], ["Cyber Operator", "💻", 15], ["Drone Pilot", "🛸", 13],
    ["Scout Ranger", "🗡️", 9], ["Artillery Spotter", "🔭", 11], ["Flame Trooper", "🔥", 16],
    ["K9 Handler", "🐕", 10], ["Signal Corps", "📡", 7], ["Special Forces", "⚡", 25]
]
addPlantsToDropdown(ROSTER_15)
EMOJI_MAP = {name: emoji for name, emoji, _ in ROSTER_15}

class BarracksDispatcher:
    ROWS, COLS = 5, 5

    def __init__(self):
        self.matrix = [[None for _ in range(self.COLS)] for _ in range(self.ROWS)]

    def sync_from_game(self):
        snapshot = getGridSnapshot().to_py()
        for pos, name in enumerate(snapshot):
            r, c = pos // self.COLS, pos % self.COLS
            self.matrix[r][c] = name if name else None

    def render_ascii(self):
        for r in range(self.ROWS):
            row_str = " ".join(EMOJI_MAP.get(cell, "🎖️") if cell else "⬡" for cell in self.matrix[r])
            print(f"Row {r}: {row_str}")

dispatcher = BarracksDispatcher()
dispatcher.sync_from_game()

if dispatcher.matrix[4][4] is None:
    plantAt(24, "Special Forces")
    dispatcher.sync_from_game()

def py_on_tile_event(pos, unit_name, action_mode, ok):
    dispatcher.sync_from_game()
    r, c = pos // 5, pos % 5
    status = "EXECUTED" if ok else "DENIED"
    print(f"[HQ Dispatcher] Order={action_mode} at Sector #{pos} (r={r}, c={c}) -> {status}")

print("=== Live 5x5 Barracks Tactical Matrix ===")
dispatcher.render_ascii()`
    },
    5: {
        title: "Topic 5: Queue / FIFO — Mission Dispatch Queue",
        pillar: "OOP + DSA: Encapsulated FIFO Deque",
        classes: ["class MissionDispatchQueue", "collections.deque", "enqueue_order()", "dequeue_order()"],
        tree: null,
        concept: "First-In, First-Out (FIFO) Queue: Using Python's `collections.deque`, mission orders enter at the rear (`append`) and execute from the front (`popleft`) in strict arrival order.",
        game: "Powers the **📡 Mission Queue (FIFO)** panel on the right and the **📡 Dispatch Order (T5)** button in the Barracks Grid tab.",
        arch: "• <b>MissionDispatchQueue._queue</b>: Private `deque` instance storing upcoming HQ dispatches.<br>• <b>enqueue_order(order)</b>: Appends new mission to the tail in O(1).<br>• <b>dequeue_order()</b>: Removes and executes `FRONT [0]` in O(1) via `popleft()`.",
        steps: [
            "Instantiate `MissionDispatchQueue` backed by `collections.deque()`.",
            "Call `enqueue_order(...)` three times to schedule Air-Drop, Inspection, and Night Ambush.",
            "Inspect `FRONT [0]` using `peek()` without removing it.",
            "Sync the queue array to the right-hand Mission Queue UI panel."
        ],
        complexity: "O(1) time complexity for both `enqueue` (`append`) and `dequeue` (`popleft`).",
        code: `# Topic 5: FIFO Queue — Mission Dispatch System
from collections import deque
from js import updateClimateQueue, pushAction

class MissionDispatchQueue:
    """FIFO Queue managing incoming High Command operations."""

    def __init__(self):
        self._queue = deque()

    def enqueue_order(self, order_name: str):
        self._queue.append(order_name)     # Enqueue at BACK
        self.sync_ui()

    def dequeue_order(self):
        if self._queue:
            order = self._queue.popleft()  # Dequeue from FRONT
            self.sync_ui()
            return order
        return None

    def peek(self):
        return self._queue[0] if self._queue else None

    def sync_ui(self):
        updateClimateQueue(list(self._queue))

mission_q = MissionDispatchQueue()
mission_q.enqueue_order("📦 Supply Air-Drop (+35 Rations, +20 Ammo)")
mission_q.enqueue_order("🎖️ High Command Inspection (+15c Bonus, +4 Morale)")
mission_q.enqueue_order("🌧️ Night Ambush Simulation (-8 Stamina, +10% XP)")

print("Orders in Queue:", len(mission_q._queue))
print("FRONT [0] (next dispatch):", mission_q.peek())
pushAction("🐍 Topic 5: Mission FIFO Queue synchronized")`
    },
    6: {
        title: "Topic 6: Stack / LIFO — Command History & Undo",
        pillar: "OOP + DSA: Encapsulated LIFO Stack",
        classes: ["class CommandStack", "push(self, order)", "pop(self)", "peek(self)"],
        tree: null,
        concept: "Last-In, First-Out (LIFO) Stack: All insertions (`push`) and removals (`pop`) happen at the `TOP` of the stack. The most recently executed command is always the first to be undone.",
        game: "Powers the **🗂️ Command Stack (LIFO)** panel on the right and the **↩️ Undo Command (T6)** button, which pops the latest state snapshot to revert your last tactical action.",
        arch: "• <b>CommandStack._items</b>: Encapsulated Python list acting as a LIFO stack.<br>• <b>push(order)</b>: Appends command to the top (`_items.append`).<br>• <b>pop()</b>: Removes and returns the latest command (`_items.pop()`).",
        steps: [
            "Create a `CommandStack` object.",
            "Push 3 sequential tactical orders onto the stack (`Deploy`, `Ration`, `Drill`).",
            "Call `peek()` to verify the most recent order sits at `TOP ▲`.",
            "Pop all items in reverse chronological (LIFO) order."
        ],
        complexity: "O(1) amortized time for `push`, `pop`, and `peek`.",
        code: `# Topic 6: LIFO Stack — Command History & Tactical Undo
from js import pushAction

class CommandStack:
    """LIFO Stack for tracking and reversing recent player orders."""

    def __init__(self):
        self._items = []

    def push(self, order: str):
        self._items.append(order)
        pushAction(order)

    def pop(self):
        return self._items.pop() if self._items else None

    def peek(self):
        return self._items[-1] if self._items else None

    def size(self) -> int:
        return len(self._items)

cmd_stack = CommandStack()
cmd_stack.push("🪖 Deployed Rifleman at Sector #0")
cmd_stack.push("🍖 Issued MRE Rations at Sector #0")
cmd_stack.push("🎯 Completed Live-Fire Drill at Sector #0")

print("Top of Stack (peek):", cmd_stack.peek())
print("=== LIFO Undo Sequence ===")
while cmd_stack.size() > 0:
    print("pop() ->", cmd_stack.pop())`
    },
    7: {
        title: "Topic 7: Hierarchical Tree — Rank Promotion Chain (DFS)",
        pillar: "OOP + DSA: N-ary Tree & Recursive DFS",
        classes: ["class RankNode", "add_promotion(self, child)", "dfs_find_promotion()"],
        tree: "general",
        concept: "N-ary Tree & Recursive Depth-First Search: Each `RankNode` object holds a list of child `promotions`. Recursive DFS explores each branch down to the apex Tier-3 `Special Forces` node.",
        game: "Animates the promotion lineage from `Basic Recruit` down to `Special Forces` on the **🌳 Rank Hierarchy & Soldier BST Visualizer** SVG diagram below.",
        arch: "• <b>RankNode</b>: Stores `title`, `tier`, `emoji`, and `self.promotions` (child node references).<br>• <b>dfs_find_promotion(node, target, path)</b>: Explores child subtrees recursively, returning the exact promotion chain when `target` is found.",
        steps: [
            "Construct the 6-node military rank hierarchy rooted at `Basic Recruit`.",
            "Invoke `dfs_find_promotion(root, 'Special Forces')`.",
            "Recursively traverse `Basic Recruit -> Infantry Rifleman -> Squad Leader -> Special Forces`.",
            "Animate the discovered promotion chain on the SVG Tree Visualizer."
        ],
        complexity: "O(V + E) time complexity; O(H) recursion stack space where H is tree height.",
        code: `# Topic 7: N-ary Rank Promotion Tree & Recursive Path DFS
from js import pushAction, highlightTraversal

class RankNode:
    def __init__(self, title: str, tier: str, emoji: str):
        self.title = title
        self.tier = tier
        self.emoji = emoji
        self.promotions = []

    def add_promotion(self, child_node):
        self.promotions.append(child_node)
        return child_node

root = RankNode("Basic Recruit", "Tier 0", "🥾")
rifleman = root.add_promotion(RankNode("Infantry Rifleman", "Tier 1", "🎖️"))
scout = root.add_promotion(RankNode("Recon Scout", "Tier 1", "🔭"))
squad_lead = rifleman.add_promotion(RankNode("Squad Leader", "Tier 2", "🛡️"))
gunner = rifleman.add_promotion(RankNode("Heavy Gunner", "Tier 2", "💣"))
spec_ops = squad_lead.add_promotion(RankNode("Special Forces", "Tier 3", "⚡"))

def dfs_find_promotion(node: RankNode, target_title: str, path=None):
    if path is None:
        path = []
    current_path = path + [node]
    if node.title.lower() == target_title.lower():
        return current_path
    for child in node.promotions:
        found = dfs_find_promotion(child, target_title, current_path)
        if found:
            return found
    return None

chain = dfs_find_promotion(root, "Special Forces")
if chain:
    names = [n.title for n in chain]
    print("Promotion Chain:", " -> ".join(names))
    highlightTraversal(names, "DFS Promotion Lineage")
    pushAction("🐍 Topic 7: Traced promotion chain to Special Forces")`
    },
    8: {
        title: "Topic 8: BFS — Barracks Radar & Auto-Care Sweep",
        pillar: "DSA Graph Traversal: Breadth-First Search (FIFO)",
        classes: ["bfs(grid, start)", "collections.deque", "seen = {start}", "depth[neighbor]"],
        tree: null,
        concept: "Breadth-First Search (BFS) on a 2D Grid Graph: Uses a FIFO `deque` to scan outward in concentric Manhattan-distance layers (Layer 0, Layer 1, Layer 2...) from the HQ Start sector.",
        game: "Powers the **🌊 BFS Auto-Care (T8)** button! As the BFS radar wave visits each sector, it **automatically rations, drills, and heals** every trainee it scans!",
        arch: "• <b>queue = deque([start])</b>: Maintains the FIFO frontier of sectors to scan.<br>• <b>seen = {start}</b>: Prevents revisiting sectors in cycles.<br>• <b>autoCareTrainee(pos)</b>: Triggered on each visited sector to automatically treat troops.",
        steps: [
            "Initialize FIFO `deque` with the HQ Start sector (`#0` or user-selected start).",
            "Dequeue the front sector `node`, mark it visited, and check if its soldier needs care.",
            "Enqueue all unvisited orthogonal neighbors (`Up, Right, Down, Left`) with `depth + 1`.",
            "Animate each concentric wave on the 5×5 grid while auto-caring every trainee."
        ],
        complexity: "O(V + E) time and O(V) space where V = 25 sectors and E ≤ 80 grid edges.",
        code: `# Topic 8: Breadth-First Search (BFS) — Concentric Auto-Care Radar
from collections import deque

def bfs(grid, start):
    steps = []
    visited = []
    found = []
    seen = {start}
    depth = {start: 0}
    queue = deque([start])

    while queue:
        node = queue.popleft()
        tile = grid[node]
        visited.append(node)

        if tile["needs_care"]:
            found.append(node)

        added = []
        for neighbor in tile["neighbors"]:
            if neighbor not in seen:
                seen.add(neighbor)
                depth[neighbor] = depth[node] + 1
                queue.append(neighbor)
                added.append(neighbor)

        steps.append({
            "node": node,
            "depth": depth[node],
            "queue": list(queue),
            "visited": list(visited),
            "added": added,
            "plant": tile["plant"]
        })

    return {"steps": steps, "found": found}

print("BFS Auto-Care Radar loaded. Click '🌊 BFS Auto-Care (T8)' in the Barracks Grid tab!")`
    },
    9: {
        title: "Topic 9: DFS — Deep Patrol & Auto-Care Recon",
        pillar: "DSA Graph Traversal: Depth-First Search & Backtracking",
        classes: ["dfs(grid, start)", "visit(node, depth)", "path.append(node)", "path.pop()"],
        tree: null,
        concept: "Depth-First Search (DFS) & Backtracking: Plunges down one corridor of adjacent sectors as deeply as possible before unwinding the recursion stack (`backtrack`) to explore unvisited branches.",
        game: "Powers the **🕳️ DFS Auto-Care (T9)** button! Patrols deep corridors across the 5×5 grid and **automatically cares for every trainee** encountered along the patrol!",
        arch: "• <b>visit(node, depth)</b>: Recursive helper pushing `node` onto the active `path` call stack.<br>• <b>type: 'visit' vs 'backtrack'</b>: Records both forward exploration and recursion unwinding.<br>• <b>Auto-Care</b>: Restores stamina, drills, and heals trainees on every `'visit'` step.",
        steps: [
            "Start recursive `visit(start, 0)` and mark the sector as seen.",
            "Record a `'visit'` step and auto-care any soldier stationed in that sector.",
            "Recursively visit the first unvisited neighbor until hitting a dead end.",
            "Pop the sector from `path` and emit a `'backtrack'` step (highlighted in sky-blue)."
        ],
        complexity: "O(V + E) time complexity; O(V) maximum recursion stack depth.",
        code: `# Topic 9: Depth-First Search (DFS) — Deep Corridor Auto-Care Patrol
def dfs(grid, start):
    steps = []
    visited = []
    found = []
    seen = set()
    path = []

    def visit(node, depth):
        seen.add(node)
        visited.append(node)
        path.append(node)
        tile = grid[node]

        if tile["needs_care"] and node not in found:
            found.append(node)

        steps.append({
            "type": "visit",
            "node": node,
            "depth": depth,
            "stack": list(path),
            "visited": list(visited),
            "plant": tile["plant"]
        })

        for neighbor in tile["neighbors"]:
            if neighbor not in seen:
                visit(neighbor, depth + 1)

        path.pop()
        steps.append({
            "type": "backtrack",
            "node": node,
            "depth": depth,
            "stack": list(path),
            "visited": list(visited),
            "plant": tile["plant"]
        })

    visit(start, 0)
    return {"steps": steps, "found": found}

print("DFS Deep Auto-Care Patrol ready. Click '🕳️ DFS Auto-Care (T9)' in the Barracks Grid tab!")`
    },
    10: {
        title: "Topic 10: DFS — Inorder Roster Traversal (A–Z)",
        pillar: "OOP + DSA: Binary Search Tree & Inorder DFS",
        classes: ["class BinaryNode", "insert(node, name)", "dfs_inorder(node)"],
        tree: "binary",
        concept: "Inorder Binary Tree Traversal (`Left -> Root -> Right`): Visiting the left subtree, then the current node, then the right subtree of a Binary Search Tree yields soldier classes in strictly alphabetical (A–Z) order.",
        game: "Switches the SVG visualizer to the Binary Search Tree of soldier classes and highlights every node in exact alphabetical sequence (`Combat Medic → Cyber Operator → Drone Pilot → Heavy Gunner → Paratrooper → Rifleman → Sniper`).",
        arch: "• <b>BinaryNode</b>: OOP node storing `name`, `left`, and `right` pointers.<br>• <b>insert(node, name)</b>: Places smaller names left (`<`) and larger names right (`>`).<br>• <b>dfs_inorder(node)</b>: Recursively traverses `left`, appends `node.name`, then traverses `right`.",
        steps: [
            "Insert 7 soldier classes into the Binary Search Tree rooted at `'Heavy Gunner'`.",
            "Call `dfs_inorder(root)` to traverse `Left -> Root -> Right`.",
            "Verify the output list is sorted alphabetically from `'Combat Medic'` to `'Sniper'`.",
            "Animate the 7-step alphabetical traversal on the SVG Binary Tree."
        ],
        complexity: "O(N) traversal time and O(H) recursion stack space to visit all N nodes.",
        code: `# Topic 10: DFS Inorder Traversal (Left -> Root -> Right = A-Z Roster)
from js import highlightTraversal, pushAction

class BinaryNode:
    def __init__(self, name: str):
        self.name = name
        self.left = None
        self.right = None

def insert(node, name: str):
    if node is None:
        return BinaryNode(name)
    if name < node.name:
        node.left = insert(node.left, name)
    else:
        node.right = insert(node.right, name)
    return node

def dfs_inorder(node, order=None):
    if order is None:
        order = []
    if node is not None:
        dfs_inorder(node.left, order)
        order.append(node.name)
        dfs_inorder(node.right, order)
    return order

root = None
for unit_class in ["Heavy Gunner", "Combat Medic", "Rifleman", "Cyber Operator", "Drone Pilot", "Paratrooper", "Sniper"]:
    root = insert(root, unit_class)

order = dfs_inorder(root)
print("Inorder (A-Z Sorted Roster):", " -> ".join(order))
highlightTraversal(order, "DFS Inorder (Sorted A-Z Roster)")
pushAction("🐍 Topic 10: Inorder BST traversal verified A-Z roster")`
    },
    11: {
        title: "Topic 11: DFS — Postorder Command Readiness Rollup",
        pillar: "OOP + DSA: Postorder Bottom-Up Tree Aggregation",
        classes: ["class RankNode", "build_rank_tree()", "dfs_postorder(node)"],
        tree: "general",
        concept: "Postorder Tree Traversal (`Subordinates -> Commander`): Evaluates all child specialization branches completely before reporting readiness up to the parent commanding node.",
        game: "Animates the military rank hierarchy from the front-line specialist leaves (`Special Forces`, `Heavy Gunner`, `Recon Scout`) upward to the root (`Basic Recruit`).",
        arch: "• <b>dfs_postorder(node)</b>: Loops recursively over all `node.promotions` first, and appends `node.title` only after every subordinate branch has been processed.",
        steps: [
            "Build the N-ary military rank hierarchy.",
            "Recursively descend to the deepest leaf (`Special Forces`) first.",
            "Process sibling leaves (`Heavy Gunner`, `Recon Scout`) before their parent nodes.",
            "Complete the rollup at the root node (`Basic Recruit`) and animate on the SVG diagram."
        ],
        complexity: "O(N) time complexity across N hierarchy nodes.",
        code: `# Topic 11: DFS Postorder Traversal (Subordinates -> HQ Root)
from js import highlightTraversal, pushAction

class RankNode:
    def __init__(self, title, tier, emoji):
        self.title = title
        self.tier = tier
        self.emoji = emoji
        self.promotions = []

    def add_promotion(self, child_node):
        self.promotions.append(child_node)
        return child_node

def build_rank_tree():
    root = RankNode("Basic Recruit", "Tier 0", "🥾")
    rifleman = root.add_promotion(RankNode("Infantry Rifleman", "Tier 1", "🎖️"))
    root.add_promotion(RankNode("Recon Scout", "Tier 1", "🔭"))
    squad_lead = rifleman.add_promotion(RankNode("Squad Leader", "Tier 2", "🛡️"))
    rifleman.add_promotion(RankNode("Heavy Gunner", "Tier 2", "💣"))
    squad_lead.add_promotion(RankNode("Special Forces", "Tier 3", "⚡"))
    return root

def dfs_postorder(node, order=None):
    if order is None:
        order = []
    for child in node.promotions:
        dfs_postorder(child, order)
    order.append(node.title)
    return order

order = dfs_postorder(build_rank_tree())
print("Postorder (Bottom-Up Readiness):", " -> ".join(order))
highlightTraversal(order, "DFS Postorder (Units to HQ)")
pushAction("🐍 Topic 11: Postorder bottom-up readiness rollup complete")`
    },
    12: {
        title: "Topic 12: BST — Search Soldier by Class Name",
        pillar: "OOP + DSA: Binary Search Tree Lexicographical Lookup",
        classes: ["class SoldierBSTNode", "build_bst(soldiers)", "search_bst(tree, target_name)"],
        tree: null,
        concept: "Binary Search Tree (BST) Indexing: Organizes deployed soldiers alphabetically by class name (`node.value`). Names alphabetically smaller branch left (`<`); larger names branch right (`>`); identical unit classes bucket together.",
        game: "Powers the **🌳 BST Soldier (T12)** search bar in the Barracks Grid tab! Dynamically builds a BST from your currently deployed soldiers, draws the custom SVG tree, and highlights matching sectors with `🎯`.",
        arch: "• <b>SoldierBSTNode</b>: Encapsulates `value` (class name), `units` (list of matching sectors), `left`, and `right`.<br>• <b>build_bst(soldiers)</b>: Inserts live grid units into the BST.<br>• <b>search_bst(tree, target_name)</b>: Prunes half the tree at each comparison (`target < node_key`).",
        steps: [
            "Read all active soldiers currently deployed on the 5×5 Barracks Grid.",
            "Insert each soldier into `SoldierBSTNode` alphabetically by class name.",
            "Compare `target_name` at each node, branching left or right in O(log N) steps.",
            "Highlight the search path on the SVG tree and mark matching sectors on the 5×5 grid."
        ],
        complexity: "O(log N) average search time; O(N) worst-case if insertions are already sorted.",
        code: `# Topic 12: Binary Search Tree (BST) — Search Soldier by Class Name
class SoldierBSTNode:
    def __init__(self, name: str, unit: dict):
        self.value = str(name)
        self.units = [{"pos": int(unit["pos"]), "name": str(unit["name"]), "health": int(unit["health"])}]
        self.left = None
        self.right = None

def build_bst(soldiers):
    root = None

    def insert(node, unit):
        name = str(unit["name"])
        if node is None:
            return SoldierBSTNode(name, unit)
        if name.lower() < node.value.lower():
            node.left = insert(node.left, unit)
        elif name.lower() > node.value.lower():
            node.right = insert(node.right, unit)
        else:
            node.units.append({"pos": int(unit["pos"]), "name": name, "health": int(unit["health"])})
        return node

    for u in soldiers:
        root = insert(root, u)

    nodes = []
    def flatten(node):
        if node is None:
            return None
        idx = len(nodes)
        nodes.append({"value": node.value, "units": node.units, "left": None, "right": None})
        nodes[idx]["left"] = flatten(node.left)
        nodes[idx]["right"] = flatten(node.right)
        return idx

    return {"root": flatten(root), "nodes": nodes}

def search_bst(tree, target_name: str):
    target = str(target_name).strip().lower()
    nodes = tree["nodes"]
    curr = tree["root"]
    path = []

    while curr is not None:
        node = nodes[curr]
        path.append(curr)
        node_key = node["value"].lower()
        if target == node_key:
            return {"found": True, "path": path, "units": node["units"]}
        curr = node["left"] if target < node_key else node["right"]

    return {"found": False, "path": path, "units": []}

print("BST Soldier Search Engine ready. Select a Soldier in the Game tab and click 'Search Soldier'!")`
    },
    13: {
        title: "Topic 13: Hash Tables — Dog-Tag Registry & Rehashing",
        pillar: "OOP + DSA: Hash Table with Separate Chaining & Dynamic Resize",
        classes: ["class DogTagHashTable", "_hash(self, key)", "put(self, key, val)", "_rehash(self)"],
        tree: "general",
        concept: "Hash Tables & Collision Resolution: Maps soldier dog-tag strings to bucket indices via `sum(ord(c)) % capacity`. Collisions are resolved via separate chaining (lists inside buckets), and `_rehash()` doubles capacity when the load factor exceeds `0.75`.",
        game: "Indexes all active soldiers on your 5×5 Barracks Grid into an OOP `DogTagHashTable` and prints every collision chain and dynamic resize event to the console.",
        arch: "• <b>_hash(self, key)</b>: Computes polynomial/ASCII modular hash index.<br>• <b>put(self, key, value)</b>: Appends `[key, value]` to `self.buckets[idx]` and checks `self.size / self.capacity > 0.75`.<br>• <b>_rehash(self)</b>: Doubles bucket array size and redistributes all existing dog tags.",
        steps: [
            "Initialize `DogTagHashTable(capacity=5)` with 5 empty bucket lists.",
            "Hash and insert every active soldier from your 5×5 Barracks Grid.",
            "Insert additional dog-tag records to trigger collision chaining and load factor > 0.75.",
            "Observe `_rehash()` automatically double capacity to 10 and redistribute keys."
        ],
        complexity: "O(1) average lookup and insertion; O(N) during table resize/rehash.",
        code: `# Topic 13: OOP Dog-Tag Hash Table with Chaining & Rehashing
from js import getGardenState, pushAction

class DogTagHashTable:
    def __init__(self, capacity=5):
        self.capacity = capacity
        self.size = 0
        self.buckets = [[] for _ in range(capacity)]

    def _hash(self, key: str) -> int:
        return sum(ord(ch) for ch in str(key)) % self.capacity

    def put(self, key: str, value):
        idx = self._hash(key)
        for pair in self.buckets[idx]:
            if pair[0] == key:
                pair[1] = value
                return
        if len(self.buckets[idx]) > 0:
            print(f"⚡ Collision at bucket [{idx}] for '{key}' -> Chaining!")
        self.buckets[idx].append([key, value])
        self.size += 1
        if self.size / self.capacity > 0.75:
            self._rehash()

    def _rehash(self):
        old_buckets = self.buckets
        self.capacity *= 2
        self.buckets = [[] for _ in range(self.capacity)]
        self.size = 0
        print(f"🔄 Rehashing Dog-Tag Registry to capacity = {self.capacity}...")
        for bucket in old_buckets:
            for k, v in bucket:
                self.put(k, v)

registry = DogTagHashTable(capacity=5)
for tile in getGardenState().to_py():
    if tile["plant"]:
        registry.put(f"TAG#{tile['pos']}_{tile['plant']}", f"HP:{tile['health']}%")

for tag, spec in [("TAG#91_Sniper", "HP:100%"), ("TAG#92_Tank", "HP:95%"), ("TAG#93_Medic", "HP:88%"), ("TAG#94_Ranger", "HP:92%")]:
    registry.put(tag, spec)

for i, b in enumerate(registry.buckets):
    print(f"Bucket {i}: {b}")
pushAction("🐍 Topic 13: Dog-Tag Hash Registry built & rehashed")`
    },
    14: {
        title: "Topic 14: Graph Foundations — Sector Adjacency Network",
        pillar: "OOP + DSA: Undirected Graph Adjacency List",
        classes: ["class TacticalGraph", "build_from_grid(self)", "bfs_patrol(self)", "dfs_patrol(self)"],
        tree: "general",
        concept: "Graph Representation (Adjacency List): Models the 5×5 Barracks as an undirected graph class `TacticalGraph` where each vertex (Sector `#0..#24`) maps to a list of its orthogonal neighbor sectors.",
        game: "Constructs the live adjacency dictionary directly from your 5×5 Barracks Grid and compares the exact patrol order of BFS vs. DFS starting from Sector `#0`.",
        arch: "• <b>self.adj</b>: Dictionary mapping `sector_id -> [neighbor_ids]`.<br>• <b>bfs_patrol(start)</b>: Level-order exploration using a FIFO queue.<br>• <b>dfs_patrol(start)</b>: Deep corridor exploration using recursion.",
        steps: [
            "Instantiate `TacticalGraph()` and populate `self.adj` from the 25 grid tiles.",
            "Inspect `g.adj[0]` to see Sector #0's orthogonal neighbors (`[5, 1]`).",
            "Run `bfs_patrol(0)` and `dfs_patrol(0)` on the exact same graph.",
            "Compare how BFS fans out layer-by-layer while DFS plunges down columns/rows."
        ],
        complexity: "O(V + E) time and O(V + E) adjacency list space.",
        code: `# Topic 14: OOP Tactical Graph Adjacency List — BFS vs. DFS Patrol
from collections import deque
from js import getGardenState, pushAction

class TacticalGraph:
    def __init__(self):
        self.adj = {}

    def build_from_grid(self, grid_data):
        for tile in grid_data:
            self.adj[tile["pos"]] = list(tile["neighbors"])

    def bfs_patrol(self, start=0):
        visited, queue, order = {start}, deque([start]), []
        while queue:
            u = queue.popleft()
            order.append(u)
            for v in self.adj.get(u, []):
                if v not in visited:
                    visited.add(v)
                    queue.append(v)
        return order

    def dfs_patrol(self, start=0, visited=None, order=None):
        if visited is None:
            visited, order = set(), []
        visited.add(start)
        order.append(start)
        for v in self.adj.get(start, []):
            if v not in visited:
                self.dfs_patrol(v, visited, order)
        return order

g = TacticalGraph()
g.build_from_grid(getGardenState().to_py())
print("Sector #0 Connected Neighbors:", g.adj[0])
print("BFS Patrol (first 10 sectors):", g.bfs_patrol(0)[:10])
print("DFS Patrol (first 10 sectors):", g.dfs_patrol(0)[:10])
pushAction("🐍 Topic 14: Tactical Sector Graph analyzed")`
    },
    15: {
        title: "Topic 15: Sorting Algorithms — Medevac Triage Priority",
        pillar: "OOP + DSA: In-Place Insertion Sort by Key",
        classes: ["class MedevacTriageSorter", "@staticmethod insertion_sort()", "sort_live_pods(units)"],
        tree: "general",
        concept: "Comparison Sorting (`Insertion Sort`): Iteratively inserts each soldier record into its proper sorted position by `health` (ascending), ensuring the most critically injured soldiers appear at `Rank #1` for medevac priority.",
        game: "Powers the **📊 Triage Sort (T15)** button in the Barracks Grid tab! Sorts all deployed soldiers from lowest HP to highest HP and animates their triage rank badges on the 5×5 grid.",
        arch: "• <b>MedevacTriageSorter.insertion_sort(units)</b>: Shifts higher-HP records right (`arr[j + 1] = arr[j]`) until the correct slot for `curr['health']` is found.<br>• <b>sort_live_pods(units)</b>: Entry point called by the live Triage Sort button.",
        steps: [
            "Filter the 5×5 grid for all currently occupied soldier sectors.",
            "Iterate `i` from `1` to `len(arr) - 1`, holding `curr = arr[i]`.",
            "Shift elements with `health > curr['health']` one position to the right.",
            "Display the sorted Medevac Triage Priority list and highlight ranks on the grid."
        ],
        complexity: "O(N²) worst/average time; O(N) best-case time on nearly-sorted troops; O(1) auxiliary space.",
        code: `# Topic 15: OOP Medevac Triage Sorter — Priority by Lowest HP
from js import getGardenState, pushAction

class MedevacTriageSorter:
    @staticmethod
    def insertion_sort(units):
        arr = [dict(u) for u in units]
        for i in range(1, len(arr)):
            curr = arr[i]
            j = i - 1
            while j >= 0 and arr[j]["health"] > curr["health"]:
                arr[j + 1] = arr[j]
                j -= 1
            arr[j + 1] = curr
        return arr

def sort_live_pods(units):
    return MedevacTriageSorter.insertion_sort(units)

live = [t for t in getGardenState().to_py() if t["plant"]]
sorted_units = sort_live_pods(live)
print("=== Medevac Triage Priority (Lowest HP First) ===")
for rank, u in enumerate(sorted_units, 1):
    print(f"Priority #{rank}: Sector #{u['pos']} ({u['plant']}) -> HP {u['health']}%")
pushAction("🐍 Topic 15: Sorted platoon by Medevac Triage priority")`
    },
    16: {
        title: "Topic 16: Searching — Linear vs. Binary Dog-Tag Lookup",
        pillar: "OOP + DSA: Sequential O(N) vs. Divide-and-Conquer O(log N)",
        classes: ["class BattalionSearch", "linear_search(serials, target)", "binary_search(serials, target)"],
        tree: "general",
        concept: "Linear Search vs. Binary Search: Linear Search checks dog-tag serial numbers one-by-one from index `0` in O(N) time. Binary Search requires a sorted array and halves the search interval `[left, right]` at every step, achieving O(log N) speed.",
        game: "Searches a 25-soldier battalion serial registry (`1000..1240`) for Serial `#1190` and compares the exact number of comparisons required by Linear Search (`20` steps) vs. Binary Search (`4` steps).",
        arch: "• <b>BattalionSearch.linear_search</b>: Scans sequentially and counts `steps`.<br>• <b>BattalionSearch.binary_search</b>: Computes `mid = (left + right) // 2` and narrows bounds by half each iteration.",
        steps: [
            "Generate 25 sorted Dog-Tag serial numbers (`1000, 1010, ..., 1240`).",
            "Run `linear_search` for target `1190` (takes 20 comparisons).",
            "Run `binary_search` for target `1190` (takes only 4 comparisons).",
            "Print the comparison benchmark to stdout and log to the Command Stack."
        ],
        complexity: "Linear Search: O(N) time | Binary Search: O(log N) time on sorted data.",
        code: `# Topic 16: Linear Search vs. Binary Search on Dog-Tag Serials
from js import pushAction

class BattalionSearch:
    @staticmethod
    def linear_search(serials, target):
        steps = 0
        for idx, val in enumerate(serials):
            steps += 1
            if val == target:
                return idx, steps
        return -1, steps

    @staticmethod
    def binary_search(serials, target):
        left, right = 0, len(serials) - 1
        steps = 0
        while left <= right:
            steps += 1
            mid = (left + right) // 2
            if serials[mid] == target:
                return mid, steps
            if serials[mid] < target:
                left = mid + 1
            else:
                right = mid - 1
        return -1, steps

dog_tags = [1000 + i * 10 for i in range(25)]  # Sorted Serials: 1000..1240
target_serial = 1190

lin_idx, lin_steps = BattalionSearch.linear_search(dog_tags, target_serial)
bin_idx, bin_steps = BattalionSearch.binary_search(dog_tags, target_serial)

print(f"Dog-Tag Serial #{target_serial} located at index {bin_idx}")
print(f"Linear Search comparisons: {lin_steps}")
print(f"Binary Search comparisons: {bin_steps}")
pushAction(f"🐍 Topic 16: Binary Search found Dog-Tag in {bin_steps} steps vs {lin_steps}")`
    },
    17: {
        title: "Topic 17: Dijkstra's Algorithm — Armored Convoy Router",
        pillar: "DSA Weighted Shortest Path: Priority Queue (`heapq`)",
        classes: ["dijkstra_grid_path(grid, start, goal)", "heapq.heappop(pq)", "heapq.heappush(pq)", "dist / parent"],
        tree: "general",
        concept: "Dijkstra's Shortest Path Algorithm: Uses a binary min-heap (`heapq`) to greedily expand the lowest-fuel-cost frontier sector (`cost, u`). Sectors secured by friendly troops cost `1` fuel unit to traverse, while open sectors cost `2`.",
        game: "Powers the **🚁 Convoy Route (T17)** button in the Barracks Grid tab! Finds the minimum-fuel route from HQ Start to your most critical/lowest-HP soldier and **automatically resupplies & heals** them on arrival!",
        arch: "• <b>dist</b>: Maps each sector `0..24` to its best known fuel cost (initialized to `inf`).<br>• <b>pq = [(0, start)]</b>: Min-heap ordering frontier sectors by cumulative fuel cost.<br>• <b>parent</b>: Backpointer dictionary used to reconstruct the optimal convoy path.",
        steps: [
            "Initialize `dist[start] = 0` and push `(0, start)` into the `heapq` priority queue.",
            "Pop the sector `u` with minimum cumulative fuel cost.",
            "Relax edges to each neighbor `v` (`step_cost = 1` if occupied by friendly unit, else `2`).",
            "Reconstruct the shortest path via `parent` pointers and dispatch the resupply convoy."
        ],
        complexity: "O((V + E) log V) time complexity using a binary min-heap (`heapq`).",
        code: `# Topic 17: Dijkstra's Shortest-Path Armored Convoy Router
import heapq

def dijkstra_grid_path(grid, start, goal):
    dist = {tile["pos"]: float("inf") for tile in grid}
    parent = {tile["pos"]: None for tile in grid}
    dist[start] = 0
    pq = [(0, start)]
    visited_order = []

    while pq:
        cost, u = heapq.heappop(pq)
        if cost > dist[u]:
            continue
        visited_order.append(u)
        if u == goal:
            break
        for v in grid[u]["neighbors"]:
            # Secured sector (occupied by friendly unit) costs 1 fuel; open sector costs 2
            step_cost = 1 if grid[v]["plant"] else 2
            new_cost = cost + step_cost
            if new_cost < dist[v]:
                dist[v] = new_cost
                parent[v] = u
                heapq.heappush(pq, (new_cost, v))

    path = []
    curr = goal
    while curr is not None:
        path.append(curr)
        curr = parent[curr]
    path.reverse()
    return {"path": path, "visited": visited_order, "cost": dist[goal]}

print("Dijkstra Convoy Router ready. Click '🚁 Convoy Route (T17)' in the Barracks Grid tab!")`
    },
    18: {
        title: "Topic 18: Dynamic Programming — Combat Firepower Predictor",
        pillar: "OOP + DSA: Top-Down Memoization Cache",
        classes: ["class FirepowerPredictor", "self.memo", "predict_rating(self, tier)"],
        tree: "general",
        concept: "Dynamic Programming (Top-Down Memoization): Caches solutions to overlapping subproblems in a dictionary (`self.memo`) so exponential recursive combat readiness trees collapse into O(N) linear time.",
        game: "Calculates multi-stage battalion firepower ratings across Training Tiers `0..9` in just `17` function calls instead of `100+` redundant recursive calls.",
        arch: "• <b>self.memo = {0: 10, 1: 20}</b>: Base-case lookup table.<br>• <b>predict_rating(self, tier)</b>: Returns cached value in O(1) if `tier in self.memo`; otherwise computes and stores `predict_rating(tier-1) + predict_rating(tier-2)`.",
        steps: [
            "Initialize `FirepowerPredictor` with base tiers `0 -> 10 FP` and `1 -> 20 FP`.",
            "Request `predict_rating(t)` for tiers `0` through `9`.",
            "Check `if tier in self.memo:` before making recursive calls.",
            "Verify total recursive call count is only `17` across all 10 tiers."
        ],
        complexity: "Reduces time complexity from O(2^N) naive recursion to O(N) time and O(N) cache space.",
        code: `# Topic 18: Dynamic Programming — Memoized Battalion Firepower Predictor
from js import pushAction

class FirepowerPredictor:
    def __init__(self):
        self.memo = {0: 10, 1: 20}
        self.calls = 0

    def predict_rating(self, tier: int) -> int:
        self.calls += 1
        if tier in self.memo:
            return self.memo[tier]
        self.memo[tier] = self.predict_rating(tier - 1) + self.predict_rating(tier - 2)
        return self.memo[tier]

predictor = FirepowerPredictor()
for t in range(10):
    print(f"Training Tier {t:2d} -> Platoon Firepower Index: {predictor.predict_rating(t)} FP")
print(f"Total function calls with Memoization: {predictor.calls} (vs 100+ without DP)")
pushAction("🐍 Topic 18: DP Firepower rating cached")`
    },
    19: {
        title: "Topic 19: Big O Notation — Command Radar Efficiency",
        pillar: "DSA Complexity Analysis: O(1) vs O(log N) vs O(N) vs O(N²)",
        classes: ["class BigORadarBenchmark", "o1_direct_access()", "o_log_n_binary()", "o_n_roll_call()", "o_n2_all_pairs()"],
        tree: "general",
        concept: "Asymptotic Complexity Analysis (Big O): Quantifies how operation count scales with platoon size `N = 25`: O(1) direct sector indexing (`1` op), O(log N) binary search (`4` ops), O(N) linear roll call (`25` ops), and O(N²) all-pairs cross-check (`625` ops).",
        game: "Runs an empirical operation-counter benchmark across the `25` Barracks Sectors so students can compare all major complexity classes side-by-side.",
        arch: "• <b>o1_direct_access()</b>: Array index lookup `self.sectors[0]` (`1` operation).<br>• <b>o_log_n_binary()</b>: Halves problem size each step (`4` operations).<br>• <b>o_n_roll_call()</b>: Single pass over all 25 sectors (`25` operations).<br>• <b>o_n2_all_pairs()</b>: Nested loop pairing every sector with every other sector (`625` operations).",
        steps: [
            "Instantiate `BigORadarBenchmark(25)` representing the 25 Barracks Sectors.",
            "Execute `o1_direct_access()`, `o_log_n_binary()`, `o_n_roll_call()`, and `o_n2_all_pairs()`.",
            "Compare the operation counts: `1` vs `4` vs `25` vs `625`.",
            "Log completion to the Command Stack."
        ],
        complexity: "Hierarchy: O(1) < O(log N) < O(N) < O(N log N) < O(N²) < O(2^N).",
        code: `# Topic 19: Big O Complexity Benchmark on N = 25 Barracks Sectors
from js import pushAction

class BigORadarBenchmark:
    def __init__(self, n=25):
        self.sectors = list(range(n))

    def o1_direct_access(self):
        return 1  # Direct index lookup: self.sectors[0]

    def o_log_n_binary(self):
        steps, n = 0, len(self.sectors)
        while n > 1:
            n //= 2
            steps += 1
        return steps

    def o_n_roll_call(self):
        return sum(1 for _ in self.sectors)

    def o_n2_all_pairs(self):
        return sum(1 for _ in self.sectors for _ in self.sectors)

bench = BigORadarBenchmark(25)
print(f"For N = {len(bench.sectors)} Barracks Sectors:")
print(f"  O(1) Direct Sector Access : {bench.o1_direct_access()} op")
print(f"  O(log N) Binary Search    : {bench.o_log_n_binary()} ops")
print(f"  O(N) Linear Roll Call     : {bench.o_n_roll_call()} ops")
print(f"  O(N^2) All-Pairs Check    : {bench.o_n2_all_pairs()} ops")
pushAction("🐍 Topic 19: Big O Radar efficiency benchmark complete")`
    }
};

/* =====================================================
   PYODIDE ENGINE & TAB SYNCHRONIZATION
   ===================================================== */
function appendConsole(text) {
    const el = document.getElementById("output-console");
    if (!el || text === undefined || text === null) return;
    el.appendChild(document.createTextNode(String(text)));
    while (el.childNodes.length > 600) el.removeChild(el.firstChild);
    el.scrollTop = el.scrollHeight;
}

function setConsoleStatus(text, cls) {
    const el = document.getElementById("output-console");
    if (!el) return;
    el.innerHTML = "";
    appendConsoleStatus(text, cls);
}

function appendConsoleStatus(text, cls) {
    const el = document.getElementById("output-console");
    if (!el) return;
    const s = document.createElement("span");
    s.className = cls || "";
    s.textContent = text + "\n";
    el.appendChild(s);
    el.scrollTop = el.scrollHeight;
}

function initPyodide() {
    if (pyodidePromise) return pyodidePromise;
    pyodidePromise = (async () => {
        setConsoleStatus("⏳ Initializing Pyodide Python 3.12 Tactical Engine...", "text-amber-400");
        try {
            const py = await loadPyodide();
            py.globals.set("addPlantToGrid", addPlantToGrid);
            py.globals.set("updateResources", updateResources);
            py.globals.set("addPlantsToDropdown", addPlantsToDropdown);
            py.globals.set("pushAction", pushAction);
            py.globals.set("updateClimateQueue", updateClimateQueue);

            await py.runPythonAsync(`
import sys
from js import appendConsole

class Console:
    def write(self, text):
        if text:
            appendConsole(text)
        return len(text) if text else 0
    def flush(self):
        pass

sys.stdout = Console()
sys.stderr = Console()
`);
            pyodideInstance = py;
            setConsoleStatus("✅ Python OOP Tactical Engine Ready. Click '▶ Execute Python Code' to run.", "text-emerald-400");
            return py;
        } catch (err) {
            pyodidePromise = null;
            setConsoleStatus("Failed to load Python: " + err.message, "text-rose-400");
            throw err;
        }
    })();
    return pyodidePromise;
}

async function runPythonCode() {
    const btn = document.getElementById("run-btn");
    setConsoleStatus("⏳ Executing Python OOP module...", "text-amber-400");
    if (btn) btn.disabled = true;
    try {
        if (typeof loadPyodide === "undefined") throw new Error("Pyodide CDN unavailable.");
        await initPyodide();
        document.getElementById("output-console").innerHTML = "";
        const code = document.getElementById("code-editor").value;
        await pyodideInstance.runPythonAsync(code);
        appendConsoleStatus("✔ Execution complete — Live 5×5 Barracks state updated.", "text-emerald-400");
        renderMiniGridStatus();
    } catch (err) {
        appendConsoleStatus("Error: " + err.message, "text-rose-400");
    } finally {
        if (btn) btn.disabled = false;
    }
}

function copyTopicCode() {
    const code = document.getElementById("code-editor").value;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(() => {
            pushAction("📋 Copied Python topic code to clipboard");
        });
    }
}

function stepTopic(delta) {
    const sel = document.getElementById("topic-selector");
    if (!sel) return;
    const keys = Object.keys(topicTemplates);
    const idx = keys.indexOf(String(sel.value));
    const nextIdx = (idx + delta + keys.length) % keys.length;
    loadTopic(keys[nextIdx]);
}

function loadTopic(keyOverride) {
    const sel = document.getElementById("topic-selector");
    if (!sel) return;
    if (keyOverride !== undefined) sel.value = String(keyOverride);
    const key = sel.value;
    const topic = topicTemplates[key];
    if (!topic) return;

    // Update Code Tab + Integrated Explanation Cards
    document.getElementById("code-topic-title").textContent = topic.title;
    document.getElementById("code-pillar-badge").textContent = topic.pillar || "Python OOP & DSA";
    document.getElementById("code-editor").value = topic.code;
    document.getElementById("code-exp-concept").textContent = topic.concept;
    document.getElementById("code-exp-game").textContent = topic.game;

    const sigHtml = (topic.classes || []).map(
        c => `<span class="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 code-font text-[10.5px]">${c}</span>`
    ).join("");
    const codeClassesEl = document.getElementById("code-class-pills");
    if (codeClassesEl) codeClassesEl.innerHTML = sigHtml;

    // Update Full Explanation Tab
    document.getElementById("exp-title").textContent = topic.title;
    document.getElementById("exp-pillar-badge").textContent = topic.pillar || "Python OOP & DSA";
    document.getElementById("exp-concept").textContent = topic.concept;
    document.getElementById("exp-game").textContent = topic.game;
    document.getElementById("exp-architecture").innerHTML = topic.arch || "";
    document.getElementById("exp-complexity").textContent = topic.complexity || "";

    const expClassesEl = document.getElementById("exp-class-pills");
    if (expClassesEl) expClassesEl.innerHTML = sigHtml;

    const stepsEl = document.getElementById("exp-steps");
    if (stepsEl) {
        stepsEl.innerHTML = (topic.steps || []).map((st, i) => `
            <div class="flex items-start gap-2.5 bg-slate-950/80 border border-slate-800 rounded-lg p-2.5">
                <span class="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-[10px] code-font">STEP ${i + 1}</span>
                <span class="text-slate-200 text-xs leading-relaxed">${st}</span>
            </div>
        `).join("");
    }

    travToken++;
    drawTree(topic.tree || "general");
    document.getElementById("trav-title").textContent = "Execute a Tree/BST topic or click 'Search Soldier' to animate nodes.";
    document.getElementById("trav-order").textContent = "";
    renderMiniGridStatus();
}

function switchTab(tab) {
    ["game", "code", "explain"].forEach(t => {
        const view = document.getElementById(`view-${t}`);
        const btn = document.getElementById(`tab-${t}`);
        if (view) view.classList.toggle("hidden", t !== tab);
        if (btn) btn.classList.toggle("active", t === tab);
    });
    renderMiniGridStatus();
}

/* =====================================================
   LIVE BFS / DFS AUTO-CARE, BST SOLDIER SEARCH, SORT & DIJKSTRA
   ===================================================== */
let tvToken = 0;
let tvStart = null;
let tvPicking = false;
const TV_DELAY = 460;

function tvTag(pos, text) {
    let tag = tiles[pos].root.querySelector(".tv-tag");
    if (!text) {
        if (tag) tag.remove();
        return;
    }
    if (!tag) {
        tag = document.createElement("div");
        tag.className = "tv-tag";
        tiles[pos].root.appendChild(tag);
    }
    tag.textContent = text;
}

function tvChips(arr, hotFirst) {
    return arr.length
        ? arr.map((x, i) => `<span class="tv-chip${hotFirst && i === 0 ? " hot" : ""}">#${x}</span>`).join("")
        : "[ empty ]";
}

function tvClearTiles() {
    tiles.forEach((t, i) => {
        t.root.classList.remove("tv-visited", "tv-current", "tv-queue", "tv-stack", "tv-back", "tv-found");
        t.root.style.removeProperty("--tvc");
        tvTag(i, "");
    });
}

function tvSet(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

function resetTraversal() {
    tvToken++;
    tvClearTiles();
    tvSet("tv-algo", "idle");
    tvSet("tv-state", "");
    tvSet("tv-current", "-");
    tvSet("tv-struct-label", "FRONTIER");
    tvSet("tv-struct", "-");
    tvSet("tv-visited", "-");
    tvSet("tv-order", "-");
    tvSet("tv-found", "-");
    tvSet("tv-msg", "");
}

function toggleTvPickStart() {
    tvPicking = !tvPicking;
    const b = document.getElementById("tv-pick-btn");
    if (b) b.classList.toggle("tool-btn-active", tvPicking);
    tvSet("tv-msg", tvPicking ? "Click any Barracks Sector tile to set it as the HQ Start node." : "");
}

function tvStartTile() {
    return tvStart !== null ? tvStart : (selectedPos !== null ? selectedPos : 0);
}

function animateBFSStep(s, ctx) {
    ctx.depth[s.node] = s.depth;
    tvClearTiles();
    s.visited.forEach((p, i) => {
        const r = tiles[p].root;
        r.classList.add("tv-visited");
        r.style.setProperty("--tvc", `hsl(${195 + ctx.depth[p] * 14}, 80%, 50%)`);
        tvTag(p, ctx.caredSet.has(p) ? "✨ CARED" : `${i + 1}·L${ctx.depth[p]}`);
    });
    s.queue.forEach((p, i) => {
        tiles[p].root.classList.add("tv-queue");
        if (!ctx.caredSet.has(p)) tvTag(p, `Q${i + 1}`);
    });
    tiles[s.node].root.classList.add("tv-current");
    tvSet("tv-current", `Sector #${s.node} (L${s.depth})`);
    tvSet("tv-struct-label", "FIFO QUEUE");
    tvSet("tv-struct", tvChips(s.queue, true));
    tvSet("tv-msg", `Scanned #${s.node}. Enqueued neighbors: ${s.added.length ? s.added.map(a => "#" + a).join(", ") : "none"}.`);
}

function animateDFSStep(s, ctx) {
    if (s.type === "visit") ctx.depth[s.node] = s.depth;
    tvClearTiles();
    s.visited.forEach((p, i) => {
        const r = tiles[p].root;
        r.classList.add("tv-visited");
        r.style.setProperty("--tvc", `hsl(${42 - Math.min(ctx.depth[p] || 0, 16) * 2}, 90%, 50%)`);
        tvTag(p, ctx.caredSet.has(p) ? "✨ CARED" : `${i + 1}·D${ctx.depth[p] || 0}`);
    });
    s.stack.forEach(p => tiles[p].root.classList.add("tv-stack"));
    if (s.type === "visit") {
        tiles[s.node].root.classList.add("tv-current");
        tvSet("tv-msg", `DFS patrolling Sector #${s.node} (depth ${s.depth}).`);
    } else {
        tiles[s.node].root.classList.add("tv-back");
        if (!ctx.caredSet.has(s.node)) tvTag(s.node, "↩ back");
        tvSet("tv-msg", `Backtracking from Sector #${s.node}.`);
    }
    tvSet("tv-current", `Sector #${s.node} (D${s.depth})`);
    tvSet("tv-struct-label", "CALL STACK");
    tvSet("tv-struct", s.stack.length ? tvChips(s.stack, false) : "[ empty ]");
}

// Auto-Care Helper called when BFS, DFS, or Dijkstra Convoy scans a Sector with a Trainee
function autoCareTrainee(pos, algoLabel) {
    const u = gardenPlants[pos];
    if (!u || u.removing) return null;
    let cared = [];

    if (u.water < WATER_NEED) {
        u.water = 100;
        changeRes("water", -3);
        changeRes("coins", 2);
        animWater(pos);
        cared.push("🍖 Rationed");
    }
    if (u.needsTrim) {
        u.needsTrim = false;
        u.trimTimer = TRIM_INTERVAL;
        u.health = Math.min(100, u.health + 5);
        u.progress = Math.min(100, u.progress + 12);
        changeRes("coins", 3);
        animTrim(pos);
        cared.push("🎯 Drilled");
    }
    if (u.infested) {
        u.infested = false;
        u.pestTimer = PEST_INTERVAL;
        u.health = Math.min(100, u.health + 20);
        changeRes("coins", 4);
        animPest(pos, true);
        cared.push("🩺 Patched");
    }
    if (u.health < 70) {
        u.health = 98;
        sparkle(pos, 4, "💚");
        cared.push("💉 Healed");
    }

    if (cared.length > 0) {
        u.lastAction = `🤖 ${algoLabel} Auto-Care`;
        evaluatePlant(pos);
        updateCell(pos);
        renderResources();
        renderDashboard();
        renderAssistant();
        pushAction(`🤖 ${algoLabel} Auto-Cared #${pos} (${u.name}): ${cared.join(", ")}`);
        return cared.join(" + ");
    }
    return null;
}

async function runGameTraversal(kind) {
    resetTraversal();
    const token = ++tvToken;
    const label = kind === "bfs" ? "BFS" : "DFS";
    const requiredTopic = kind === "bfs" ? "8" : "9";
    loadTopic(requiredTopic);

    tvSet("tv-algo", `${label} Auto-Care`);
    tvSet("tv-state", "⏳ Python...");
    let result;
    try {
        const py = await initPyodide();
        if (token !== tvToken) return;
        await py.runPythonAsync(document.getElementById("code-editor").value);
        const fn = py.globals.get(kind);
        const gridProxy = py.toPy(getGardenState());
        const resultProxy = fn(gridProxy, tvStartTile());
        result = toJS(resultProxy);
        resultProxy.destroy();
        gridProxy.destroy();
        fn.destroy();
    } catch (err) {
        tvSet("tv-state", "❌ error");
        tvSet("tv-msg", String(err.message || err));
        return;
    }

    const snap = getGridSnapshot();
    const found = result.found || [];
    const foundSet = new Set(found);
    const caredSet = new Set();
    const ctx = { depth: {}, plants: snap, foundSet, caredSet };
    const order = [];
    let autoCaredCount = 0;
    tvSet("tv-state", "▶ SCAN & AUTO-CARE");
    pushAction(`🧭 Python ${label} Auto-Care Sweep started at Sector #${tvStartTile()}`);

    for (const step of result.steps) {
        if (token !== tvToken) return;
        if (kind === "bfs" || step.type === "visit") {
            order.push(step.node);
            const careSummary = autoCareTrainee(step.node, label);
            if (careSummary) {
                autoCaredCount++;
                caredSet.add(step.node);
            }
        }
        if (kind === "bfs") animateBFSStep(step, ctx);
        else animateDFSStep(step, ctx);
        if (caredSet.has(step.node)) {
            tvTag(step.node, "✨ CARED");
            tvSet("tv-msg", `🤖 ${label} Auto-Cared Sector #${step.node} (${snap[step.node]})!`);
        }
        tvSet("tv-visited", tvChips(step.visited, false));
        tvSet("tv-order", order.join(" → "));
        tvSet("tv-found", found.length ? found.map(pos => `<span class="tv-chip">#${pos} ${snap[pos] || ""}</span>`).join("") : "none");
        await sleep(TV_DELAY);
    }
    if (token !== tvToken) return;
    tiles.forEach(t => t.root.classList.remove("tv-current", "tv-back", "tv-queue", "tv-stack"));
    tvSet("tv-state", "✅ DONE");
    tvSet("tv-msg", `${label} scanned ${new Set(order).size} sectors and auto-cared ${autoCaredCount} trainee(s).`);
}

function runGameBFS() {
    return runGameTraversal("bfs");
}

function runGameDFS() {
    return runGameTraversal("dfs");
}

// Topic 15 Live Game Feature: Medevac Triage Sort by Lowest Health
async function runGameSort() {
    resetTraversal();
    const token = ++tvToken;
    loadTopic("15");
    tvSet("tv-algo", "InsertionSort");
    tvSet("tv-state", "⏳ Python...");
    try {
        const py = await initPyodide();
        if (token !== tvToken) return;
        await py.runPythonAsync(document.getElementById("code-editor").value);
        const fn = py.globals.get("sort_live_pods");
        const livePods = getGardenState().filter(t => t.plant);
        if (!livePods.length) {
            tvSet("tv-state", "⚠ empty");
            tvSet("tv-msg", "Deploy at least 2 soldiers to sort them by triage priority!");
            return;
        }
        const proxy = py.toPy(livePods);
        const resProxy = fn(proxy);
        const sorted = toJS(resProxy);
        resProxy.destroy();
        proxy.destroy();
        fn.destroy();

        tvSet("tv-state", "▶ TRIAGE RANKING");
        tvSet("tv-struct-label", "TRIAGE PRIORITY");
        const order = [];
        for (let i = 0; i < sorted.length; i++) {
            if (token !== tvToken) return;
            const item = sorted[i];
            const r = tiles[item.pos].root;
            r.classList.add("tv-visited", "tv-current");
            r.style.setProperty("--tvc", `hsl(${150 - i * 22}, 80%, 46%)`);
            tvTag(item.pos, `Rank #${i + 1} (${item.health}%)`);
            order.push(`#${item.pos}(${item.health}%)`);
            tvSet("tv-order", order.join(" ≤ "));
            await sleep(430);
            r.classList.remove("tv-current");
        }
        tvSet("tv-state", "✅ SORTED");
        tvSet("tv-msg", `Sorted ${sorted.length} soldiers from lowest HP to highest HP.`);
    } catch (err) {
        tvSet("tv-state", "❌ error");
        tvSet("tv-msg", String(err.message || err));
    }
}

// Topic 17 Live Game Feature: Dijkstra Shortest Armored Convoy Route
async function runGameDijkstra() {
    resetTraversal();
    const token = ++tvToken;
    loadTopic("17");
    const start = tvStartTile();
    const state = getGardenState();
    const candidates = state.filter(t => t.plant && t.pos !== start).sort((a, b) => a.health - b.health);
    const goal = candidates.length ? candidates[0].pos : (start === 24 ? 0 : 24);

    tvSet("tv-algo", "Dijkstra Convoy");
    tvSet("tv-state", "⏳ Python...");
    try {
        const py = await initPyodide();
        if (token !== tvToken) return;
        await py.runPythonAsync(document.getElementById("code-editor").value);
        const fn = py.globals.get("dijkstra_grid_path");
        const gridProxy = py.toPy(state);
        const resProxy = fn(gridProxy, start, goal);
        const res = toJS(resProxy);
        resProxy.destroy();
        gridProxy.destroy();
        fn.destroy();

        tvSet("tv-state", "▶ ROUTING");
        tvSet("tv-struct-label", "SHORTEST ROUTE");
        tvSet("tv-struct", tvChips(res.path, true));
        for (let i = 0; i < res.path.length; i++) {
            if (token !== tvToken) return;
            const pos = res.path[i];
            const r = tiles[pos].root;
            r.classList.add("tv-visited", "tv-current");
            r.style.setProperty("--tvc", "#f59e0b");
            tvTag(pos, i === 0 ? "🚁 HQ" : (i === res.path.length - 1 ? "🎯 TARGET" : `Hop ${i}`));
            tvSet("tv-current", `Sector #${pos}`);
            tvSet("tv-order", res.path.slice(0, i + 1).map(p => "#" + p).join(" → "));
            await sleep(400);
            r.classList.remove("tv-current");
        }
        // Auto-care target soldier upon convoy arrival
        autoCareTrainee(goal, "Convoy");
        tvSet("tv-state", "✅ ARRIVED");
        tvSet("tv-msg", `Convoy routed #${start} → #${goal} in ${res.path.length - 1} hops (fuel cost: ${res.cost}) & resupplied unit!`);
        pushAction(`🚁 Topic 17: Convoy routed #${start} → #${goal} (cost ${res.cost})`);
    } catch (err) {
        tvSet("tv-state", "❌ error");
        tvSet("tv-msg", String(err.message || err));
    }
}

// Topic 12 Live Game Feature: BST Search Soldier by Name
function renderHealthBST(tree) {
    const svg = document.getElementById("tree-svg");
    const nodes = tree.nodes || [];
    document.getElementById("tree-kind").textContent = "(Live Alphabetical BST built from Deployed Soldiers)";
    if (!nodes.length || tree.root === null || tree.root === undefined) {
        svg.setAttribute("viewBox", "0 0 440 160");
        svg.innerHTML = '<text x="220" y="80" text-anchor="middle" fill="#fbbf24" font-size="13">No soldiers deployed on grid to index.</text>';
        return {};
    }
    const positions = {};
    let inorderCounter = 0, maxDepth = 0;
    function assign(index, depth) {
        if (index === null || index === undefined) return;
        const node = nodes[index];
        maxDepth = Math.max(maxDepth, depth);
        assign(node.left, depth + 1);
        positions[index] = { x: 58 + inorderCounter * 96, y: 35 + depth * 58, depth };
        inorderCounter++;
        assign(node.right, depth + 1);
    }
    assign(tree.root, 0);
    const width = Math.max(440, 116 + Math.max(0, inorderCounter - 1) * 96);
    const height = Math.max(160, 80 + maxDepth * 58);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    let markup = "";
    nodes.forEach((node, index) => {
        if (!positions[index]) return;
        for (const side of ["left", "right"]) {
            const child = node[side];
            if (child === null || child === undefined || !positions[child]) continue;
            const a = positions[index], b = positions[child];
            markup += `<line class="tedge" x1="${a.x}" y1="${a.y + 14}" x2="${b.x}" y2="${b.y - 14}"></line>`;
        }
    });
    nodes.forEach((node, index) => {
        if (!positions[index]) return;
        const { x, y } = positions[index];
        const count = (node.units || []).length;
        const emoji = CROP_EMOJI_MAP[node.value] || "🎖️";
        const shortName = node.value.length > 10 ? node.value.slice(0, 9) + "…" : node.value;
        const label = `${emoji} ${shortName}${count > 1 ? ` ×${count}` : ""}`;
        markup += `<g class="tnode" data-name="bst-${index}"><rect x="${x - 44}" y="${y - 14}" width="88" height="28" rx="8"></rect><text class="tlabel" x="${x}" y="${y}">${label}</text><g class="tbadge"><circle cx="${x + 38}" cy="${y - 9}" r="8"></circle><text x="${x + 38}" y="${y - 9}"></text></g></g>`;
    });
    svg.innerHTML = markup;
    return positions;
}

async function runGameBSTSearch() {
    resetTraversal();
    const token = ++tvToken;
    loadTopic("12");
    const targetName = (document.getElementById("bst-soldier-input").value || "").trim();
    if (!targetName) {
        tvSet("tv-state", "⚠ invalid");
        tvSet("tv-msg", "Select a Soldier class name to search in the BST.");
        return;
    }
    tvSet("tv-algo", "BST Soldier Search");
    tvSet("tv-state", "⏳ Python...");
    let tree, result;
    try {
        const py = await initPyodide();
        if (token !== tvToken) return;
        await py.runPythonAsync(document.getElementById("code-editor").value);
        const buildFn = py.globals.get("build_bst");
        const searchFn = py.globals.get("search_bst");
        const records = getGardenState()
            .filter(t => t.plant)
            .map(t => ({ pos: t.pos, name: t.plant, health: t.health }));
        const unitProxy = py.toPy(records);
        const treeProxy = buildFn(unitProxy);
        tree = toJS(treeProxy);
        const resultProxy = searchFn(treeProxy, targetName);
        result = toJS(resultProxy);
        resultProxy.destroy();
        treeProxy.destroy();
        unitProxy.destroy();
        buildFn.destroy();
        searchFn.destroy();
    } catch (err) {
        tvSet("tv-state", "❌ error");
        tvSet("tv-msg", String(err.message || err));
        return;
    }
    renderHealthBST(tree);
    const svg = document.getElementById("tree-svg");
    const nodes = tree.nodes;
    const pathValues = [];
    tvSet("tv-struct-label", "BST ALPHABETICAL PATH");
    tvSet("tv-struct", result.path.length ? result.path.map(i => `<span class="tv-chip">${nodes[i].value}</span>`).join("") : "[ empty ]");
    tvSet("tv-found", result.found
        ? result.units.map(u => `<span class="tv-chip">#${u.pos} ${u.name} (HP ${u.health}%)</span>`).join("")
        : "none");

    for (let step = 0; step < result.path.length; step++) {
        if (token !== tvToken) return;
        const index = Number(result.path[step]);
        const el = svg.querySelector(`[data-name="bst-${index}"]`);
        if (el) {
            el.classList.add("visited", "current");
            const badge = el.querySelector(".tbadge text");
            if (badge) badge.textContent = String(step + 1);
        }
        pathValues.push(nodes[index].value);
        tvSet("tv-order", pathValues.join(" → "));
        await sleep(360);
        if (el) el.classList.remove("current");
    }
    if (result.found) {
        result.units.forEach(u => {
            tiles[u.pos].root.classList.add("tv-visited", "tv-found");
            tvTag(u.pos, `🎯 ${u.name}`);
        });
    }
    tvSet("tv-state", result.found ? "✅ FOUND" : "🔎 NOT FOUND");
    tvSet("tv-msg", result.found
        ? `BST located ${result.units.length} "${targetName}" unit(s) at Sector(s): ${result.units.map(u => "#" + u.pos).join(", ")}.`
        : `No "${targetName}" currently deployed on the grid. Deploy one first!`);
    pushAction(`🌳 BST Search for "${targetName}" -> ${result.found ? "FOUND" : "NOT FOUND"}`);
}

/* =====================================================
   STARTUP INITIALIZATION
   ===================================================== */
window.onload = () => {
    const verEl = document.getElementById("version-badge");
    if (verEl) verEl.textContent = "v" + APP_VERSION;
    try {
        if (typeof lucide !== "undefined") lucide.createIcons();
    } catch (e) {}

    createTiles();

    // Bind HQ Start Tile Picker click listener
    const gridEl = document.getElementById("garden-grid");
    if (gridEl) {
        gridEl.addEventListener("click", (e) => {
            if (!tvPicking) return;
            const root = e.target.closest(".tile");
            const pos = tiles.findIndex(t => t.root === root);
            if (pos < 0) return;
            e.stopPropagation();
            tvStart = pos;
            tiles.forEach((t, i) => t.root.classList.toggle("tv-start", i === pos));
            document.getElementById("tv-pick-btn").textContent = `📍 HQ Start (#${pos})`;
            toggleTvPickStart();
            tvSet("tv-msg", `HQ Start locked to Sector #${pos}.`);
        }, true);
    }

    renderActionStack();
    addPlantsToDropdown(DEFAULT_SEED_BAG);
    updateResources(RES.water, RES.seeds, RES.energy, RES.hope, RES.coins);

    const select = document.getElementById("topic-selector");
    if (select) {
        Object.keys(topicTemplates).forEach(k => {
            const opt = document.createElement("option");
            opt.value = k;
            opt.textContent = topicTemplates[k].title;
            select.appendChild(opt);
        });
    }

    const codeEditor = document.getElementById("code-editor");
    if (codeEditor) {
        codeEditor.addEventListener("keydown", (e) => {
            if (e.key === "Tab") {
                e.preventDefault();
                const ta = e.target;
                const s = ta.selectionStart;
                ta.value = ta.value.substring(0, s) + "    " + ta.value.substring(ta.selectionEnd);
                ta.selectionStart = ta.selectionEnd = s + 4;
            }
        });
    }

    loadTopic("1");
    switchTab("game");

    // Spawn starter Platoon OOP instances on the 5x5 Barracks Grid
    setTimeout(() => {
        spawnPlant(0, "Rifleman", "");
        pushAction("🎖️ Instantiated InfantryRifleman at Sector #0");
    }, 200);
    setTimeout(() => {
        spawnPlant(6, "Combat Medic", "");
        gardenPlants[6].needsTrim = true;
        evaluatePlant(6);
        updateCell(6);
        pushAction("🩺 Instantiated FieldMedic at Sector #6");
    }, 420);
    setTimeout(() => {
        spawnPlant(12, "Sniper", "");
        gardenPlants[12].water = 24;
        evaluatePlant(12);
        updateCell(12);
        pushAction("🎯 Instantiated ReconSniper at Sector #12");
    }, 640);
    setTimeout(() => {
        spawnPlant(18, "Tank Commander", "");
        selectPlant(0);
        pushAction("🚜 Instantiated ArmoredDivision at Sector #18");
    }, 860);

    renderClimate();
    renderDashboard();
    renderAssistant();
    renderScore();
    renderMiniGridStatus();

    lastTick = Date.now();
    setInterval(gameTick, 1000);

    if (typeof loadPyodide !== "undefined") {
        initPyodide().catch(() => {});
    }
};
