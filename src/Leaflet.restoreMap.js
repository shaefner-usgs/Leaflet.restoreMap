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
          _updateLayers;

      _map = this;

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
       * Get the Array index of the layer whose name matches the given name.
       *
       * @param layers {Array}
       * @param name {String}
       *
       * @return index {Integer} default is -1
       */
      _getIndex = function (layers, name) {
        var index = -1;

        layers.forEach((layer, i) => {
          if (layer.name === name) {
            index = i;
          }
        });

        return index;
      };

      /**
       * Get the Leaflet overlay from a layer group/name.
       *
       * @param layer {Object}
       *     {
       *       group {String}
       *       name {String}
       *     }
       *
       * @return overlay {L.layer}
       */
      _getOverlay = function (layer) {
        var overlay;

        if (layer.group) {
          if (Object.prototype.hasOwnProperty.call(_layers.overlays, layer.group)) {
            overlay = _layers.overlays[layer.group][layer.name];
          }
        } else {
          overlay = _layers.overlays[layer.name];
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
       * Check if a javascript Object is empty.
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
        _updateLayers(e, 'add');

        _storage.layers.mapLayers = JSON.stringify(_settings.layers);
      };

      /**
       * Handler for when overlays are removed.
       *
       * @param e {Event}
       */
      _overlayremove = function (e) {
        _updateLayers(e, 'remove');

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

          settings.add.forEach(layer => {
            var overlay = _getOverlay(layer);

            if (overlay && !_map.hasLayer(overlay)) {
              _map.addLayer(overlay);
            }
          });

          settings.remove.forEach(layer => {
            var overlay = _getOverlay(layer);

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
       * Update the list of tracked layers.
       *
       * @param e {Event}
       * @param type {String <add|remove>}
       */
      _updateLayers = function (e, type) {
        var index,
            settings;

        settings = _settings.layers[_scope][_id.layers];
        index = {
          add: _getIndex(settings.add, e.name),
          remove: _getIndex(settings.remove, e.name)
        };

        Object.keys(index).forEach(key => {
          if (key === type) { // add layer to list if not present
            if (index[key] === -1) {
              settings[key].push({
                group: e.group?.name || null,
                name: e.name
              });
            }
          } else { // remove layer from list if present
            if (index[key] !== -1) {
              settings[key].splice(index[key], 1);
            }
          }
        });
      };


      _initialize(options);
      options = null;
    }
  });
}));
