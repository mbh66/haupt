// Letter Book components for michaelhaupt.com (Quartz 5 local plugin).
// Plain ES modules with preact's JSX runtime, so no build step is needed:
// edit this file, rebuild the site.
import { jsx, Fragment } from "preact/jsx-runtime"
import { readFileSync } from "fs"
import { join } from "path"

const h = (type, props, ...children) =>
  jsx(type, { ...(props || {}), children: children.length === 1 ? children[0] : children })

// ---------- shared helpers ----------

const DEFAULTS = {
  siteName: "Michael Haupt",
  nav: { "Letter Book": "/", About: "about" },
  place: "Greyton, Valley of Grace",
  ledgerFoot: "Results vary with rainfall.",
  ledgerPage: "letters/index",
  ledgerHeading: null,
  lettersFolder: "letters",
  authorPage: "about-the-author",
  copyrightHolder: "Michael Haupt",
  licence: { name: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" },
  links: {},
}
const withDefaults = (opts) => ({ ...DEFAULTS, ...(opts || {}) })

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

function toDate(v) {
  if (!v) return null
  if (v instanceof Date) return isNaN(v) ? null : v
  const d = new Date(String(v))
  return isNaN(d) ? null : d
}
const fmtLong = (d) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
const fmtShort = (d) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`

function rootPath(slug) {
  const depth = (slug || "").split("/").length - 1
  return depth > 0 ? "../".repeat(depth).slice(0, -1) : "."
}
function href(fromSlug, target) {
  if (/^(https?:|mailto:)/.test(target)) return target
  const t = target === "/" || target === "index" ? "" : target.replace(/^\//, "")
  return `${rootPath(fromSlug)}/${t}`
}

const isLetter = (slug, folder) =>
  !!slug && slug.startsWith(folder + "/") && !slug.endsWith("/index") && slug !== folder + "/index"

const STATUS = {
  replied: { label: "Replied", tone: "green" },
  acknowledged: { label: "Acknowledged", tone: "red" },
  declined: { label: "Declined", tone: "grey" },
  "no-reply": { label: "No reply yet", tone: "dashed" },
  sent: { label: "Sent", tone: "red" },
}

// ---------- Masthead ----------

const mastheadCss = `
.masthead { display:flex; justify-content:space-between; align-items:baseline; gap:1.5rem; flex-wrap:wrap;
  border-bottom:1px solid var(--dark); padding-bottom:.6rem; width:100%; }
.masthead .mast-name { font-family:var(--headerFont); font-size:2rem; color:var(--dark); text-decoration:none;
  background:none; padding:0; font-weight:400; line-height:1.1; }
.masthead nav { display:flex; gap:1.4rem; flex-wrap:wrap; font-size:1rem; }
.masthead nav a { color:var(--gray); background:none; padding:0 0 1px; font-weight:400; border-bottom:1px solid transparent; }
.masthead nav a:hover { color:var(--secondary); }
.masthead nav a.active { color:var(--secondary); border-bottom-color:var(--gold); }
.masthead.letter-mode { justify-content:flex-end; border-bottom-color:var(--lightgray); }
`

export const Masthead = (rawOpts) => {
  const opts = withDefaults(rawOpts)
  const C = ({ fileData }) => {
    const slug = fileData.slug
    const letter = isLetter(slug, opts.lettersFolder)
    const items = Object.entries(opts.nav).map(([label, target]) => {
      const t = target.replace(/^\//, "")
      const base = t.replace(/\/index$/, "").replace(/\/$/, "")
      const active =
        t === "" ? slug === "index" : slug === base || slug.startsWith(base + "/")
      return h("a", { href: href(slug, target), class: active ? "active internal" : "internal" }, label)
    })
    return h(
      "div",
      { class: letter ? "masthead letter-mode" : "masthead" },
      letter ? null : h("a", { class: "mast-name internal", href: href(slug, "/") }, opts.siteName),
      h("nav", { "aria-label": "Site" }, items),
    )
  }
  C.css = mastheadCss
  return C
}

// ---------- Letterhead (letter pages only) ----------

const letterheadCss = `
.letterhead { text-align:center; margin:2.2rem 0 0; }
.letterhead .lh-name { font-family:"IM Fell English SC", var(--headerFont); font-size:1.7rem; letter-spacing:.06em; color:var(--dark); }
.letterhead .lh-domain { font-size:.78rem; letter-spacing:.14em; color:var(--gray); text-transform:uppercase; margin-top:.1rem; }
.letterhead .lh-rule { border-top:1px solid var(--gold); border-bottom:1px solid var(--gold); height:2px; margin:.8rem auto 0; width:min(28rem, 70%); }
.letter-meta { display:flex; justify-content:space-between; align-items:center; gap:1rem; margin:2.2rem 0 1.4rem; }
.letter-meta .place-date { text-align:right; color:var(--gray); line-height:1.5; margin-left:auto; }
.docket { display:inline-block; font-family:"IM Fell English SC", var(--headerFont); letter-spacing:.08em; line-height:1.35;
  border:2px solid var(--stamp-red); color:var(--stamp-red); border-radius:3px; padding:.4rem .8rem; transform:rotate(-6deg);
  text-align:center; text-transform:uppercase; font-size:.85rem; opacity:.9; }
.docket.tone-green { border-color:var(--secondary); color:var(--secondary); }
.docket.tone-grey { border-color:var(--gray); color:var(--gray); }
.docket.tone-dashed { border-color:var(--gray); color:var(--gray); border-style:dashed; }
@media (max-width: 800px) { .letter-meta { flex-direction:column-reverse; align-items:flex-end; } }
`

export const Letterhead = (rawOpts) => {
  const opts = withDefaults(rawOpts)
  const C = ({ fileData, cfg }) => {
    if (!isLetter(fileData.slug, opts.lettersFolder)) return null
    const fm = fileData.frontmatter || {}
    const sent = toDate(fm.sent)
    const st = STATUS[fm.status] || null
    const statusDate = toDate(fm.status_date)
    const stampLines = []
    if (sent) stampLines.push(`Sent · ${fmtShort(sent)}`)
    if (st && fm.status !== "sent") stampLines.push(statusDate ? `${st.label} · ${fmtShort(statusDate)}` : st.label)
    return h(
      Fragment,
      null,
      h(
        "div",
        { class: "letterhead" },
        h("div", { class: "lh-name" }, opts.siteName),
        h("div", { class: "lh-domain" }, cfg.baseUrl || ""),
        h("div", { class: "lh-rule" }),
      ),
      h(
        "div",
        { class: "letter-meta" },
        stampLines.length
          ? h("div", { class: `docket tone-${st ? st.tone : "red"}` }, stampLines.flatMap((l, i) => (i ? [h("br"), l] : [l])))
          : null,
        h("div", { class: "place-date" }, fm.place || opts.place, h("br"), sent ? fmtLong(sent) : ""),
      ),
    )
  }
  C.css = letterheadCss
  return C
}

// ---------- Ledger (home page only) ----------

const ledgerCss = `
.letter-actions { display:flex; gap:1.4rem; flex-wrap:wrap; margin-top:1.6rem; font-size:.95rem; }
.ledger { margin-top:1.5rem; }
.ledger-head { display:flex; justify-content:space-between; align-items:baseline; border-bottom:1px solid var(--gold); padding-bottom:.4rem; }
.ledger-head h2 { font-family:"IM Fell English SC", var(--headerFont); font-weight:400; font-size:1.7rem; letter-spacing:.06em; margin:0; color:var(--dark); }
.ledger-head .tally { color:var(--gray); font-size:.9rem; }
.ledger ol { list-style:none; margin:0; padding:0; }
.ledger li { display:grid; grid-template-columns:4.5rem 8rem minmax(0,1fr) auto; gap:1.2rem; align-items:center;
  padding:1rem 0; border-bottom:1px solid var(--lightgray); margin:0; }
.ledger .no { font-family:"IM Fell English SC", var(--headerFont); color:var(--gray); }
.ledger .sent { color:var(--gray); font-size:.95rem; }
.ledger .to a { font-size:1.2rem; color:var(--dark); background:none; padding:0; font-weight:400; }
.ledger .to a:hover { color:var(--secondary); }
.ledger .to small { display:block; color:var(--gray); font-size:.88rem; margin-top:.15rem; }
.ledger .docket { font-size:.75rem; padding:.2rem .6rem; transform:rotate(-4deg); border-width:1.5px; }
.ledger .empty { color:var(--gray); font-style:italic; padding:1rem 0; }
.ledger-foot { margin-top:2.5rem; color:var(--gray); font-style:italic; }
@media (max-width: 800px) {
  .ledger li { grid-template-columns:3.5rem minmax(0,1fr); row-gap:.3rem; }
  .ledger .no { grid-column:1; grid-row:1; }
  .ledger .sent { grid-column:2; grid-row:1; }
  .ledger .to { grid-column:1 / -1; grid-row:3; }
  .ledger .stamp { grid-column:1 / -1; grid-row:4; }
  .ledger .docket { transform:rotate(-2deg); }
}
`

export const Ledger = (rawOpts) => {
  const opts = withDefaults(rawOpts)
  const C = ({ fileData, allFiles, cfg }) => {
    if (isLetter(fileData.slug, opts.lettersFolder)) {
      // Letter pages: the two links the private version does not carry.
      const fm = fileData.frontmatter || {}
      const url = `https://${cfg.baseUrl}/${fileData.slug}`
      const subject = encodeURIComponent(`A letter worth forwarding: ${fm.title || ""}`)
      const body = encodeURIComponent(`I thought of you when I read this letter:\n\n${url}\n`)
      return h(
        "div",
        { class: "letter-actions" },
        h("a", { class: "external", href: `mailto:?subject=${subject}&body=${body}` }, "Forward this letter"),
        h("a", { class: "internal", href: href(fileData.slug, fm.template || "write-your-own") }, "Write your own"),
      )
    }
    if (fileData.slug !== opts.ledgerPage) return null
    const letters = (allFiles || [])
      .filter((f) => isLetter(f.slug, opts.lettersFolder))
      .filter((f) => (f.frontmatter?.status || "") !== "sent")
      .sort((a, b) => (Number(b.frontmatter?.number) || 0) - (Number(a.frontmatter?.number) || 0))
    const replied = letters.filter((f) => f.frontmatter?.status === "replied").length
    const rows = letters.map((f) => {
      const fm = f.frontmatter || {}
      const sent = toDate(fm.sent)
      const st = STATUS[fm.status] || STATUS["no-reply"]
      const sub = [fm.layer ? fm.layer[0].toUpperCase() + fm.layer.slice(1) : null, fm.audience].filter(Boolean).join(" · ")
      return h(
        "li",
        null,
        h("span", { class: "no" }, fm.number ? `No. ${fm.number}` : ""),
        h("span", { class: "sent" }, sent ? fmtShort(sent) : ""),
        h("span", { class: "to" }, h("a", { class: "internal", href: href(fileData.slug, f.slug) }, fm.title || f.slug), sub ? h("small", null, sub) : null),
        h("span", { class: "stamp" }, h("span", { class: `docket tone-${st.tone}` }, st.label)),
      )
    })
    return h(
      "section",
      { class: "ledger", "aria-label": "Letters and their status" },
      h(
        "div",
        { class: "ledger-head" },
        opts.ledgerHeading ? h("h2", { id: "letter-book-heading" }, opts.ledgerHeading) : h("span"),
        h("span", { class: "tally" }, `${letters.length} published · ${replied} replied`),
      ),
      letters.length ? h("ol", null, rows) : h("p", { class: "empty" }, "The first letters are in the post."),
      opts.ledgerFoot ? h("p", { class: "ledger-foot" }, opts.ledgerFoot) : null,
    )
  }
  C.css = ledgerCss
  return C
}

