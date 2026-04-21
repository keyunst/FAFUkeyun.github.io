import esriConfig from "https://js.arcgis.com/5.0/@arcgis/core/config.js";
import WebMap from "https://js.arcgis.com/5.0/@arcgis/core/WebMap.js";
import MapView from "https://js.arcgis.com/5.0/@arcgis/core/views/MapView.js";

import BasemapGallery from "https://js.arcgis.com/5.0/@arcgis/core/widgets/BasemapGallery.js";
import LayerList from "https://js.arcgis.com/5.0/@arcgis/core/widgets/LayerList.js";
import Legend from "https://js.arcgis.com/5.0/@arcgis/core/widgets/Legend.js";
import Search from "https://js.arcgis.com/5.0/@arcgis/core/widgets/Search.js";
import ScaleBar from "https://js.arcgis.com/5.0/@arcgis/core/widgets/ScaleBar.js";

import Home from "https://js.arcgis.com/5.0/@arcgis/core/widgets/Home.js";
import Compass from "https://js.arcgis.com/5.0/@arcgis/core/widgets/Compass.js";
import Fullscreen from "https://js.arcgis.com/5.0/@arcgis/core/widgets/Fullscreen.js";
import Measurement from "https://js.arcgis.com/5.0/@arcgis/core/widgets/Measurement.js";

esriConfig.portalUrl = "https://www.geosceneonline.cn/geoscene";
const WEBMAP_ID = "5d6e5d9225294277b6317dea60beab2e";

const POP_FIELD_WANT = "SUM_2020";
const URBAN_FIELD_WANT = "2020_城";

// DOM
const loadingEl = document.getElementById("loading");
const coordDiv = document.getElementById("coordDiv");
const clockEl = document.getElementById("clock");

const aboutModal = document.getElementById("aboutModal");
document.getElementById("openAbout")?.addEventListener("click", () => (aboutModal.open = true));
document.getElementById("closeAbout")?.addEventListener("click", () => (aboutModal.open = false));

// 顶部按钮：把 themeBtn 改为「重置」
const resetBtn = document.getElementById("themeBtn");
const screenshotBtn = document.getElementById("screenshotBtn");

