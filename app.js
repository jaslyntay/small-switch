/* Small Switch: every number here is an estimate built from a published
   factor and a habit the user sets. The factors live in FACTORS so they are
   easy to check against the sources listed in SOURCES. */

const FACTORS = {
  btuPerGallonPerF: 8.34,       // energy to warm 1 gallon of water by 1°F
  heatRiseF: 60,                // typical cold-to-hot rise (about 55°F to 115°F)
  btuPerKwh: 3412,
  btuPerTherm: 100000,
  electricHeaterEff: 0.92,      // electric resistance water heater
  gasHeaterEff: 0.6,            // typical gas storage water heater
  co2PerTherm: 5.3,             // kg CO2 per therm of natural gas (EPA)
  co2PerGallonGas: 8.887,       // kg CO2 per gallon of gasoline (EPA)
  co2PerCarYear: 4600,          // kg CO2 from a typical passenger car in a year (EPA)
  hotShareShower: 2 / 3,        // share of shower water that is hot
  hotShareWarmWash: 0.5,        // a warm wash mixes about half hot water
  ledWatts: 9,                  // an LED that replaces a 60 W bulb
}

const DEFAULT_SETTINGS = {
  units: 'us',
  heater: 'electric',
  elecPrice: 0.17,   // $ per kWh
  gridCo2: 0.394,    // kg CO2 per kWh, US average (EPA eGRID 2022)
  gasPrice: 1.5,     // $ per therm
  waterPrice: 0.012, // $ per gallon, water plus sewer
  fuelPrice: 3.5,    // $ per gallon of gasoline
  mpg: 22.8,         // average US car and light truck (EPA)
  bottlePrice: 1.0,  // $ per bottled drink
}

const SWITCHES = [
  {
    id: 'shower', icon: 'droplet', title: 'Shorter showers', desc: 'Cut a few minutes off each shower.',
    inputs: [
      { key: 'minutes', label: 'Minutes shorter', min: 1, max: 10, value: 2, suffix: ' min' },
      { key: 'perWeek', label: 'Showers per week', min: 1, max: 14, value: 7 },
      { key: 'flow', label: 'Showerhead', type: 'select', value: 2.5, options: [[2.5, 'Standard (2.5 gal / 9.5 L per min)'], [2.0, 'WaterSense (2.0 gal / 7.6 L per min)'], [1.5, 'Low-flow (1.5 gal / 5.7 L per min)']] },
    ],
    compute(i, s) {
      const gallons = i.minutes * i.perWeek * 52 * i.flow
      return add({ water: gallons, usd: gallons * s.waterPrice }, heating(gallons * FACTORS.hotShareShower, s))
    },
    how: 'Water saved = minutes × showers per week × 52 × showerhead flow. About two-thirds of shower water is hot, and warming one gallon by 60°F takes about 500 BTU, which your water heater has to supply.',
  },
  {
    id: 'cold', icon: 'wash', title: 'Wash clothes in cold', desc: 'Most of a washer’s energy goes into heating water.',
    inputs: [
      { key: 'loads', label: 'Loads per week', min: 1, max: 10, value: 4 },
      { key: 'gallons', label: 'Washer', type: 'select', value: 14, options: [[14, 'High-efficiency (about 14 gal / 53 L)'], [25, 'Older top-loader (about 25 gal / 95 L)']] },
    ],
    compute(i, s) {
      return heating(i.loads * 52 * i.gallons * FACTORS.hotShareWarmWash, s)
    },
    how: 'Hot water avoided = loads per week × 52 × gallons per load × half (a warm wash is about half hot water). The energy is what your water heater would have used to warm it.',
  },
  {
    id: 'dry', icon: 'wind', title: 'Air-dry laundry', desc: 'Use a rack or line instead of the dryer.',
    inputs: [
      { key: 'loads', label: 'Loads air-dried per week', min: 1, max: 10, value: 2 },
      { key: 'kwh', label: 'Dryer', type: 'select', value: 2.5, options: [[2.5, 'Electric dryer (about 2.5 kWh a load)'], [3.5, 'Older electric dryer (about 3.5 kWh a load)']] },
    ],
    compute(i, s) {
      return electricity(i.loads * 52 * i.kwh, s)
    },
    how: 'Electricity saved = loads per week × 52 × energy per dryer load. Assumes an electric dryer.',
  },
  {
    id: 'led', icon: 'bulb', title: 'Switch to LED bulbs', desc: 'Same light, a fraction of the power.',
    inputs: [
      { key: 'bulbs', label: 'Bulbs swapped', min: 1, max: 20, value: 5 },
      { key: 'hours', label: 'Hours on per day', min: 1, max: 12, value: 3, suffix: ' h' },
      { key: 'old', label: 'Old bulbs', type: 'select', value: 60, options: [[60, '60 W incandescent'], [43, '43 W halogen'], [14, '14 W compact fluorescent']] },
    ],
    compute(i, s) {
      return electricity((i.bulbs * (i.old - FACTORS.ledWatts) * i.hours * 365) / 1000, s)
    },
    how: `Electricity saved = bulbs × (old watts − ${FACTORS.ledWatts} W for the LED) × hours a day × 365 ÷ 1,000.`,
  },
  {
    id: 'trips', icon: 'bike', title: 'Walk or bike short trips', desc: 'Leave the car for trips under a couple of miles.',
    inputs: [{ key: 'distance', label: 'Distance per week', min: 1, max: 40, value: 5, distance: true }],
    compute(i, s) {
      const miles = s.units === 'metric' ? i.distance / 1.609 : i.distance
      const gallons = (miles * 52) / s.mpg
      return { fuel: gallons, co2: gallons * FACTORS.co2PerGallonGas, usd: gallons * s.fuelPrice }
    },
    how: 'Fuel saved = distance per week × 52 ÷ fuel economy. Each gallon of gasoline burned releases 8.887 kg of CO₂.',
  },
  {
    id: 'bottle', icon: 'bottle', title: 'Carry a reusable bottle', desc: 'Skip single-use plastic bottles.',
    inputs: [{ key: 'perWeek', label: 'Bottles skipped per week', min: 1, max: 21, value: 5 }],
    compute(i, s) {
      const bottles = i.perWeek * 52
      return { bottles, usd: bottles * s.bottlePrice }
    },
    how: 'Bottles avoided = bottles per week × 52. CO₂ from making and shipping bottles varies a lot by source, so it isn’t counted here.',
  },
]

