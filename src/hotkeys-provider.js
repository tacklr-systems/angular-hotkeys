(function() {

  'use strict';
  angular.module('cfp.hotkeys').provider('hotkeys', ['$injector', function($injector) {
    function hotkeysProviderFactory($rootElement, $rootScope, $compile, $window, Hotkey) {
      var initialized = false;

      var mouseTrapEnabled = true;

      function pause() {
        mouseTrapEnabled = false;
      }

      function unpause() {
        mouseTrapEnabled = true;
      }

      // monkeypatch Mousetrap's stopCallback() function
      // this version doesn't return true when the element is an INPUT, SELECT, or TEXTAREA
      // (instead we will perform this check per-key in the _add() method)
      Mousetrap.prototype.stopCallback = function(event, element) {
        if (!mouseTrapEnabled) {
          return true;
        }

        // if the element has the class "mousetrap" then no need to stop
        if ((' ' + element.className + ' ').indexOf(' mousetrap ') > -1) {
          return false;
        }

        return (element.contentEditable && element.contentEditable === 'true');
      };

      var scope = {};

      /**
       * Holds references to the different scopes that have bound hotkeys
       * attached.  This is useful to catch when the scopes are `$destroy`d and
       * then automatically unbind the hotkey.
       *
       * @type {Object}
       */
      var boundScopes = {};

      var boundStates = {};

      function init() {
        if (!initialized) {

          initialized = true;
          /**
          * A new scope used internally for the cheatsheet
          * @type {$rootScope.Scope}
          */
          scope = $rootScope.$new();

          /**
          * Holds an array of Hotkey objects currently bound
          * @type {Array}
          */
          scope.hotkeys = [];

          boundScopes = {};

          if (config.useNgRoute) {
            $rootScope.$on('$routeChangeSuccess', function (event, route) {
              purgeHotkeys();

              if (route && route.hotkeys) {
                angular.forEach(route.hotkeys, function (hotkey) {
                  // a string was given, which implies this is a function that is to be
                  // $eval()'d within that controller's scope
                  // TODO: hotkey here is super confusing.  sometimes a function (that gets turned into an array), sometimes a string
                  var callback = hotkey[2];
                  if (typeof(callback) === 'string' || callback instanceof String) {
                    hotkey[2] = [callback, route];
                  }

                  // todo: perform check to make sure not already defined:
                  // this came from a route, so it's likely not meant to be persistent
                  hotkey[5] = false;
                  _add.apply(this, hotkey);
                });
              }
            });
          }

          if (config.useNgState) {
            $rootScope.$on('$stateChangeSuccess', function (event, toState) {
              purgeHotkeys();
              if (boundStates && boundStates[toState.name]) {

                angular.forEach(boundStates[toState.name], function (cfg) {
                  cfg.persistent = false;
                  _add(cfg);
                });
              }
            });
          }

        }
      }

      /**
       * Purges all non-persistent hotkeys (such as those defined in routes)
       *
       * Without this, the same hotkey would get recreated everytime
       * the route is accessed.
       */
      function purgeHotkeys() {
        var i = scope.hotkeys.length;
        while (i--) {
          var hotkey = scope.hotkeys[i];
          if (hotkey && !hotkey.persistent) {
            _del(hotkey);
          }
        }
      }

      /**
       * Creates a new Hotkey and creates the Mousetrap binding
       *
       * @param {string}   combo       mousetrap key binding
       * @param {string}   description description for the help menu
       * @param {Function} callback    method to call when key is pressed
       * @param {string}   action      the type of event to listen for (for mousetrap)
       * @param {array}    allowIn     an array of tag names to allow this combo in ('INPUT', 'SELECT', and/or 'TEXTAREA')
       * @param {boolean}  persistent  if true, the binding is preserved upon route changes
       * @param {string}   identifier  optional identifier for the shortcut
       */
      function _add(combo, description, callback, action, allowIn, persistent, identifier) {

          // used to save original callback for "allowIn" wrapping:
          var _callback;

          // these elements are prevented by the default Mousetrap.stopCallback():
          var preventIn = ['INPUT', 'SELECT', 'TEXTAREA'];

          // Determine if object format was given:
          var objType = Object.prototype.toString.call(combo);

          if (objType === '[object Object]') {
            description = combo.description;
            callback    = combo.callback;
            action      = combo.action;
            persistent  = combo.persistent;
            allowIn     = combo.allowIn;
            identifier  = combo.identifier;
            combo       = combo.combo;
          }

          // no duplicates please
          _del(combo);

          // description is optional:
          if (description instanceof Function) {
            action = callback;
            callback = description;
            description = '$$undefined$$';
          } else if (angular.isUndefined(description)) {
            description = '$$undefined$$';
          }

          // any items added through the public API are for controllers
          // that persist through navigation, and thus undefined should mean
          // true in this case.
          if (persistent === undefined) {
            persistent = true;
          }
          // if callback is defined, then wrap it in a function
          // that checks if the event originated from a form element.
          // the function blocks the callback from executing unless the element is specified
          // in allowIn (emulates Mousetrap.stopCallback() on a per-key level)
          if (typeof callback === 'function') {

            // save the original callback
            _callback = callback;

            // make sure allowIn is an array
            if (!(allowIn instanceof Array)) {
              allowIn = [];
            }

            // remove anything from preventIn that's present in allowIn
            var index;
            for (var i=0; i < allowIn.length; i++) {
                allowIn[i] = allowIn[i].toUpperCase();
                index = preventIn.indexOf(allowIn[i]);
                if (index !== -1) {
                    preventIn.splice(index, 1);
                }
            }

            // create the new wrapper callback
            callback = function(event) {
              var shouldExecute = true;

              // if the callback is executed directly `hotkey.get('w').callback()`
              // there will be no event, so just execute the callback.
              if (event) {
                var target = event.target || event.srcElement; // srcElement is IE only
                var nodeName = target.nodeName.toUpperCase();

                // check if the input has a mousetrap class, and skip checking preventIn if so
                if ((' ' + target.className + ' ').indexOf(' mousetrap ') > -1) {
                  shouldExecute = true;
                } else {
                  // don't execute callback if the event was fired from inside an element listed in preventIn
                  for (var i=0; i<preventIn.length; i++) {
                    if (preventIn[i] === nodeName) {
                      shouldExecute = false;
                      break;
                    }
                  }
                }
              }

              if (shouldExecute) {
                wrapApply(_callback.apply(this, arguments));
              }
            };
          }

          if (typeof(action) === 'string') {
            Mousetrap.bind(combo, wrapApply(callback), action);
          } else {
            Mousetrap.bind(combo, wrapApply(callback));
          }

          var hotkey = new Hotkey(combo, description, callback, action, allowIn, persistent, identifier);
          scope.hotkeys.push(hotkey);
          return hotkey;
      }

      /**
       * delete and unbind a Hotkey
       *
       * @param  {mixed} hotkey   Either the bound key or an instance of Hotkey
       * @return {boolean}        true if successful
       */
      function _del(hotkey) {
        var combo = (hotkey instanceof Hotkey) ? hotkey.combo : hotkey;

        Mousetrap.unbind(combo);

        if (angular.isArray(combo)) {
          var retStatus = true;
          var i = combo.length;
          while (i--) {
            retStatus = _del(combo[i]) && retStatus;
          }
          return retStatus;
        } else {
          var index = scope.hotkeys.indexOf(_get(combo));

          if (index > -1) {
            // if the combo has other combos bound, don't unbind the whole thing, just the one combo:
            if (scope.hotkeys[index].combo.length > 1) {
              scope.hotkeys[index].combo.splice(scope.hotkeys[index].combo.indexOf(combo), 1);
            } else {

              // remove hotkey from bound scopes
              angular.forEach(boundScopes, function (boundScope) {
                var scopeIndex = boundScope.indexOf(scope.hotkeys[index]);

                if (scopeIndex !== -1) {
                  boundScope.splice(scopeIndex, 1);
                }
              });

              scope.hotkeys.splice(index, 1);
            }
            return true;
          }
        }

        return false;
      }

      /**
       * Get a Hotkey object by key binding
       *
       * @param  {[string]} [combo]  the key the Hotkey is bound to. Returns all key bindings if no key is passed
       * @return {Hotkey}          The Hotkey object
       */
      function _get(combo) {

        if (!combo) {
          return scope.hotkeys;
        }

        var hotkey;

        for (var i = 0; i < scope.hotkeys.length; i++) {
          hotkey = scope.hotkeys[i];

          if (hotkey.combo.indexOf(combo) > -1) {
            return hotkey;
          }
        }

        return false;
      }

      /**
       * returns all the shortcuts that match the identifier
       * @param {string} identifier  identifier for the shortcut
       */
      function _getById(identifier) {
        var results = []

        for (var i = 0; i < scope.hotkeys.length; i++) {
          var hotkey = scope.hotkeys[i];

          if (hotkey.identifier === identifier) {
            results.push(hotkey);
          }
        }

        return results;
      }

      /**
       * Binds the hotkey to a particular scope.  Useful if the scope is
       * destroyed, we can automatically destroy the hotkey binding.
       *
       * @param  {Object} scope The scope to bind to
       */
      function bindTo(scope) {
        // Only initialize once to allow multiple calls for same scope.
        if (!(scope.$id in boundScopes)) {

          // Add the scope to the list of bound scopes
          boundScopes[scope.$id] = [];

          scope.$on('$destroy', function () {
            var i = boundScopes[scope.$id].length;
            while (i--) {
              _del(boundScopes[scope.$id].pop());
            }
          });
        }
        // return an object with an add function so we can keep track of the
        // hotkeys and their scope that we added via this chaining method
        return {
          add: function (args) {
            var hotkey;

            if (arguments.length > 1) {
                hotkey = _add.apply(this, arguments);
            } else {
                hotkey = _add(args);
            }

            boundScopes[scope.$id].push(hotkey);
            return this;
          }
        };
      }

      function bindToState(cfg, states) {
        var wrap = (states instanceof Array) ? states : [states];

        wrap.forEach(function(state) {
          if (!boundStates[state]) {
            boundStates[state] = [];
          }
          boundStates[state].push(cfg);
        });

      }

      /**
       * All callbacks sent to Mousetrap are wrapped using this function
       * so that we can force a $scope.$apply()
       *
       * @param  {Function} callback [description]
       * @return {[type]}            [description]
       */
      function wrapApply(callback) {
        // return mousetrap a function to call
        return function (event, combo) {

          // if this is an array, it means we provided a route object
          // because the scope wasn't available yet, so rewrap the callback
          // now that the scope is available:
          if (callback instanceof Array) {
            var funcString = callback[0];
            var route = callback[1];
            callback = function () {
              route.scope.$eval(funcString);
            };
          }

          // this takes place outside angular, so we'll have to call
          // $apply() to make sure angular's digest happens
          $rootScope.$apply(function() {
            // call the original hotkey callback with the keyboard event
            callback(event, _get(combo));
          });
        };
      }

      function _all() {
        return _get();
      }

      var publicApi = {
        init                  : init,
        add                   : _add,
        del                   : _del,
        get                   : _get,
        getById               : _getById,
        all                   : _all,
        bindTo                : bindTo,
        bindToState           : bindToState,
        useNgRoute            : config.useNgRoute,
        usNgState             : config.useNgState,
        purgeHotkeys          : purgeHotkeys,
        pause                 : pause,
        unpause               : unpause
      };

      return publicApi;

    }

    hotkeysProviderFactory.$inject = ['$rootElement', '$rootScope', '$compile', '$window', 'HotKey'];

    var config = {
      useNgRoute: $injector.has('ngViewDirective'),
      useNgState: false,
      $get: hotkeysProviderFactory
    };

    return config;
  }]);

})();