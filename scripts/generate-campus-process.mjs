import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const directory = fileURLToPath(new URL("../public/campus/process/", import.meta.url));
mkdirSync(directory, { recursive: true });
const ink = "#292b2c", line = "#d6d1c4", paper = "#fffaf0", orange = "#d17b4c", sage = "#a3b6a3";
const rect = (x, y, w, h, fill = paper, radius = 12) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${line}" stroke-width="2"/>`;
const path = (d, color = ink, width = 3, fill = "none") => `<path d="${d}" fill="${fill}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const circle = (x, y, r, fill = orange) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const text = (x, y, value, size = 12, color = ink) => `<text x="${x}" y="${y}" font-family="Inter, sans-serif" font-size="${size}" font-weight="500" fill="${color}">${value}</text>`;
const bars = (x, y, w = 80, n = 3) => Array.from({ length: n }, (_, i) => path(`M${x} ${y + i * 16}h${w - i * 13}`, line, 5)).join("");
const check = (x, y) => circle(x, y, 13, sage) + path(`M${x - 5} ${y}l4 4 7-8`, paper, 2.5);
const sheet = (x, y, w = 160, h = 210, label = "BRIEF") => rect(x + 10, y + 10, w, h, "#e4e3d5") + rect(x, y, w, h) + text(x + 18, y + 32, label) + path(`M${x + 18} ${y + 49}h${w - 36}`, line, 2);
const browser = (x, y, w, h) => rect(x, y, w, h) + path(`M${x} ${y + 29}h${w}`, line, 2) + [0, 1, 2].map(i => circle(x + 15 + i * 13, y + 15, 3, i ? line : orange)).join("");
const phone = (x, y, w = 88, h = 166) => rect(x, y, w, h, ink, 15) + rect(x + 7, y + 8, w - 14, h - 17, paper, 9) + path(`M${x + 30} ${y + 16}h${w - 60}`, line, 3);
const shirt = (x, y, scale = 1, fill = sage) => `<g transform="translate(${x} ${y}) scale(${scale})">${path("M20 5L0 25l15 20 12-8v68h70V37l12 8 15-20-20-20-24-5c-2 16-32 16-34 0Z", line, 2, fill)}</g>`;
const connector = (x1, y1, x2, y2) => path(`M${x1} ${y1}H${(x1 + x2) / 2}V${y2}H${x2}`, orange, 3) + path(`M${x2 - 6} ${y2 - 5}l6 5-6 5`, orange, 3);
const cube = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${path("M0 25L45 0l45 25-45 26Z", paper, 2, orange)}${path("M0 25v55l45 25V51Z", paper, 2, "#bb6b40")}${path("M45 51l45-26v55l-45 25Z", paper, 2, "#eab78e")}</g>`;
const art = {
  systems: [
    sheet(75, 70, 200, 245, "PROCESS BRIEF") + bars(98, 145, 130) + check(105, 220) + text(128, 225, "PEOPLE + SYSTEMS") + rect(355, 88, 158, 60) + text(373, 122, "SERVICE") + rect(355, 169, 158, 60, "#e4e3d5") + text(373, 203, "INTEGRATION") + rect(355, 250, 158, 60) + text(373, 284, "DATA") + connector(285, 198, 345, 198),
    text(60, 65, "SYSTEM BLUEPRINT") + [60, 231, 402].map((x, i) => rect(x, 105, 138, 177, i === 1 ? "#e4e3d5" : paper) + text(x + 18, 138, ["USER", "SERVICE", "DATA"][i]) + bars(x + 20, 195, 90)).join("") + connector(198, 179, 226, 179) + connector(369, 179, 397, 179) + path("M129 298v25h342v-25", sage, 3) + text(246, 345, "API / FLOW"),
    browser(68, 66, 320, 248) + text(88, 129, "INTEGRATION REVIEW") + [165, 210, 255].map(y => check(101, y) + bars(129, y, 195, 1)).join("") + rect(421, 115, 108, 160, "#e4e3d5") + text(437, 148, "DELIVERY") + bars(438, 185, 65) + circle(475, 241, 12, orange),
  ],
  brands: [
    sheet(61, 73, 211, 235, "BRAND BRIEF") + bars(82, 151, 136, 2) + circle(106, 244, 24, sage) + path("M94 244h24M106 232v24", paper, 3) + text(150, 238, "AUDIENCE") + text(150, 260, "CHARACTER") + rect(344, 95, 185, 181, "#e4e3d5") + shirt(370, 125, 1, paper) + connector(282, 193, 334, 193),
    rect(62, 68, 292, 246) + text(85, 103, "IDENTITY / DIRECTION") + text(84, 195, "W", 76) + bars(185, 147, 112) + [paper, sage, orange, ink].map((c, i) => rect(85 + i * 61, 247, 42, 42, c, 4)).join("") + rect(386, 115, 154, 185, "#e4e3d5") + shirt(410, 146, .88, paper),
    browser(62, 66, 300, 251) + rect(81, 116, 117, 156, "#e4e3d5", 5) + shirt(89, 139, .8, paper) + bars(218, 132, 116) + rect(217, 232, 116, 30, orange, 5) + phone(408, 102, 115, 216) + shirt(433, 158, .53) + bars(429, 256, 69, 2) + text(77, 344, "PRODUCT + CONTENT + CHANNELS"),
  ],
  media: [
    sheet(65, 68, 181, 247, "VISUAL BRIEF") + bars(87, 147, 124) + rect(86, 221, 118, 53, "#e4e3d5", 4) + path("M98 260l29-22 30 12 34-19", sage, 4) + rect(298, 93, 228, 201) + text(315, 124, "STORYBOARD") + [0, 1, 2, 3].map(i => rect(315 + i % 2 * 101, 145 + Math.floor(i / 2) * 67, 86, 53, i % 2 ? "#e4e3d5" : paper, 4) + circle(338 + i % 2 * 101, 166 + Math.floor(i / 2) * 67, 8, orange)).join(""),
    text(64, 61, "SCENE / MATERIAL / LIGHT") + path("M69 277l179-103 250 130-185 44Z", line, 2, "#e4e3d5") + cube(257, 164, 1.25) + circle(455, 100, 30, paper) + path("M455 64v-15M489 100h15M479 74l12-12M429 74l-11-12", orange, 3) + path("M439 137l-44 100M418 128l-54 84", line, 2) + rect(87, 177, 90, 55, ink, 5) + path("M177 186l29-11v59l-29-10Z", ink, 2, sage) + path("M127 238v66M127 253l-25 50M127 253l24 50", ink, 3),
    browser(58, 92, 298, 194) + rect(74, 136, 266, 131, "#e4e3d5", 3) + cube(173, 151, .86) + phone(408, 60, 116, 255) + cube(439, 121, .66) + bars(429, 246, 71, 2) + check(103, 321) + text(126, 325, "REVIEW / EXPORT") + text(408, 344, "FORMATS"),
  ],
  web: [
    text(65, 62, "INFORMATION ARCHITECTURE") + rect(230, 91, 141, 58, ink) + text(271, 126, "HOME", 13, paper) + path("M300 149v34M103 183h394M103 183v27M234 183v27M365 183v27M497 183v27", sage, 3) + [51, 181, 312, 444].map((x, i) => rect(x, 210, 105, 99, i === 1 ? "#e4e3d5" : paper) + text(x + 15, 240, ["SYSTEMS", "BRANDS", "STUDIO", "DIGITAL"][i], 10) + bars(x + 16, 273, 68, 2)).join(""),
    browser(56, 78, 350, 245) + rect(74, 125, 166, 132, "#e4e3d5", 5) + path("M99 232l27-48 32 22 23-58 33 84", sage, 4) + bars(260, 137, 120) + rect(260, 212, 120, 33, ink, 5) + [74, 180, 287].map(x => rect(x, 274, 92, 29, paper, 4)).join("") + phone(441, 116, 103, 207) + rect(454, 158, 77, 89, "#e4e3d5", 4) + bars(459, 268, 63, 2),
    browser(61, 69, 350, 231) + text(80, 129, "DEVICE / ACCESSIBILITY") + [167, 209, 251].map((y, i) => check(99, y) + text(123, y + 4, ["RESPONSIVE", "KEYBOARD", "REDUCED MOTION"][i])).join("") + phone(451, 109, 87, 172) + rect(463, 143, 63, 43, "#e4e3d5", 4) + bars(465, 207, 58, 2) + path("M130 310v23h179v-23", line, 3) + text(434, 316, "MOBILE"),
  ],
};
for (const [zone, scenes] of Object.entries(art)) {
  scenes.forEach((scene, i) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380"><rect width="600" height="380" fill="#f0ecdf"/><g fill="${line}" opacity=".6">${Array.from({ length: 20 }, (_, j) => circle(32 + j % 5 * 134, 30 + Math.floor(j / 5) * 104, 1.4, line)).join("")}</g>${scene}</svg>\n`;
    writeFileSync(`${directory}/${zone}-${i + 1}.svg`, svg);
  });
}
console.log("Generated 12 editable SVG process illustrations.");
