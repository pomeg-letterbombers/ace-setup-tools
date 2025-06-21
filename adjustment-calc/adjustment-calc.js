"use strict";
(() => {
let csvURL = "../res/JPN_EasyChatSystem.csv";
const easychatData = new Map([[0, {Group: "", Word: ""}]]);
fetch(csvURL)
    .then(response => response.text())
    .then(text => {
        const dArray = text.split('\n').map((x) => x.split(','));
        easychatData.delete(0);
        for (const entry of dArray.slice(1, dArray.length - 1)) {
            easychatData.set(parseInt(entry[0], 16), {Group: entry[1], Word: entry[2]});
        }
    });

const toolForm = document.forms[0];
const out = document.forms[0].elements.namedItem("results");

function calcAdjustment(encryptionKey, oldSpecies, newSpecies, checksumWord) {
    if (typeof encryptionKey !== "number") {
        throw new Error();
    }
    if (typeof oldSpecies !== "number") {
        throw new Error();
    }
    if (typeof newSpecies !== "number") {
        throw new Error();
    }
    if (typeof checksumWord !== "number") {
        throw new Error();
    }
    const checksumDiff = Math.max(oldSpecies, newSpecies) - Math.min(oldSpecies, newSpecies);
    const decryptedValue = checksumWord ^ encryptionKey;
    return checksumDiff + decryptedValue & 0xFFFF;
}

function calcExpAdjustment(baseAdjustment, experience) {
    if (typeof baseAdjustment !== "number") {
        throw new Error();
    }
    if (typeof experience !== "number") {
        throw new Error();
    }
    let newExperience = baseAdjustment;
    while (newExperience < experience) {
        newExperience += 0x10000;
    }
    return newExperience >>> 0;
}

function calcEvAdjustment(baseAdjustment) {
    if (typeof baseAdjustment !== "number") {
        throw new Error();
    }
    const ev1 = (baseAdjustment >>> 0) & 0xFF;
    const ev2 = (baseAdjustment >>> 8) & 0xFF;
    return [ev1, ev2];
}

function filterEasyChat(useUnlockable, usePostElite4) {
    // Word groups are determined by a bit shift right by 9
    const filteredEasyChat = [...easychatData.keys()];
    const UNLOCKABLE_GROUPS = new Set([
        0x0,
        0x11,
        0x12,
        0x13,
        0x14,
        0x15,
    ]);
    const POST_E4_GROUPS = new Set([
        0x0,
        0x11,
        0x12,
        0x13,
        0x14,
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
    return filteredEasyChat;
}

function searchChecksumWords(
    adjustmentType,
    encryptionKey,
    oldSpecies,
    newSpecies,
    useUnlockable,
    usePostElite4,
    experience
) {
    const easychatData = filterEasyChat(useUnlockable, usePostElite4);
    let checksumWord = 0;
    let adjustmentScore = 2**32 - 1 >>> 0;
    switch (adjustmentType) {
        case "experience":
            for (const wordIndex of easychatData) {
                const adjustment = calcAdjustment(encryptionKey, oldSpecies, newSpecies, wordIndex);
                const expAdjustment = calcExpAdjustment(adjustment, experience);
                if (expAdjustment < adjustmentScore) {
                    adjustmentScore = expAdjustment;
                    checksumWord = wordIndex;
                }
            }
            break;
        case "ev":
            for (const wordIndex of easychatData) {
                const adjustment = calcAdjustment(encryptionKey, oldSpecies, newSpecies, wordIndex);
                const evAdjustment = calcEvAdjustment(adjustment);
                const evAdjustmentScore = evAdjustment[0] + evAdjustment[1];
                if (evAdjustmentScore < adjustmentScore) {
                    adjustmentScore = evAdjustmentScore;
                    checksumWord = wordIndex;
                }
            }
            break;
        default:
            throw new Error();
    }
    return checksumWord;
}

for (const radio of toolForm.elements.namedItem("adjustment-type")) {
    radio.addEventListener("input", (e) => {
        if (toolForm.elements.namedItem("adjustment-type").value === "experience") {
            toolForm.querySelector("#experienceInputControl").classList.remove("d-none");
            toolForm.elements.namedItem("experienceInput").disabled = false;    
        } else {
            toolForm.querySelector("#experienceInputControl").classList.add("d-none");
            toolForm.elements.namedItem("experienceInput").value = "";
            toolForm.elements.namedItem("experienceInput").disabled = true;
        }
    });
}

toolForm.elements.namedItem("search-ecs").addEventListener("input", (e) => {
    if (e.target.checked) {
        toolForm.elements.namedItem("checksum-word").value = "";
        toolForm.elements.namedItem("checksum-word").disabled = true;
        toolForm.elements.namedItem("use-unlockable").disabled = false;
    } else {
        toolForm.elements.namedItem("checksum-word").disabled = false;
        toolForm.elements.namedItem("use-unlockable").checked = false;
        toolForm.elements.namedItem("use-post-e4").checked = false;
        toolForm.elements.namedItem("use-unlockable").disabled = true;
        toolForm.elements.namedItem("use-post-e4").disabled = true;
    }
});

toolForm.elements.namedItem("encryption-key").addEventListener("blur", function() {
    const n = Number(this.value);
    if (isNaN(n) || !(n >= 0 && n <= 0xffff)) {
        this.setCustomValidity("Invalid encryption key");
        this.reportValidity();
    } else {
        this.setCustomValidity("");
    }
    document.activeElement.blur();
})

toolForm.elements.namedItem("base-species").addEventListener("blur", function() {
    const n = Number(this.value);
    if (isNaN(n) || !(n >= 0 && n <= 0xffff)) {
        this.setCustomValidity("Invalid species");
        this.reportValidity();
    } else {
        this.setCustomValidity("");
    }
    document.activeElement.blur();
})

toolForm.elements.namedItem("new-species").addEventListener("blur", function() {
    const n = Number(this.value);
    if (isNaN(n) || !(n >= 0 && n <= 0xffff)) {
        this.setCustomValidity("Invalid species");
        this.reportValidity();
    } else {
        this.setCustomValidity("");
    }
    document.activeElement.blur();
})

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
    const adjustmentType = params.get("adjustment-type");
    const encryptionKey = Number(params.get("encryption-key"));
    const oldSpecies = Number(params.get("base-species"));
    const newSpecies = Number(params.get("new-species"));
    let checksumWord = NaN;
    if (params.get("search-ecs")) {
        const useUnlockable = Boolean(params.get("use-unlockable"));
        const usePostElite4 = Boolean(params.get("use-post-e4"));
        checksumWord = searchChecksumWords(
            adjustmentType,
            encryptionKey,
            oldSpecies,
            newSpecies,
            useUnlockable,
            usePostElite4,
            Number(params.get("experience"))
        )
    } else {
        checksumWord = Number(params.get("checksum-word"))
    }
    out.querySelector("#wordindexOut").innerText = "0x" + checksumWord.toString(16).padStart(4, "0").toUpperCase();
    out.querySelector("#wordgroupOut").innerText = easychatData.get(checksumWord).Group;
    out.querySelector("#wordOut").innerText = easychatData.get(checksumWord).Word;
    const baseAdjustment = calcAdjustment(encryptionKey, oldSpecies, newSpecies, checksumWord);
    let adjustment;
    switch (adjustmentType) {
        case "experience":
            adjustment = calcExpAdjustment(baseAdjustment, Number(params.get("experience")));
            out.querySelector("#adjustOut").innerText = String(adjustment) + " experience";
            break;
        case "ev":
            adjustment = calcEvAdjustment(baseAdjustment)
            out.querySelector("#adjustOut").innerText = `\
${adjustment[0]} HP and ${adjustment[1]} Attack \
or ${adjustment[0]} Sp.Attack and ${adjustment[1]} Sp.Defense`
            break;
        default:
            throw new Error();
    }
})

})();
