// ==UserScript==
// @name         WARFRAME
// @version      1.1.1
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
// @require      https://raw.githubusercontent.com/aleab/userscripts-collection/v1.1.1/aleab-common.js
// ==/UserScript==

/* jshint esversion: 6              */
/* eslint curly: off, no-eval: off  */
/* global $, aleab, sleep           */

const GITHUB_TAG = 'v1.1.1';
const GITHUB_RAW_BASEURL = `https://raw.githubusercontent.com/aleab/userscripts-collection/${GITHUB_TAG}/warframe`;

aleab.waitForModules().then(() => {
    $(document).ready(async function() {
        const urls = [
            [ '^https://warframe.market/.*$', `${GITHUB_RAW_BASEURL}/warframe.market.js` ],
            [ '^https://tennoware.com/.*$', `${GITHUB_RAW_BASEURL}/tennoware.com.js` ],
            [ '^https://wf.xuerian.net/.*$', `${GITHUB_RAW_BASEURL}/wf.xuerian.net.js` ],
            [ '^https://hub.warframestat.us/.*$', `${GITHUB_RAW_BASEURL}/hub.warframestat.us.js` ]
        ];

        let doStuff = async function() {
            let o = null;
            let currentUrl = window.location.href;
            for (let i = 0; i < urls.length; ++i) {
                if (RegExp(urls[i][0]).test(currentUrl)) {
                    o = await fetch(urls[i][1]).then(d => d.text()).then(d => new (eval(d)));
                    break;
                }
            }

            if (o)
                await o.doStuff();
        };

        aleab.setPageChangeEvent(async function() {
            await sleep(200);
            await doStuff();
        });
        await doStuff();
    });
});
