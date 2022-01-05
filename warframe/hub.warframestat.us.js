// ==UserScript==
// @name         [WARFRAME] hub.warframestat.us
// @version      1.3.0
// @author       aleab
// @source       https://raw.githubusercontent.com/aleab/userscripts-collection/master/warframe/hub.warframestat.us.js
// @icon         https://raw.githubusercontent.com/aleab/userscripts-collection/master/warframe/warframe.png
// @icon64       https://raw.githubusercontent.com/aleab/userscripts-collection/master/warframe/warframe.png
//
// @match        https://hub.warframestat.us/*
//
// @grant        none
// @require      https://raw.githubusercontent.com/aleab/userscripts-collection/v1.3.0/aleab-common.js
// ==/UserScript==

/* jshint esversion: 6              */
/* eslint curly: off, no-eval: off  */
/* global $, aleab, sleep, waitFor  */

function _HubWarframestatUs() {
    const REGEX_TIMERS_PAGE = RegExp('^https://hub.warframestat.us/(#/)?$');

    let map = new WeakMap();
    let _ = function(obj) {
        if (!map.has(obj))
            map.set(obj, {});
        return map.get(obj);
    };

    function $find($parent, arrayOfSelectors) {
        let a = [];
        for (const selector of arrayOfSelectors) {
            let $children = $parent.find(selector);
            for (const child of $children) {
                a.push(child);
            }
        }
        return $(a);
    }

    function prependCollapseButton() {
        function _collapse(x, btn, i, listGroup, h) {
            window.localStorage.setItem(`aleab-timers-collapse_${id}`, x);
            if (x) {
                btn.addClass('collapsed').attr('aria-expanded', 'false');
                i.removeClass('fa-chevron-up').addClass('fa-chevron-down');
                listGroup.hide();
                h.addClass('mb-0');
            } else {
                btn.removeClass('collapsed').attr('aria-expanded', 'true');
                i.removeClass('fa-chevron-down').addClass('fa-chevron-up');
                listGroup.show();
                h.removeClass('mb-0');
            }
        }

        let $chevron = $('<i>', { class: 'fas' });
        let $button = $('<button>', {
            class: 'btn btn-secondary mb-1 py-0'.trim(),
            type: 'button',
            css: {
                overflowAnchor: 'none',
                position: 'absolute',
                right: '15px'
            }
        });

        const $h = $(this).find('> .header-panel');
        const $listGroup = $(this).find('> .list-group');
        $button.append($chevron).click(function() { _collapse(!$button.is('.collapsed'), $button, $chevron, $listGroup, $h); });

        const id = getPanelId(this);
        const isCollapsed = window.localStorage.getItem(`aleab-timers-collapse_${id}`) === 'true';
        _collapse(isCollapsed, $button, $chevron, $listGroup, $h);

        return $button;
    }

    function getPanelId(element) {
        if ($(element).is('.binpacker-item:has(#news-cycle-checkbox)')) return 'news';
        if ($(element).is(".binpacker-item:has(> h4:contains('Alerts'))")) return 'alerts';

        let className = element.className
            .replace('panel-header', '')
            .replace('binpacker-item', '')
            .replace('mt-2', '')
            .trim();
        if (className === 'bounties') {
            className += '-' + $(element).find('> h4').text().replace('Bounty Cycle', '').replace(' ', '').trim().toLowerCase();
        }
        return className;
    }

    function HubWarframestatUs() {}
    HubWarframestatUs.prototype.doStuff = async function() {
        console.log(`WARFRAME | hub.warframestat.us: ${window.location.href}`);

        let currentUrl = window.location.href;
        if (REGEX_TIMERS_PAGE.test(currentUrl)) {
            let container = $('.timers > .grid')[0];
            let $timersDiv = $('.timers div:has(> .binpacker-item)');

            await waitFor('.timers div > .binpacker-item[style]');
            await sleep(200);

            // Change the style of the container
            $(container).removeClass('grid', 'container-fluid').css({
                display: 'flex',
                flexFlow: 'row nowrap',
            });

            // Create the new columns
            let o = {
                class: 'col-md-4',
                css: {
                    display: 'flex',
                    flexFlow: 'column nowrap',
                    justifyContent: 'flex-start',
                }
            };
            let c1 = $('<div>', o);
            let c2 = $('<div>', o);
            let c3 = $('<div>', o);
            $(container).append(c1, c2, c3);

            $find($timersDiv, [ '.time', '.binpacker-item:has(#news-cycle-checkbox)', '.baro', '.darvo', '.sales' ])
                .removeClass('col-md-4')
                .removeAttr('style')
                .prepend(function() { return prependCollapseButton.apply(this); })
                .appendTo(c1);
            $find($timersDiv, [ ".binpacker-item:has(> h4:contains('Alerts'))", '.construction', '.events', '.invasions', '.bounties' ])
                .removeClass('col-md-4')
                .removeAttr('style')
                .prepend(function() { return prependCollapseButton.apply(this); })
                .appendTo(c2);
            $find($timersDiv, [ '.fissures', '.nightwave', '.sortie', '.conclave' ])
                .removeClass('col-md-4')
                .removeAttr('style')
                .prepend(function() { return prependCollapseButton.apply(this); })
                .appendTo(c3);

            $timersDiv.remove();
        }
    };

    return HubWarframestatUs;
}

aleab.waitForModules().then(() => {
    $(document).ready(async function() {
        let o = new (_HubWarframestatUs())();
        aleab.setPageChangeEvent(async function() {
            await sleep(200);
            await o.doStuff();
        });
        await o.doStuff();
    });
});
