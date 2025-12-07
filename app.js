// app.js
const CONFIG = {
  SHEET_ID: "1PwWhUZr7WDYCKRusbGpM5hPUinxM9mtSG6uVECSaiuI", // your sheet id
  TAB_NAME: "Mappings", // sheet tab name
};

// column names from your sheet / JSON
const COLS = {
  franchise: "Franchise (series)",
  format1: "Content format 1",
  volume: "volume/season",
  seq: "sequence number",
  title: 'title (chapter, not official title, just like "chapter 2")',
  format2: "Content format 2",

  // LN-side columns – adjust these if your headers are different
  lnVolume: "LN volume/season",
  lnSeq: "LN sequence number",
  lnTitle: 'LN title (chapter, not official title, just like "chapter 2")',
  notes: "Notes",
};

document.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("status");
  const tableBody = document.querySelector("#chaptersTable tbody");
  const seriesFilter = document.getElementById("seriesFilter");
  const searchInput = document.getElementById("searchInput");
  const seriesTitle = document.getElementById("seriesTitle");
  const detailSection = document.getElementById("detailSection");
  const detailContent = document.getElementById("detailContent");

  let allRows = [];
  let currentSeries = null;
  let lastSelectedRowEl = null;

  async function loadData() {
    try {
      statusEl.textContent = "Loading data…";

      const url = `https://opensheet.elk.sh/${CONFIG.SHEET_ID}/${encodeURIComponent(
        CONFIG.TAB_NAME
      )}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // only manga rows with a sequence number
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
    seriesTitle.textContent = currentSeries
      ? `${currentSeries} – Chapters`
      : "Chapters";

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

    // compute duplicate counts for manga and LN titles
    const mangaTitleCounts = rows.reduce((acc, row) => {
      const t = row[COLS.title] || "";
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});

    const lnTitleCounts = rows.reduce((acc, row) => {
      const t = row[COLS.lnTitle] || "";
      if (!t) return acc;
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});

    // apply search filter (matches seq or either title)
    if (searchTerm) {
      rows = rows.filter((row) => {
        const seq = String(row[COLS.seq] || "").toLowerCase();
        const title = String(row[COLS.title] || "").toLowerCase();
        const lnTitle = String(row[COLS.lnTitle] || "").toLowerCase();
        return (
          seq.includes(searchTerm) ||
          title.includes(searchTerm) ||
          lnTitle.includes(searchTerm)
        );
      });
    }

    renderTable(rows, mangaTitleCounts, lnTitleCounts);
  }

  function renderTable(rows, mangaTitleCounts, lnTitleCounts) {
    tableBody.innerHTML = "";
    lastSelectedRowEl = null;
    detailContent.innerHTML =
      "<p>Select a row in the table to see more information.</p>";
    detailSection.classList.add("hidden");

    if (rows.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 6;
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
      const lnVolume = row[COLS.lnVolume] || "";
      const lnSeq = row[COLS.lnSeq] || "";
      const lnTitle = row[COLS.lnTitle] || "";
      const isMangaDup = mangaTitleCounts[title] > 1;
      const isLnDup = lnTitle && lnTitleCounts[lnTitle] > 1;

      // #
      const tdSeq = document.createElement("td");
      tdSeq.textContent = seq;
      tr.appendChild(tdSeq);

      // Manga vol
      const tdMangaVol = document.createElement("td");
      tdMangaVol.textContent = volume;
      tr.appendChild(tdMangaVol);

      // Manga title + duplicate badge
      const tdMangaTitle = document.createElement("td");
      tdMangaTitle.textContent = title;
      if (isMangaDup) {
        const badge = document.createElement("span");
        badge.className = "badge-duplicate";
        badge.textContent = `x${mangaTitleCounts[title]}`;
        tdMangaTitle.appendChild(badge);
      }
      tr.appendChild(tdMangaTitle);

      // LN vol
      const tdLnVol = document.createElement("td");
      tdLnVol.textContent = lnVolume || "–";
      tr.appendChild(tdLnVol);

      // LN title + duplicate badge
      const tdLnTitle = document.createElement("td");
      tdLnTitle.textContent = lnTitle || "–";
      if (isLnDup) {
        const badge = document.createElement("span");
        badge.className = "badge-duplicate badge-ln-dup";
        badge.textContent = `x${lnTitleCounts[lnTitle]}`;
        tdLnTitle.appendChild(badge);
      }
      tr.appendChild(tdLnTitle);

      // Format
      const tdFmt = document.createElement("td");
      tdFmt.textContent = format1;
      tdFmt.classList.add("col-format");
      tr.appendChild(tdFmt);

      // click handler for detail view
      tr.addEventListener("click", () => {
        if (lastSelectedRowEl) {
          lastSelectedRowEl.classList.remove("selected-row");
        }
        tr.classList.add("selected-row");
        lastSelectedRowEl = tr;
        showDetails(row, mangaTitleCounts, lnTitleCounts);
      });

      tableBody.appendChild(tr);
    }
  }

  function showDetails(row, mangaTitleCounts, lnTitleCounts) {
    const seq = row[COLS.seq] || "";
    const volume = row[COLS.volume] || "";
    const title = row[COLS.title] || "";
    const lnVolume = row[COLS.lnVolume] || "";
    const lnSeq = row[COLS.lnSeq] || "";
    const lnTitle = row[COLS.lnTitle] || "";
    const notes = row[COLS.notes] || "";
    const series = row[COLS.franchise] || "";
    const format1 = row[COLS.format1] || "";
    const format2 = row[COLS.format2] || "";

    const mangaDupCount = mangaTitleCounts[title] || 1;
    const lnDupCount = lnTitle ? lnTitleCounts[lnTitle] || 1 : 1;

    let duplicationInfo = "";
    if (mangaDupCount > 1) {
      duplicationInfo += `<p><span class="detail-label">Manga duplication:</span> This manga chapter label appears in <span class="detail-value">${mangaDupCount}</span> mapping rows (compression / expansion zone).</p>`;
    }
    if (lnTitle && lnDupCount > 1) {
      duplicationInfo += `<p><span class="detail-label">LN duplication:</span> This LN chapter label appears in <span class="detail-value">${lnDupCount}</span> mapping rows.</p>`;
    }
    if (!duplicationInfo) {
      duplicationInfo =
        '<p><span class="detail-label">Duplication:</span> No duplicates detected for this chapter label.</p>';
    }

    detailContent.innerHTML = `
      <p><span class="detail-label">Series:</span> <span class="detail-value">${series}</span></p>

      <p><span class="detail-label">Manga:</span>
        <span class="detail-value">
          Volume ${volume || "?"}, sequence #${seq || "?"}, ${title || "(no title)"}
        </span>
      </p>

      <p><span class="detail-label">LN mapping:</span>
        <span class="detail-value">
          ${
            lnTitle
              ? `Volume ${lnVolume || "?"}, sequence #${lnSeq || "?"}, ${lnTitle}`
              : "No LN mapping info provided for this row."
          }
        </span>
      </p>

      <p><span class="detail-label">Formats:</span>
        <span class="detail-value">${format1 || "?"} → ${format2 || "??"}</span>
      </p>

      ${duplicationInfo}

      <p><span class="detail-label">Notes:</span>
        <span class="detail-value">${notes || "—"}</span>
      </p>
    `;

    detailSection.classList.remove("hidden");
  }

  loadData();
});
