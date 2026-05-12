// ═══════════════════════════════════════════════════════════
//  RDC Floor Card  v4.8.0 - BADGES & RÉSUMÉ
// ═══════════════════════════════════════════════════════════

const CATS = [
  {
    key: "eclairages",   label: "Eclairages",   icon: "mdi:lightbulb-outline",
    activeLabel: "allumé",  inactiveLabel: "éteint",
    activeColor: "#fbbf24",
  },
  {
    key: "ouvertures",   label: "Ouvertures",   icon: "mdi:door-open",
    activeLabel: "ouvert",  inactiveLabel: "fermé",
    activeColor: "#f87171",
  },
  {
    key: "temperatures", label: "Températures", icon: "mdi:thermometer",
    activeLabel: null,       inactiveLabel: null,   // pas d'état on/off
    activeColor: "#34d399",
  },
  {
    key: "prises",       label: "Prises",       icon: "mdi:power-socket-eu",
    activeLabel: "allumée",  inactiveLabel: "éteinte",
    activeColor: "#a78bfa",
  },
  {
    key: "securite",     label: "Sécurité",     icon: "mdi:shield-home-outline",
    activeLabel: "actif",    inactiveLabel: "inactif",
    activeColor: "#38bdf8",
  },
];

const ACTIVE_STATES = ["on", "open", "locked", "unlocked"];

// Pluriel simple FR
function plural(n, word) {
  return n <= 1 ? `${n} ${word}` : `${n} ${word}s`;
}

// ════════════════════════════════════════════════════════════
//  CARTE PRINCIPALE
// ════════════════════════════════════════════════════════════

class RdcFloorCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._tab  = "eclairages";
    this._hass = null;
    this._cfg  = null;
  }

  static getConfigElement() { return document.createElement("rdc-floor-card-editor"); }

  static getStubConfig() {
    return {
      title: "Rez-de-Chaussée",
      eclairages: [], ouvertures: [], temperatures: [], prises: [], securite: [],
    };
  }

  getCardSize() { return 4; }

  setConfig(c) {
    if (!c) throw new Error("Configuration invalide");
    this._cfg = c;
  }

  set hass(h) {
    this._hass = h;
    if (!this.shadowRoot.querySelector(".card")) {
      this._render();
    } else {
      this._update();
    }
  }

  // ── Helpers ───────────────────────────────────────────────

  _getEnt(e) {
    if (!e) return "";
    return typeof e === "string" ? e : (e.entity || "");
  }

  _getLab(e, st) {
    if (typeof e === "object" && e.label) return e.label;
    return st?.attributes?.friendly_name || this._getEnt(e).split(".")[1] || "Inconnu";
  }

  // Retourne { active, total } par catégorie
  _getStats() {
    const out = {};
    CATS.forEach(c => {
      const ents = this._cfg[c.key] || [];
      let active = 0, total = 0;
      ents.forEach(e => {
        const id = this._getEnt(e);
        if (!id) return;
        total++;
        const st = this._hass?.states[id];
        if (st && ACTIVE_STATES.includes(st.state)) active++;
      });
      out[c.key] = { active, total };
    });
    return out;
  }

  // Texte affiché dans le badge d'un onglet
  _tabBadgeText(cat, stats) {
    const s = stats[cat.key];
    if (!s || s.total === 0) return "0";
    if (cat.activeLabel === null) return `${s.total}`; // températures
    return `${s.active} / ${s.total}`;
  }

  // HTML du chip résumé dans le header
  _headerChipHtml(cat, stats) {
    const s = stats[cat.key];
    if (!s || s.total === 0) return "";   // catégorie vide : on n'affiche pas

    let text;
    if (cat.activeLabel === null) {
      // Températures : juste le nombre de capteurs
      text = `<span class="chip-val">${plural(s.total, "capteur")}</span>`;
    } else if (s.active === 0) {
      text = `<span class="chip-off">${plural(s.total, cat.inactiveLabel)}</span>`;
    } else if (s.active === s.total) {
      text = `<span class="chip-on" style="color:${cat.activeColor}">${plural(s.active, cat.activeLabel)}</span>`;
    } else {
      text = `<span class="chip-on" style="color:${cat.activeColor}">${s.active} ${cat.activeLabel}${s.active > 1 ? "s" : ""}</span>`
           + `<span class="chip-sep">·</span>`
           + `<span class="chip-off">${s.total - s.active} ${cat.inactiveLabel}${(s.total - s.active) > 1 ? "s" : ""}</span>`;
    }

    return `
      <div class="hchip" data-hchip="${cat.key}">
        <ha-icon icon="${cat.icon}" class="hchip-icon" style="--mdc-icon-size:15px;color:${cat.activeColor}"></ha-icon>
        ${text}
      </div>`;
  }

  // ── Mise à jour légère (états + badges, sans re-rendre) ───

  _update() {
    if (!this._hass || !this.shadowRoot) return;

    // 1. Tuiles de l'onglet courant
    (this._cfg[this._tab] || []).forEach(e => {
      const id   = this._getEnt(e);
      const st   = this._hass.states[id];
      const tile = this.shadowRoot.querySelector(`[data-id="${id}"]`);
      if (!tile || !st) return;
      tile.classList.toggle("active", ACTIVE_STATES.includes(st.state));
      const v = tile.querySelector(".val");
      if (v) v.textContent = st.attributes.unit_of_measurement
        ? `${st.state}${st.attributes.unit_of_measurement}` : st.state;
    });

    // 2. Badges des onglets + chips du header
    const stats = this._getStats();
    CATS.forEach(cat => {
      // Badge onglet
      const badge = this.shadowRoot.querySelector(`[data-badge="${cat.key}"]`);
      if (badge) {
        const s = stats[cat.key];
        badge.textContent = this._tabBadgeText(cat, stats);
        badge.classList.toggle("badge-active", s && s.active > 0);
      }
      // Chip header
      const chip = this.shadowRoot.querySelector(`[data-hchip="${cat.key}"]`);
      if (chip) chip.outerHTML = this._headerChipHtml(cat, stats);
    });
  }

  // ── Rendu complet ─────────────────────────────────────────

  _render() {
    if (!this._hass || !this._cfg) return;

    const stats = this._getStats();

    const tabsHtml = CATS.map(cat => {
      const s    = stats[cat.key];
      const text = this._tabBadgeText(cat, stats);
      const hasActive = s && s.active > 0;
      return `
        <div class="tab ${this._tab === cat.key ? "active" : ""}" data-tab="${cat.key}">
          <ha-icon icon="${cat.icon}"></ha-icon>
          <span>${this._cfg["label_" + cat.key] || cat.label}</span>
          <span class="badge ${hasActive ? "badge-active" : ""}" data-badge="${cat.key}">${text}</span>
        </div>`;
    }).join("");

    const headerChips = CATS.map(cat => this._headerChipHtml(cat, stats)).join("");

    const gridHtml = (this._cfg[this._tab] || []).map(e => {
      const id = this._getEnt(e);
      if (!id) return "";
      const st     = this._hass.states[id];
      const name   = this._getLab(e, st);
      const active = st && ACTIVE_STATES.includes(st.state);
      const icon   = st?.attributes?.icon
        || (id.startsWith("light")  ? "mdi:lightbulb"
          : id.startsWith("cover")  ? "mdi:window-shutter"
          : id.startsWith("lock")   ? "mdi:lock"
          : id.startsWith("switch") ? "mdi:toggle-switch"
          : "mdi:circle-medium");
      const val = st
        ? (st.attributes.unit_of_measurement
            ? `${st.state}${st.attributes.unit_of_measurement}` : st.state)
        : "---";
      return `
        <div class="tile${active ? " active" : ""}" data-id="${id}">
          <ha-icon icon="${icon}" class="tile-icon"></ha-icon>
          <div class="info">
            <div class="name">${name}</div>
            <div class="val">${val}</div>
          </div>
        </div>`;
    }).join("");

    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; width:100%; }
        .card { background:#020617; border-radius:28px; padding:24px; color:white; width:100%; box-sizing:border-box; }

        /* ── Header ── */
        .header { margin-bottom:22px; }
        .title  { font-size:1.8rem; font-weight:800; color:#f8fafc; margin-bottom:10px; }
        .header-chips {
          display:flex; flex-wrap:wrap; gap:8px;
        }
        .hchip {
          display:inline-flex; align-items:center; gap:5px;
          background:#1e293b; border-radius:20px; padding:5px 12px;
          font-size:.82rem; font-weight:600;
        }
        .chip-on  { font-weight:700; }
        .chip-off { color:#64748b; }
        .chip-val { color:#94a3b8; }
        .chip-sep { color:#334155; margin:0 1px; }

        /* ── Onglets ── */
        .tabs { display:flex; gap:12px; margin-bottom:25px; overflow-x:auto; padding-bottom:8px; }
        .tab  {
          padding:14px 20px; background:#1e293b; border-radius:16px;
          display:flex; align-items:center; gap:10px;
          cursor:pointer; white-space:nowrap; transition:background .2s;
        }
        .tab.active { background:#38bdf8; color:#020617; }
        .tab span   { font-size:1rem; font-weight:700; }

        /* Badge dans l'onglet */
        .badge {
          margin-left:2px; padding:3px 9px;
          background:rgba(255,255,255,.08);
          border-radius:20px; font-size:.78rem; font-weight:700;
          color:#64748b; transition:background .2s, color .2s;
          min-width:28px; text-align:center;
        }
        .tab.active .badge { background:rgba(2,6,23,.18); color:#0c4a6e; }
        .badge.badge-active { background:rgba(245,158,11,.18); color:#fbbf24; }
        .tab.active .badge.badge-active { background:rgba(2,6,23,.25); color:#92400e; }

        /* ── Grille tuiles ── */
        .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:16px; }
        .tile {
          background:#1e293b; padding:22px; border-radius:20px;
          display:flex; align-items:center; gap:18px; cursor:pointer;
          border:1px solid rgba(255,255,255,.05);
          transition:background .2s, border-color .2s;
        }
        .tile.active { border-color:#f59e0b; background:rgba(245,158,11,.12); }
        .tile-icon { --mdc-icon-size:32px; color:#6b8aaa; }
        .tile.active .tile-icon { color:#f59e0b; }
        .info { min-width:0; }
        .name { font-size:1.15rem; font-weight:600; color:#f1f5f9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .val  { font-size:1rem; color:#94a3b8; font-weight:500; text-transform:capitalize; }
        [data-id*="temperature"] .val,[data-id*="thermometer"] .val { font-size:1.6rem; color:#34d399; font-weight:800; }

        /* ── Scrollbar ── */
        .tabs::-webkit-scrollbar { height:4px; }
        .tabs::-webkit-scrollbar-thumb { background:#334155; border-radius:10px; }
      </style>
      <div class="card">
        <div class="header">
          <div class="title">${this._cfg.title || "Rez-de-Chaussée"}</div>
          <div class="header-chips">${headerChips}</div>
        </div>
        <div class="tabs">${tabsHtml}</div>
        <div class="grid">${gridHtml}</div>
      </div>`;

    this.shadowRoot.querySelectorAll(".tab").forEach(t => {
      t.onclick = () => { this._tab = t.dataset.tab; this._render(); };
    });

    this.shadowRoot.querySelectorAll(".tile").forEach(t => {
      t.onclick = () => {
        const id = t.dataset.id, domain = id.split(".")[0];
        if (["light","switch"].includes(domain)) {
          this._hass.callService(domain, "toggle", { entity_id: id });
        } else if (domain === "cover") {
          const s = this._hass.states[id]?.state;
          this._hass.callService("cover", s === "open" ? "close_cover" : "open_cover", { entity_id: id });
        } else if (domain === "lock") {
          const s = this._hass.states[id]?.state;
          this._hass.callService("lock", s === "locked" ? "unlock" : "lock", { entity_id: id });
        } else {
          this.dispatchEvent(new CustomEvent("hass-more-info", { detail:{ entityId:id }, bubbles:true, composed:true }));
        }
      };
    });
  }
}

// ════════════════════════════════════════════════════════════
//  ÉDITEUR VISUEL
// ════════════════════════════════════════════════════════════

class RdcFloorCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._tab  = "eclairages";
    this._hass = null;
    this._cfg  = null;
  }

  set hass(h) {
    this._hass = h;
    this.shadowRoot.querySelectorAll("ha-entity-picker").forEach(p => { p.hass = h; });
  }

  setConfig(c) {
    this._cfg = JSON.parse(JSON.stringify(c));
    this._render();
  }

  _fire() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._cfg },
      bubbles: true,
      composed: true,
    }));
  }

  _render() {
    if (!this._cfg) return;
    const cat  = CATS.find(c => c.key === this._tab);
    const ents = this._cfg[this._tab] || [];

    const tabBtns = CATS.map(c => {
      const count = (this._cfg[c.key] || []).filter(e => {
        const id = typeof e === "string" ? e : (e?.entity || "");
        return !!id;
      }).length;
      return `
        <button class="etab ${this._tab === c.key ? "active" : ""}" data-tab="${c.key}">
          <ha-icon icon="${c.icon}"></ha-icon>
          <span>${c.label}</span>
          ${count > 0 ? `<span class="ecount">${count}</span>` : ""}
        </button>`;
    }).join("");

    const rows = ents.map((e, i) => {
      const lab = typeof e === "object" ? (e.label || "") : "";
      return `
        <div class="erow" data-index="${i}">
          <div class="picker-wrap" data-index="${i}"></div>
          <input class="label-input" type="text"
            placeholder="Label personnalisé…"
            value="${lab.replace(/"/g, "&quot;")}"
            data-index="${i}" />
          <button class="del-btn" data-index="${i}" title="Supprimer">
            <ha-icon icon="mdi:delete-outline"></ha-icon>
          </button>
        </div>`;
    }).join("");

    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; font-family:var(--primary-font-family,sans-serif); }
        .section { margin-bottom:20px; }
        .section-title {
          font-size:.72rem; font-weight:700; letter-spacing:.09em;
          text-transform:uppercase; color:var(--secondary-text-color,#888);
          margin-bottom:10px;
        }
        .full-input {
          width:100%; box-sizing:border-box; padding:10px 14px;
          background:var(--card-background-color,#fff);
          border:1px solid var(--divider-color,#e0e0e0);
          border-radius:10px; font-size:1rem;
          color:var(--primary-text-color,#212121);
          outline:none; transition:border-color .2s;
        }
        .full-input:focus { border-color:var(--primary-color,#03a9f4); }
        .etabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
        .etab {
          display:flex; align-items:center; gap:6px;
          padding:8px 14px;
          border:1px solid var(--divider-color,#e0e0e0);
          border-radius:20px; background:transparent; cursor:pointer;
          color:var(--primary-text-color); font-size:.88rem; font-weight:600;
          transition:background .15s, border-color .15s;
        }
        .etab:hover { background:var(--secondary-background-color,#f5f5f5); }
        .etab.active {
          background:var(--primary-color,#03a9f4);
          border-color:var(--primary-color,#03a9f4); color:#fff;
        }
        .etab ha-icon { --mdc-icon-size:17px; }
        .ecount {
          background:var(--primary-color,#03a9f4); color:#fff;
          font-size:.7rem; font-weight:700; padding:1px 7px;
          border-radius:20px;
        }
        .etab.active .ecount { background:rgba(255,255,255,.3); color:#fff; }
        .rename-row { display:flex; align-items:center; gap:10px; }
        .rename-prefix { font-size:.82rem; color:var(--secondary-text-color,#888); white-space:nowrap; }
        .rename-input {
          flex:1; padding:8px 12px;
          background:var(--card-background-color,#fff);
          border:1px solid var(--divider-color,#e0e0e0);
          border-radius:8px; font-size:.9rem;
          color:var(--primary-text-color,#212121); outline:none;
        }
        .rename-input:focus { border-color:var(--primary-color,#03a9f4); }
        hr { border:none; border-top:1px solid var(--divider-color,#e0e0e0); margin:18px 0; }
        .entity-list { display:flex; flex-direction:column; gap:10px; }
        .erow { display:flex; align-items:center; gap:8px; }
        .picker-wrap { flex:1.6; min-width:0; }
        .label-input {
          flex:1; min-width:0; padding:10px 12px;
          background:var(--card-background-color,#fff);
          border:1px solid var(--divider-color,#e0e0e0);
          border-radius:8px; font-size:.9rem;
          color:var(--primary-text-color,#212121); outline:none;
        }
        .label-input:focus { border-color:var(--primary-color,#03a9f4); }
        .del-btn {
          flex-shrink:0; background:transparent; border:none; cursor:pointer;
          color:var(--error-color,#f44336); padding:7px; border-radius:8px;
          display:flex; align-items:center; transition:background .15s;
        }
        .del-btn:hover { background:rgba(244,67,54,.1); }
        .del-btn ha-icon { --mdc-icon-size:20px; }
        .add-btn {
          display:flex; align-items:center; justify-content:center; gap:8px;
          width:100%; padding:10px 18px; margin-top:6px;
          border:1.5px dashed var(--primary-color,#03a9f4);
          border-radius:10px; background:transparent; cursor:pointer;
          color:var(--primary-color,#03a9f4); font-size:.92rem; font-weight:600;
          transition:background .15s;
        }
        .add-btn:hover { background:rgba(3,169,244,.07); }
        .add-btn ha-icon { --mdc-icon-size:20px; }
        .count-badge {
          display:inline-block; margin-left:6px;
          background:var(--primary-color,#03a9f4); color:#fff;
          font-size:.7rem; font-weight:700; padding:1px 7px;
          border-radius:20px; vertical-align:middle;
        }
      </style>

      <div class="section">
        <div class="section-title">Titre de la carte</div>
        <input id="card-title" class="full-input" type="text"
          placeholder="Rez-de-Chaussée"
          value="${(this._cfg.title || "").replace(/"/g, "&quot;")}" />
      </div>
      <hr />
      <div class="section">
        <div class="section-title">Catégorie</div>
        <div class="etabs">${tabBtns}</div>
        <div class="rename-row">
          <span class="rename-prefix">Renommer l'onglet :</span>
          <input class="rename-input" id="tab-label" type="text"
            placeholder="${cat.label}"
            value="${(this._cfg["label_" + this._tab] || "").replace(/"/g, "&quot;")}" />
        </div>
      </div>
      <hr />
      <div class="section">
        <div class="section-title">
          Entités — ${this._cfg["label_" + this._tab] || cat.label}
          <span class="count-badge">${ents.length}</span>
        </div>
        <div class="entity-list" id="entity-list">${rows}</div>
        <button class="add-btn" id="add-btn">
          <ha-icon icon="mdi:plus-circle-outline"></ha-icon>
          Ajouter une entité
        </button>
      </div>`;

    // Injecter les ha-entity-picker
    this.shadowRoot.querySelectorAll(".picker-wrap").forEach(wrap => {
      const idx    = parseInt(wrap.dataset.index, 10);
      const e      = ents[idx];
      const id     = typeof e === "string" ? e : (e?.entity || "");
      const picker = document.createElement("ha-entity-picker");
      picker.hass  = this._hass;
      picker.value = id;
      picker.allowCustomEntity = false;
      picker.style.cssText = "display:block;width:100%;";
      picker.addEventListener("value-changed", ev => {
        ev.stopPropagation();
        this._setEntity(idx, ev.detail.value);
      });
      wrap.appendChild(picker);
    });

    this.shadowRoot.getElementById("card-title").addEventListener("input", ev => {
      this._cfg = { ...this._cfg, title: ev.target.value };
      this._fire();
    });

    this.shadowRoot.getElementById("tab-label").addEventListener("input", ev => {
      this._cfg = { ...this._cfg, ["label_" + this._tab]: ev.target.value };
      this._fire();
    });

    this.shadowRoot.querySelectorAll(".etab").forEach(btn => {
      btn.addEventListener("click", () => { this._tab = btn.dataset.tab; this._render(); });
    });

    this.shadowRoot.querySelectorAll(".label-input").forEach(inp => {
      inp.addEventListener("input", ev => {
        this._setLabel(parseInt(ev.target.dataset.index, 10), ev.target.value);
      });
    });

    this.shadowRoot.querySelectorAll(".del-btn").forEach(btn => {
      btn.addEventListener("click", ev => {
        ev.stopPropagation();
        const list = [...(this._cfg[this._tab] || [])];
        list.splice(parseInt(btn.dataset.index, 10), 1);
        this._cfg = { ...this._cfg, [this._tab]: list };
        this._fire(); this._render();
      });
    });

    this.shadowRoot.getElementById("add-btn").addEventListener("click", () => {
      const list = [...(this._cfg[this._tab] || []), ""];
      this._cfg = { ...this._cfg, [this._tab]: list };
      this._fire(); this._render();
      setTimeout(() => {
        const pickers = this.shadowRoot.querySelectorAll("ha-entity-picker");
        pickers[pickers.length - 1]?.focus?.();
      }, 60);
    });
  }

  _setEntity(idx, newId) {
    const list = [...(this._cfg[this._tab] || [])];
    const cur  = list[idx];
    list[idx]  = (typeof cur === "object" && cur.label)
      ? { entity: newId, label: cur.label } : newId;
    this._cfg = { ...this._cfg, [this._tab]: list };
    this._fire();
  }

  _setLabel(idx, newLabel) {
    const list = [...(this._cfg[this._tab] || [])];
    const cur  = list[idx];
    const id   = typeof cur === "string" ? cur : (cur?.entity || "");
    list[idx]  = newLabel ? { entity: id, label: newLabel } : id;
    this._cfg  = { ...this._cfg, [this._tab]: list };
    this._fire();
  }
}

// ════════════════════════════════════════════════════════════
//  ENREGISTREMENT
// ════════════════════════════════════════════════════════════

customElements.define("rdc-floor-card",        RdcFloorCard);
customElements.define("rdc-floor-card-editor", RdcFloorCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type:        "rdc-floor-card",
  name:        "RDC Floor Card",
  description: "Carte multi-onglets pour le rez-de-chaussée",
  preview:     false,
});
