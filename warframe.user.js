// ==UserScript==
// @name         WARFRAME
// @version      1.0.5
// @author       aleab
// @source       https://raw.githubusercontent.com/aleab/userscripts-collection/master/warframe.user.js
// @icon         https://raw.githubusercontent.com/aleab/userscripts-collection/master/warframe/warframe.png
// @icon64       https://raw.githubusercontent.com/aleab/userscripts-collection/master/warframe/warframe.png
//
// @match        https://warframe.market/*
// @match        https://tennoware.com/*
// @match        https://wf.xuerian.net/*
//
// @grant        none
// @require      https://raw.githubusercontent.com/aleab/userscripts-collection/v1.0.5/aleab-common.js
// ==/UserScript==

/* jshint esversion: 6              */
/* eslint curly: off, no-eval: off  */
/* global $, aleab, sleep           */

const GITHUB_TAG = 'v1.0.5';
const GITHUB_RAW_BASEURL = `https://raw.githubusercontent.com/aleab/userscripts-collection/${GITHUB_TAG}/warframe`;

aleab.waitForModules().then(() => {
    $(document).ready(async function() {
        const WarframeMarket = await fetch(`${GITHUB_RAW_BASEURL}/warframe.market.js`).then(d => d.text()).then(d => new (eval(d)));
        const Tennoware = await fetch(`${GITHUB_RAW_BASEURL}/tennoware.com.js`).then(d => d.text()).then(d => new (eval(d)));
        const WfXuerianNet = await fetch(`${GITHUB_RAW_BASEURL}/wf.xuerian.net.js`).then(d => d.text()).then(d => new (eval(d)));

        let doStuff = async function() {
            let currentUrl = window.location.href;
            if (RegExp('^https://warframe.market/.*$').test(currentUrl))
                await WarframeMarket.doStuff();
            else if (RegExp('^https://tennoware.com/.*$').test(currentUrl))
                await Tennoware.doStuff();
            else if (RegExp('^https://wf.xuerian.net/.*$').test(currentUrl))
                await WfXuerianNet.doStuff();
        };

        aleab.setPageChangeEvent(async function() {
            await sleep(200);
            await doStuff();
        });
        await doStuff();
    });
});
