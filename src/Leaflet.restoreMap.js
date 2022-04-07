(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(['leaflet'], factory);
  } else if (typeof module !== 'undefined') {
    // Node/CommonJS
    module.exports = factory(require('leaflet'));
  } else {
    // Browser globals
    if (typeof window.L === 'undefined') {
      throw new Error('Leaflet must be loaded first');
    }
    factory(window.L);
  }
}(function (L) {
  L.Map.include({
    restoreMap: function (options) {
      var _id,
          _layers,
          _map,
          _scope,
          _settings,
          _storage,
          _this,

          _addListeners,
          _baselayerchange,
          _fullscreenchange,
          _getIndex,
          _getOverlay,
          _initialize,
          _initSettings,
          _isEmpty,
          _moveend,
          _overlayadd,
          _overlayremove,
          _restore,
          _restoreLayers,
          _restoreView,
          _updateOverlays;


      _map = this;
      _this = {};

      _initialize = function (options) {
        var storage = {
          local: window.localStorage || {},
          session: window.sessionStorage || {}
        };

        options = L.extend({
          baseLayers: {},
          id: 'shared',
          layerStorageType: 'local',
          overlays: {},
          scope: 'global',
          shareLayers: false,
          viewStorageType: 'session'
        }, options);

        _id = {
          layers: options.id,
          view: options.id
        }
        _layers = {
          baseLayers: options.baseLayers,
          overlays: options.overlays
        }
        _scope = options.scope;
        _storage = {
          layers: storage[options.layerStorageType],
          view: storage[options.viewStorageType]
        }
        _settings = {
          layers: JSON.parse(_storage.layers.mapLayers || '{}'),
          view: JSON.parse(_storage.view.mapView || '{}')
        };

        if (options.shareLayers) {
          _id.layers = 'shared'; // share settings across multiple maps
        }

        _addListeners();
        _initSettings();
        _restore();
      };

      /**
       * Add listeners to store the map's settings.
       */
      _addListeners = function () {
        if (!_map.__initRestore) {
          _map.on('baselayerchange', _baselayerchange);
          _map.on('fullscreenchange', _fullscreenchange);
          _map.on('moveend', _moveend);
          _map.on('overlayadd', _overlayadd);
          _map.on('overlayremove', _overlayremove);

          _map.__initRestore = true;
        }
      };

      /**
       * Handler for when a base layer changes.
       *
       * @param e {Event}
       */
      _baselayerchange = function (e) {
        var settings = _settings.layers[_scope][_id.layers];

        settings.base = e.name;
        _storage.layers.mapLayers = JSON.stringify(_settings.layers);
      };

      /**
       * Handler for when fullscreen mode changes.
       */
      _fullscreenchange = function () {
        var settings = _settings.view[_scope][_id.view];

        if (_map.isFullscreen()) {
          settings.fs = true;
        } else {
          settings.fs = false;
        }

        _storage.view.mapView = JSON.stringify(_settings.view);
      };

      /**
       * Get the Array index of the overlay that matches the given name.
       *
       * @param overlays {Array}
       * @param name {String}
       *
       * @return index {Integer} default is -1
       */
      _getIndex = function (overlays, name) {
        var index = -1;

        overlays.forEach((overlay, i) => {
          if (overlay.name === name) {
            index = i;
          }
        });

        return index;
      };

      /**
       * Get the associated Leaflet overlay from a tracked item's group/name.
       *
       * @param item {Object}
       *     {
       *       group {String}
       *       name {String}
       *     }
       *
       * @return overlay {L.layer}
       */
      _getOverlay = function (item) {
        var overlay;

        if (item.group) {
          if (Object.prototype.hasOwnProperty.call(_layers.overlays, item.group)) {
            overlay = _layers.overlays[item.group][item.name];
          }
        } else {
          overlay = _layers.overlays[item.name];
        }

        return overlay;
      };

      /**
       * Initialize Object templates that store the map's settings.
       */
      _initSettings = function () {
        if (!_settings.layers[_scope]) {
          _settings.layers[_scope] = {};
        }
        if (!_settings.layers[_scope][_id.layers]) {
          _settings.layers[_scope][_id.layers] = {
            add: [],
            remove: []
          };
        }

        if (!_settings.view[_scope]) {
          _settings.view[_scope] = {};
        }
        if (!_settings.view[_scope][_id.view]) {
          _settings.view[_scope][_id.view] = {};
        }
      };

      /**
       * Check if an Object is empty.
       *
       * @param obj {Object}
       *
       * @return {Boolean}
       */
      _isEmpty = function (obj) {
        return Object.keys(obj).length === 0;
      };

      /**
       * Handler for when the map extent changes.
       */
      _moveend = function () {
        var settings = _settings.view[_scope][_id.view];

        if (!_map._loaded) {
          return; // don't access map bounds if view is not set
        }

        settings.lat = _map.getCenter().lat;
        settings.lng = _map.getCenter().lng;
        settings.zoom = _map.getZoom();

        _storage.view.mapView = JSON.stringify(_settings.view);
      };

      /**
       * Handler for when overlays are added.
       *
       * @param e {Event}
       */
      _overlayadd = function (e) {
        _updateOverlays(e, 'add');

        _storage.layers.mapLayers = JSON.stringify(_settings.layers);
      };

      /**
       * Handler for when overlays are removed.
       *
       * @param e {Event}
       */
      _overlayremove = function (e) {
        _updateOverlays(e, 'remove');

        _storage.layers.mapLayers = JSON.stringify(_settings.layers);
      };

      /**
       * Restore the map's settings.
       */
      _restore = function () {
        try {
          _restoreLayers();
          _restoreView();
        } catch (error) {
          console.error(error);
        }
      };

      /**
       * Restore map layers.
       */
      _restoreLayers = function () {
        var settings = _settings.layers[_scope][_id.layers];

        if (!_isEmpty(settings)) {
          if (settings.base) {
            Object.keys(_layers.baseLayers).forEach(name => {
              var baseLayer = _layers.baseLayers[name];

              if (name === settings.base) {
                _map.addLayer(baseLayer);
              } else {
                _map.removeLayer(baseLayer);
              }
            });
          }

          settings.add.forEach(item => {
            var overlay = _getOverlay(item);

            if (overlay && !_map.hasLayer(overlay)) {
              _map.addLayer(overlay);
            }
          });

          settings.remove.forEach(item => {
            var overlay = _getOverlay(item);

            if (overlay && _map.hasLayer(overlay)) {
              _map.removeLayer(overlay);
            }
          });
        }
      };

      /**
       * Restore map view.
       */
      _restoreView = function () {
        var latlng,
            settings;

        settings = _settings.view[_scope][_id.view];

        if (!_isEmpty(settings)) {
          latlng = L.latLng(settings.lat, settings.lng);

          _map.setView(latlng, settings.zoom, true);

          if (settings.fs) {
            _map.toggleFullscreen();
          }
        }
      };

      /**
       * Update the list of stored overlays.
       *
       * @param e {Event}
       * @param action {String <add|remove>}
       */
      _updateOverlays = function (e, action) {
        var index,
            settings,
            tracked;

        settings = _settings.layers[_scope][_id.layers];
        index = {
          add: _getIndex(settings.add, e.name),
          remove: _getIndex(settings.remove, e.name)
        };

        Object.keys(index).forEach(type => {
          tracked = _layers.overlays[e.name];

          // Add/remove an overlay to/from the list of stored overlays
          if (type === action) {
            if (tracked && index[type] === -1) { // add to add/remove list
              settings[type].push({
                group: e.group?.name || null,
                name: e.name
              });
            }
          } else {
            if (tracked && index[type] !== -1) { // remove from add/remove list
              settings[type].splice(index[type], 1);
            }
          }
        });
      };

      // ----------------------------------------------------------
      // Public methods
      // ----------------------------------------------------------

      /**
       * Add an overlay to be tracked.
       *
       * @param layer {Object}
       *     {
       *       layerName: L.Layer
       *     }
       */
      _this.addOverlay = function (layer) {
        var name = Object.keys(layer)[0];

        _layers.overlays[name] = layer[name];

        _restoreLayers();
      };

      /**
       * Remove an overlay from being tracked.
       *
       * @param layer {Object}
       *     {
       *       layerName: L.Layer
       *     }
       */
      _this.removeOverlay = function (layer) {
        var name = Object.keys(layer)[0];

        delete _layers.overlays[name];

        _restoreLayers();
      };


      _initialize(options);
      options = null;
      return _this;
    }
  });
}));
