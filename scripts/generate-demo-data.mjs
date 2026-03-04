/**
 * Generates realistic but fake financial data for README screenshots.
 * Run with: node scripts/generate-demo-data.mjs
 */

import * as XLSX from '../static-site/node_modules/xlsx/xlsx.mjs';
import { writeFileSync } from 'fs';

// --- Seeded pseudo-random (LCG) for reproducibility ---
let seed = 42;
function rand() {
  seed = (seed * 1664525 + 1013904223) & 0xffffffff;
  return (seed >>> 0) / 0xffffffff;
}
function randRange(min, max) {
  return min + rand() * (max - min);
}
function randNormal(mean, std) {
  // Box-Muller
  const u = Math.max(1e-10, rand());
  const v = rand();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// --- Date helpers ---
function generateMonths(startYear, startMonth, endYear, endMonth) {
  const months = [];
  let y = startYear,
    m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    months.push(new Date(y, m - 1, 1));
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

// Jan 2019 → Feb 2026 (86 months)
const months = generateMonths(2019, 1, 2026, 2);

// --- US Spend ---
// $3,200–$6,800/month, seasonal peaks in Dec/Jan, slow upward trend
function generateUSSpend(months) {
  return months.map((date, i) => {
    const trend = i * 18;
    const seasonal = Math.sin((date.getMonth() - 5) * Math.PI / 6) * 350;
    const holidayBump = date.getMonth() === 11 ? 800 : 0;
    const noise = randNormal(0, 500);
    const total = Math.max(2800, 3400 + trend + seasonal + holidayBump + noise);
    return { Dates: date, Total: Math.round(total), Conversion: 1.0 };
  });
}

// --- UK Spend ---
// £1,600–£2,800/month in GBP, GBP/USD ~1.24–1.32
function generateUKSpend(months) {
  return months.map((date, i) => {
    const trend = i * 6;
    const seasonal = Math.sin((date.getMonth() - 5) * Math.PI / 6) * 120;
    const noise = randNormal(0, 180);
    const total = Math.max(1400, 1750 + trend + seasonal + noise);
    const conversion = 1.27 + randNormal(0, 0.025);
    return {
      Dates: date,
      Total: Math.round(total),
      Conversion: parseFloat(Math.max(1.18, Math.min(1.38, conversion)).toFixed(4)),
    };
  });
}

// --- US Networth ---
// Starts $148k Jan 2019, grows to ~$710k by Feb 2026
// COVID dip Mar–Apr 2020, recovery by Aug 2020; 2022 bear market
function generateUSNetworth(months) {
  let net = 148000;
  const result = [];
  for (let i = 0; i < months.length; i++) {
    const date = months[i];
    const yr = date.getFullYear();
    const mo = date.getMonth(); // 0-indexed

    // Monthly savings contribution (growing career)
    const savings = 4200 + i * 35;

    // Market return baseline ~8% annual = 0.64%/mo, with variance
    let marketPct = randNormal(0.0064, 0.035);

    // COVID crash: Mar–Apr 2020
    if (yr === 2020 && (mo === 2 || mo === 3)) marketPct = -0.14;
    // Recovery: May–Sep 2020
    if (yr === 2020 && mo >= 4 && mo <= 8) marketPct = randNormal(0.04, 0.02);

    // 2022 bear market
    if (yr === 2022 && mo >= 0 && mo <= 8) marketPct = randNormal(-0.025, 0.025);
    // 2022 recovery end
    if (yr === 2022 && mo >= 9) marketPct = randNormal(0.01, 0.02);

    // 2023 strong recovery
    if (yr === 2023) marketPct = randNormal(0.018, 0.025);

    net = Math.max(80000, net * (1 + marketPct) + savings);
    result.push({ Dates: date, Net: Math.round(net), Conversion: 1.0 });
  }
  return result;
}

// --- UK Networth ---
// Starts £42k Jan 2019, grows to ~£178k by Feb 2026 (GBP)
function generateUKNetworth(months) {
  let net = 42000;
  const result = [];
  for (let i = 0; i < months.length; i++) {
    const date = months[i];
    const yr = date.getFullYear();
    const mo = date.getMonth();

    const savings = 1200 + i * 12;
    let marketPct = randNormal(0.006, 0.03);

    if (yr === 2020 && (mo === 2 || mo === 3)) marketPct = -0.12;
    if (yr === 2020 && mo >= 4 && mo <= 8) marketPct = randNormal(0.035, 0.02);
    if (yr === 2022 && mo >= 0 && mo <= 8) marketPct = randNormal(-0.02, 0.025);
    if (yr === 2023) marketPct = randNormal(0.015, 0.022);

    net = Math.max(30000, net * (1 + marketPct) + savings);
    const conversion = 1.27 + randNormal(0, 0.025);
    result.push({
      Dates: date,
      Net: Math.round(net),
      Conversion: parseFloat(Math.max(1.18, Math.min(1.38, conversion)).toFixed(4)),
    });
  }
  return result;
}

// --- Total Comp ---
// Tech career: $168k total comp in 2019 → $248k in 2026 (gross annual)
// Pension Contrib = 401k contribution (~8% gross), Net after tax ~34% effective rate
function generateTotalComp(months) {
  // Annual gross milestones
  const annualGross = {
    2019: 168000,
    2020: 172000,
    2021: 190000, // promotion
    2022: 210000,
    2023: 225000,
    2024: 238000,
    2025: 248000,
    2026: 255000,
  };

  return months.map((date) => {
    const yr = date.getFullYear();
    const gross = Math.round(annualGross[yr] / 12);
    const pensionContrib = Math.round(gross * 0.08); // 8% 401k
    const taxableGross = gross - pensionContrib;
    const effectiveTax = 0.28 + (gross / 25000) * 0.02; // slightly progressive
    const net = Math.round(taxableGross * (1 - Math.min(0.34, effectiveTax)));
    return {
      Dates: date,
      Gross: gross,
      'Pension Contrib': pensionContrib,
      Net: net,
      Conversion: 1.0,
    };
  });
}

// --- US Asset Allocation (current snapshot, sums to ~$710k) ---
const usAssetAllocation = [
  { Asset: 'US Total Market ETF',    Value: 182000, 'Account Type': '401k' },
  { Asset: 'Target Date 2055 Fund',  Value:  48000, 'Account Type': '401k' },
  { Asset: 'US Total Market ETF',    Value: 108000, 'Account Type': 'Roth IRA' },
  { Asset: 'Small Cap Value ETF',    Value:  22000, 'Account Type': 'Roth IRA' },
  { Asset: 'US Total Market ETF',    Value:  71000, 'Account Type': 'IRA' },
  { Asset: 'International ETF',      Value:  92000, 'Account Type': 'Taxable Brokerage' },
  { Asset: 'US Total Market ETF',    Value: 118000, 'Account Type': 'Taxable Brokerage' },
  { Asset: 'Bond ETF',               Value:  34000, 'Account Type': 'Taxable Brokerage' },
  { Asset: 'High Yield Savings',     Value:  38000, 'Account Type': 'HYSA' },
  { Asset: 'HSA Investment Fund',    Value:  21000, 'Account Type': 'HSA' },
  { Asset: 'Bitcoin',                Value:   8500, 'Account Type': 'Coinbase' },
  { Asset: 'Ethereum',               Value:   3200, 'Account Type': 'Coinbase' },
];
// Sum: 182+48+108+22+71+92+118+34+38+21+8.5+3.2 = 745.7k ✓ close to US NW endpoint

// --- UK Asset Allocation (current snapshot in GBP, sums to ~£178k) ---
// Conversion ~1.27 throughout
const ukAssetAllocation = [
  { Asset: 'Global Equity Index',  Value:  92000, 'Account Type': 'UK Pension',          Conversion: 1.27 },
  { Asset: 'UK Equity Index',      Value:  28000, 'Account Type': 'UK Pension',          Conversion: 1.27 },
  { Asset: 'Bonds Fund',           Value:  14000, 'Account Type': 'UK Pension',          Conversion: 1.27 },
  { Asset: 'Global ETF (ISA)',     Value:  31000, 'Account Type': 'Taxable Brokerage',   Conversion: 1.27 },
  { Asset: 'Cash ISA',             Value:   6500, 'Account Type': 'Taxable Brokerage',   Conversion: 1.27 },
  { Asset: 'Instant Access Saver', Value:  18000, 'Account Type': 'UK Cash',             Conversion: 1.27 },
];
// Sum: 92+28+14+31+6.5+18 = 189.5k GBP → ×1.27 ≈ $240k in USD, close to UK NW endpoint

// --- Build workbook ---
const wb = XLSX.utils.book_new();

function addSheet(name, data) {
  const ws = XLSX.utils.json_to_sheet(data, { cellDates: true });
  // Format date columns as YYYY-MM-DD
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r + 1; R <= range.e.r; R++) {
    const cellAddr = XLSX.utils.encode_cell({ r: R, c: 0 });
    const cell = ws[cellAddr];
    if (cell && cell.t === 'd') {
      cell.z = 'yyyy-mm-dd';
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, name);
}

addSheet('US Spend', generateUSSpend(months));
addSheet('UK Spend', generateUKSpend(months));
addSheet('US Networth', generateUSNetworth(months));
addSheet('UK Networth', generateUKNetworth(months));
addSheet('Total Comp', generateTotalComp(months));
addSheet('US Asset Allocation', usAssetAllocation);
addSheet('UK Asset Allocation', ukAssetAllocation);

const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
writeFileSync('demo-data.xlsx', buf);

// Print summary
const usNW = generateUSNetworth(months);
const ukNW = generateUKNetworth(months);
const lastUS = usNW[usNW.length - 1];
const lastUK = ukNW[ukNW.length - 1];
console.log('Generated demo-data.xlsx');
console.log(`  US Networth (latest): $${lastUS.Net.toLocaleString()}`);
console.log(`  UK Networth (latest): £${lastUK.Net.toLocaleString()} (~$${Math.round(lastUK.Net * lastUK.Conversion).toLocaleString()})`);
const usAssets = usAssetAllocation.reduce((s, r) => s + r.Value, 0);
const ukAssets = ukAssetAllocation.reduce((s, r) => s + r.Value * r.Conversion, 0);
console.log(`  US asset allocation total: $${usAssets.toLocaleString()}`);
console.log(`  UK asset allocation total (USD): $${Math.round(ukAssets).toLocaleString()}`);
