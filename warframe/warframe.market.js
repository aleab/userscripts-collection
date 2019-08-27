(function() {
    const REGEX_ITEMS_PAGE = RegExp('^https://warframe.market/items/(.+)$');

    const REGION = 'en';
    const STATUS = 'ingame';

    let map = new WeakMap();
    let _ = function(obj) {
        if (!map.has(obj))
            map.set(obj, {});
        return map.get(obj);
    };

    function WarframeMarket() { }

    WarframeMarket.prototype.doStuff = async function() {
        console.log(`WARFRAME | warframe.market: ${window.location.href}`);

        let item = REGEX_ITEMS_PAGE.exec(window.location.href)[1];
        fetch(`https://api.warframe.market/v1/items/${item}/orders`).then(data => data.json()).then(data => {
            window.payload = data.payload;
            let sellOrders = data.payload.orders.filter(o => o.visible && o.order_type == 'sell' && o.region == REGION && o.user.status == STATUS)
                                                .sort((o1, o2) => o1.platinum - o2.platinum);

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

            setTimeout(async function() {
                await waitFor('div.content__header--second.flex--root > .flex--right');
                await sleep(100);

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
            }, 50);
        });
    };

    return WarframeMarket;
}());