// 时钟
function pad2(n){ return String(n).padStart(2, "0"); }
function updateClock(){
  if (!clockEl) return;
  const d = new Date();
  clockEl.textContent = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
updateClock();
setInterval(updateClock, 1000);

// 侧栏折叠
const shellPanel = document.querySelector('calcite-shell-panel[slot="panel-start"]');
const collapseBtn = document.getElementById("collapsePanelBtn");

function syncCollapseBtn(){
  if (!collapseBtn || !shellPanel) return;
  collapseBtn.iconStart = shellPanel.collapsed ? "chevron-right" : "chevron-left";
  collapseBtn.textContent = shellPanel.collapsed ? "展开侧栏（功能面板）" : "折叠侧栏（扩大地图）";
}

// WebMap + View
const webmap = new WebMap({ portalItem: { id: WEBMAP_ID } });

const view = new MapView({
  container: "viewDiv",
  map: webmap,
  popup: { dockEnabled: true, dockOptions: { position: "bottom-right", breakpoint: false } }
});

// 默认视图：以 Tools 的范围为准
let defaultViewpoint = null;

// =============== 动态 UI padding ===============
function updateUIPadding(){
  if (!shellPanel) return;
  const w = shellPanel.getBoundingClientRect().width;
  const left = Math.max(10, Math.round(w + 12));
  view.ui.padding = { left, right: 12, top: 76, bottom: 22 };
}

if (shellPanel && "ResizeObserver" in window) {
  const ro = new ResizeObserver(() => updateUIPadding());
  ro.observe(shellPanel);
} else {
  window.addEventListener("resize", () => updateUIPadding());
}

updateUIPadding();
syncCollapseBtn();

function setSidebarCollapsed(collapsed){
  if (!shellPanel) return;
  shellPanel.collapsed = !!collapsed;
  syncCollapseBtn();
  updateUIPadding();
  setTimeout(updateUIPadding, 260);
}

collapseBtn?.addEventListener("click", () => {
  if (!shellPanel) return;
  setSidebarCollapsed(!shellPanel.collapsed);
  if (shellPanel.collapsed) {
    document.querySelectorAll("calcite-action[data-target]").forEach(a => (a.active = false));
  }
});
// ================================================================

// ===== 右上角控件：Home/Compass/Fullscreen（Home 与 Tools 默认范围一致）=====
view.ui.empty("top-left");
view.ui.empty("top-right");

const homeWidget = new Home({ view });
view.ui.add(homeWidget, "top-right");
view.ui.add(new Compass({ view }), "top-right");
view.ui.add(new Fullscreen({ view }), "top-right");
view.ui.add(new ScaleBar({ view, unit: "metric" }), "bottom-left");

// Home 点击统一回到 defaultViewpoint
homeWidget.on("go", (e) => {
  try {
    if (defaultViewpoint) {
      e?.preventDefault?.();
      view.goTo(defaultViewpoint).catch(console.error);
    }
  } catch (err) {
    console.warn("Home go handler error:", err);
  }
});

// 左侧面板控件
new BasemapGallery({ view, container: "basemapDiv" });
new LayerList({ view, container: "layerListDiv" });
new Legend({ view, container: "legendDiv" });

const search = new Search({ view, container: "searchDiv", includeDefaultSources: false });

// ====== ActionBar：点击按钮自动开关侧栏 + 切换面板 ======
const actions = [...document.querySelectorAll("calcite-action[data-target]")];
const panels = [...document.querySelectorAll("calcite-panel[data-panel]")];

function showPanel(target){
  actions.forEach(x => (x.active = x.getAttribute("data-target") === target));
  panels.forEach(p => (p.hidden = p.getAttribute("data-panel") !== target));
}

actions.forEach((a) => {
  a.addEventListener("click", () => {
    if (!shellPanel) return;
    const target = a.getAttribute("data-target");
    if (!target) return;

    if (shellPanel.collapsed) {
      setSidebarCollapsed(false);
      showPanel(target);
      return;
    }

    const clickedActive = a.active === true;
    if (clickedActive) {
      setSidebarCollapsed(true);
      actions.forEach(x => (x.active = false));
    } else {
      showPanel(target);
    }
  });
});

// utils
function lower(s){ return (s ?? "").toString().toLowerCase(); }
function escapeHtml(s){
  return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
}
function formatPercent(n, digits = 2){
  const x = Number(n);
  if (Number.isNaN(x)) return "-";
  return `${x.toFixed(digits)}%`;
}
function formatNumber(n){
  const x = Number(n);
  if (Number.isNaN(x)) return "-";
  return x.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
function normalizeName(name){
  let s = String(name ?? "").trim();
  s = s.replace(/\s+/g, "");
  const suffixes = ["特别行政区","维吾尔自治区","壮族自治区","回族自治区","自治区","省","市"];
  for (const suf of suffixes) {
    if (s.endsWith(suf)) { s = s.slice(0, -suf.length); break; }
  }
  return s;
}
function findFieldByNameOrAlias(fields, want){
  if (!fields?.length) return null;
  const w = lower(want);
  return fields.find(f => lower(f.name) === w || lower(f.alias) === w) || null;
}
function pickNameField(layer){
  const s = (layer.fields || []).filter(f => f.type === "string");
  return (
    layer.displayField ||
    s.find(f => /省|name|名称|adm/i.test(f.name) || /省|name|名称|adm/i.test(f.alias))?.name ||
    s[0]?.name ||
    null
  );
}
function pickSearchStringField(layer){
  const prefer = ["name","名称","地名","省","省名","市","市名","城市","adm"];
  const f = layer.fields?.filter(x => x.type === "string") ?? [];
  for (const p of prefer) {
    const hit = f.find(x => lower(x.name).includes(p) || lower(x.alias).includes(p));
    if (hit) return hit.name;
  }
  return f[0]?.name;
}

async function buildSearchSourcesFromWebMap(){
  await webmap.loadAll();
  const sources = [];
  webmap.allLayers.forEach((lyr) => {
    if (lyr.type === "feature") {
      const field = pickSearchStringField(lyr);
      if (field) {
        sources.push({
          layer: lyr,
          name: lyr.title,
          searchFields: [field],
          displayField: field,
          outFields: ["*"],
          placeholder: `搜索：${lyr.title}`
        });
      }
    }
  });
  search.sources = sources;
}

async function zoomToData(){
  const layers = webmap.allLayers.filter(l => l.type === "feature");
  for (const lyr of layers) {
    try {
      await lyr.load();
      if (lyr.fullExtent) {
        await view.goTo(lyr.fullExtent.expand(1.12));
        return;
      }
    } catch {}
  }
}

// 坐标 HUD
view.on("pointer-move", (evt) => {
  const p = view.toMap({ x: evt.x, y: evt.y });
  if (!p || !coordDiv) return;
  coordDiv.textContent = `Lon: ${p.longitude.toFixed(5)} , Lat: ${p.latitude.toFixed(5)}`;
});

// ===== Tools 面板功能：回到默认/放大/缩小/导出 PNG =====
function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportViewToPng(){
  const shot = await view.takeScreenshot({ format: "png", quality: 1, width: 1920 });
  const res = await fetch(shot.dataUrl);
  const blob = await res.blob();
  const ts = new Date();
  const name = `map_${ts.getFullYear()}${pad2(ts.getMonth()+1)}${pad2(ts.getDate())}_${pad2(ts.getHours())}${pad2(ts.getMinutes())}${pad2(ts.getSeconds())}.png`;
  downloadBlob(blob, name);
}

async function goDefault(){
  if (defaultViewpoint) {
    await view.goTo(defaultViewpoint);
  } else {
    await zoomToData();
  }
}

document.getElementById("goHomeBtn")?.addEventListener("click", () => goDefault().catch(console.error));
document.getElementById("zoomInBtn")?.addEventListener("click", () => view.goTo({ zoom: view.zoom + 1 }));
document.getElementById("zoomOutBtn")?.addEventListener("click", () => view.goTo({ zoom: view.zoom - 1 }));
document.getElementById("exportPngBtn")?.addEventListener("click", () => exportViewToPng().catch(console.error));

// 顶部“截图”
screenshotBtn?.addEventListener("click", () => exportViewToPng().catch(console.error));

// 量测
let measurement = null;
try {
  measurement = new Measurement({ view, container: "measureDiv" });
  document.getElementById("measureLineBtn")?.addEventListener("click", () => (measurement.activeTool = "distance"));
  document.getElementById("measureAreaBtn")?.addEventListener("click", () => (measurement.activeTool = "area"));
  document.getElementById("measureClearBtn")?.addEventListener("click", () => measurement.clear());
} catch {}

// ===== 顶部「重置」按钮逻辑 =====
function resetPanelsToBasemap(){
  showPanel("panel-basemap");
}
async function resetApp(){
  try {
    // 1) 关闭实验说明弹窗
    if (aboutModal) aboutModal.open = false;

    // 2) 清除量测
    try { measurement?.clear(); } catch {}

    // 3) 侧栏回到默认面板（底图库），并收起侧栏
    resetPanelsToBasemap();
    setSidebarCollapsed(true);
    actions.forEach(a => (a.active = false));

    // 4) 回到默认视图
    await goDefault();
  } catch (e) {
    console.warn("resetApp failed:", e);
  }
}

// 把原“暗色”按钮改成重置按钮（不改 id）
if (resetBtn) {
  resetBtn.textContent = "重置";
  resetBtn.setAttribute("icon-start", "refresh");
  resetBtn.addEventListener("click", () => resetApp());
}

// ===== Stats（含快速定位省份）=====
const statCount = document.getElementById("statCount");
const statSum = document.getElementById("statSum");
const statAvg = document.getElementById("statAvg");
const statMax = document.getElementById("statMax");

const provinceQuickSelect = document.getElementById("provinceQuickSelect");
const metricSeg = document.getElementById("metricSeg");
const topRank = document.getElementById("topRank");

function renderTop10(list, metric){
  if (!topRank) return;
  const arr = list.filter(x => Number.isFinite(x[metric]))
    .sort((a,b) => b[metric] - a[metric])
    .slice(0, 10);

  if (!arr.length) {
    topRank.innerHTML = `<div class="hint">无可用数据</div>`;
    return;
  }

  const max = arr[0][metric] || 1;
  topRank.innerHTML = arr.map((it, idx) => {
    const pct = Math.max(2, Math.round((it[metric] / max) * 100));
    const showVal = metric === "urban" ? formatPercent(it.urban) : formatNumber(it.pop);
    return `
      <div class="rank-item">
        <div class="rank-no">${idx + 1}</div>
        <div class="rank-name" title="${escapeHtml(it.name)}">${escapeHtml(it.name)}</div>
        <div class="rank-val">${escapeHtml(showVal)}</div>
        <div class="rank-bar"><div style="width:${pct}%"></div></div>
      </div>
    `;
  }).join("");
}

async function initStats(){
  await webmap.loadAll();
  const layers = webmap.allLayers.filter(l => l.type === "feature");
  if (!layers.length) throw new Error("WebMap 中没有要素图层");

  const zoomLayer = layers.find(l => l.geometryType === "polygon") || layers[0];
  await zoomLayer.load();
  const zoomNameField = pickNameField(zoomLayer);
  if (!zoomNameField) throw new Error("定位层未找到省名字段（string）");
  const zoomOidField = zoomLayer.objectIdField;
  const zoomLayerView = await view.whenLayerView(zoomLayer);

  let popLayer = null, urbanLayer = null;
  let popField = null, urbanField = null;

  for (const lyr of layers) {
    await lyr.load();
    const fPop = findFieldByNameOrAlias(lyr.fields, POP_FIELD_WANT);
    const fUrban = findFieldByNameOrAlias(lyr.fields, URBAN_FIELD_WANT);
    if (!popLayer && fPop) { popLayer = lyr; popField = fPop.name; }
    if (!urbanLayer && fUrban) { urbanLayer = lyr; urbanField = fUrban.name; }
  }
  if (!popLayer && !urbanLayer) throw new Error(`未找到字段 ${POP_FIELD_WANT} 或 ${URBAN_FIELD_WANT}`);

  const extentMap = new Map();
  const oidMap = new Map();
  const displayMap = new Map();

  const baseRes = await zoomLayer.queryFeatures({
    where: "1=1",
    outFields: [zoomNameField, zoomOidField],
    returnGeometry: true
  });

  baseRes.features.forEach(f => {
    const displayName = String(f.attributes[zoomNameField] ?? "").trim();
    const key = normalizeName(displayName);
    if (!key) return;
    displayMap.set(key, displayName);
    oidMap.set(key, f.attributes[zoomOidField]);
    if (f.geometry?.extent) extentMap.set(key, f.geometry.extent.clone());
  });

  const table = new Map();
  for (const [key, displayName] of displayMap.entries()) {
    table.set(key, { key, name: displayName, pop: NaN, urban: NaN });
  }

  async function mergeMetric(layer, fieldName, targetProp){
    if (!layer) return;
    await layer.load();
    const nameField = pickNameField(layer);
    if (!nameField) throw new Error(`指标层（${layer.title}）找不到省名字段`);
    const res = await layer.queryFeatures({
      where: "1=1",
      outFields: [nameField, fieldName],
      returnGeometry: false
    });
    res.features.forEach(f => {
      const n = String(f.attributes[nameField] ?? "").trim();
      const key = normalizeName(n);
      if (!key) return;
      if (!table.has(key)) table.set(key, { key, name: n, pop: NaN, urban: NaN });
      table.get(key)[targetProp] = Number(f.attributes[fieldName]);
    });
  }

  await mergeMetric(popLayer, popField, "pop");
  await mergeMetric(urbanLayer, urbanField, "urban");

  const list = [...table.values()];

  statCount && (statCount.textContent = String(list.length));
  const totalPop = list.reduce((s, x) => s + (Number.isFinite(x.pop) ? x.pop : 0), 0);
  statSum && (statSum.textContent = totalPop ? formatNumber(totalPop) : "-");

  const urbanVals = list.map(x => x.urban).filter(Number.isFinite);
  const avgUrban = urbanVals.length ? (urbanVals.reduce((a,b)=>a+b,0) / urbanVals.length) : NaN;
  statAvg && (statAvg.textContent = Number.isFinite(avgUrban) ? formatPercent(avgUrban) : "-");

  const maxUrbanItem = list.filter(x => Number.isFinite(x.urban)).sort((a,b)=>b.urban-a.urban)[0];
  statMax && (statMax.textContent = maxUrbanItem ? `${maxUrbanItem.name} ${formatPercent(maxUrbanItem.urban)}` : "-");

  let highlightHandle = null;
  if (provinceQuickSelect) {
    const keys = [...displayMap.keys()].sort((a,b) => (displayMap.get(a) || a).localeCompare(displayMap.get(b) || b, "zh"));

    provinceQuickSelect.innerHTML =
      `<calcite-option value="">— 选择省份 —</calcite-option>` +
      keys.map(k => `<calcite-option value="${escapeHtml(k)}">${escapeHtml(displayMap.get(k) || k)}</calcite-option>`).join("");

    const doLocate = async () => {
      const key = provinceQuickSelect.value;
      if (!key) return;

      const ext = extentMap.get(key);
      if (ext) await view.goTo(ext.expand(1.35));

      const oid = oidMap.get(key);
      if (oid != null) {
        if (highlightHandle) highlightHandle.remove();
        highlightHandle = zoomLayerView.highlight([oid]);
      }
    };

    provinceQuickSelect.addEventListener("calciteSelectChange", () => doLocate().catch(console.error));
    provinceQuickSelect.addEventListener("change", () => doLocate().catch(console.error));
  }

  const getMetric = () => (metricSeg?.value || "pop");
  renderTop10(list, getMetric());
  metricSeg?.addEventListener("calciteSegmentedControlChange", () => renderTop10(list, getMetric()));

  return list;
}

// 主流程
view.when(async () => {
  try {
    await webmap.loadAll();
    await buildSearchSourcesFromWebMap();
    await zoomToData();

    // 默认范围以这里为准
    if (!defaultViewpoint) {
      defaultViewpoint = view.viewpoint?.clone?.() ?? view.viewpoint;
    }

    try {
      await initStats();
    } catch (e) {
      console.warn("统计/定位初始化失败：", e);
      if (topRank) topRank.innerHTML = `<div class="hint">统计初始化失败：${escapeHtml(e.message)}（按F12看Console）</div>`;
    }
  } finally {
    loadingEl?.classList.add("hidden");
  }
}).catch((e) => {
  console.error("地图初始化失败：", e);
  loadingEl?.classList.add("hidden");
  alert("地图初始化失败：请按 F12 查看 Console 报错。");
});