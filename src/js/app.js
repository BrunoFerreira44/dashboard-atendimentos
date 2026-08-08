(function () {
  const requiredColumns = {
    date: ["data do atendimento", "data", "atendimento"],
    patient: ["nome do paciente", "paciente", "nome"],
    value: ["valor da sessao", "valor da sessão", "valor", "sessao", "sessão"],
  };

  const charts = {};
  const currency = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const number = new Intl.NumberFormat("pt-BR");
  const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
  });
  const fullDateFormatter = new Intl.DateTimeFormat("pt-BR");

  const els = {
    input: document.querySelector("#sheet-input"),
    uploadButton: document.querySelector("#upload-button"),
    demoButton: document.querySelector("#demo-button"),
    emptyState: document.querySelector("#empty-state"),
    dashboard: document.querySelector("#dashboard"),
    toast: document.querySelector("#toast"),
    fileName: document.querySelector("#file-name"),
    dateRange: document.querySelector("#date-range"),
    totalRevenue: document.querySelector("#total-revenue"),
    totalSessions: document.querySelector("#total-sessions"),
    totalPatients: document.querySelector("#total-patients"),
    patientsTable: document.querySelector("#patients-table"),
  };

  if (window.Chart) {
    Chart.defaults.font.family =
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    Chart.defaults.color = "#66736d";
  }

  els.uploadButton.addEventListener("click", () => els.input.click());
  els.input.addEventListener("change", handleFileUpload);
  els.demoButton.addEventListener("click", () => {
    try {
      const rows = createDemoRows();
      renderDashboard(rows, "Dados de exemplo");
    } catch (error) {
      showToast(error.message || "Nao foi possivel montar o exemplo.");
    }
  });

  async function handleFileUpload(event) {
    const [file] = event.target.files;
    if (!file) return;

    try {
      const rows = await readSpreadsheet(file);
      renderDashboard(rows, file.name);
    } catch (error) {
      showToast(error.message || "Nao foi possivel ler a planilha.");
    } finally {
      event.target.value = "";
    }
  }

  async function readSpreadsheet(file) {
    const extension = file.name.split(".").pop().toLowerCase();
    const isGoogleSpreadsheet = file.type === "application/vnd.google-apps.spreadsheet";

    if (extension === "csv") {
      const text = await file.text();
      return parseCsv(text);
    }

    if (!window.XLSX) {
      throw new Error("Biblioteca de leitura do Excel nao carregada. Verifique sua conexao.");
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, {
        cellDates: true,
        dateNF: "dd/mm/yyyy",
        type: "array",
      });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      return XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
    } catch (error) {
      if (isGoogleSpreadsheet) {
        throw new Error("Nao foi possivel ler a planilha do Google Sheets selecionada.");
      }
      throw error;
    }
  }

  function parseCsv(text) {
    const delimiter = (text.match(/;/g) || []).length > (text.match(/,/g) || []).length ? ";" : ",";
    const lines = text
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .filter((line) => line.trim());
    const headers = splitCsvLine(lines.shift() || "", delimiter);

    return lines.map((line) => {
      const values = splitCsvLine(line, delimiter);
      return headers.reduce((row, header, index) => {
        row[header] = values[index] || "";
        return row;
      }, {});
    });
  }

  function splitCsvLine(line, delimiter) {
    const result = [];
    let current = "";
    let insideQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const next = line[index + 1];

      if (char === '"' && next === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === delimiter && !insideQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  function renderDashboard(rawRows, sourceName) {
    const normalized = normalizeRows(rawRows);

    if (!normalized.length) {
      throw new Error("Nao encontrei linhas validas com data, paciente e valor.");
    }

    const analytics = buildAnalytics(normalized);
    els.emptyState.classList.add("is-hidden");
    els.dashboard.classList.remove("is-hidden");
    els.fileName.textContent = sourceName;
    els.dateRange.textContent = `${fullDateFormatter.format(analytics.firstDate)} a ${fullDateFormatter.format(
      analytics.lastDate,
    )}`;

    els.totalRevenue.textContent = currency.format(analytics.totalRevenue);
    els.totalSessions.textContent = number.format(analytics.totalSessions);
    els.totalPatients.textContent = number.format(analytics.patientRows.length);

    renderMonthlyRevenue(analytics.monthlyRows);
    renderPatientRevenue(analytics.patientRows);
    renderMonthlySessions(analytics.monthlyRows);
    renderWeekdays(analytics.weekdayRows);
    renderPatientsTable(analytics.patientRows);
    showToast("Dashboard atualizado.");
  }

  function normalizeRows(rawRows) {
    if (!rawRows.length) return [];

    const headers = Object.keys(rawRows[0]);
    const columnMap = mapColumns(headers);

    if (!columnMap.date || !columnMap.patient || !columnMap.value) {
      throw new Error(
        "A planilha precisa ter as colunas: Data do atendimento, Nome do paciente e Valor da sessao.",
      );
    }

    return rawRows
      .map((row) => {
        const date = parseDate(row[columnMap.date]);
        const patient = String(row[columnMap.patient] || "").trim();
        const value = parseMoney(row[columnMap.value]);
        return { date, patient, value };
      })
      .filter((row) => row.date && row.patient && Number.isFinite(row.value) && row.value > 0)
      .sort((a, b) => a.date - b.date);
  }

  function mapColumns(headers) {
    return Object.entries(requiredColumns).reduce((map, [key, candidates]) => {
      map[key] = headers.find((header) => {
        const normalizedHeader = normalizeText(header);
        return candidates.some((candidate) => {
          const normalizedCandidate = normalizeText(candidate);
          return (
            normalizedHeader === normalizedCandidate ||
            normalizedHeader.includes(normalizedCandidate)
          );
        });
      });
      return map;
    }, {});
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }

  function parseDate(value) {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === "number") {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      excelEpoch.setUTCDate(excelEpoch.getUTCDate() + value);
      return new Date(excelEpoch.getUTCFullYear(), excelEpoch.getUTCMonth(), excelEpoch.getUTCDate());
    }

    const text = String(value || "").trim();
    if (!text) return null;

    const brDate = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (brDate) {
      const [, day, month, year] = brDate;
      const fullYear = year.length === 2 ? `20${year}` : year;
      return new Date(Number(fullYear), Number(month) - 1, Number(day));
    }

    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function parseMoney(value) {
    if (typeof value === "number") return value;

    const sanitized = String(value || "")
      .replace(/[^\d,.-]/g, "")
      .replace(/\.(?=\d{3}(\D|$))/g, "")
      .replace(",", ".");

    return Number.parseFloat(sanitized);
  }

  function buildAnalytics(rows) {
    const patients = new Map();
    const months = new Map();
    const weekdays = new Map([
      ["Seg", { label: "Seg", sessions: 0 }],
      ["Ter", { label: "Ter", sessions: 0 }],
      ["Qua", { label: "Qua", sessions: 0 }],
      ["Qui", { label: "Qui", sessions: 0 }],
      ["Sex", { label: "Sex", sessions: 0 }],
      ["Sab", { label: "Sab", sessions: 0 }],
      ["Dom", { label: "Dom", sessions: 0 }],
    ]);

    rows.forEach((row) => {
      const patient = patients.get(row.patient) || {
        patient: row.patient,
        revenue: 0,
        sessions: 0,
      };
      patient.revenue += row.value;
      patient.sessions += 1;
      patients.set(row.patient, patient);

      const monthKey = `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, "0")}`;
      const month = months.get(monthKey) || {
        key: monthKey,
        label: formatMonth(row.date),
        revenue: 0,
        sessions: 0,
      };
      month.revenue += row.value;
      month.sessions += 1;
      months.set(monthKey, month);

      const weekdayLabel = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"][row.date.getDay()];
      weekdays.get(weekdayLabel).sessions += 1;
    });

    const totalRevenue = rows.reduce((sum, row) => sum + row.value, 0);
    const patientRows = Array.from(patients.values())
      .map((patient) => ({
        ...patient,
        average: patient.revenue / patient.sessions,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      totalRevenue,
      totalSessions: rows.length,
      firstDate: rows[0].date,
      lastDate: rows[rows.length - 1].date,
      patientRows,
      monthlyRows: Array.from(months.values()).sort((a, b) => a.key.localeCompare(b.key)),
      weekdayRows: Array.from(weekdays.values()),
    };
  }

  function formatMonth(date) {
    const label = monthFormatter.format(date).replace(".", "");
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function renderMonthlyRevenue(rows) {
    renderChart("monthly-revenue-chart", {
      type: "line",
      data: {
        labels: rows.map((row) => row.label),
        datasets: [
          {
            label: "Receita",
            data: rows.map((row) => row.revenue),
            borderColor: "#2f8f6b",
            backgroundColor: "rgba(47, 143, 107, 0.12)",
            borderWidth: 3,
            pointBackgroundColor: "#2f8f6b",
            pointRadius: 4,
            tension: 0.36,
            fill: true,
          },
        ],
      },
      options: baseOptions({ moneyAxis: true }),
    });
  }

  function renderPatientRevenue(rows) {
    const topRows = rows.slice(0, 12).reverse();
    renderChart("patient-revenue-chart", {
      type: "bar",
      data: {
        labels: topRows.map((row) => row.patient),
        datasets: [
          {
            label: "Receita",
            data: topRows.map((row) => row.revenue),
            backgroundColor: "#4077b8",
            borderRadius: 6,
            barThickness: 18,
          },
        ],
      },
      options: {
        ...baseOptions({ moneyAxis: true, indexAxis: "y" }),
        indexAxis: "y",
      },
    });
  }

  function renderMonthlySessions(rows) {
    renderChart("monthly-sessions-chart", {
      type: "bar",
      data: {
        labels: rows.map((row) => row.label),
        datasets: [
          {
            label: "Sessoes",
            data: rows.map((row) => row.sessions),
            backgroundColor: "#d06c55",
            borderRadius: 6,
          },
        ],
      },
      options: baseOptions({ integerAxis: true }),
    });
  }

  function renderWeekdays(rows) {
    renderChart("weekday-chart", {
      type: "doughnut",
      data: {
        labels: rows.map((row) => row.label),
        datasets: [
          {
            data: rows.map((row) => row.sessions),
            backgroundColor: ["#2f8f6b", "#4077b8", "#d06c55", "#7a64a8", "#e0a63c", "#66a6a0", "#9a8566"],
            borderColor: "#ffffff",
            borderWidth: 3,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { boxWidth: 12, boxHeight: 12, usePointStyle: true },
          },
          tooltip: {
            callbacks: {
              label: (item) => `${item.label}: ${number.format(item.raw)} sessoes`,
            },
          },
        },
        cutout: "62%",
      },
    });
  }

  function renderPatientsTable(rows) {
    els.patientsTable.innerHTML = rows
      .slice(0, 10)
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.patient)}</td>
            <td>${currency.format(row.revenue)}</td>
            <td>${number.format(row.sessions)}</td>
            <td>${currency.format(row.average)}</td>
          </tr>
        `,
      )
      .join("");
  }

  function baseOptions({ moneyAxis = false, integerAxis = false, indexAxis = "x" } = {}) {
    const valueAxis = indexAxis === "y" ? "x" : "y";
    return {
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#1d2521",
          padding: 12,
          callbacks: {
            label: (item) => {
              const value = moneyAxis ? currency.format(item.raw) : number.format(item.raw);
              return `${item.dataset.label}: ${value}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: indexAxis === "y", color: "#edf0ec" },
          border: { display: false },
          ticks: { precision: integerAxis ? 0 : undefined },
        },
        y: {
          grid: { display: indexAxis !== "y", color: "#edf0ec" },
          border: { display: false },
          ticks: { precision: integerAxis ? 0 : undefined },
        },
        [valueAxis]: {
          grid: { color: "#edf0ec" },
          border: { display: false },
          ticks: {
            precision: integerAxis ? 0 : undefined,
            callback: (value) => (moneyAxis ? compactMoney(value) : number.format(value)),
          },
        },
      },
    };
  }

  function compactMoney(value) {
    if (Math.abs(value) >= 1000) return `R$ ${number.format(Math.round(value / 1000))} mil`;
    return currency.format(value);
  }

  function renderChart(canvasId, config) {
    if (!window.Chart) {
      throw new Error("Biblioteca de graficos nao carregada. Verifique sua conexao.");
    }

    if (charts[canvasId]) charts[canvasId].destroy();
    const context = document.querySelector(`#${canvasId}`).getContext("2d");
    charts[canvasId] = new Chart(context, config);
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      els.toast.classList.remove("is-visible");
    }, 3200);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => {
      const replacements = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      };
      return replacements[char];
    });
  }

  function createDemoRows() {
    const patients = [
      ["Ana Martins", 180],
      ["Bruno Lopes", 220],
      ["Carla Nunes", 200],
      ["Diego Ramos", 180],
      ["Elisa Rocha", 240],
      ["Fabio Lima", 190],
      ["Giovana Reis", 210],
      ["Helena Prado", 230],
    ];
    const rows = [];
    const today = new Date();

    for (let monthsAgo = 8; monthsAgo >= 0; monthsAgo -= 1) {
      patients.forEach(([patient, baseValue], index) => {
        const sessions = 1 + ((index + monthsAgo) % 3);
        for (let session = 0; session < sessions; session += 1) {
          rows.push({
            "Data do atendimento": new Date(
              today.getFullYear(),
              today.getMonth() - monthsAgo,
              3 + index * 3 + session,
            ),
            "Nome do paciente": patient,
            "Valor da sessao": baseValue + ((monthsAgo + session) % 2) * 20,
          });
        }
      });
    }

    return rows;
  }
})();
