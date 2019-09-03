(function() {
    const REGEX_WISHLIST_PAGE = RegExp('^https://wf.xuerian.net(/.+)?/?#wishlist$');
    const REGEX_RELIQUARY_PAGE = RegExp('^https://wf.xuerian.net(/.+)?/?#reliquary$');

    let map = new WeakMap();
    let _ = function(obj) {
        if (!map.has(obj))
            map.set(obj, {});
        return map.get(obj);
    };

    function WfXuerianNet() {
        _(this).Settings = {
            searchHighlightColor: [ '#F10A63', '#C40850' ],
            rarityColors: [ '#B87333', '#C0C0C0', '#E2C012' ]
        };
        _(this).relicParts = null;
        _(this).relicSources = null;

        Object.defineProperty(this, 'Settings', { get: () => _(this).Settings });
    }

    WfXuerianNet.prototype.doStuff = async function() {
        console.log(`WARFRAME | wf.xuerian.net: ${window.location.href}`);

        $('#content').css({ 'padding-top': '15px' });

        let currentUrl = window.location.href;
        if (REGEX_WISHLIST_PAGE.test(currentUrl)) {
            await wishlist.addOptions(this);
            await wishlist.miscTweaks(this);
        } else if (REGEX_RELIQUARY_PAGE.test(currentUrl)) {
            await reliquary.waitForAll();
            await reliquary.clean(this);

            await reliquary.getReliquaryPartsAndSources(this);
            await reliquary.tweakRelicsLegendDiv(this);

            await reliquary.addRelicsSearchField(this);
            await reliquary.addRelicsOptions(this);
            await reliquary.addSourcesSearchField(this);

            await reliquary.miscTweaks(this);
        }
        addCustomStyles(this);
    };


    // ===================
    //  PRIVATE FUNCTIONS
    // ===================

    const wishlist = {
        addOptions: async function(self) {
            $('div.wishlist .aleab-options').remove();

            let hideVaulted = checked => {
                let cbHideVaulted = $('div.wishlist.active .aleab-options > #aleab-opt-hideVaultedSets input[type="checkbox"]');
                if (checked) {
                    cbHideVaulted.attr('checked', 'checked');
                    $('.list.box-container > .set.vaulted').addClass('hidden');
                } else {
                    cbHideVaulted.removeAttr('checked');
                    $('.list.box-container > .set.vaulted').removeClass('hidden');
                }
                window.localStorage.setItem('aleab-wishlist_hideVaultedSets', checked);
            };

            let saveBtn = $('#content > div.wishlist.active > form input.save[type="button"]')[0];
            $('div.wishlist > form > .legend').remove();
            $(document.createElement('div')).addClass('legend').append(saveBtn).append(
                $(document.createElement('div')).addClass('aleab-options').append(
                    $(document.createElement('div')).attr('id', 'aleab-opt-hideVaultedSets').append(
                        $(document.createElement('label')).append(
                            $(document.createElement('input')).attr('type', 'checkbox')  // [Hide Vaulted]
                              .change(ev => hideVaulted(ev.currentTarget.checked))
                        ).append(
                            $(document.createElement('span')).append('Hide Vaulted')
                        )
                    )
                )
            ).prependTo('#content > div.wishlist.active > form');

            hideVaulted(window.localStorage.getItem('aleab-wishlist_hideVaultedSets') === 'true');
        },

        miscTweaks: async function(self) {
            await waitFor('.list.box-container');

            // Tweak set name style
            $('.list.box-container > .set').css({ 'padding': '10px 12px' });
            $('.list.box-container > .set > div:first-child').css({ 'margin-bottom': '3px' });
            $('.list.box-container > .set > div:first-child > .name').css({ 'font-weight': 'bold' });
        }
    };

    const reliquary = {
        waitForAll: async function() {
            await waitFor('#content > div.reliquary.active > .relics.box-container');
            await waitFor('#content > div.reliquary.active > .relics.box-container > .relic.box > .rewards');

            await waitFor('#content > div.reliquary.active > .sources.box-container');
            await waitFor('#content > div.reliquary.active > .sources.box-container > .source.box > .rotations');
        },

        clean: async function(self) {
            _(self).relicParts = null;
            _(self).relicSources = null;

            $('#aleab-styles').remove();

            $('#aleab-relic-search').remove();
            $('#aleab-relic-options').remove();

            let jRow1 = $('#aleab-relics-legend-row1');
            jRow1.parent().append(jRow1.children().clone());
            jRow1.remove();

            $('#aleab-sources-legend').remove();
        },

        getReliquaryPartsAndSources: async function(self) {
            await waitFor('.relics.box-container > .relic.box > .rewards');
            _(self).relicParts = $('.relics.box-container > .relic.box > .rewards > .reward.wanted > .name');

            await waitFor('.sources.box-container > .source.box > .rotations');
            _(self).relicSources = $('.sources.box-container > .source.box > .rotations span[relic]');
        },

        // REWARDS
        tweakRelicsLegendDiv: async function(self) {
            let jRelicsContainer = $('#content > div.reliquary.active > .relics.box-container');
            let legend = jRelicsContainer.prevAll().filter('.legend')[0];

            $(legend).css({ 'flex-direction': 'column' });

            $(document.createElement('div')).attr('id', 'aleab-relics-legend-row1').addClass('legend').append(
                $(legend).children().remove()
            ).appendTo(legend);
        },

        addRelicsSearchField: async function(self) {
            $('#aleab-relic-search').remove();

            let onKeyup = ev => {
                let SETTINGS = _(self).Settings;
                let relicParts = _(self).relicParts;

                if (!relicParts || relicParts.length == 0)
                    return;

                let filter = ev.currentTarget.value;
                let regex = RegExp(`(${filter.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi');

                // Clear highlighted text
                for (let i = 0; i < relicParts.length; ++i) {
                    relicParts[i].innerHTML = relicParts[i].innerText;
                }
                let exceptVaulted = window.localStorage.getItem('aleab-reliquary_hideVaulted') === 'true' ? ':not(.vaulted)' : '';
                relicParts.closest(`.relic.box:not(.aleab-filter-show)${exceptVaulted}`).removeClass('hidden');
                relicParts.closest('.relic.box.aleab-filter-show').removeClass('aleab-filter-show');

                // Highlight text
                if (!filter || filter.length == 0)
                    return;

                let matchingParts = $.grep(relicParts, (e, i) => e.innerText.toLowerCase().indexOf(filter.toLowerCase()) > -1);
                for (let i = 0; i < matchingParts.length; ++i) {
                    let rarity = $(matchingParts[i]).closest('.reward.wanted').find('.chance').text();
                    let outline = rarity !== '25-17%'
                        ? `text-shadow: ${SETTINGS.searchHighlightColor[0]} 0px 0px 4px, ${SETTINGS.searchHighlightColor[0]} 0px 0px 4px, ${SETTINGS.searchHighlightColor[0]} 0px 0px 4px`
                        : `text-shadow: ${SETTINGS.searchHighlightColor[1]} 0px 0px 4px, ${SETTINGS.searchHighlightColor[1]} 0px 0px 4px, ${SETTINGS.searchHighlightColor[1]} 0px 0px 4px`;
                    let html = matchingParts[i].innerHTML.replace(regex, `<span class="aleab-h" style="font-weight: bold; ${outline};">$1</span>`);
                    matchingParts[i].innerHTML = html;

                    $(matchingParts[i]).closest('.relic.box').addClass('aleab-filter-show');
                }
                relicParts.closest('.relic.box:not(.aleab-filter-show)').addClass('hidden');
            };

            let legend = $('#content > div.reliquary.active > .relics.box-container').prevAll().filter('.legend')[0];
            $(document.createElement('div')).attr('id', 'aleab-relic-search').addClass('wanker').addClass('aleab-search').append(
                $(document.createElement('input')).attr('type', 'text').attr('placeholder', 'Search...').keyup(onKeyup)
            ).appendTo($(legend).find('div')[0]);
        },

        addRelicsOptions: async function(self) {
            $('#aleab-relic-options').remove();

            let hideVaulted = checked => {
                let cbHideVaulted = $('div.reliquary.active .aleab-options > #aleab-opt-hideVaultedRelics input[type="checkbox"]');
                if (checked) {
                    cbHideVaulted.attr('checked', 'checked');
                    $('.relics.box-container > .relic.vaulted').addClass('hidden');
                } else {
                    cbHideVaulted.removeAttr('checked');
                    $('.relics.box-container > .relic.vaulted').removeClass('hidden');
                }
                window.localStorage.setItem('aleab-reliquary_hideVaulted', checked);
            };

            let legend = $('#content > div.reliquary.active > .relics.box-container').prevAll().filter('.legend')[0];
            $(document.createElement('div')).addClass('aleab-options').append(
                $(document.createElement('div')).attr('id', 'aleab-opt-hideVaultedRelics').append(
                    $(document.createElement('label')).append(
                        $(document.createElement('input')).attr('type', 'checkbox')  // [Hide Vaulted]
                          .change(ev => hideVaulted(ev.currentTarget.checked))
                    ).append(
                        $(document.createElement('span')).append('Hide Vaulted')
                    )
                )
            ).appendTo(legend);

            hideVaulted(window.localStorage.getItem('aleab-reliquary_hideVaulted') === 'true');
        },

        // SOURCES
        addSourcesSearchField: async function(self) {
            $('#aleab-sources-legend').remove();

            let onKeyup = ev => {
                let SETTINGS = _(self).Settings;
                let relicSources = _(self).relicSources;

                if (!relicSources || relicSources.length === 0)
                    return;

                let filter = ev.currentTarget.value;
                let regex = RegExp(`(${filter.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi');

                // Clear highlighted text
                for (let i = 0; i < relicSources.length; ++i) {
                    $(relicSources[i]).css({ 'font-weight': '', 'text-shadow': '' });
                }
                let onlyActiveBounties = window.localStorage.getItem('aleab-reliquary_hideInactiveSources') === 'true' ? '.active-bounty' : '';
                relicSources.closest(`.source.box.bounty${onlyActiveBounties}:not(.aleab-filter-show)`).removeClass('hidden');
                relicSources.closest('.source.box:not(.bounty):not(.aleab-filter-show)').removeClass('hidden');
                relicSources.closest('.source.box.aleab-filter-show').removeClass('aleab-filter-show');

                // Highlight text
                if (!filter || filter.length == 0)
                    return;

                let matchingSources = $.grep(relicSources, (e, i) => e.getAttribute('relic').toLowerCase().indexOf(filter.toLowerCase()) > -1);
                for (let i = 0; i < matchingSources.length; ++i) {
                    let rarity = $(matchingSources[i]).closest('.reward.wanted').find('.chance').text();
                    let outline = `${SETTINGS.searchHighlightColor[0]} 0px 0px 2px, ${SETTINGS.searchHighlightColor[0]} 0px 0px 2px, ${SETTINGS.searchHighlightColor[0]} 0px 0px 2px`;
                    $(matchingSources[i]).css({ 'font-weight': 'bold', 'text-shadow': outline });
                    $(matchingSources[i]).closest('.source.box').addClass('aleab-filter-show');
                }
                relicSources.closest('.source.box:not(.aleab-filter-show)').addClass('hidden');
            };

            let jSourcesContainer = $('#content > div.reliquary.active > .sources.box-container');
            $(document.createElement('div')).addClass('legend').attr('id', 'aleab-sources-legend').append(
                $(document.createElement('div')).addClass('wanker')
                  .append($(document.createElement('div')).addClass('icon').append('<div class="pip c1" />'))
                  .append($(document.createElement('div')).addClass('name').append('Sources'))
            ).append(
                $(document.createElement('div')).attr('id', 'aleab-sources-search').addClass('wanker').addClass('aleab-search').append(
                    $(document.createElement('input')).attr('type', 'text').attr('placeholder', 'Search...').keyup(onKeyup)
                )
            ).insertBefore(jSourcesContainer);
        },

        miscTweaks: async function(self) {
            let SETTINGS = _(self).Settings;

            // Use different text color for each relic rarity
            $('.relics.box-container > .relic.box .reward:has(.chance:contains("25-17%"))').addClass('common');
            $('.relics.box-container > .relic.box .reward:has(.chance:contains("11-20%"))').addClass('uncommon');
            $('.relics.box-container > .relic.box .reward:has(.chance:contains("2-10%"))').addClass('rare');

            // Hide inactive sources
            if (!window.localStorage.getItem('aleab-reliquary_hideInactiveSources'))
                window.localStorage.setItem('aleab-reliquary_hideInactiveSources', true);
            if (window.localStorage.getItem('aleab-reliquary_hideInactiveSources') === 'true')
                $('.sources.box-container > .source.bounty:not(.active-bounty)').addClass('hidden');
        }
    };

    const addCustomStyles = function() {
        // Custom Styles
        let S = function() {
            let str = '';
            for (let i = 0; i < arguments.length; ++i)
                str += (arguments[i] ? arguments[i] : '') + '\n';
            return str + '\n';
        };

        $('#aleab-styles').remove();
        $(document.createElement('style')).attr('id', 'aleab-styles').attr('type', 'text/css')
            .append(S(
                '/* ======= *',
                ' *  STUFF  *',
                ' * ======= */'
            ))
            .append(S(
                '.aleab-options { font-size: 0.95em; }',
                '.aleab-options label { display: inline-block; text-indent: 22px; }',
                '.aleab-options label > input { vertical-align: middle; }'
            ))
            .append(S(
                '.aleab-search > input {',
                '    border-radius: 5px;',
                '    padding: 1px 3px;',
                '    outline: unset;',
                '}',
                '.aleab-search > input:focus { box-shadow: 0px 0px 3px 2px #4265A5; }'
            ))
            .append(S('',
                '/* ========== *',
                ' *  WISHLIST  *',
                ' * ========== */'
            ))
            .append(S(
                '.wishlist > form { margin-top: -12px; }',
                '.wishlist > form > .legend { margin-bottom: 4px; }',
                '.wishlist > form > .legend > input.save[type="button"] {',
                '    font-size: 1.2em;',
                '    margin: 0px 0px 3px 4px;',
                '    width: unset;',
                '    max-width: unset;',
                '    padding: 0px 15px;',
                '}'
            ))
            .append(S(
                '.wishlist .aleab-options label { display: inline-block; text-indent: 16px; }'
            ))
            .append(S('',
                '/* =========== *',
                ' *  RELIQUARY  *',
                ' * =========== */'
            ))
            .append(S(
                '.reliquary > .legend { margin-bottom: 4px; }'
            ))
            .append(S(
                '.reliquary .box .reward.common { color: #B87333 !important; }',
                '.reliquary .box .reward.uncommon { color: #C0C0C0 !important; }',
                '.reliquary .box .reward.rare { color: #E2C012 !important; }',
            ))
            .append(S(
                '.reliquary .box:hover .details {',
                '    box-shadow: 0px 0px 8px 1px var(--border-faint);',
                '}',
                '.reliquary .source.active-bounty { box-shadow: 0px 0px 8px 1px var(--bounty); }',
                '.reliquary .source.active-fissure { box-shadow: 0px 0px 8px 1px var(--orokin); }'
            ))
            .appendTo(document.head);
    }

    return WfXuerianNet;
}());
