/*
 * angular-hotkeys
 *
 * Automatic keyboard shortcuts for your angular apps
 *
 * (c) 2016 Wes Cruver
 * License: MIT
 */

(function() {

    'use strict';

    angular.module('cfp.hotkeys', [])
        .run((hotkeys, hotkeysCheatSheet) => {
            // force hotkeys to run by injecting it. Without this, hotkeys only runs
            // when a controller or something else asks for it via DI.
            hotkeys.init()
            hotkeysCheatSheet.init()
        });

})();