// ---------- Author block and base line (every page) ----------

function readAuthorFile(name) {
  try {
    const raw = readFileSync(join(process.cwd(), "content", `${name}.md`), "utf-8")
    const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
    const fm = {}
    let body = raw
    if (m) {
      body = m[2]
      for (const line of m[1].split("\n")) {
        const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/)
        if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, "")
      }
    }
    const paras = body
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p && !p.startsWith("#") && !p.startsWith("<!--"))
    return { fm, paras }
  } catch {
    return { fm: {}, paras: [] }
  }
}

// Minimal inline markdown: [text](url), [[target|text]], *italic*
function inline(text, slug) {
  const out = []
  const re = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]|\[([^\]]+)\]\(([^)]+)\)|\*([^*]+)\*/g
  let last = 0
  let m
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1]) out.push(h("a", { class: "internal", href: href(slug, m[1]) }, m[2] || m[1]))
    else if (m[3]) out.push(h("a", { href: href(slug, m[4]), class: /^https?:/.test(m[4]) ? "external" : "internal" }, m[3]))
    else out.push(h("em", null, m[5]))
    last = re.lastIndex
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}


// Single-colour brand marks (24x24), from Simple Icons (CC0). Drawn inline so no
// request goes to the networks. Add a network: one entry here, one line in the config.
const SOCIAL_ICONS = {
  LinkedIn: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  Substack: "M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z",
  YouTube: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
}

