(function() {
    const REGEX_MYBUILDS_PAGE = RegExp('^https://tennoware.com/mybuilds/?$');
    const REGEX_BUILD_PAGE = RegExp('^https://tennoware.com/(warframes|primaryweapons|secondaryweapons|meleeweapons|archguns-land|beasts|sentinels|sentinelsweapons|archwings|archguns-space|archmelee|zaws|kitguns|moas)/.+$');

    let map = new WeakMap();
    let _ = function(obj) {
        if (!map.has(obj))
            map.set(obj, {});
        return map.get(obj);
    };

    function Tennoware() {
        _(this).weaponTypeToNameMap = {};
    }

    Tennoware.prototype.doStuff = async function() {
        console.log(`WARFRAME | tennoware.com: ${window.location.href}`);

        await populateWeaponTypeToNameMap(this);

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

    const populateWeaponTypeToNameMap = async function(self) {
        await waitFor('.topbar .nav-menu > .nav-options');

        _(self).weaponTypeToNameMap = {};
        let navOptions = $('.topbar .nav-menu > .nav-options a.nav-option');

        for (let i = 0; i < navOptions.length; ++i) {
            let type = navOptions[i].href.replace(/^.*\/(.+)$/, '$1');
            _(self).weaponTypeToNameMap[type] = $(navOptions[i]).text();
        }
    }

    const mybuilds = {
        prettifyMyBuildsPageLayout: async function(self) {
            await waitFor('.my-builds > .builds-wrapper > .my-build-container');
            let builds = $('.my-builds > .builds-wrapper > .my-build-container');

            // Sort by item name
            builds.sort((a, b) => {
                let result = $(a).find('.my-item-name').text().localeCompare($(b).find('.my-item-name').text());
                if (result === 0)
                    result = $(a).find('.my-build-list-name').text().localeCompare($(b).find('.my-build-list-name').text());
                return result;
            });
            $('.my-builds > .builds-wrapper').append(builds.remove());

            // Organize by item type
            let buckets = {};
            for (let i = 0; i < builds.length; ++i) {
                let href = $(builds[i]).find('.my-build-buttons > a:has(div.interactable:has(p:contains("Open")))')[0].href;
                let type = REGEX_BUILD_PAGE.exec(href)[1];
                (buckets[type] ? buckets[type] : (buckets[type] = [])).push(i);
            }

            let wrapper = $(document.createElement('div')).addClass('flex-wrapper-c').insertAfter($('.my-builds > .builds-wrapper > .my-builds-subtitle')[0]);
            for (let type in _(self).weaponTypeToNameMap) {
                if (!buckets[type]) continue;
                let name = _(self).weaponTypeToNameMap[type];

                $(document.createElement('div')).addClass(['collapsible-group', 'flex-wrapper-c']).append(
                    $(document.createElement('button')).addClass('collapsible').click(ev => {
                        let group = $(ev.currentTarget).closest('.collapsible-group');
                        group.find('.collapsible-content').toggleClass('hidden');
                        group.toggleClass('active');
                        $(ev.currentTarget).find('i.fas.fa-chevron-right').toggleClass('rot90');
                    }).append(
                        $(document.createElement('i')).addClass(['fas', 'fa-chevron-right'])
                    ).append(
                        $(document.createElement('span')).append(name)
                    )
                ).append(
                    $(document.createElement('div')).addClass('collapsible-content').addClass('hidden').append(
                        buckets[type].map(i => builds[i])
                    )
                ).appendTo(wrapper);
            }

            // Remove the search field, since it's broken now that the builds have been moved
            $('.my-builds > .my-builds-topbar').remove();
            $('.my-builds > .builds-wrapper').css({ 'padding-top': '10px' });
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

        // Custom Styles
        let S = function() {
            let str = '';
            for (let i = 0; i < arguments.length; ++i)
                str += (arguments[i] ? arguments[i] : '') + '\n';
            return str + '\n';
        };
        let R = function(s, n) {
            let str = '';
            for (let i = 0; i < n; ++i)
                str += s;
            return str;
        }

        $('#fontawesome-styles').remove();
        $(document.createElement('link')).attr('id', 'fontawaesome-styles').attr('rel', 'stylesheet').attr('type', 'text/css').attr('href', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.10.2/css/fontawesome.min.css').appendTo(document.head);

        $('#fontawesome-styles-solid').remove();
        $(document.createElement('link')).attr('id', 'fontawaesome-styles-solid').attr('rel', 'stylesheet').attr('type', 'text/css').attr('href', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.10.2/css/solid.min.css').appendTo(document.head);

        $('#aleab-styles').remove();
        $(document.createElement('style')).attr('id', 'aleab-styles').attr('type', 'text/css')
            .append(S(
                '.hidden { display: none !important; }',
                '.flex-wrapper-c { display: flex; flex-direction: column; align-items: center; }',
                '.rot90 { transform: rotate(90deg); }'
            ))
            .append(S(
                '.collapsible-group {',
                '    width: 97vw;',
                '    max-width: 820px;',
                '    margin-bottom: 4px;',
                '}',
                '.collapsible-group.active { margin-bottom: 12px; }'
            ))
            .append(S(
                '.collapsible-group > .collapsible {',
                '    align-self: flex-start;',
                '    background-color: transparent;',
                '    border: none;',
                '    outline: none;',
                '    cursor: pointer;',
                '    padding: 0px 0px 0px 4px;',
                '    color: #F0D975;',
                '    font-size: 17px;',
                `    text-shadow: black 0px 0px 2px${R(', black 0px 0px 2px', 7)};`,
                '}',
                '.collapsible-group > .collapsible > .fas { font-size: 14px; }',
                '.collapsible-group > .collapsible > span { padding-left: 4px; }',
                '.collapsible-group.active > .collapsible > span { padding-left: 6px; }'
            ))
            .append(S(
                '.collapsible-group > .collapsible-content {',
                '    display: block;',
                '    overflow: hidden;',
                '    max-width: 790px;',
                '}'
            ))
            .appendTo(document.head);
    }

    return Tennoware;
}());
