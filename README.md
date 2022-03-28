# Leaflet.restoreMap

Leaflet plugin that stores and restores a map’s settings when a web page is reloaded. The map’s center and zoom level are stored by default, as well as full screen status (compatible with [Leaflet.fullscreen](https://github.com/shaefner-usgs/Leaflet.fullscreen)). Optionally, the selected map layers (base layers, overlays and [grouped overlays](https://github.com/ismyrnow/leaflet-groupedlayercontrol)) can be stored as well.

### Usage Example

1. Include the plugin:

```html
<script src='Leaflet.restoreMap.js'></script>
```

2. Create a Leaflet map instance as usual:

```js
var map = L.map();
```

3. Initialize the Restore Map plugin:

```js
map.restoreMap(<Object> options?)
```

### Options

| Option | Type | Default | Description |
| ------ | ------ | ------ | ------ |
| baseLayers | Object | {} | Object literal with layer names as keys and Layer objects as values for the layers you want to remember. Typically the *baselayers* parameter for [L.control.layers](https://leafletjs.com/reference.html#control-layers). |
| id | String | '\_shared\_' | Unique value used to save settings for multiple maps separately. |
| layerStorageType | String | 'local' | Storage type for the map's layers ('local' or 'session'). |
| overlays | Object | {} | Object literal with layer names as keys and Layer objects as values for the layers you want to remember. Typically the *overlays* parameter for [L.control.layers](https://leafletjs.com/reference.html#control-layers). |
| scope | String | '\_global\_' | Groups shared map layer settings across a domain. Typically the app’s name. |
| shareLayers | Boolean | false | Whether or not to share the stored map layers between multiple maps within the same scope. |
| viewStorageType | String | 'session' | Storage type for the map’s center and zoom level ('local' or 'session'). |