function socialRow(social, name) {
  const entries = Object.entries(social || {}).filter(([k]) => SOCIAL_ICONS[k])
  if (!entries.length) return null
  return h(
    "ul",
    { class: "a-social" },
    entries.map(([network, url]) =>
      h(
        "li",
        null,
        h(
          "a",
          { href: url, class: "external social", target: "_blank", rel: "me noopener", "aria-label": `${name} on ${network}`, title: network },
          h("svg", { viewBox: "0 0 24 24", width: "20", height: "20", "aria-hidden": "true", focusable: "false" }, h("path", { d: SOCIAL_ICONS[network] })),
        ),
      ),
    ),
  )
}

const authorCss = `
.author-block { border-top:1px solid var(--gold); margin-top:3rem; padding-top:1.4rem; display:grid;
  grid-template-columns:9rem minmax(0,1fr); gap:2rem; align-items:center; }
.author-block .portrait { width:9rem; height:9rem; border-radius:3px; }
.author-block .portrait i { display:block; width:100%; height:100%; background:var(--darkgray);
  -webkit-mask:var(--portrait) center/contain no-repeat; mask:var(--portrait) center/contain no-repeat; }
:root[saved-theme="dark"] .author-block .portrait { background:#e6e1d2; }
:root[saved-theme="dark"] .author-block .portrait i { background:#2e3b33; }
.author-block .a-name { font-family:"IM Fell English SC", var(--headerFont); font-size:1.5rem; letter-spacing:.06em; color:var(--dark); }
.author-block .a-title { font-style:italic; color:var(--gray); margin:.1rem 0 .6rem; }
.author-block p { margin:0 0 .6rem; }
.author-block .a-links { display:flex; gap:1.3rem; flex-wrap:wrap; font-size:.95rem; }
.author-block .a-social { list-style:none; display:flex; gap:1rem; margin:.9rem 0 0; padding:0; }
.author-block .a-social li { margin:0; }
.author-block .a-social a.social { display:inline-flex; color:var(--secondary); border-bottom:none; padding:0; background:none; }
.author-block .a-social a.social:hover { color:var(--tertiary); }
.author-block .a-social svg { fill:currentColor; display:block; }
.author-block .a-social a.external::after, .author-block .a-social .external-icon { display:none; }
.author-slim { border-top:1px solid var(--gold); margin-top:3rem; padding-top:.9rem; display:flex; justify-content:space-between; gap:1rem; flex-wrap:wrap; color:var(--gray); }
.base-line { display:flex; justify-content:space-between; gap:1rem; flex-wrap:wrap; border-top:1px solid var(--lightgray);
  margin:1.4rem 0 3rem; padding-top:.6rem; font-size:.82rem; color:var(--gray); }
@media (max-width: 800px) { .author-block { grid-template-columns:1fr; gap:1rem; } }
`

