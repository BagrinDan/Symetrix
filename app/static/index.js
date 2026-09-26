let actions = [];
let transcript = [];
let meetings = [];

let timer = null;
let seconds = 0;
let selectedFile = null;

const qs = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];

function toast(message) {
    qs("#toast").textContent = message;
    qs("#toast").classList.remove("hidden");

    setTimeout(() => {
        qs("#toast").classList.add("hidden");
    }, 1600);
}


// Navigare între pagini
qsa("[data-view]").forEach(button => {
    button.onclick = () => {
        qsa(".view").forEach(view => view.classList.remove("active"));

        qs("#view-" + button.dataset.view).classList.add("active");

        qsa("[data-view]").forEach(item => {
            item.classList.remove("active");
        });

        button.classList.add("active");
    };
});


// Navigare între taburile Results
qsa("[data-tab]").forEach(button => {
    button.onclick = () => {
        qsa("[data-tab]").forEach(item => {
            item.classList.remove("active");
        });

        qsa(".panel").forEach(panel => {
            panel.classList.remove("active");
        });

        button.classList.add("active");

        qs("#panel-" + button.dataset.tab).classList.add("active");
    };
});


// Adăugare participant
qs("#participantInput").onkeydown = e => {
    if (e.key === "Enter" && e.target.value.trim()) {
        const chip = document.createElement("span");

        chip.className = "chip";

        chip.innerHTML =
            e.target.value.trim() + ' <button>×</button>';

        qs("#chips").appendChild(chip);

        e.target.value = "";
    }
};


// Ștergere participant
qs("#chips").onclick = e => {
    if (e.target.tagName === "BUTTON") {
        e.target.parentElement.remove();
    }
};


// Selectare fișier
qs("#chooseFile").onclick = () => {
    qs("#fileInput").click();
};


qs("#fileInput").onchange = () => {
    selectedFile = qs("#fileInput").files[0] || null;

    qs("#audioName").textContent =
        selectedFile?.name || "No file selected";

    reset();
};


// Drag and drop
["dragenter", "dragover"].forEach(eventName => {
    qs("#drop").addEventListener(eventName, e => {
        e.preventDefault();

        qs("#drop").classList.add("drag");
    });
});


["dragleave", "drop"].forEach(eventName => {
    qs("#drop").addEventListener(eventName, e => {
        e.preventDefault();

        qs("#drop").classList.remove("drag");
    });
});


qs("#drop").ondrop = e => {
    const file = e.dataTransfer.files[0];

    if (file) {
        selectedFile = file;

        qs("#audioName").textContent = file.name;
    }

    reset();
};


// Timer pentru recording
function fmt(value) {
    return (
        String(Math.floor(value / 60)).padStart(2, "0") +
        ":" +
        String(value % 60).padStart(2, "0")
    );
}


qs("#record").onclick = () => {
    seconds = 0;

    qs("#recbox").classList.remove("hidden");
    qs("#readybox").classList.add("hidden");

    qs("#timer").textContent = "00:00";

    clearInterval(timer);

    timer = setInterval(() => {
        seconds++;

        qs("#timer").textContent = fmt(seconds);
    }, 1000);

    reset();
};


qs("#stop").onclick = () => {
    clearInterval(timer);

    qs("#recbox").classList.add("hidden");

    qs("#readybox").classList.remove("hidden");

    qs("#duration").textContent = fmt(seconds);

    qs("#audioName").textContent =
        "Recording_" +
        fmt(seconds).replace(":", "-") +
        ".webm";
};


function discard() {
    clearInterval(timer);

    seconds = 0;

    selectedFile = null;

    qs("#recbox").classList.add("hidden");

    qs("#readybox").classList.add("hidden");

    qs("#audioName").textContent =
        "No file selected";
}


qs("#discard").onclick = discard;

qs("#deleteRec").onclick = discard;

qs("#previewRec").onclick = () => {
    toast("Recording preview simulated");
};


// Reset procesare
function reset() {
    qsa(".step").forEach((step, index) => {
        step.classList.remove(
            "done",
            "current"
        );

        if (index === 0) {
            step.classList.add("done");
        }
    });

    qs("#results").classList.add("hidden");
}


