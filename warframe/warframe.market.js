(function() {
    const REGEX_ITEMS_PAGE = RegExp('^https://warframe.market/items/(.+)$');

    const REGION = 'en';
    const STATUS = 'ingame';
    
    const MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;

    let map = new WeakMap();
    let _ = function(obj) {
        if (!map.has(obj))
            map.set(obj, {});
        return map.get(obj);
    };

    function WarframeMarket() {
        _(this).sellOrders = null;
        _(this).ordersObserver = null;
    }

    WarframeMarket.prototype.doStuff = async function() {
        console.log(`WARFRAME | warframe.market: ${window.location.href}`);

        if (_(this).ordersObserver) {
            _(this).ordersObserver.disconnect();
            _(this).ordersObserver = null;
        }

        // Fetch sell orders
        if (REGEX_ITEMS_PAGE.test(window.location.href)) {
            let item = REGEX_ITEMS_PAGE.exec(window.location.href)[1];
            await fetch(`https://api.warframe.market/v1/items/${item}/orders`).then(data => data.json()).then(data => {
                _(this).sellOrders = window.sellOrders = filterOrders(data.payload.orders);
            });

            await market.addPriceStatistics(this);
            await market.observeOrderChanges(this);
            market.addCustomCSS(this);
        }
    };


    // ===================
    //  PRIVATE FUNCTIONS
    // ===================

    const filterOrders = function(orders) {
        return orders.filter(o => o.visible && o.order_type === 'sell' && o.region === REGION && o.user.status === STATUS)
                     .sort((o1, o2) => o1.platinum - o2.platinum);
    };

    const secondsToDhms = function(seconds) {
        seconds = Number(seconds);
        let d = Math.floor(seconds / (3600*24));
        let h = Math.floor(seconds % (3600*24) / 3600);
        let m = Math.floor(seconds % 3600 / 60);
        let s = Math.floor(seconds % 60);
        return { 'd': d, 'h': h, 'm': m, 's': s };
    };

    const market = {
        addPriceStatistics: async function(self) {
            let sellOrders = _(self).sellOrders;
            if (!sellOrders) return;

            let stdDev = 0;
            let mean1 = 0; let median1 = 0;
            let mean2 = 0; let median2 = 0;

            // Calculate mean (w/ outliers)
            sellOrders.forEach(function(o) { mean1 += o.platinum; });
            mean1 /= sellOrders.length;

            // Calculate median (w/ outliers)
            const m1 = Math.floor(sellOrders.length / 2);
            median1 = sellOrders.length % 2 == 0
                ? (sellOrders[m1 - 1].platinum + sellOrders[m1].platinum) / 2
                : sellOrders[m1].platinum;

            // Calculate standard deviation
            sellOrders.forEach(function(o) { stdDev += Math.pow(o.platinum - mean1, 2); });
            stdDev = Math.sqrt(stdDev / (sellOrders.length - 1));

            // Calculate mean (w/o outliers)
            sellOrders = sellOrders.filter(o => o.platinum >= mean1 - 2.5 * stdDev && o.platinum <= mean1 + 2.5 * stdDev)
                                   .sort((o1, o2) => o1.platinum - o2.platinum);
            sellOrders.forEach(function(o) { mean2 += o.platinum; });
            mean2 /= sellOrders.length;

            // Calculate median (w/o outliers)
            const m2 = Math.floor(sellOrders.length / 2);
            median2 = sellOrders.length % 2 == 0
                ? (sellOrders[m2 - 1].platinum + sellOrders[m2].platinum) / 2
                : sellOrders[m2].platinum;

            await waitFor('div.content__header--second.flex--root > .flex--right');
            $('#aleab-mean-median').remove();
            $('div.content__header--second.flex--root > .flex--right').append(`
                <div id="aleab-mean-median" style="padding: 7px 0 7px 7px; height: 100%; display: flex; flex-direction: column; justify-content: center;">
                  <div>
                    <span style="white-space: pre;">Mean:   </span>
                    <div class="platinum_price" style="display: inline-block;">
                      <b class="price">${Math.round((mean2 + 0.00001) * 100) / 100}</b>
                      <svg class="wfm-icon icon-platinum" viewBox="0 0 215.535 215.535"><use xlink:href="/static/build/wfm-icons-c162ee.svg#icon-platinum" /></svg>
                    </div>
                    <span> (</span>
                    <div class="platinum_price" style="display: inline-block;">
                      <b class="price">${Math.round((mean1 + 0.00001) * 100) / 100}</b>
                      <svg class="wfm-icon icon-platinum" viewBox="0 0 215.535 215.535"><use xlink:href="/static/build/wfm-icons-c162ee.svg#icon-platinum" /></svg>
                    </div>
                    <span>)</span>
                  </div>

                  <div>
                    <span>Median: </span>
                    <div class="platinum_price" style="display: inline-block;">
                      <b class="price">${Math.round((median2 + 0.00001) * 100) / 100}</b>
                      <svg class="wfm-icon icon-platinum" viewBox="0 0 215.535 215.535"><use xlink:href="/static/build/wfm-icons-c162ee.svg#icon-platinum" /></svg>
                    </div>
                    <span> (</span>
                    <div class="platinum_price" style="display: inline-block;">
                      <b class="price">${Math.round((median1 + 0.00001) * 100) / 100}</b>
                      <svg class="wfm-icon icon-platinum" viewBox="0 0 215.535 215.535"><use xlink:href="/static/build/wfm-icons-c162ee.svg#icon-platinum" /></svg>
                    </div>
                    <span>)</span>
                  </div>
                </div>`);
        },

        observeOrderChanges: async function(self) {
            let addCreationDate = (nodes) => {
                let filteredNodes = nodes.filter(n => $(n).find(`.user__status > .s-${STATUS}`).length > 0);
                for (let i = 0; i < filteredNodes.length; ++i) {
                    let jN = $(filteredNodes[i]);

                    let username = jN.find('.user__name').text();
                    let reputation = jN.find('.user__reputation > span:first-child').text().replace(',', '');
                    let price = jN.find('.order__price > .platinum__price > .price').text().replace(',', '');
                    let quantity = jN.find('.order__quantity > span:first-child').text().replace(',', '');

                    if (username.length === 0 || reputation.length === 0 || price.length === 0 || quantity.length === 0)
                        continue;

                    let order = _(self).sellOrders.find(order => order.user.ingame_name === username && order.user.reputation == reputation && order.platinum == price && order.quantity == quantity);
                    if (!order)
                        continue;
                    
                    let now = Date.now();

                    let secondsPosted = Math.round((now - new Date(order.last_update)) / 1000);
                    let dhms = secondsToDhms(secondsPosted);
                    let str = `${dhms.d > 0 ? dhms.d + 'd ' : '' }${dhms.h > 0 ? dhms.h + 'h ' : ''}${dhms.m > 0 ? dhms.m + 'm ' : ''}${dhms.s > 0 ? dhms.s + 's' : ''}`;
                    if (str.length > 0) str = `(${str.trim()})`;

                    let div = jN.find('div:last-child > .row > div:last-child');
                    div.find('.order__posted_time').remove();
                    $(document.createElement('div')).addClass('order__posted_time').append(
                        $(document.createElement('span')).append(str)
                    ).appendTo(div);
                }
            };

            await waitFor('.container.item_orders > .infinite-scroll > .infinite-translate');
            let rowsContainer = $('.container.item_orders > .infinite-scroll > .infinite-translate');

            _(self).ordersObserver = new MutationObserver(async function(mutations, observer) {
                if (!mutations || mutations.length === 0)
                    return;

                // Update _(self).sellOrders
                await window.caches.open('WFM-PWA-v1').then(async function(cache) {
                    let item = REGEX_ITEMS_PAGE.exec(window.location.href)[1];
                    let data = await (await cache.match(`https://api.warframe.market/v1/items/${item}/orders`)).json();
                    _(self).sellOrders = window.sellOrders = filterOrders(data.payload.orders);
                });

                let addedNodes = mutations.flatMap(e => $.makeArray(e.addedNodes)).filter(n => $(n).hasClass('order-row'));
                if (addedNodes.length > 0) {
                    addCreationDate(addedNodes);
                }
            });
            _(self).ordersObserver.observe(rowsContainer[0], { childList: true });

            addCreationDate(rowsContainer.find('.order-row').toArray());
        },

        addCustomCSS: function(self) {
            let S = function() {
                let str = '';
                for (let i = 0; i < arguments.length; ++i)
                    str += (arguments[i] ? arguments[i] : '') + '\n';
                return str + '\n';
            };

            $('#aleab-styles').remove();
            $(document.createElement('style')).attr('id', 'aleab-styles').attr('type', 'text/css')
                .append(S(
                    '.order-row .order__posted_time {',
                    '    display: flex;',
                    '    align-items: center;',
                    '    transform: translate(100%, 0);',
                    '    position: absolute;',
                    '    right: 0px;',
                    '    width: 160px;',
                    '    height: 100%;',
                    '}',
                    '.order-row .order__posted_time > span { padding-left: 8px; }',
                    '.order-row:nth-child(2n) .order__posted_time { background: #FFF; }',
                    '.order-row.order__own_line .order__posted_time { background: #E9E3F3 !important; }',
                    '.order-row.order__own_line:nth-child(odd) .order__posted_time { background: #F1EDF8 !important; }'
                ))
                .appendTo(document.head);
        }
    };

    return WarframeMarket;
}());
