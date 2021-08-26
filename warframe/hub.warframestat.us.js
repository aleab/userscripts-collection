(function() {
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

    function HubWarframestatUs() {}
    HubWarframestatUs.prototype.doStuff = async function() {
        console.log(`WARFRAME | hub.warframestat.us: ${window.location.href}`);

        let currentUrl = window.location.href;
        if (REGEX_TIMERS_PAGE.test(currentUrl)) {
            let container = $('.timers > .grid')[0];
            let $timersDiv = $('.timers div:has(> .binpacker-item)');

            /*let loaded = false;
            while (!loaded) {
                await aleab.sleep(200);
                loaded = typeof($($timersDiv.find('.binpacker-item')[0]).attr('style')) != 'undefined';
            }*/
            await aleab.waitFor('.timers div > .binpacker-item[style]');
            await aleab.sleep(200);

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

            $find($timersDiv, [ '.binpacker-item:has(#news-cycle-checkbox)', '.reset', '.darvo', '.baro', '.earth', '.cetus', '.vallis', '.cambion' ])
                .removeClass('col-md-4')
                .removeAttr('style')
                .appendTo(c1);
            $find($timersDiv, [ ".binpacker-item:has(> h4:contains('Alerts'))", '.construction', '.events', '.invasions', '.bounties' ])
                .removeClass('col-md-4')
                .removeAttr('style')
                .appendTo(c2);
            $find($timersDiv, [ '.fissures', '.nightwave', '.sortie', '.arbitration', '.sol', '.sentientoutpost' ])
                .removeClass('col-md-4')
                .removeAttr('style')
                .appendTo(c3);

            $timersDiv.remove();
        }
    };

    return HubWarframestatUs;
}());
