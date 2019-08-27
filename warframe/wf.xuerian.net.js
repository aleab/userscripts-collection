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

        _(this).relicParts = null;
        _(this).relicSources = null;

        $('#content').css({ 'padding-top': '15px' });

        let currentUrl = window.location.href;
        if (REGEX_WISHLIST_PAGE.test(currentUrl)) {
            await wishlist.miscTweaks(this);
        } else if (REGEX_RELIQUARY_PAGE.test(currentUrl)) {
            reliquary.getReliquaryPartsAndSources(this);

            await reliquary.addRewardsSearchField(this);
            await reliquary.addRewardsOptions(this);
            await reliquary.addSourcesSearchField(this);

            await reliquary.miscTweaks(this);
        }
    };


    // ===================
    //  PRIVATE FUNCTIONS
    // ===================

    const wishlist = {
        miscTweaks: async function(self) {
            await waitFor('.list.box-container');

            // Hide vaulted sets
            $('.list.box-container > .set.vaulted').css({ 'display': 'none' });

            // Tweak set name style
            $('.list.box-container > .set').css({ 'padding': '10px 12px' });
            $('.list.box-container > .set > div:first-child').css({ 'margin-bottom': '3px' });
            $('.list.box-container > .set > div:first-child > .name').css({ 'font-weight': 'bold' });
        }
    };

    const reliquary = {
        getReliquaryPartsAndSources: async function(self) {
            await waitFor('.relics.box-container > .relic.box > .rewards');
            _(self).relicParts = $('.relics.box-container > .relic.box > .rewards > .reward.wanted > .name');

            await waitFor('.sources.box-container > .source.box > .rotations');
            _(self).relicSources = $('.sources.box-container > .source.box > .rotations span[relic]');
        },

        // REWARDS
        addRewardsSearchField: async function(self) {
            await waitFor('#content > div.reliquary > .relics.box-container');
            $('#aleab-part-search').remove();

            let legend = $('#content > div.reliquary > .relics.box-container').prevAll().filter('.legend')[0];
            $(legend).css({ 'margin-bottom': '4px' });

            let div = document.createElement('div');
            $(div).addClass('wanker').attr('id', 'aleab-part-search');
            $(div).appendTo(legend);

            let input = document.createElement('input');
            $(input).attr('type', 'text').attr('placeholder', 'Search...').css({ 'border-radius': '5px', 'padding': '1px 3px' });
            $(input).focus(ev => $(ev.currentTarget).css({ 'outline': 'unset', 'box-shadow': '0 0 0pt 1pt #4265A5' }))
                    .blur(ev => $(ev.currentTarget).css({ 'outline': 'unset', 'box-shadow': '' }));
            $(input).keyup(ev => {
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
                relicParts.closest(`.relic.box:not(.aleab-filter-show)${exceptVaulted}`).css({ 'display': '' });
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
                relicParts.closest('.relic.box:not(.aleab-filter-show)').css({ 'display': 'none' });
            });
            $(input).appendTo(div);
        },

        addRewardsOptions: async function(self) {
            await waitFor('#content > div.reliquary > .legend');
            $('#aleab-options').remove();

            let wrapper = document.createElement('div');
            $(wrapper).attr('id', 'aleab-options').insertAfter('#content > div.reliquary > .legend');

            $(document.createElement('div')).append(
                $(document.createElement('label'))
                  .css({ 'display': 'inline-block', 'text-indent': '22px', 'font-size': '0.95em' }).append(
                      $(document.createElement('input')).attr('id', 'aleab-cb-hideVaulted').attr('type', 'checkbox')
                        .css({ 'vertical-align': 'middle' })
                ).append(
                    $(document.createElement('span')).append('Hide Vaulted')
                )
            ).appendTo(wrapper);

            // Hide Vaulted
            let hideVaulted = checked => {
                let cbHideVaulted = $(wrapper).find('#aleab-cb-hideVaulted');
                if (checked) {
                    cbHideVaulted.attr('checked', 'checked');
                    $('.relics.box-container > .relic.vaulted').css({ 'display': 'none' });
                } else {
                    cbHideVaulted.removeAttr('checked');
                    $('.relics.box-container > .relic.vaulted').css({ 'display': '' });
                }
                window.localStorage.setItem('aleab-reliquary_hideVaulted', checked);
            };
            $(wrapper).find('#aleab-cb-hideVaulted').change(ev => hideVaulted(ev.currentTarget.checked));

            await waitFor('#content > div.reliquary > .relics.box-container');
            await waitFor('#content > div.reliquary > .relics.box-container > .relic.vaulted', 1000);
            hideVaulted(window.localStorage.getItem('aleab-reliquary_hideVaulted') === 'true');
        },

        // SOURCES
        addSourcesSearchField: async function(self) {
            await waitFor('#content > div.reliquary > .sources.box-container');
            $('#aleab-sources-legend').remove();

            let inputKeyup = ev => {
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
                relicSources.closest(`.source.box.bounty${onlyActiveBounties}:not(.aleab-filter-show)`).css({ 'display': '' });
                relicSources.closest('.source.box:not(.bounty):not(.aleab-filter-show)').css({ 'display': '' });
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
                relicSources.closest('.source.box:not(.aleab-filter-show)').css({ 'display': 'none' });
            };

            $(document.createElement('div')).addClass('legend').attr('id', 'aleab-sources-legend').css({ 'margin-bottom': '4px' }).append(
                $(document.createElement('div')).addClass('wanker').append(
                    $(document.createElement('div')).addClass('name').append('Sources')
                )
            ).append(
                $(document.createElement('div')).addClass('wanker').append(
                    $(document.createElement('input')).attr('type', 'text').attr('placeholder', 'Search...')
                      .css({ 'border-radius': '5px', 'padding': '1px 3px' })
                      .focus(ev => $(ev.currentTarget).css({ 'outline': 'unset', 'box-shadow': '0 0 0pt 1pt #4265A5' }))
                      .blur(ev => $(ev.currentTarget).css({ 'outline': 'unset', 'box-shadow': '' }))
                      .keyup(inputKeyup)
                )
            ).insertBefore('#content > div.reliquary > .sources.box-container');
        },

        miscTweaks: async function(self) {
            let SETTINGS = _(self).Settings;
            
            // Use different text color for each relic rarity
            await waitFor('.relics.box-container')
            $('.relics.box-container > .relic.box .reward:has(.chance:contains("25-17%"))').css('color', SETTINGS.rarityColors[0]);
            $('.relics.box-container > .relic.box .reward:has(.chance:contains("11-20%"))').css('color', SETTINGS.rarityColors[1]);
            $('.relics.box-container > .relic.box .reward:has(.chance:contains("2-10%"))').css('color', SETTINGS.rarityColors[2]);

            // Hide inactive sources
            await waitFor('.sources.box-container')
            $('.sources.box-container > .source.bounty:not(.active-bounty)').css({ 'display': 'none' });
            window.localStorage.setItem('aleab-reliquary_hideInactiveSources', true);
        }
    };

    return WfXuerianNet;
}());