const SCALES = [[1, 'Just me'], [4, 'My household'], [30, 'My class'], [500, 'My school']]
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const SOURCES = [
  ['US EPA, Greenhouse Gas Equivalencies Calculator: calculations and references (CO₂ per gallon of gasoline, per therm of natural gas, per kWh, and per car per year)', 'https://www.epa.gov/energy/greenhouse-gases-equivalencies-calculator-calculations-and-references'],
  ['US EPA, eGRID (power-grid emissions by region)', 'https://www.epa.gov/egrid'],
  ['US EPA WaterSense, showerheads (2.5 gal/min federal maximum, 2.0 gal/min WaterSense)', 'https://www.epa.gov/watersense/showerheads'],
  ['US DOE Energy Saver, water heating', 'https://www.energy.gov/energysaver/water-heating'],
  ['US DOE Energy Saver, LED lighting', 'https://www.energy.gov/energysaver/led-lighting'],
  ['ENERGY STAR, clothes washers', 'https://www.energystar.gov/products/clothes_washers'],
  ['US EIA, electricity prices', 'https://www.eia.gov/electricity/'],
]

/* ---------- Helpers ---------- */

const $ = (sel) => document.querySelector(sel)
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* private browsing: skip saving */ } },
}

function add(a, b) {
  const out = { ...a }
  for (const [k, v] of Object.entries(b)) out[k] = (out[k] || 0) + v
  return out
}

function electricity(kwh, s) {
  return { kwh, co2: kwh * s.gridCo2, usd: kwh * s.elecPrice }
}

function heating(hotGallons, s) {
  const btu = hotGallons * FACTORS.btuPerGallonPerF * FACTORS.heatRiseF
  if (s.heater === 'gas') {
    const therms = btu / FACTORS.btuPerTherm / FACTORS.gasHeaterEff
    return { therms, co2: therms * FACTORS.co2PerTherm, usd: therms * s.gasPrice }
  }
  return electricity(btu / FACTORS.btuPerKwh / FACTORS.electricHeaterEff, s)
}

