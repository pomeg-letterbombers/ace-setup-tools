"use strict";
(() => {
let csvURL = "../res/JPN_EasyChatSystem.csv";
const easychatData = new Set([0]);
const fireredData = [0];
const leafgreenData = [0];
const COMPATIBLE_SUBSTRUCTURE_ORDERS = new Set([6, 7, 8, 12, 13, 18, 19, 22]);

fetch(csvURL)
    .then(response => response.text())
    .then(text => {
        const dArray = text.split('\n').map((x) => x.split(','));
        easychatData.delete(0);
        for (const entry of dArray.slice(1, dArray.length - 1)) {
            easychatData.add(parseInt(entry[0], 16));
        }
    });
csvURL = "../res/FireRed_Species.csv";
fetch(csvURL)
    .then(response => response.text())
    .then(text => {
        const dArray = text.split('\n').map((x) => x.split(','));
        fireredData.pop();
        for (const entry of dArray.slice(1, dArray.length - 1)) {
            fireredData.push(parseInt(entry[0], 16));
        }
    });
csvURL = "../res/LeafGreen_Species.csv";
fetch(csvURL)
    .then(response => response.text())
    .then(text => {
        const dArray = text.split('\n').map((x) => x.split(','));
        leafgreenData.pop();
        for (const entry of dArray.slice(1, dArray.length - 1)) {
            leafgreenData.push(parseInt(entry[0], 16));
        }
    });

const toolForm = document.forms[0];
const out = toolForm.elements.namedItem("results").querySelector("#resultsTableBody");
if (out.constructor !== HTMLTableSectionElement) {
    throw new Error();
}

class PokeRNG {
    state;
    constructor(seed) {
        if (typeof seed !== "number") {
            throw new Error();
        }
        this.state = seed >>> 0;
    }

    next(advances = 1) {
        for (let i = 0; i < advances; i++) {
            this.state = ((Math.imul(0x41c64e6d, this.state) >>> 0) + 0x6073) >>> 0;
        }
        return this.state;
    }

    next16(advances = 1) {
        return (this.next(advances) >>> 16) & 0xffff;
    }
}

function* staticPIDRNG(
    seed,
    initialAdvances,
    advances,
    delay
) {
    if (typeof seed !== "number") {
        throw new Error();
    }
    if (typeof initialAdvances !== "number") {
        throw new Error();
    }
    if (typeof advances !== "number") {
        throw new Error();
    }
    if (typeof delay !== "number") {
        throw new Error();
    }
    const mainRNG = new PokeRNG(seed);
    const advanceRNG = new PokeRNG(0);
    mainRNG.next(initialAdvances + delay);
    for (let i = 0; i < advances; i++, mainRNG.next()) {
        advanceRNG.state = mainRNG.state;
        const pid = (advanceRNG.next16() | (advanceRNG.next16() << 16)) >>> 0;
        yield pid;
    }
}

function* wildPIDRNG(
    seed,
    initialAdvances,
    advances,
    delay
) {
    if (typeof seed !== "number") {
        throw new Error();
    }
    if (typeof initialAdvances !== "number") {
        throw new Error();
    }
    if (typeof advances !== "number") {
        throw new Error();
    }
    if (typeof delay !== "number") {
        throw new Error();
    }
    const mainRNG = new PokeRNG(seed);
    const advanceRNG = new PokeRNG(0);
    mainRNG.next(initialAdvances + delay);
    for (let i = 0; i < advances; i++, mainRNG.next()) {
        advanceRNG.state = mainRNG.state;
        advanceRNG.next(2);
        const pidNature = advanceRNG.next16() % 25;
        let pid;
        do {
            pid = (advanceRNG.next16() | (advanceRNG.next16() << 16)) >>> 0;
        } while (pid % 25 !== pidNature);
        yield pid;
    }
}

function hasWordsCheck(pid, tid, targetValues) {
    const encryptionKey = ((pid >>> 0) ^ (tid >>> 0)) & 0xffff;
    for (const targetValue of targetValues) {
        const encryptedValue = targetValue ^ encryptionKey;
        if (easychatData.has(encryptedValue)) {
            return true;
        }
    }
    return false;
}

function searchPIDRNG(tid, initialAdvances, rng, glitchmonList) {
    const usableAdvances = [];
    let advanceCount = initialAdvances - 1;
    for (const pid of rng) {
        advanceCount++;
        if (!COMPATIBLE_SUBSTRUCTURE_ORDERS.has((pid >>> 0) % 24)) {
            continue
        }
        if (hasWordsCheck(pid, tid, glitchmonList)) {
            usableAdvances.push([advanceCount, pid]);
        }
    }
    return usableAdvances;
}

toolForm.elements.namedItem("seed").addEventListener("input", function() {
    this.setCustomValidity("");
})

toolForm.elements.namedItem("seed").addEventListener("blur", function() {
    const n = Number(this.value);
    if (isNaN(n) || !(n >= 0 && n <= 0xffffffff)) {
        this.setCustomValidity("Invalid seed");
        this.reportValidity();
    } else {
        this.setCustomValidity("");
    }
    document.activeElement.blur();
})

toolForm.onsubmit = () => false;
toolForm.addEventListener("submit", function(e) {
    e.preventDefault();
    const params = new FormData(toolForm);
    let glitchmonList;
    let rng;
    switch (params.get("encounter-type")) {
        case "static":
            rng = staticPIDRNG(
                parseInt(params.get("seed"), 16),
                Number(params.get("initial-advances")),
                Number(params.get("advances")),
                Number(params.get("delay")),
            )
            break;
        case "wild":
            rng = wildPIDRNG(
                parseInt(params.get("seed"), 16),
                Number(params.get("initial-advances")),
                Number(params.get("advances")),
                Number(params.get("delay")),
            )
            break;
        default:
            throw new Error("");
    }
    switch (params.get("game-version")) {
        case "firered":
            glitchmonList = fireredData;
            break;
        case "leafgreen":
            glitchmonList = leafgreenData;
            break;
        default:
            throw new Error("");
    }
    const results = searchPIDRNG(
        Number(params.get("tid")),
        Number(params.get("initial-advances")),
        rng,
        glitchmonList
    )
    while (out.firstElementChild) {
        out.removeChild(out.lastElementChild);
    }
    for (const result of results) {
        const row = document.createElement("tr");
        const advanceCell = document.createElement("td");
        const pidCell = document.createElement("td");
        pidCell.classList.add("font-monospace");
        advanceCell.innerText = String(result[0]);
        pidCell.innerText = result[1].toString(16).padStart(8, "0").toUpperCase();
        row.appendChild(advanceCell);
        row.appendChild(pidCell);
        out.appendChild(row);
    }
});
})();
