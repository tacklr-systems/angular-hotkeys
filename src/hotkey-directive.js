(function() {

  'use strict';
  angular.module('cfp.hotkeys').directive('hotkey', function hotkeyDirective(hotkeys) {
    return {
      restrict: 'A',
      link: function(scope, el, attrs) {
        var keys = [];

        angular.forEach(scope.$eval(attrs.hotkey), function(func, hotkey) {
          // split and trim the hotkeys string into array
          var allowIn = typeof attrs.hotkeyAllowIn === "string" ? attrs.hotkeyAllowIn.split(/[\s,]+/) : [];

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
        el.bind('$destroy', function() {
          angular.forEach(keys, hotkeys.del);
        });
      }
    };
  });
})();