export const AuthorBlock = (rawOpts) => {
  const opts = withDefaults(rawOpts)
  const C = ({ fileData }) => {
    const slug = fileData.slug
    const { fm, paras } = readAuthorFile(opts.authorPage)
    const letter = isLetter(slug, opts.lettersFolder)
    const year = new Date().getFullYear()
    const base = h(
      "div",
      { class: "base-line" },
      h(
        "span",
        null,
        opts.licence ? ["Text ", h("a", { href: opts.licence.url, rel: "license", class: "external" }, opts.licence.name), " · "] : null,
        h("a", { class: "internal", href: href(slug, "ai-use") }, "AI use"),
      ),
      h("span", null, `© ${year} ${opts.copyrightHolder}`),
    )
    if (letter) {
      return h(
        "footer",
        { class: "site-foot" },
        h(
          "div",
          { class: "author-slim" },
          h("span", null, fm.slim || `${opts.siteName} writes the Letter Book from ${opts.place}.`),
          h("a", { class: "internal", href: href(slug, opts.authorPage) }, "About the author"),
        ),
        base,
      )
    }
    const portrait = fm.portrait ? `url(${href(slug, fm.portrait)})` : null
    return h(
      "footer",
      { class: "site-foot" },
      h(
        "div",
        { class: "author-block" },
        portrait ? h("div", { class: "portrait", style: `--portrait:${portrait}` }, h("i", { role: "img", "aria-label": `Pencil portrait of ${opts.siteName}` })) : h("div"),
        h(
          "div",
          null,
          h("div", { class: "a-name" }, fm.name || opts.siteName),
          fm.title_line ? h("div", { class: "a-title" }, fm.title_line) : null,
          paras.map((p) => h("p", null, inline(p, slug))),
          Object.keys(opts.links).length
            ? h("div", { class: "a-links" }, Object.entries(opts.links).map(([label, t]) => h("a", { href: href(slug, t), class: /^https?:/.test(t) ? "external" : "internal" }, label)))
            : null,
          socialRow(opts.social, fm.name || opts.siteName),
        ),
      ),
      base,
    )
  }
  C.css = authorCss
  return C
}