// Speakerii se adaugă automat din transcript
function updateSpeakers() {
    const speakerSelect = qs("#speaker");

    if (!speakerSelect) {
        return;
    }

    const current = speakerSelect.value;

    const speakers = [
        ...new Set(
            transcript
                .map(item => item.speaker)
                .filter(Boolean)
        )
    ];

    speakerSelect.innerHTML =
        '<option value="all">All speakers</option>' +
        speakers
            .map(name =>
                `<option value="${name}">${name}</option>`
            )
            .join("");

    if (speakers.includes(current)) {
        speakerSelect.value = current;
    }
}


// Summary
function setSummary(text) {
    const summary = qs("#panel-summary p");

    if (summary) {
        summary.textContent =
            text || "No summary generated yet.";
    }
}


// Curățare date demo
function clearDemoContent() {
    actions = [];

    transcript = [];

    meetings = [];

    setSummary(
        "No summary generated yet."
    );

    const decisionsBody =
        qs("#decisionsBody") ||
        qs("#panel-decisions tbody");

    if (decisionsBody) {
        decisionsBody.innerHTML = "";
    }

    const chips = qs("#chips");

    if (chips) {
        chips.innerHTML = "";
    }

    const emailTo = qs("#emailTo");

    const emailSubject =
        qs("#emailSubject");

    const emailMessage =
        qs("#emailMessage");

    if (emailTo) {
        emailTo.value = "";
    }

    if (emailSubject) {
        emailSubject.value = "";
    }

    if (emailMessage) {
        emailMessage.value = "";
    }

    const p1 = qs("#p1");

    const p2 = qs("#p2");

    const p3 = qs("#p3");

    if (p1) {
        p1.textContent =
            "Email preview will appear after processing.";
    }

    if (p2) {
        p2.textContent = "";
    }

    if (p3) {
        p3.textContent = "";
    }

    updateSpeakers();

    renderActions();

    renderTranscript();

    renderMeetings();
}


// Process meeting
qs("#process").onclick = async () => {
    const file = selectedFile;

    if (!file) {
        toast(
            "Select an audio file first"
        );

        return;
    }

    reset();

    const steps = qsa(".step");

    try {
        const formData =
            new FormData();

        formData.append(
            "file",
            file
        );

        if (steps[1]) {
            steps[1].classList.add(
                "current"
            );
        }

        const response =
            await fetch(
                "/api/process",
                {
                    method: "POST",
                    body: formData
                }
            );

        if (!response.ok) {
            throw new Error(
                "Processing failed"
            );
        }

        const data =
            await response.json();

        if (steps[1]) {
            steps[1].classList.remove(
                "current"
            );

            steps[1].classList.add(
                "done"
            );
        }

        for (
            let i = 2;
            i < steps.length;
            i++
        ) {
            steps[i].classList.add(
                "current"
            );

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        600
                    )
            );

            steps[i].classList.remove(
                "current"
            );

            steps[i].classList.add(
                "done"
            );
        }

        setSummary(
            data.summary
        );

        if (
            Array.isArray(
                data.actions
            )
        ) {
            actions =
                data.actions;
        }

        if (
            Array.isArray(
                data.transcript
            )
        ) {
            transcript =
                data.transcript;
        }

        if (
            Array.isArray(
                data.meetings
            )
        ) {
            meetings =
                data.meetings;
        }

        updateSpeakers();

        renderActions();

        renderTranscript();

        renderMeetings();

        qs("#results")
            .classList
            .remove("hidden");

        qs("#results")
            .scrollIntoView({
                behavior: "smooth"
            });

        toast(
            "Processing completed"
        );

    } catch (error) {
        console.error(error);

        toast(
            "Processing error"
        );
    }
};


