angular.module('cfp.hotkeys').provider('hotkeysCheatSheet', function() {
  function hotkeysCheatSheetProviderFactory($rootElement, $rootScope, $compile, $window, $document, hotkeys) {

    var scope = null,
      previousEsc = false,
      initialized = false;

    function toggleCheatSheet() {
      scope.helpVisible = !scope.helpVisible;

      // Bind to esc to remove the cheat sheet.  Ideally, this would be done
      // as a directive in the template, but that would create a nasty
      // circular dependency issue that I don't feel like sorting out.
      if (scope.helpVisible) {
        previousEsc = hotkeys.get('esc');
        hotkeys.del('esc');

        // Here's an odd way to do this: we're going to use the original
        // description of the hotkey on the cheat sheet so that it shows up.
        // without it, no entry for esc will ever show up (#22)
        hotkeys.add('esc', previousEsc.description, toggleCheatSheet, null, ['INPUT', 'SELECT', 'TEXTAREA']);
      } else {
        hotkeys.del('esc');

        // restore the previously bound ESC key
        if (previousEsc !== false) {
          hotkeys.add(previousEsc);
        }
      }
    }

    return {
      init: function() {
        if (!initialized) {

          initialized = true;
          /**
          * A new scope used internally for the cheatsheet
          * @type {$rootScope.Scope}
          */
          scope = $rootScope.$new();

          /**
          * Contains the state of the help's visibility
          * @type {Boolean}
          */
          scope.helpVisible = false;

          /**
           * Holds the title string for the help menu
           * @type {String}
           */
          scope.title = config.templateTitle;

          /**
           * Holds the header HTML for the help menu
           * @type {String}
           */
          scope.header = config.templateHeader;

          /**
           * Holds the footer HTML for the help menu
           * @type {String}
           */
          scope.footer = config.templateFooter;

          /**
           * Expose toggleCheatSheet to hotkeys scope so we can call it using
           * ng-click from the template
           * @type {function}
           */
          scope.toggleCheatSheet = toggleCheatSheet;

          // Auto-create a help menu:
          if (config.includeCheatSheet) {

            var document = $document[0];
            var element = $rootElement[0];
            hotkeys.add(config.hotkey, config.description, toggleCheatSheet);

            // If $rootElement is document or documentElement, then body must be used
            if (element === document || element === document.documentElement) {
                element = document.body;
            }

            var helpMenu = angular.element(this.template);

            angular.element(element).append($compile(helpMenu)(scope));
          }
        }
      },
      toggleCheatSheet      : toggleCheatSheet,
      template              : config.template,
      includeCheatSheet     : config.includeCheatSheet,
      hotkey                : config.hotkey,
      description           : config.description,
      templateTitle         : config.templateTitle

    };
  }

  hotkeysCheatSheetProviderFactory.$inject = ['$rootElement', '$rootScope', '$compile', '$window', '$document', 'hotkeys'];

  var cheatSheetTemplate =
    '<div class="cfp-hotkeys-container fade" ng-class="{in: helpVisible}" style="display: none;"><div class="cfp-hotkeys">' +
      '<h4 class="cfp-hotkeys-title" ng-if="!header">{{ title }}</h4>' +
      '<div ng-bind-html="header" ng-if="header"></div>' +
      '<table><tbody>' +
        '<tr ng-repeat="hotkey in hotkeys | filter:{ description: \'!$$undefined$$\' }">' +
            '<td class="cfp-hotkeys-keys">' +
            '<span ng-repeat="key in hotkey.format() track by $index" class="cfp-hotkeys-key">{{ key }}</span>' +
            '</td>' +
            '<td class="cfp-hotkeys-text">{{ hotkey.description }}</td>' +
        '</tr>' +
      '</tbody></table>' +
      '<div ng-bind-html="footer" ng-if="footer"></div>' +
      '<div class="cfp-hotkeys-close" ng-click="toggleCheatSheet()">&#215;</div>' +
    '</div></div>';

  var config = {
    /**
     * Configurable setting to disable the cheatsheet entirely
     * @type {Boolean}
     */
    includeCheatSheet: true,

    /**
     * Configurable setting for the cheat sheet title
     * @type {String}
     */
    templateTitle: 'Keyboard Shortcuts:',

    /**
     * Configurable settings for the cheat sheet header and footer.  Both are HTML, and the header
     * overrides the normal title if specified.
     * @type {String}
     */
    templateHeader: null,
    templateFooter: null,

    /**
     * Cheat sheet template in the event you want to totally customize it.
     * @type {String}
     */
    template: cheatSheetTemplate,
    /**
     * Configurable setting for the cheat sheet hotkey
     * @type {String}
     */
    hotkey: '?',
    /**
     * Configurable setting for the cheat sheet description
     * @type {String}
     */
    description: 'Show / hide this help menu',
    $get: hotkeysCheatSheetProviderFactory
  };

  return config;
});