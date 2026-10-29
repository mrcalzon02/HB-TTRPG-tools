#!/usr/bin/env node
/**
 * Capture a real running game's visible screens. Never reconstruct or paint title art.
 * Usage: node capture-browser.mjs URL OUTPUT_DIRECTORY MODE REPO_SHA
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const [url, directory, mode, revision] = process.argv.slice(2);
if (!url || !directory || !mode || !revision) throw new Error("URL OUTPUT_DIRECTORY MODE REPO_SHA required");
fs.mkdirSync(directory, {recursive:true});
const browser = await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--no-sandbox"]});
const context = await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1,reducedMotion:"reduce"});
const page = await context.newPage();
const errors=[];
page.on("pageerror", error=>errors.push(String(error).slice(0,350)));
const shots=[];
const filenameSafe = value => value.replace(/[^a-z0-9-]/gi,"-").toLowerCase().replace(/-+/g,"-");
async function capture(name) {
  await page.evaluate(async () => { if (document.fonts) await document.fonts.ready; });
  await page.waitForTimeout(900);
  const file = path.join(directory, name+".png");
  const bytes = await page.screenshot({path:file,animations:"disabled",fullPage:false});
  if (bytes.length < 12000 || bytes.toString("hex",0,8) !== "89504e470d0a1a0a") throw new Error("Invalid/empty framebuffer for "+name);
  const text = (await page.locator("body").innerText()).slice(0,500);
  shots.push({name,file:name+".png",sha256:crypto.createHash("sha256").update(bytes).digest("hex"),bytes:bytes.length,visibleText:text});
}
try {
  await page.goto(url,{waitUntil:"domcontentloaded",timeout:60000});
  const target = mode === "fleet" ? "#root" : "#screen";
  await page.waitForFunction(sel => {
    const el = document.querySelector(sel);
    return !!el && (el.innerText || "").trim().length > 40;
  },target,{timeout:55000});
  if (mode === "jewel") {
    await page.waitForFunction(() => {
      const splash=document.querySelector("#jewelbrook-loading-splash");
      return !splash || getComputedStyle(splash).display === "none" ||
        getComputedStyle(splash).visibility === "hidden" || splash.getBoundingClientRect().height === 0 ||
        splash.getAttribute("aria-hidden") === "true";
    },null,{timeout:30000});
  }
  await page.waitForTimeout(1600);
  const broken = await page.locator("img").evaluateAll(nodes => nodes.filter(n => n.complete && !n.naturalWidth).length);
  const loaded = await page.locator("img").evaluateAll(nodes => nodes.filter(n => n.complete && n.naturalWidth > 0).length);
  if (mode !== "fleet" && loaded === 0) throw new Error("No game UI images loaded; refusing unverified menu screenshot");
  await capture("title");
  if (mode !== "fleet") {
    const names = await page.locator("nav.bottom button[data-nav]").evaluateAll(nodes =>
      [...new Set(nodes.map(n => n.getAttribute("data-nav")).filter(Boolean))]);
    for (const name of names) {
      if (name === "home") continue;
      try {
        const selector='nav.bottom button[data-nav="'+name+'"]';
        await page.locator(selector).first().click({timeout:12000});
        await page.waitForTimeout(700);
        const live = (await page.locator("#screen").innerText()).trim();
        if (live.length < 35) throw new Error("Menu did not render visible text");
        await capture("menu-"+filenameSafe(name));
      } catch (error) {
        errors.push("menu "+name+": "+String(error));
      }
    }
  }
  const evidence={repoSha:revision,url,mode,origin:"Live browser rendering of checked-out game's actual interface",capturedAt:new Date().toISOString(),loadedImages:loaded,brokenImages:broken,shots,errors};
  fs.writeFileSync(path.join(directory,"capture.json"),JSON.stringify(evidence,null,2)+"\n");
  console.log("Verified "+shots.length+" runtime screenshots for "+mode+" at "+revision);
} finally {
  await browser.close();
}