// Action Items
function renderActions() {
    const search =
        qs("#aSearch")
            .value
            .toLowerCase();

    const filter =
        qs("#aFilter").value;

    let rows =
        actions.filter(item => {
            const text =
                (
                    item.task +
                    " " +
                    item.owner +
                    " " +
                    item.status
                ).toLowerCase();

            return (
                text.includes(search) &&
                (
                    filter === "all" ||
                    item.priority === filter
                )
            );
        });

    if (
        qs("#aSort").value ===
        "deadline"
    ) {
        rows = [...rows].sort(
            (a, b) =>
                String(
                    a.deadline || ""
                ).localeCompare(
                    String(
                        b.deadline || ""
                    )
                )
        );
    }

    if (
        qs("#aSort").value ===
        "owner"
    ) {
        rows = [...rows].sort(
            (a, b) =>
                String(
                    a.owner || ""
                ).localeCompare(
                    String(
                        b.owner || ""
                    )
                )
        );
    }

    qs("#aBody").innerHTML =
        rows.map(item => `
            <tr>

                <td>
                    ${item.id ?? ""}
                </td>

                <td>
                    ${item.task ?? ""}
                </td>

                <td>
                    ${item.owner ?? ""}
                </td>

                <td>
                    ${item.label ?? ""}
                </td>

                <td>

                    <span class="pill ${
            item.priority === "high"
                ? "red"
                : "amber"
        }">

                        ${item.priority ?? ""}

                    </span>

                </td>

                <td>

                    <span class="pill ${
            item.status ===
            "In progress"
                ? "blue"
                : "gray"
        }">

                        ${item.status ?? ""}

                    </span>

                </td>

                <td>

                    <button
                        class="jump"
                        data-time="${
            item.evidence ?? ""
        }"
                    >

                        ${
            item.evidence ?? ""
        }

                    </button>

                </td>

            </tr>
        `).join("");

    qs("#aEmpty")
        .classList
        .toggle(
            "hidden",
            rows.length > 0
        );
}


["input", "change"].forEach(
    eventName => {

        qs("#aSearch")
            .addEventListener(
                eventName,
                renderActions
            );

        qs("#aFilter")
            .addEventListener(
                eventName,
                renderActions
            );

        qs("#aSort")
            .addEventListener(
                eventName,
                renderActions
            );
    }
);


// Export CSV
qs("#aExport").onclick = () => {
    if (actions.length === 0) {
        toast(
            "No action items to export"
        );

        return;
    }

    const csv = [
        [
            "Action Item",
            "Owner",
            "Deadline",
            "Priority",
            "Status",
            "Evidence"
        ],

        ...actions.map(item => [
            item.task,
            item.owner,
            item.label,
            item.priority,
            item.status,
            item.evidence
        ])
    ]
        .map(row =>
            row.map(value =>
                `"${String(
                    value ?? ""
                ).replaceAll(
                    '"',
                    '""'
                )}"`
            ).join(",")
        )
        .join("\n");

    const url =
        URL.createObjectURL(
            new Blob(
                [csv],
                {
                    type: "text/csv"
                }
            )
        );

    const link =
        document.createElement(
            "a"
        );

    link.href = url;

    link.download =
        "medmeet_action_items.csv";

    link.click();

    URL.revokeObjectURL(
        url
    );
};


// Transcript
function renderTranscript() {
    const search =
        qs("#tSearch")
            .value
            .toLowerCase();

    const speaker =
        qs("#speaker").value;

    const language =
        qs("#lang").value;

    const rows =
        transcript.filter(item => {

            const text =
                (
                    item.text +
                    " " +
                    item.speaker +
                    " " +
                    item.lang
                ).toLowerCase();

            return (
                text.includes(search) &&
                (
                    speaker === "all" ||
                    item.speaker ===
                    speaker
                ) &&
                (
                    language === "all" ||
                    item.lang ===
                    language
                )
            );
        });

    qs("#tList").innerHTML =
        rows.map(item => `
            <div
                class="transcriptline"
                data-time="${
            item.time
        }"
            >

                <time>
                    ${
            item.time ?? ""
        }
                </time>

                <b>
                    ${
            item.speaker ?? ""
        }
                </b>

                <span
                    class="lang ${
            item.lang === "EN"
                ? "en"
                : item.lang === "RU"
                    ? "ru"
                    : ""
        }"
                >

                    ${
            item.lang ?? ""
        }

                </span>

                <p>
                    ${
            item.text ?? ""
        }
                </p>

            </div>
        `).join("");

    qs("#tEmpty")
        .classList
        .toggle(
            "hidden",
            rows.length > 0
        );
}


["input", "change"].forEach(
    eventName => {

        qs("#tSearch")
            .addEventListener(
                eventName,
                renderTranscript
            );

        qs("#speaker")
            .addEventListener(
                eventName,
                renderTranscript
            );

        qs("#lang")
            .addEventListener(
                eventName,
                renderTranscript
            );
    }
);


