const ALEAB_JQUERY_VERSION = '3.4.1';

(function() {
    let loadJS = (url, location, then) => {
        var script = document.createElement('script');
        script.src = url;
        script.onload = then;
        script.onreadystatechange = then;
        location.appendChild(script);
    };

    let aleab = window.aleab ? window.aleab : (window.aleab = {});
    loadJS(`https://code.jquery.com/jquery-${ALEAB_JQUERY_VERSION}.min.js`, document.body, () => { (aleab.modules ? aleab.modules : (aleab.modules = {}))['jQuery'] = true; });

    aleab.waitForModules = function(timeout) {
        return new Promise(async (resolve, reject) => {
            if (!timeout || timeout <= 0)
                timeout = 5000;

            const modules = [ 'jQuery' ];
            let ready = false;
            do {
                ready = true;
                for (let i = 0; i < modules.length; ++i) {
                    ready &= (aleab.modules ? aleab.modules[modules[i]] : false);
                }

                await sleep(25);
                timeout -= 25;
            } while (timeout > 0 && !ready);

            if (ready)
                resolve(aleab.modules);
            else {
                let str = 'Timeout while waiting for modules!'
                console.error(`[aleab-common] ${str}\n  Expected:`, modules, '\n  Loaded:', aleab.modules);
                reject(str);
            }
        });
    }

    aleab.setPageChangeEvent = function(fn) {
        window.onpopstate = history.onpushstate = fn;
    }
})();

(function(history){
    let pushState = history.pushState;
    history.pushState = function(state) {
        if (typeof history.onpushstate == "function")
            history.onpushstate({ state: state });
        return pushState.apply(history, arguments);
    };
})(window.history);


// ===================
//  UTILITY FUNCTIONS
// ===================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitFor(selector, timeout) {
    if (!timeout || timeout <= 0)
        timeout = 5000;

    let jq = $(selector);
    while (timeout > 0 && jq.length == 0) {
        await sleep(25);
        timeout -= 25;
        jq = $(selector);
    }
    return timeout > 0 && jq.length > 0;
}
