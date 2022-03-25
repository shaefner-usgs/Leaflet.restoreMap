/* global L */
'use strict';


/**
 * Leaflet.restoreMap plugin - store and restore a map's settings.
 *
 * 1. remembers map view (center and zoom level)
 * 2. remembers selected layers, including grouped layers
 *    compatible with https://github.com/ismyrnow/Leaflet.groupedlayercontrol
 * 3. remembers fullscreen mode
 *    compatible with https://github.com/Leaflet/Leaflet.fullscreen
 * 4. option to share layer settings among multiple maps within an app/site
 *
 * Usage: map.restoreMap(options)
 *
 * @param options {Object} optional
 *     {
 *       baseLayers {Object <Layer Config>}
 *           req'd for restoring the map's base layer
 *       id {String}
 *           saves each map's settings separately
 *       layerStorageType {String <local|session>}
 *       overlays {Object <Layer Config>}
 *           req'd for restoring the map's overlays
 *       scope {String <AppName>}
 *           isolates shared map layer settings across a domain
 *       shareLayers {Boolean}
 *           shares map layer settings between multiple maps in the same scope
 *       viewStorageType {String <local|session>}
 *     }
 *
 * <Layer Config> : http://leafletjs.com/reference.html#control-layers
 */
L.RestoreMapMixin = {
  restoreMap: function (options) {
    var _baseLayers,
        _layers,
        _layersId,
        _layersStorage,
        _map,
        _overlays,
        _scope,
        _view,
        _viewId,
        _viewStorage,

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
        id: '_shared_',
        layerStorageType: 'local',
        overlays: {},
        scope: '_global_',
        shareLayers: false,
        viewStorageType: 'session'
      }, options);

      _baseLayers = options.baseLayers;
      _layersStorage = storage[options.layerStorageType];
      _layers = JSON.parse(_layersStorage.mapLayers || '{}');
      _layersId = options.id;
      _overlays = options.overlays,
      _scope = options.scope;
      _viewStorage = storage[options.viewStorageType];
      _view = JSON.parse(_viewStorage.mapView || '{}');
      _viewId = options.id;

      if (options.shareLayers) {
        _layersId = '_shared_'; // share settings across multiple maps
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
      _layers[_scope][_layersId].base = e.name;

      _layersStorage.mapLayers = JSON.stringify(_layers);
    };

    /**
     * Handler for when fullscreen mode changes.
     */
    _fullscreenchange = function () {
      var settings = _view[_scope][_viewId];

      if (_map.isFullscreen()) {
        settings.fs = true;
      } else {
        settings.fs = false;
      }

      _viewStorage.mapView = JSON.stringify(_view);
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
        if (Object.prototype.hasOwnProperty.call(_overlays, layer.group)) {
          overlay = _overlays[layer.group][layer.name];
        }
      } else {
        overlay = _overlays[layer.name];
      }

      return overlay;
    };

    /**
     * Initialize Object templates that store the map's settings.
     */
    _initSettings = function () {
      if (!_layers[_scope]) {
        _layers[_scope] = {};
      }
      if (!_layers[_scope][_layersId]) {
        _layers[_scope][_layersId] = {
          add: [],
          remove: []
        };
      }

      if (!_view[_scope]) {
        _view[_scope] = {};
      }
      if (!_view[_scope][_viewId]) {
        _view[_scope][_viewId] = {};
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
      var settings = _view[_scope][_viewId];

      if (!_map._loaded) {
        return; // don't access map bounds if view is not set
      }

      settings.lat = _map.getCenter().lat;
      settings.lng = _map.getCenter().lng;
      settings.zoom = _map.getZoom();

      _viewStorage.mapView = JSON.stringify(_view);
    };

    /**
     * Handler for when overlays are added.
     *
     * @param e {Event}
     */
    _overlayadd = function (e) {
      _updateLayers(e, 'add');

      _layersStorage.mapLayers = JSON.stringify(_layers);
    };

    /**
     * Handler for when overlays are removed.
     *
     * @param e {Event}
     */
    _overlayremove = function (e) {
      _updateLayers(e, 'remove');

      _layersStorage.mapLayers = JSON.stringify(_layers);
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
      var settings = _layers[_scope][_layersId];

      if (!_isEmpty(settings)) {
        if (settings.base) {
          Object.keys(_baseLayers).forEach(name => {
            var baseLayer = _baseLayers[name];

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

      settings = _view[_scope][_viewId];

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

      settings = _layers[_scope][_layersId];
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
};


L.Map.include(L.RestoreMapMixin);
