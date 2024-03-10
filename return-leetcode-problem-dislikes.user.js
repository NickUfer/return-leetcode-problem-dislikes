// ==UserScript==
// @name         Return LeetCode Problem Dislikes
// @namespace    https://github.com/NickUfer/return-leetcode-problem-dislikes
// @version      0.1.0
// @description  Adds back dislikes to problems in the dynamic layout
// @author       Nick Ufer
// @homepage     https://github.com/NickUfer/return-leetcode-problem-dislikes
// @homepageURL  https://github.com/NickUfer/return-leetcode-problem-dislikes
// @source       https://github.com/NickUfer/return-leetcode-problem-dislikes
// @supportURL   https://github.com/NickUfer/return-leetcode-problem-dislikes/issues
// @match        https://leetcode.com/*
// @icon         https://assets.leetcode.com/static_assets/public/icons/favicon.ico
// @updateURL    https://raw.githubusercontent.com/NickUfer/return-leetcode-problem-dislikes/main/return-leetcode-problem-dislikes.user.js
// @downloadURL  https://raw.githubusercontent.com/NickUfer/return-leetcode-problem-dislikes/main/return-leetcode-problem-dislikes.user.js
// @copyright    MIT License
// @grant        none
// ==/UserScript==

(async function () {
    'use strict';

    const query = `
    query questionTitle($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
            dislikes
        }
    }`;

    /**
     * @type {string | undefined}
     */
    let lastSlug = undefined;

    /**
     *
     * @type {string | undefined}
     */
    let lastPathName= location.pathname;

    /**
     *
     * @type {Node | undefined}
     */
    let dislikeCountNode = undefined;

    await run();

    const observer = new MutationObserver(function() {
        if (location.pathname !== lastPathName) {
            lastPathName = location.pathname;
            run();
        }
    });
    observer.observe(document, {subtree: true, childList: true});

    async function run() {
        console.log("run")
        const titleSlug = extractTitleSlug();
        if (!titleSlug) {
            debug('Could not extract title slug from URL, stopping execution.')
            return;
        }
        debug('Title slug: ' + titleSlug);
        if (titleSlug === lastSlug) {
            debug('Title slug (and hence problem) is same as before, stopping execution.')
        }
        lastSlug = titleSlug;

        const dislikes = await fetchDislikes(titleSlug);
        debug('Fetched dislikes: ' + dislikes);

        const dislikeButton = await getDislikeCountDiv();
        dislikeButton.textContent = abbreviateDislikes(dislikes);
    }

    // function clearOldDislikeCount() {
    //     const elements = document.querySelectorAll('div[id=' + dislikeCountDivId + ']');
    //     if (elements.length > 0) {
    //         elements[0].remove();
    //     }
    // }

    /**
     * @return {string | undefined}
     */
    function extractTitleSlug() {
        const regex = /^\/problems\/([a-zA-Z0-9-]+)(\/([a-zA-Z0-9-]+))*\/?(\?.*)?$/;
        const groups = regex.exec(window.location.pathname);
        if (!groups) {
            return;
        }
        return groups[1];
    }

    /**
     * @param titleSlug {string}
     * @return {Promise<number>}
     */
    async function fetchDislikes(titleSlug) {
        const result = await fetch('https://leetcode.com/graphql/', {
            method: 'POST',
            body: JSON.stringify({
                query: query,
                variables: {
                    titleSlug: titleSlug
                },
                operationName: 'questionTitle'
            }),
            headers: {
                'Content-type': 'application/json; charset=UTF-8'
            }
        });
        const body = await result.json();
        debug('Result body: ' + body);
        return body.data.question.dislikes;
    }

    /**
     * @return {Promise<Node>}
     */
    function getDislikeCountDiv() {
        return new Promise((resolve) => {
            if (dislikeCountNode !== undefined) {
                resolve(dislikeCountNode);
                return;
            }

            let thumbsDownIcon = document.querySelectorAll('svg[data-icon=thumbs-down]');
            if (thumbsDownIcon.length > 0) {
                resolve(thumbsDownIcon[0].parentElement.parentElement)
                return;
            }

            let observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (thumbsDownIcon.length > 0) return;

                    for (let addedNode of mutation.addedNodes) {
                        thumbsDownIcon = document.querySelectorAll('svg[data-icon=thumbs-down]');
                        if (thumbsDownIcon.length > 0) {
                            observer.disconnect();

                            dislikeCountNode = document.createElement('div');
                            thumbsDownIcon[0].parentElement.parentElement.appendChild(dislikeCountNode);

                            resolve(dislikeCountNode);
                        }
                    }
                })
            })

            observer.observe(document.querySelectorAll('body')[0], {
                childList: true,
                subtree: true,
                attributes: false,
                characterData: false
            });
        });
    }

    /**
     * @param dislikes {number}
     * @return string
     */
    function abbreviateDislikes(dislikes) {
        if (dislikes >= 1000) {
            dislikes /= 100.0
            dislikes = Math.round(dislikes);
            dislikes /= 10.0;
            dislikes += 'K';
        }
        return dislikes;
    }

    /**
     * @param message {string}
     */
    function debug(message) {
        console.debug('[RDLPD] ' + message)
    }
})();
