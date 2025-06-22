"use strict";
(() => {
let csvURL = "../res/JPN_EasyChatSystem.csv";
const easychatData = new Map([[0, {Group: "", Word: ""}]]);
const fireredData = new Map([[0, 0]]);
const leafgreenData = new Map([[0, 0]]);
const EV_ADJUST_ORDERS = new Set([8, 22]);
const EXP_ADJUST_ORDERS = new Set([6, 7, 12, 13, 18, 19]);
const POKEMON_STROAGE_ADDR = 0x0202924c;
const PID_SUBSTRUCTURE_ORDERS = [
    'GAEM',
    'GAME',
    'GEAM',
    'GEMA',
    'GMAE',
    'GMEA',
    'AGEM',
    'AGME',
    'AEGM',
    'AEMG',
    'AMGE',
    'AMEG',
    'EGAM',
    'EGMA',
    'EAGM',
    'EAMG',
    'EMGA',
    'EMAG',
    'MGAE',
    'MGEA',
    'MAGE',
    'MAEG',
    'MEGA',
    'MEAG',
];

fetch(csvURL)
    .then(response => response.text())
    .then(text => {
        const dArray = text.split('\n').map((x) => x.split(','));
        easychatData.delete(0);
        for (const entry of dArray.slice(1, dArray.length - 1)) {
            easychatData.set(parseInt(entry[0], 16), {Group: entry[1], Word: entry[2]});
        }
    });
csvURL = "../res/FireRed_Species.csv";
fetch(csvURL)
    .then(response => response.text())
    .then(text => {
        const dArray = text.split('\n').map((x) => x.split(','));
        fireredData.delete(0);
        for (const entry of dArray.slice(1, dArray.length - 1)) {
            fireredData.set(parseInt(entry[0], 16), parseInt(entry[1], 16));
        }
    });
csvURL = "../res/LeafGreen_Species.csv";
fetch(csvURL)
    .then(response => response.text())
    .then(text => {
        const dArray = text.split('\n').map((x) => x.split(','));
        leafgreenData.delete(0);
        for (const entry of dArray.slice(1, dArray.length - 1)) {
            leafgreenData.set(parseInt(entry[0], 16), parseInt(entry[1], 16));
        }
    });

const toolForm = document.forms[0];
const out = toolForm.elements.namedItem("resultsOutput");

function filterEasyChat(useUnlockable, usePostElite4) {
    // Word groups are determined by a bit shift right by 9
    const filteredEasyChat = [...easychatData.keys()];
    const UNLOCKABLE_GROUPS = new Set([
        0x0,    // POKÉMON2
        0x11,   // EVENTS
        0x12,   // MOVE 1
        0x13,   // MOVE 2
        0x15,   // POKÉMON
    ]);
    const POST_E4_GROUPS = new Set([
        0x0,    // POKÉMON2
        0x11,   // EVENTS
        0x12,   // MOVE 1
        0x13,   // MOVE 2
    ]);
    const POST_E4_INDEX = (() => {
        const POKEMON2_GROUP = 0x15 << 9
        const indexes = new Set();
            indexes.add(POKEMON2_GROUP | 146); // Moltres, can only be reached from Sevii Islands
            // Exclude MEWTWO to CELEBII
            for (let i = 150; i <= 251; i++) {
                indexes.add(POKEMON2_GROUP | i);
            }
            return indexes;
    })();
    const filteredGroups = new Set();
    const filteredIndexes = new Set();
    if (!useUnlockable) {
        for (const group of UNLOCKABLE_GROUPS) {
            filteredGroups.add(group);
        }
    } else if (!usePostElite4) {
        for (const group of POST_E4_GROUPS) {
            filteredGroups.add(group);
        }
        for (const index of POST_E4_INDEX) {
            filteredIndexes.add(index);
        }
    }
    for (let i = filteredEasyChat.length - 1; i >= 0; i--) {
        if (
            filteredGroups.has(filteredEasyChat[i] >>> 9)
            || filteredIndexes.has(filteredEasyChat[i])
        ) {
            filteredEasyChat.splice(i, 1);
        }
    }
    return new Set(filteredEasyChat);
}

function getAdjustmentType(pid) {
    if (typeof pid !== "number") {
        throw new Error();
    }
    const pmod = (pid >>> 0) % 24;
    if (EV_ADJUST_ORDERS.has(pmod)) {
        return "EV";
    }
    if (EXP_ADJUST_ORDERS.has(pmod)) {
        return "Experience"
    }
    return "";
}

function findSpeciesWord(encryptionKey, targetSpeciesList, wordList) {
    if (!(
        typeof encryptionKey === "number"
        && targetSpeciesList.constructor === Map
        && wordList.constructor === Set
    )) {
        throw new Error();
    }
    const words = [[0, 0]];
    words.pop();
    for (const speciesIndex of targetSpeciesList.keys()) {
        if (typeof speciesIndex !== "number") {
            throw new Error();
        }
        const encryptedSpecies = speciesIndex ^ encryptionKey;
        if (wordList.has(encryptedSpecies)) {
            words.push([speciesIndex, encryptedSpecies]);
        }
    }
    return words;
}

function calculateBoxLocation(entrypoint) {
    if (typeof entrypoint !== "number") {
        throw new Error();
    }
    const offset = ((entrypoint & 0x0203ffff)
                    - (POKEMON_STROAGE_ADDR + 4 + 124));
    const boxNumber = Math.floor(Math.floor(offset / 80) / 30) + 1;
    const slotNumber = Math.floor(offset / 80) % 30 + 1;
    return [boxNumber, slotNumber];
}

toolForm.elements.namedItem("pid").addEventListener("input", function() {
    this.setCustomValidity("");
});

toolForm.elements.namedItem("pid").addEventListener("blur", function() {
    const n = Number(this.value);
    if (isNaN(n) || !(n >= 0 && n <= 0xffffffff)) {
        this.setCustomValidity("Invalid personality value");
        this.reportValidity();
    } else {
        this.setCustomValidity("");
    }
    document.activeElement.blur();
});

toolForm.elements.namedItem("use-unlockable").addEventListener("input", (e) => {
    if (e.target.checked) {
        toolForm.elements.namedItem("use-post-e4").disabled = false;
    } else {
        toolForm.elements.namedItem("use-post-e4").checked = false;
        toolForm.elements.namedItem("use-post-e4").disabled = true;
    }
});

toolForm.onsubmit = () => false;
toolForm.addEventListener("submit", function(e) {
    e.preventDefault();
    const params = new FormData(toolForm);
    const pid = Number(params.get("pid"));
    const tid = Number(params.get("tid"));
    const gameVersion = params.get("game-version");
    let speciesList;
    switch (gameVersion) {
        case "firered":
            speciesList = fireredData;
            break;
        case "leafgreen":
            speciesList = leafgreenData;
            break
        default:
            throw new Error("");
    }
    const encryptionKey = ((pid >>> 0) ^ (tid >>> 0)) & 0xffff;
    const adjustmentType = getAdjustmentType(pid);
    const words = adjustmentType !== ""
                    ? findSpeciesWord(
                        encryptionKey,
                        speciesList,
                        filterEasyChat(
                            Boolean(params.get("use-unlockable")),
                            Boolean(params.get("use-post-e4"))
                        )
                    )
                    : [];
    const outPidorder = out.querySelector("#pidorderOut");
    const outEncrypt = out.querySelector("#encryptionOut");
    const outAdjust = out.querySelector("#adjustOut");
    const outTable = out.querySelector("#resultsTableBody");
    while (outTable.firstElementChild) {
        outTable.removeChild(outTable.lastElementChild);
    }
    for (const word of words) {
        const entrypoint = calculateBoxLocation(speciesList.get(word[0]));
        const row = document.createElement("tr");
        const speciesCell = document.createElement("td");
        const entrypointCell = document.createElement("td");
        const wordIndexCell = document.createElement("td");
        const wordGroupCell = document.createElement("td");
        const wordCell = document.createElement("td");
        speciesCell.innerText = "0x" + word[0].toString(16).padStart(4, "0").toUpperCase();
        entrypointCell.innerText = `Box ${entrypoint[0]} - Slot ${entrypoint[1]}`;
        wordIndexCell.innerText = "0x" + word[1].toString(16).padStart(4, "0").toUpperCase();
        wordGroupCell.innerText = easychatData.get(word[1]).Group;
        wordCell.innerText = easychatData.get(word[1]).Word;
        row.appendChild(speciesCell);
        row.appendChild(entrypointCell);
        row.appendChild(wordIndexCell);
        row.appendChild(wordGroupCell);
        row.appendChild(wordCell);
        outTable.appendChild(row);
    }
    outPidorder.innerText = `${(pid >>> 0) % 24} [${PID_SUBSTRUCTURE_ORDERS[(pid >>> 0) % 24]}]`;
    outEncrypt.innerText = "0x" + encryptionKey.toString(16).padStart(4, "0").toUpperCase();
    outAdjust.innerText = adjustmentType !== "" ? adjustmentType : "None";
})

})();