// Jump din Action Item în Transcript
document.addEventListener(
    "click",
    e => {

        if (
            !e.target
                .classList
                .contains("jump")
        ) {
            return;
        }

        qs(
            '[data-tab="transcript"]'
        ).click();

        qs("#tSearch").value = "";

        qs("#speaker").value =
            "all";

        qs("#lang").value =
            "all";

        renderTranscript();

        const line =
            qsa(
                ".transcriptline"
            ).find(
                item =>
                    item.dataset.time ===
                    e.target.dataset.time
            );

        if (line) {
            line.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            line.style.background =
                "#fff7d5";

            setTimeout(() => {
                line.style.background =
                    "";
            }, 1500);
        }
    }
);


// Edit email
qs("#editEmail").onclick = () => {

    [
        "#emailTo",
        "#emailSubject",
        "#emailMessage"
    ].forEach(id => {

        qs(id).readOnly =
            false;
    });

    qs("#editActions")
        .classList
        .remove("hidden");

    qs("#editEmail")
        .classList
        .add("hidden");
};


// Cancel edit email
qs("#cancelEmail").onclick = () => {

    [
        "#emailTo",
        "#emailSubject",
        "#emailMessage"
    ].forEach(id => {

        qs(id).readOnly =
            true;
    });

    qs("#editActions")
        .classList
        .add("hidden");

    qs("#editEmail")
        .classList
        .remove("hidden");
};


// Save email
qs("#saveEmail").onclick = () => {

    [
        "#emailTo",
        "#emailSubject",
        "#emailMessage"
    ].forEach(id => {

        qs(id).readOnly =
            true;
    });

    const paragraphs =
        qs("#emailMessage")
            .value
            .split(/\n\s*\n/);

    qs("#p1").textContent =
        paragraphs[0] || "";

    qs("#p2").textContent =
        paragraphs[1] || "";

    qs("#p3").innerHTML =
        (
            paragraphs
                .slice(2)
                .join("<br><br>") ||
            ""
        ).replace(
            /\n/g,
            "<br>"
        );

    qs("#editActions")
        .classList
        .add("hidden");

    qs("#editEmail")
        .classList
        .remove("hidden");

    toast(
        "Email updated"
    );
};


qs("#send").onclick = () => {
    toast(
        "Email sent through local workflow"
    );
};


// Meetings
function renderMeetings() {
    const search =
        qs("#mSearch")
            .value
            .toLowerCase();

    const filter =
        qs("#mFilter").value;

    const rows =
        meetings.filter(item => {

            const text =
                (
                    item.title +
                    " " +
                    item.type +
                    " " +
                    item.participants
                ).toLowerCase();

            return (
                text.includes(search) &&
                (
                    filter === "all" ||
                    item.type ===
                    filter
                )
            );
        });

    if (rows.length === 0) {

        qs("#mList").innerHTML =
            '<div class="empty">No meetings available.</div>';

        return;
    }

    qs("#mList").innerHTML =
        rows.map(item => `
            <div class="meetingrow">

                <div>

                    <b>
                        ${
            item.title ?? ""
        }
                    </b>

                    <br>

                    <small>
                        ${
            item.type ?? ""
        }
                    </small>

                </div>

                <div>
                    ${
            item.type ?? ""
        }
                </div>

                <div>
                    ${
            item.date ?? ""
        }
                </div>

                <div>
                    ${
            item.duration ?? ""
        }
                </div>

                <div>
                    ${
            item.participants ?? ""
        }
                </div>

                <button
                    class="btn soft"
                >
                    Open
                </button>

            </div>
        `).join("");
}


qs("#mSearch").oninput =
    renderMeetings;

qs("#mFilter").onchange =
    renderMeetings;


// Settings
qs("#defaultType").onchange = e => {

    if (
        e.target.value !==
        "Ask each time"
    ) {
        qs("#meetingType").value =
            e.target.value;
    }

    toast(
        "Default meeting type updated"
    );
};


qs("#autoSummary").onchange =
    () => {

        toast(
            "Preference saved"
        );
    };


// Inițializare
clearDemoContent();

reset();