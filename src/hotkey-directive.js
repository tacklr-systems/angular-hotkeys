function hotkeyDirective(hotkeys) {
    return {
        restrict: 'A',
        link(scope, el, attrs) {
            const keys = []

            angular.forEach(scope.$eval(attrs.hotkey), (func, hotkey) => {
                // split and trim the hotkeys string into array
                const allowIn = typeof attrs.hotkeyAllowIn === "string" ? attrs.hotkeyAllowIn.split(/[\s,]+/) : [];

                keys.push(hotkey);

                hotkeys.add({
                    combo: hotkey,
                    description: attrs.hotkeyDescription,
                    callback: func,
                    action: attrs.hotkeyAction,
                    allowIn: allowIn
                });
            });

            // remove the hotkey if the directive is destroyed:
            el.bind('$destroy', () => {
                angular.forEach(keys, hotkeys.del);
            });
        }
    };
}

hotkeyDirective.$inject = ['hotkeys']

angular.module('cfp.hotkeys').directive('hotkey', hotkeyDirective)