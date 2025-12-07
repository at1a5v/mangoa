// app.js
const CONFIG = {
  SHEET_ID: "1PwWhUZr7WDYCKRusbGpM5hPUinxM9mtSG6uVECSaiuI", // your sheet id
  TAB_NAME: "Mappings", // change if your tab has a different name
};

// column names from your sheet / JSON
const COLS = {
  franchise: "Franchise (series)",
  format1: "Content format 1",
  volume: "volume/season",
  seq: "sequence number",
  title: 'title (chapter, not official title, just like "chapter 2")',
  format2: "Content format 2",
};

document.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("status");
  const tableBody = document.querySelector("#chaptersTable tbody");
  const seriesFilter = document.getElementById("seriesFilter");
  const searchInput = document.getElementById("searchInput");
  const seriesTitle = document.getElementById("seriesTitle");

  let allRows = [];
  let currentSeries = null;

  async function loadData() {
    try {
      statusEl.textContent = "Loading data…";

      const url = `https://opensheet.elk.sh/${CONFIG.SHEET_ID}/${encodeURIComponent(
        CONFIG.TAB_NAME
      )}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // basic sanity filter: keep manga rows only
      allRows = data.filter(
        (row) =>
          row[COLS.format1] &&
          row[COLS.format1].toLowerCase() === "manga" &&
          row[COLS.seq]
      );

      setupSeriesFilter();
      updateView();
      statusEl.textContent = "";
    } catch (err) {
      console.error(err);
      statusEl.textContent =
        "Failed to load data from Google Sheets. Check console for details.";
    }
  }

  function setupSeriesFilter() {
    const seriesSet = new Set(
      allRows.map((row) => row[COLS.franchise] || "Unknown series")
    );
    const seriesList = Array.from(seriesSet).sort();

    seriesFilter.innerHTML = "";
    for (const name of seriesList) {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      seriesFilter.appendChild(opt);
    }

    currentSeries = seriesList[0] || null;
    seriesFilter.value = currentSeries || "";
    seriesTitle.textContent = currentSeries ? `${currentSeries} – Chapters` : "Chapters";

    seriesFilter.addEventListener("change", () => {
      currentSeries = seriesFilter.value;
      seriesTitle.textContent = `${currentSeries} – Chapters`;
      updateView();
    });

    searchInput.addEventListener("input", () => {
      updateView();
    });
  }

  function updateView() {
    const searchTerm = searchInput.value.trim().toLowerCase();

    // filter by series
    let rows = allRows.filter((row) => row[COLS.franchise] === currentSeries);

    // sort by numeric sequence
    rows.sort(
      (a, b) => Number(a[COLS.seq] || 0) - Number(b[COLS.seq] || 0)
    );

    // compute duplicate title counts for this series
    const titleCounts = rows.reduce((acc, row) => {
      const t = row[COLS.title] || "";
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});

    // apply search filter (matches seq or title)
    if (searchTerm) {
      rows = rows.filter((row) => {
        const seq = String(row[COLS.seq] || "").toLowerCase();
        const title = String(row[COLS.title] || "").toLowerCase();
        return seq.includes(searchTerm) || title.includes(searchTerm);
      });
    }

    renderTable(rows, titleCounts);
  }

  function renderTable(rows, titleCounts) {
    tableBody.innerHTML = "";

    if (rows.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 4;
      td.textContent = "No chapters match your filters.";
      tr.appendChild(td);
      tableBody.appendChild(tr);
      return;
    }

    for (const row of rows) {
      const tr = document.createElement("tr");

      const seq = row[COLS.seq] || "";
      const volume = row[COLS.volume] || "";
      const title = row[COLS.title] || "";
      const format1 = row[COLS.format1] || "";
      const isDuplicate = titleCounts[title] > 1;

      // sequence #
      const tdSeq = document.createElement("td");
      tdSeq.textContent = seq;
      tr.appendChild(tdSeq);

      // volume
      const tdVolume = document.createElement("td");
      tdVolume.textContent = volume;
      tr.appendChild(tdVolume);

      // title + duplicate badge
      const tdTitle = document.createElement("td");
      tdTitle.textContent = title;
      if (isDuplicate) {
        const badge = document.createElement("span");
        badge.className = "badge-duplicate";
        badge.textContent = `x${titleCounts[title]}`;
        tdTitle.appendChild(badge);
      }
      tr.appendChild(tdTitle);

      // format
      const tdFmt = document.createElement("td");
      tdFmt.textContent = format1;
      tr.appendChild(tdFmt);

      tableBody.appendChild(tr);
    }
  }

  loadData();
});
