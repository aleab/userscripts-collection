// ==UserScript==
// @name         [WARFRAME] wf.xuerian.net
// @version      1.3.0
// @author       aleab
// @source       https://raw.githubusercontent.com/aleab/userscripts-collection/master/warframe/wf.xuerian.net.js
// @icon         https://raw.githubusercontent.com/aleab/userscripts-collection/master/warframe/warframe.png
// @icon64       https://raw.githubusercontent.com/aleab/userscripts-collection/master/warframe/warframe.png
//
// @match        https://wf.xuerian.net/*
//
// @grant        none
// @require      https://raw.githubusercontent.com/aleab/userscripts-collection/v1.3.0/aleab-common.js
// ==/UserScript==

/* jshint esversion: 6              */
/* eslint curly: off, no-eval: off  */
/* global $, aleab, sleep, waitFor  */

function _WfXuerianNet() {
    const REGEX_WISHLIST_PAGE = RegExp('^https://wf.xuerian.net(/.+)?/?#wishlist$');
    const REGEX_RELIQUARY_PAGE = RegExp('^https://wf.xuerian.net(/.+)?/?#reliquary$');

    const MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;

    const RelicType = {
        None: 0,
        Lith: 1 << 0,
        Meso: 1 << 1,
        Neo : 1 << 2,
        Axi : 1 << 3,
        All : (1 << 4) - 1
    };

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

        _(this).reliquary = {
            relicParts: null,
            relicSources: null,
            relicPartsObserver: null,
            relicSourcesObserver: null,

            relicSearchFilter: '',
            relicTypeFilter: RelicType.All
        };

        Object.defineProperty(this, 'Settings', { get: () => _(this).Settings });
        Object.defineProperty(this, 'reliquary', { get: () => _(this).reliquary });
    }

    WfXuerianNet.prototype.doStuff = async function() {
        console.log(`WARFRAME | wf.xuerian.net: ${window.location.href}`);
        $('#content').css({ 'padding-top': '15px' });

        if (_(this).reliquary.relicPartsObserver) {
            _(this).reliquary.relicPartsObserver.disconnect();
            _(this).reliquary.relicPartsObserver = null;
        }
        if (_(this).reliquary.relicSourcesObserver) {
            _(this).reliquary.relicSourcesObserver.disconnect();
            _(this).reliquary.relicSourcesObserver = null;
        }

        let currentUrl = window.location.href;
        if (REGEX_WISHLIST_PAGE.test(currentUrl)) {
            // [Wishlist]
            await wishlist.addOptions(this);
            await wishlist.miscTweaks(this);
        } else if (REGEX_RELIQUARY_PAGE.test(currentUrl)) {
            // [Reliquary]
            await reliquary.waitForAll();
            await reliquary.clean(this);
            await reliquary.getReliquaryPartsAndSources(this);

            await reliquary.tweakRelicsLegendDiv(this);
            await reliquary.addRelicsSearchField(this);
            await reliquary.addRelicsOptions(this);
            await reliquary.observeRelicsChanges(this);

            await reliquary.addSourcesLegendDiv(this);
            await reliquary.addSourcesSearchField(this);
            await reliquary.addSourcesOptions(this);
            await reliquary.observeSourcesChanges(this);

            await reliquary.miscTweaks(this);
        }
        addCustomStyles(this);
    };


    // ===================
    //  PRIVATE FUNCTIONS
    // ===================

    const addOrRemoveFlag= function(condition, value, flag) {
        if (condition)
            return value | flag;
        return value & ~flag;
    };

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
            _(self).reliquary.relicParts = null;
            _(self).reliquary.relicSources = null;

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
            _(self).reliquary.relicParts = $('.relics.box-container > .relic.box > .rewards > .reward.wanted > .name');

            await waitFor('.sources.box-container > .source.box > .rotations');
            _(self).reliquary.relicSources = $('.sources.box-container > .source.box > .rotations span[relic]');
        },

        miscTweaks: async function(self) {
            let SETTINGS = _(self).Settings;

            // Use different text color for each relic rarity
            $('.relics.box-container > .relic.box .reward:has(.chance:contains("25-17%"))').addClass('common');
            $('.relics.box-container > .relic.box .reward:has(.chance:contains("11-20%"))').addClass('uncommon');
            $('.relics.box-container > .relic.box .reward:has(.chance:contains("2-10%"))').addClass('rare');
        },

        // ========
        //  RELICS
        // ========
        shouldHideVaultedRelics: () => window.localStorage.getItem('aleab-reliquary_hideVaulted') === 'true',
        hideVaultedRelics: function(checked) {
            let cbHideVaulted = $('div.reliquary.active #aleab-relics-legend.legend .aleab-options > #aleab-opt-hideVaultedRelics input[type="checkbox"]');
            if (checked) {
                cbHideVaulted.attr('checked', 'checked');
                $('.relics.box-container > .relic.vaulted').addClass('hidden');
            } else {
                cbHideVaulted.removeAttr('checked');
                $('.relics.box-container > .relic.vaulted').removeClass('hidden');
            }
            window.localStorage.setItem('aleab-reliquary_hideVaulted', checked);
        },

        getRelicsTypeFilterStatus: function() {
            let checkboxes = $('#aleab-opt-relicTypeFilter input[type="checkbox"]');
            let filter = RelicType.None;
            for (let i = 0; i < checkboxes.length; ++i) {
                filter |= checkboxes[i].checked ? checkboxes[i].getAttribute('data') : 0;
            }
            return filter;
        },

        applyRelicsFilters: function(searchFilter, typeFilter, self) {
            if (searchFilter !== undefined)
                _(self).reliquary.relicSearchFilter = searchFilter;
            if (typeFilter >= 0)
                _(self).reliquary.relicTypeFilter = typeFilter;

            // Clear filters
            let relicParts = _(self).reliquary.relicParts;
            for (let i = 0; i < relicParts.length; ++i) {
                relicParts[i].innerHTML = relicParts[i].innerText;
            }
            let exceptVaulted = reliquary.shouldHideVaultedRelics() ? ':not(.vaulted)' : '';
            relicParts.closest(`.relic.box:not(.aleab-filter-show)${exceptVaulted}`).removeClass('hidden');
            relicParts.closest('.relic.box.aleab-filter-show').removeClass('aleab-filter-show');

            reliquary.applyRelicsSearchFilter(_(self).reliquary.relicSearchFilter, self);
            reliquary.applyRelicsTypeFilter(_(self).reliquary.relicTypeFilter, self);
        },
        applyRelicsSearchFilter: function(filter, self) {
            let SETTINGS = _(self).Settings;
            let relicParts = _(self).reliquary.relicParts;

            if (!relicParts || relicParts.length == 0)
                return;
            if (!filter || filter.length == 0)
                return;

            // Highlight text
            let regex = RegExp(`(${filter.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi');

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
        },
        applyRelicsTypeFilter: function(filter, self) {
            let relics = $('.reliquary > .relics.box-container > .relic.box:not(.hidden)');
            for (let i = 0; i < relics.length; ++i) {
                let type = $(relics[i]).find('.header > .name').text().split(' ')[0];
                if (RelicType[type] & filter) {
                    $(relics[i]).addClass('aleab-filter-show');
                } else {
                    let box = $(relics[i]).removeClass('aleab-filter-show').addClass('hidden');
                }
            }
        },
        // ------

        tweakRelicsLegendDiv: async function(self) {
            let jRelicsContainer = $('#content > div.reliquary.active > .relics.box-container');
            let legend = jRelicsContainer.prevAll().filter('.legend')[0];

            $(legend).attr('id', 'aleab-relics-legend');
            $(document.createElement('div')).attr('id', 'aleab-relics-legend-row1').addClass('legend').append(
                $(legend).children().remove()
            ).appendTo(legend);
        },

        addRelicsSearchField: async function(self) {
            $('#aleab-relic-search').remove();

            let legend = $('div.reliquary #aleab-relics-legend.legend')[0];
            $(document.createElement('div')).attr('id', 'aleab-relic-search').addClass('wanker').addClass('aleab-search').append(
                $(document.createElement('input')).attr('type', 'text').attr('placeholder', 'Search...').keyup(ev => reliquary.applyRelicsFilters(ev.currentTarget.value, undefined, self))
            ).appendTo($(legend).find('div')[0]);
        },

        addRelicsOptions: async function(self) {
            $('div.reliquary #aleab-relics-legend.legend .aleab-options').remove();

            let legend = $('div.reliquary #aleab-relics-legend.legend')[0];
            $(document.createElement('div')).addClass('aleab-options').append(
                $(document.createElement('div')).attr('id', 'aleab-opt-hideVaultedRelics').append(
                    $(document.createElement('label')).append(
                        $(document.createElement('input')).attr('type', 'checkbox')  // [Hide Vaulted]
                          .change(ev => reliquary.hideVaultedRelics(ev.currentTarget.checked))
                    ).append(
                        $(document.createElement('span')).append('Hide Vaulted')
                    )
                )
            ).append(
                $(document.createElement('div')).attr('id', 'aleab-opt-relicTypeFilter').append(
                    $(document.createElement('table')).append(
                        $(document.createElement('tr')).append(
                            $(document.createElement('td')).append(
                                $(document.createElement('label')).append(
                                    $(document.createElement('input')).attr({ 'type': 'checkbox', 'data': `${RelicType.Lith}`, 'checked': '' })
                                      .change(ev => reliquary.applyRelicsFilters(undefined, reliquary.getRelicsTypeFilterStatus(), self))
                                ).append($(document.createElement('span')).append('Lith'))
                            )
                        ).append(
                            $(document.createElement('td')).append(
                                $(document.createElement('label')).append(
                                    $(document.createElement('input')).attr({ 'type': 'checkbox', 'data': `${RelicType.Meso}`, 'checked': '' })
                                      .change(ev => reliquary.applyRelicsFilters(undefined, reliquary.getRelicsTypeFilterStatus(), self))
                                ).append($(document.createElement('span')).append('Meso'))
                            )
                        )
                    ).append(
                        $(document.createElement('tr')).append(
                            $(document.createElement('td')).append(
                                $(document.createElement('label')).append(
                                    $(document.createElement('input')).attr({ 'type': 'checkbox', 'data': `${RelicType.Neo}`, 'checked': '' })
                                      .change(ev => reliquary.applyRelicsFilters(undefined, reliquary.getRelicsTypeFilterStatus(), self))
                                ).append($(document.createElement('span')).append('Neo'))
                            )
                        ).append(
                            $(document.createElement('td')).append(
                                $(document.createElement('label')).append(
                                    $(document.createElement('input')).attr({ 'type': 'checkbox', 'data': `${RelicType.Axi}`, 'checked': '' })
                                      .change(ev => reliquary.applyRelicsFilters(undefined, reliquary.getRelicsTypeFilterStatus(), self))
                                ).append($(document.createElement('span')).append('Axi'))
                            )
                        )
                    )
                )
            ).appendTo(legend);

            reliquary.hideVaultedRelics(reliquary.shouldHideVaultedRelics());
        },

        observeRelicsChanges: async function(self) {
            _(self).reliquary.relicPartsObserver = new MutationObserver(async function(mutations, observer) {
                if (!mutations || mutations.length === 0)
                    return;

                let relicsBoxContainer = $('div.reliquary > .relics.box-container')[0];

                let shouldDoStuff = false;
                for (let i = 0; i < mutations.length; ++i) {
                    if (mutations[i].type === 'attributes' && mutations[i].attributeName === 'class' && mutations[i].target.parentElement === relicsBoxContainer) {
                        let hadVaultedClass = mutations[i].oldValue.split(' ').includes('vaulted');
                        shouldDoStuff = $(mutations[i].target).hasClass('vaulted') != hadVaultedClass;
                        break;
                    } else if (mutations[i].type === 'childList' && mutations[i].target === relicsBoxContainer) {
                        shouldDoStuff = true;
                        break;
                    }
                }

                if (shouldDoStuff) {
                    reliquary.hideVaultedRelics(reliquary.shouldHideVaultedRelics());
                    $('.relics.box-container > .relic.hidden:not(.vaulted)').removeClass('hidden');
                    reliquary.applyRelicsSearchFilter($('#aleab-relic-search > input')[0].value, self);
                }
            });

            _(self).reliquary.relicPartsObserver.observe($('div.reliquary > .relics.box-container')[0], {
                attributes: true,
                attributeOldValue: true,
                attributeFilter: [ 'class' ],
                childList: true,
                subtree: true
            });
        },

        // =========
        //  SOURCES
        // =========
        shouldHideInactiveSources: () => window.localStorage.getItem('aleab-reliquary_hideInactiveSources') === 'true',
        hideInactiveSources: function(checked) {
            let cbHideVaulted = $('div.reliquary.active #aleab-sources-legend.legend > .aleab-options > #aleab-opt-hideInactiveSources input[type="checkbox"]');
            if (checked) {
                cbHideVaulted.attr('checked', 'checked');
                $('.sources.box-container > .source.bounty:not(.active-bounty)').addClass('hidden');
            } else {
                cbHideVaulted.removeAttr('checked');
                $('.sources.box-container > .source.bounty:not(.active-bounty)').removeClass('hidden');
            }
            window.localStorage.setItem('aleab-reliquary_hideInactiveSources', checked);
        },

        applySourcesSearchFilter: function(filter, self) {
            let SETTINGS = _(self).Settings;
            let relicSources = _(self).reliquary.relicSources;

            if (!relicSources || relicSources.length === 0)
                return;

            if (!filter)
                filter = '';
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
        },
        // ------

        addSourcesLegendDiv: async function(self) {
            $('#aleab-sources-legend').remove();

            let jSourcesContainer = $('#content > div.reliquary.active > .sources.box-container');
            $(document.createElement('div')).attr('id', 'aleab-sources-legend').addClass('legend').append(
                $(document.createElement('div')).attr('id', 'aleab-sources-legend-row1').addClass('legend').append(
                    $(document.createElement('div')).addClass('wanker')
                      .append($(document.createElement('div')).addClass('icon').append('<div class="pip c1" />'))
                      .append($(document.createElement('div')).addClass('name').append('Sources'))
                )
            ).insertBefore(jSourcesContainer);
        },

        addSourcesSearchField: async function(self) {
            $('#aleab-sources-search').remove();

            $(document.createElement('div')).attr('id', 'aleab-sources-search').addClass('wanker').addClass('aleab-search').append(
                $(document.createElement('input')).attr('type', 'text').attr('placeholder', 'Search...').keyup(ev => reliquary.applySourcesSearchFilter(ev.currentTarget.value, self))
            ).appendTo('#aleab-sources-legend > #aleab-sources-legend-row1');
        },

        addSourcesOptions: async function(self) {
            $('div.reliquary #aleab-sources-legend.legend > .aleab-options').remove();

            let legend = $('div.reliquary #aleab-sources-legend')[0];
            $(document.createElement('div')).addClass('aleab-options').append(
                $(document.createElement('div')).attr('id', 'aleab-opt-hideInactiveSources').append(
                    $(document.createElement('label')).append(
                        $(document.createElement('input')).attr('type', 'checkbox')  // [Hide Inactive]
                          .change(ev => reliquary.hideInactiveSources(ev.currentTarget.checked))
                    ).append(
                        $(document.createElement('span')).append('Hide Inactive')
                    )
                )
            ).appendTo(legend);

            reliquary.hideInactiveSources(reliquary.shouldHideInactiveSources());
        },

        observeSourcesChanges: async function(self) {
            _(self).reliquary.relicSourcesObserver = new MutationObserver(async function(mutations, observer) {
                if (!mutations || mutations.length === 0)
                    return;

                let sourcesBoxContainer = $('div.reliquary > .sources.box-container')[0];

                let shouldDoStuff = false;
                for (let i = 0, shouldDoStuff = false; i < mutations.length && !shouldDoStuff; ++i) {
                    if (mutations[i].type === 'attributes' && mutations[i].attributeName === 'class') {
                        if (mutations[i].target.parentElement === sourcesBoxContainer)
                            shouldDoStuff = $(mutations[i].target).hasClass('active-bounty') != mutations[i].oldValue.split(' ').includes('active-bounty');
                    } else if (mutations[i].type === 'childList') {
                        shouldDoStuff = mutations[i].target === sourcesBoxContainer;
                    } else {
                        console.log('[Sources Mutation]: ', mutations[i]);
                    }
                }

                if (shouldDoStuff) {
                    reliquary.hideInactiveSources(reliquary.shouldHideInactiveSources());
                    $('.sources.box-container > .source.hidden:not(.bounty)').removeClass('hidden');
                    $('.sources.box-container > .source.active-bounty.hidden').removeClass('hidden');
                    reliquary.applySourcesSearchFilter($('#aleab-sources-search > input')[0].value, self);
                }
            });

            _(self).reliquary.relicSourcesObserver.observe($('div.reliquary > .sources.box-container')[0], { 
                attributes: true,
                attributeOldValue: true,
                attributeFilter: [ 'class' ],
                childList: true,
                subtree: true
            });
        },
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
                '.aleab-options {',
                '    font-size: 0.95em;',
                '    display: flex;',
                '    flex-wrap: wrap;',
                '    flex-direction: row;',
                '}',
                '.aleab-options > div { margin-right: 20px; }',
                '.aleab-options *:not(td) > label { display: inline-block; text-indent: 22px; }',
                '.aleab-options label > input { vertical-align: middle; }'
            ))
            .append(S(
                '#aleab-opt-relicTypeFilter > table {',
                '    border: #545454 solid 2px;',
                '    border-radius: 6px;',
                '    border-spacing: 4px 0px;',
                '}',
                '#aleab-opt-relicTypeFilter > table td > label > input { transform: scale(0.9); }'
            ))
            .append(S(
                '.aleab-search { margin: 2px 0px; }',
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
                '.reliquary > .legend {',
                '    margin-bottom: 4px;',
                '    flex-direction: column;',
                '}'
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

            $('header:has(#tokeninfo:not(.hidden)) ~ #content > .reliquary.active').css({ 'margin-top': '-12px' });
    }

    return WfXuerianNet;
}

aleab.waitForModules().then(() => {
    $(document).ready(async function() {
        let o = new (_WfXuerianNet())();
        aleab.setPageChangeEvent(async function() {
            await sleep(200);
            await o.doStuff();
        });
        await o.doStuff();
    });
});
