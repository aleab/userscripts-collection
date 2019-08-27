(function() {
    const REGEX_MYBUILDS_PAGE = RegExp('^https://tennoware.com/mybuilds/?$');
    const REGEX_BUILD_PAGE = RegExp('^https://tennoware.com/(warframes|primaryweapons|secondaryweapons|meleeweapons|archguns-land|beasts|sentinels|sentinelsweapons|archwings|archguns-space|archmelee|zaws|kitguns|moas)/.+$');

    let map = new WeakMap();
    let _ = function(obj) {
        if (!map.has(obj))
            map.set(obj, {});
        return map.get(obj);
    };

    function Tennoware() { }

    Tennoware.prototype.doStuff = async function() {
        console.log(`WARFRAME | tennoware.com: ${window.location.href}`);

        let currentUrl = window.location.href;
        if (REGEX_MYBUILDS_PAGE.test(currentUrl)) {
            await mybuilds.prettifyMyBuildsPageLayout(this);
        } else if (REGEX_BUILD_PAGE.test(currentUrl)) {
            await build.addCopyDamageValuesButton(this);
            await build.tweakMoaPage(this);
        }

        await miscTweaks(this);
    };


    // ===================
    //  PRIVATE FUNCTIONS
    // ===================

    const mybuilds = {
        prettifyMyBuildsPageLayout: async function(self) {
            await waitFor('.my-builds > .builds-wrapper > .my-build-container');
            let builds = $('.my-builds > .builds-wrapper > .my-build-container');

            // Sort by item name
            builds.sort((a, b) => {
                let at = $(a).find('.my-item-name').text();
                let bt = $(b).find('.my-item-name').text();
                if (at > bt) return 1;
                if (at < bt) return -1;

                at = $(a).find('.my-build-list-name').text();
                bt = $(b).find('.my-build-list-name').text();
                if (at > bt) return 1;
                if (at < bt) return -1;
                return 0;
            });

            $('.my-builds > .builds-wrapper > .my-build-container').remove()
            $('.my-builds > .builds-wrapper').append(builds);
        }
    };

    const build = {
        addCopyDamageValuesButton: async function(self) {
            await waitFor('.stats-wrapper');
            await waitFor('.stats-wrapper > .stats-item.damage');

            let damageWrapperDiv = $('.stats-wrapper > .stats-item.damage').filter((i, e) => {
                let jStatNames = $(e).find('.stat-name');
                if (jStatNames.length > 0) {
                    return jStatNames[0].innerText && jStatNames[0].innerText.startsWith('Damage');
                }
                return false;
            })[0];
            if (!damageWrapperDiv)
                return;

            // Add button
            let wrapper = document.createElement('div');
            $(wrapper).css({ 'display': 'flex', 'flex-direction': 'row', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '2px' })
                .append($(damageWrapperDiv).find('.stat-name')[0]);
            $(damageWrapperDiv).prepend(wrapper);

            let button = document.createElement("div");
            $(button).css({ 'flex-grow': '0', 'min-width': 'unset', 'min-height': 'unset' })
                .addClass('interactable').addClass('interactable-semi-inactive');
            $(wrapper).append(button);

            let buttonText = document.createElement("p");
            $(button).append(buttonText);
            $(buttonText).css('font-size', '14px')
                         .css('padding', '6px 10px 4px 10px')
                .addClass('interactable-p').text('Copy');

            $(button).click(ev => {
                let damageIndexes = {
                    'impact': 0, 'puncture': 1, 'slash': 2,
                    'cold': 3, 'electricity': 4, 'heat': 5, 'toxin': 6,
                    'blast': 7, 'corrosive': 8, 'gas': 9, 'magnetic': 10, 'radiation': 11, 'viral': 12,
                    'true': 13, 'void': 14
                }
                let damageValues = Array(15);

                let damageStatDivs = $(ev.target).closest('.stats-item.damage').find('.damage > div.stat');
                for (let i = 0; i < damageStatDivs.length; ++i) {
                    let damageType = $(damageStatDivs[i]).find('p')[0].innerText.match('^([^:]+):.*$')[1].toLowerCase();
                    if (damageIndexes.hasOwnProperty(damageType))
                        damageValues[damageIndexes[damageType]] = $(damageStatDivs[i]).find('p.stat-frag')[0].innerText;
                }

                let text = '';
                for (let i = 0; i < 15; ++i)
                    text += (damageValues[i] ? damageValues[i] : '0') + '\n';
                navigator.clipboard.writeText(text);
            });
        },

        tweakMoaPage: async function(self) {
            if (REGEX_BUILD_PAGE.exec(window.location.href)[1] !== 'moas')
                return;

            await waitFor('.modding-screen > .mod-stack');
            $('.modding-screen > .mod-stack').css({ 'width': '825px' });
            $('.modding-screen > .mod-stack > .special-modding').css({ 'max-width': '805px' });
            $('.modding-screen > .mod-stack > .slots-wrapper > .slots').css({ 'max-width': '805px' });
        }
    };

    miscTweaks = async function(self) {
        await waitFor('.topbar');
        $('.topbar > .top-buttons > a[href$="/mybuilds"]').attr('href', 'javascript:;')
    }

    return Tennoware;
}());
