(function() {

  'use strict';
  angular.module('cfp.hotkeys').provider('HotKey', function() {

  function hotkeyFactory($window) {
    /**
     * Convert strings like cmd into symbols like ⌘
     * @param  {String} combo Key combination, e.g. 'mod+f'
     * @return {String}       The key combination with symbols
     */
    function symbolize (combo) {
      var map = {
        command   : '\u2318',     // ⌘
        shift     : '\u21E7',     // ⇧
        left      : '\u2190',     // ←
        right     : '\u2192',     // →
        up        : '\u2191',     // ↑
        down      : '\u2193',     // ↓
        'return'  : '\u23CE',     // ⏎
        backspace : '\u232B',     // ⌫
        option    : '\u2325'      // ⌥
      };

      return combo.split('+').map(function(value) {
        var symbol = value;

        if (value === 'mod' || value === 'command' || value === 'ctrl') {

          if ($window.navigator && $window.navigator.platform.indexOf('Mac') >=0 ) {
            symbol = 'command';
          } else {
            symbol = 'ctrl';
          }
        } else if (value === 'alt' || value === 'option') {
          if ($window.navigator && $window.navigator.platform.indexOf('Mac') >=0 ) {
            switch (config.macAlt) {
              case 'symbol':
                symbol = 'opt';
                break;
              case 'alt':
                symbol = 'alt';
                break;
              default:
                symbol = 'option';
            }
          } else {
            symbol = 'alt';
          }
        }

        return map[symbol] || symbol;
      }).join(' + ');
    }

    /**
     * Hotkey object used internally for consistency
     *
     * @param {array}    combo       The keycombo. it's an array to support multiple combos
     * @param {String}   description Description for the keycombo
     * @param {Function} callback    function to execute when keycombo pressed
     * @param {string}   action      the type of event to listen for (for mousetrap)
     * @param {array}    allowIn     an array of tag names to allow this combo in ('INPUT', 'SELECT', and/or 'TEXTAREA')
     * @param {Boolean}  persistent  Whether the hotkey persists navigation events
     * @param {string}   identifier  optional identifier for the shortcut
     */
    function Hotkey (combo, description, callback, action, allowIn, persistent, identifier) {
      // TODO: Check that the values are sane because we could
      // be trying to instantiate a new Hotkey with outside dev's
      // supplied values

      this.combo = combo instanceof Array ? combo : [combo];
      this.description = description;
      this.callback = callback;
      this.action = action;
      this.allowIn = allowIn;
      this.persistent = persistent;
      this._formated = null;
      this.identifier = identifier;
    }

    /**
     * Helper method to format (symbolize) the key combo for display
     *
     * @return {[Array]} An array of the key combination sequence
     *   for example: "command+g c i" becomes ["⌘ + g", "c", "i"]
     *
     */
    Hotkey.prototype.format = function() {
      if (this._formated === null) {
          this._formated = this.combo.map(function comboMapper(combo) {
              return combo.split(/[\s]/).map(symbolize);
          });
      }

      return this._formated;
    };

    return Hotkey;
  }

  hotkeyFactory.$inject = ['$window'];

  var config = {
    macAlt: 'option',
    $get: hotkeyFactory
  };

  return config;
});
})();