function fmt(n) {
  const abs = Math.abs(n)
  const digits = abs > 0 && abs < 10 ? 1 : 0
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits, notation: abs >= 1e6 ? 'compact' : 'standard' }).format(n)
}
const money = (n) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: n < 10 ? 2 : 0 }).format(n)

function displayUnits(s) {
  const metric = s.units === 'metric'
  return {
    water: (g) => [metric ? g * 3.785 : g, metric ? 'liters' : 'gallons'],
    co2: (kg) => [metric ? kg : kg * 2.2046, metric ? 'kg CO₂' : 'lb CO₂'],
    distance: (mi) => [metric ? mi * 1.609 : mi, metric ? 'km' : 'miles'],
    fuel: (g) => [metric ? g * 3.785 : g, metric ? 'liters of fuel' : 'gallons of gas'],
    dist: metric ? 'km' : 'mi',
  }
}

/* ---------- State ---------- */

function freshState() {
  return {
    settings: { ...DEFAULT_SETTINGS },
    scale: 1,
    on: { shower: true, led: true },
    inputs: Object.fromEntries(SWITCHES.map((sw) => [sw.id, Object.fromEntries(sw.inputs.map((inp) => [inp.key, inp.value]))])),
    week: {},
  }
}

function loadState() {
  const fromLink = readLink()
  const saved = fromLink || store.get('ss:state')
  const base = freshState()
  if (!saved) return base
  return {
    settings: { ...base.settings, ...saved.settings },
    scale: Number(saved.scale) > 0 ? Number(saved.scale) : 1,
    on: saved.on || base.on,
    inputs: Object.fromEntries(SWITCHES.map((sw) => [sw.id, { ...base.inputs[sw.id], ...(saved.inputs?.[sw.id] || {}) }])),
    week: fromLink ? {} : saved.week || {},
  }
}

function readLink() {
  if (!location.hash.startsWith('#s=')) return null
  try {
    const json = decodeURIComponent(escape(atob(location.hash.slice(3).replace(/-/g, '+').replace(/_/g, '/'))))
    return JSON.parse(json)
  } catch {
    return null
  }
}

function linkFor(state) {
  const { week, ...shared } = state
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(shared)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${location.origin}${location.pathname}#s=${b64}`
}

let state = loadState()
const save = () => store.set('ss:state', state)

function yearly(sw) {
  return sw.compute(state.inputs[sw.id], state.settings)
}

/* ---------- Rendering ---------- */

function yieldChips(r) {
  const u = displayUnits(state.settings)
  const chips = []
  if (r.co2) chips.push(['m-co2', `${fmt(u.co2(r.co2)[0])} ${u.co2(r.co2)[1]}`])
  if (r.water) chips.push(['m-water', `${fmt(u.water(r.water)[0])} ${u.water(r.water)[1]}`])
  if (r.kwh) chips.push(['m-power', `${fmt(r.kwh)} kWh`])
  if (r.therms) chips.push(['m-power', `${fmt(r.therms)} therms`])
  if (r.fuel) chips.push(['m-power', `${fmt(u.fuel(r.fuel)[0])} ${u.fuel(r.fuel)[1]}`])
  if (r.bottles) chips.push(['m-plastic', `${fmt(r.bottles)} bottles`])
  if (r.usd) chips.push(['m-cash', money(r.usd)])
  return chips.map(([cls, text]) => `<span class="yield ${cls}">${text}</span>`).join('')
}

