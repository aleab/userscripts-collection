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

            $find($timersDiv, [ '.binpacker-item:has(#news-cycle-checkbox)', '.reset', '.earth', '.cetus', '.vallis', '.cambion', '.baro', '.sales', '.darvo' ])
                .removeClass('col-md-4')
                .removeAttr('style')
                .prepend(function() { return prependCollapseButton.apply(this); })
                .appendTo(c1);
            $find($timersDiv, [ ".binpacker-item:has(> h4:contains('Alerts'))", '.construction', '.events', '.invasions', '.bounties' ])
                .removeClass('col-md-4')
                .removeAttr('style')
                .prepend(function() { return prependCollapseButton.apply(this); })
                .appendTo(c2);
            $find($timersDiv, [ '.fissures', '.nightwave', '.sortie', '.arbitration', '.sol', '.sentientoutpost', '.conclave' ])
                .removeClass('col-md-4')
                .removeAttr('style')
                .prepend(function() { return prependCollapseButton.apply(this); })
                .appendTo(c3);

            $timersDiv.remove();
        }
    };

    return HubWarframestatUs;
}());