function renderSwitches() {
  const u = displayUnits(state.settings)
  $('#switches').innerHTML = SWITCHES.map((sw) => {
    const on = !!state.on[sw.id]
    const vals = state.inputs[sw.id]
    const inputs = sw.inputs.map((inp) => {
      const id = `${sw.id}-${inp.key}`
      if (inp.type === 'select') {
        return `<label class="slider" for="${id}">${inp.label}<select id="${id}" data-sw="${sw.id}" data-key="${inp.key}">${inp.options.map(([v, t]) => `<option value="${v}" ${Number(vals[inp.key]) === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`
      }
      const suffix = inp.distance ? ` ${u.dist}` : inp.suffix || ''
      return `<div class="slider"><div class="slider-top"><label for="${id}">${inp.label}</label><output for="${id}" id="${id}-out">${vals[inp.key]}${suffix}</output></div>
        <input type="range" id="${id}" min="${inp.min}" max="${inp.distance && state.settings.units === 'metric' ? 65 : inp.max}" step="1" value="${vals[inp.key]}" data-sw="${sw.id}" data-key="${inp.key}" data-suffix="${suffix}"></div>`
    }).join('')
    return `<article class="switch${on ? ' on' : ''}" aria-labelledby="${sw.id}-title">
      <div class="switch-head">
        <span class="switch-icon" aria-hidden="true"><i class="ti ti-${sw.icon}"></i></span>
        <div><h3 id="${sw.id}-title">${sw.title}</h3><p>${sw.desc}</p></div>
      </div>
      <button class="chip" data-toggle="${sw.id}" aria-pressed="${on}">${on ? '<i class="ti ti-check" aria-hidden="true"></i> I’ll do this' : '<i class="ti ti-plus" aria-hidden="true"></i> Add this switch'}</button>
      ${inputs}
      <div><div class="small" style="font-size:0.8rem;color:var(--muted);margin-bottom:4px">Saves you each year</div><div class="yields" id="${sw.id}-yields">${yieldChips(yearly(sw))}</div></div>
      <details><summary>How we calculate</summary><p>${sw.how}</p></details>
    </article>`
  }).join('')
}

function totals(multiplier = state.scale) {
  let t = {}
  for (const sw of SWITCHES) if (state.on[sw.id]) t = add(t, yearly(sw))
  for (const k of Object.keys(t)) t[k] *= multiplier
  return t
}

function renderTotals() {
  const u = displayUnits(state.settings)
  const t = totals()
  const metrics = [
    ['m-co2', 'leaf', 'CO₂ avoided', ...u.co2(t.co2 || 0)],
    ['m-water', 'droplet', 'Water saved', ...u.water(t.water || 0)],
    ['m-power', 'bolt', 'Energy saved', t.kwh || 0, 'kWh' + (t.therms ? ` + ${fmt(t.therms)} therms` : '')],
    ['m-cash', 'coin', 'Money saved', null, money(t.usd || 0)],
  ]
  if (t.bottles) metrics.push(['m-plastic', 'bottle', 'Plastic bottles', t.bottles, 'not thrown away'])
  $('#metrics').innerHTML = metrics.map(([cls, icon, label, value, unit]) => `<div class="metric ${cls}">
    <div class="label"><i class="ti ti-${icon}" aria-hidden="true"></i> ${label}</div>
    <div class="value">${value === null ? unit : fmt(value)}</div>${value === null ? '' : `<div class="unit">${unit}</div>`}
  </div>`).join('')

  const people = state.scale
  $('#scope-label').textContent = people === 1 ? 'per year' : `per year, for ${fmt(people)} people`
  const co2 = t.co2 || 0
  const miles = co2 / (FACTORS.co2PerGallonGas / state.settings.mpg)
  const [d, dUnit] = u.distance(miles)
  let equiv = co2 > 0 ? `That’s the same CO₂ as driving an average car about <b>${fmt(d)} ${dUnit}</b>.` : 'Turn on a switch to see your savings.'
  if (co2 >= FACTORS.co2PerCarYear / 2) equiv += ` Or taking about <b>${fmt(co2 / FACTORS.co2PerCarYear)} cars</b> off the road for a year.`
  $('#equiv').innerHTML = equiv
}

function renderScale() {
  const custom = !SCALES.some(([n]) => n === state.scale)
  $('#scale').innerHTML = SCALES.map(([n, label]) => `<button class="chip" data-scale="${n}" aria-pressed="${state.scale === n}">${label}${n > 1 ? ` (${n})` : ''}</button>`).join('') +
    `<label class="sr-only" for="custom-scale">Custom number of people</label><input type="number" id="custom-scale" min="1" max="100000" step="1" placeholder="Other" value="${custom ? state.scale : ''}" aria-describedby="scale-error"><span id="scale-error" class="hint" style="margin:0;color:#a32d2d"></span>`
}

function weekSavings() {
  let t = {}
  let days = 0
  for (const sw of SWITCHES) {
    if (!state.on[sw.id]) continue
    const ticked = (state.week[sw.id] || []).filter(Boolean).length
    days += ticked
    const y = yearly(sw)
    for (const [k, v] of Object.entries(y)) t[k] = (t[k] || 0) + (v / 365) * ticked
  }
  return { t, days }
}

function renderPlan() {
  const chosen = SWITCHES.filter((sw) => state.on[sw.id])
  if (!chosen.length) {
    $('#plan').innerHTML = '<p class="empty">Add a switch above to start your plan.</p>'
    return
  }
  const u = displayUnits(state.settings)
  const { t, days } = weekSavings()
  $('#plan').innerHTML = `<p class="hint" style="margin-top:4px">Tick each day you stick with it. Your week adds up below. This part counts just you, and it’s saved on this device.</p>
  <ul class="plan-list">${chosen.map((sw) => {
    const week = state.week[sw.id] || []
    return `<li class="plan-item"><div class="plan-item-head"><span><i class="ti ti-${sw.icon}" aria-hidden="true"></i> ${sw.title}</span></div>
      <div class="days" role="group" aria-label="${sw.title}: days done this week">${DAYS.map((day, i) => `<button class="day" data-day="${sw.id}:${i}" aria-pressed="${!!week[i]}" aria-label="${day}">${day}</button>`).join('')}</div></li>`
  }).join('')}</ul>
  <div class="week" aria-live="polite">${days === 0 ? 'Nothing ticked yet this week.' : `This week you’ve saved about ${[
    t.co2 ? `${fmt(u.co2(t.co2)[0])} ${u.co2(t.co2)[1]}` : '',
    t.water ? `${fmt(u.water(t.water)[0])} ${u.water(t.water)[1]} of water` : '',
    t.usd ? money(t.usd) : '',
    t.bottles ? `${fmt(t.bottles)} bottles` : '',
  ].filter(Boolean).join(', ')}.`}</div>
  <div class="row actions">
    <button class="chip" id="print"><i class="ti ti-printer" aria-hidden="true"></i> Print my plan</button>
    <button class="chip" id="share"><i class="ti ti-share" aria-hidden="true"></i> Share my switches</button>
    <button class="chip" id="reset-week"><i class="ti ti-refresh" aria-hidden="true"></i> Start a new week</button>
  </div>
  <div id="share-out"></div>`
}

function renderSettings() {
  const s = state.settings
  const num = (key, label, step) => `<label>${label}<input type="number" min="0" step="${step}" data-setting="${key}" value="${s[key]}"></label>`
  $('#settings').innerHTML = `
    <label>Units<select data-setting="units"><option value="us" ${s.units === 'us' ? 'selected' : ''}>US (gallons, miles, lb)</option><option value="metric" ${s.units === 'metric' ? 'selected' : ''}>Metric (liters, km, kg)</option></select></label>
    <label>My water heater uses<select data-setting="heater"><option value="electric" ${s.heater === 'electric' ? 'selected' : ''}>Electricity</option><option value="gas" ${s.heater === 'gas' ? 'selected' : ''}>Natural gas</option></select></label>
    ${num('elecPrice', 'Electricity price ($ per kWh)', 0.01)}
    ${num('gridCo2', 'Power grid CO₂ (kg per kWh, US average 0.394)', 0.001)}
    ${num('gasPrice', 'Natural gas price ($ per therm)', 0.1)}
    ${num('waterPrice', 'Water + sewer price ($ per gallon)', 0.001)}
    ${num('fuelPrice', 'Gasoline price ($ per gallon)', 0.1)}
    ${num('mpg', 'Car fuel economy (miles per gallon)', 0.1)}
    ${num('bottlePrice', 'Price of one bottled drink ($)', 0.1)}
    <div><button class="chip" id="reset-settings" type="button"><i class="ti ti-arrow-back-up" aria-hidden="true"></i> Back to US averages</button></div>`
}

function renderSources() {
  $('#sources').innerHTML = `<p>Each switch shows its formula under “How we calculate”. The constants come from these sources:</p>
  <ul>${SOURCES.map(([t, url]) => `<li><a href="${url}" target="_blank" rel="noopener">${t}</a></li>`).join('')}</ul>
  <p>Assumptions you can’t change in the app: water is heated about 60°F (33°C), electric water heaters are 92% efficient and gas ones 60%, a warm wash is about half hot water, two-thirds of shower water is hot, and an LED that replaces a 60 W bulb uses 9 W. Electricity CO₂ uses the US average. Cleaner or dirtier local grids change the result, so set your own value in “My home and prices”.</p>`
}

function renderAll() {
  renderScale()
  renderTotals()
  renderSwitches()
  renderPlan()
  renderSettings()
}

function refreshNumbers() {
  for (const sw of SWITCHES) {
    const el = document.getElementById(`${sw.id}-yields`)
    if (el) el.innerHTML = yieldChips(yearly(sw))
  }
  renderTotals()
  renderPlan()
  save()
}

/* ---------- Events ---------- */

document.addEventListener('input', (e) => {
  const el = e.target
  if (el.dataset.sw && el.type === 'range') {
    state.inputs[el.dataset.sw][el.dataset.key] = Number(el.value)
    document.getElementById(`${el.id}-out`).textContent = `${el.value}${el.dataset.suffix}`
    refreshNumbers()
  } else if (el.id === 'custom-scale') {
    const n = Number(el.value)
    const error = $('#scale-error')
    if (el.value === '') { error.textContent = ''; return }
    if (!Number.isInteger(n) || n < 1 || n > 100000) { error.textContent = 'Enter a whole number from 1 to 100,000.'; return }
    error.textContent = ''
    state.scale = n
    document.querySelectorAll('[data-scale]').forEach((b) => b.setAttribute('aria-pressed', 'false'))
    renderTotals()
    save()
  }
})

document.addEventListener('change', (e) => {
  const el = e.target
  if (el.dataset.sw && el.tagName === 'SELECT') {
    state.inputs[el.dataset.sw][el.dataset.key] = Number(el.value)
    refreshNumbers()
  } else if (el.dataset.setting) {
    const key = el.dataset.setting
    if (key === 'units' && el.value !== state.settings.units) {
      const trips = state.inputs.trips
      trips.distance = Math.max(1, Math.round(el.value === 'metric' ? trips.distance * 1.609 : trips.distance / 1.609))
    }
    if (el.tagName === 'SELECT') state.settings[key] = el.value
    else if (el.value !== '' && Number(el.value) >= 0) state.settings[key] = Number(el.value)
    renderScale()
    renderSwitches()
    refreshNumbers()
  }
})

document.addEventListener('click', async (e) => {
  const t = e.target.closest('button')
  if (!t) return
  if (t.dataset.toggle) {
    state.on[t.dataset.toggle] = !state.on[t.dataset.toggle]
    renderSwitches()
    document.querySelector(`[data-toggle="${t.dataset.toggle}"]`)?.focus()
    refreshNumbers()
  } else if (t.dataset.scale) {
    state.scale = Number(t.dataset.scale)
    renderScale()
    renderTotals()
    save()
    document.querySelector(`[data-scale="${t.dataset.scale}"]`)?.focus()
  } else if (t.dataset.day) {
    const [id, i] = t.dataset.day.split(':')
    const week = (state.week[id] ||= [])
    week[Number(i)] = !week[Number(i)]
    renderPlan()
    document.querySelector(`[data-day="${t.dataset.day}"]`)?.focus()
    save()
  } else if (t.id === 'reset-week') {
    state.week = {}
    renderPlan()
    save()
  } else if (t.id === 'print') {
    window.print()
  } else if (t.id === 'share') {
    const url = linkFor(state)
    let copied = false
    try { await navigator.clipboard.writeText(url); copied = true } catch { /* show the link instead */ }
    $('#share-out').innerHTML = `<p class="hint" style="margin:10px 0 4px">${copied ? 'Link copied.' : 'Copy this link.'} It opens with your switches and settings, so friends can start from yours.</p><input type="text" readonly value="${url}" aria-label="Share link" style="width:100%;min-height:40px;border-radius:10px;border:1px solid var(--line-strong);padding:0 10px;background:var(--card)" onfocus="this.select()">`
  } else if (t.id === 'reset-settings') {
    const units = state.settings.units
    state.settings = { ...DEFAULT_SETTINGS, units }
    renderSettings()
    renderSwitches()
    refreshNumbers()
  }
})

renderSources()
renderAll()
if (location.hash.startsWith('#s=')) history.replaceState(null, '', location.pathname)
save()
