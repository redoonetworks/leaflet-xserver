'use strict';

var L = require('leaflet'),
	superagent = require('superagent');

L.TileLayer.XServer = L.TileLayer.extend({
	_isrsLayer: false,
	options: {
		disableMouseEvents : false,
	},

	initialize: function (url, options) {
		options = L.setOptions(this, options);

		var resolvedUrl = L.Util.template(url, L.extend({s: 0, x: 0, y: 0, z: 0}, options));
		this._isrsLayer = resolvedUrl.indexOf('/renderMap') !== -1;
		
		if (!this._isrsLayer && resolvedUrl.indexOf('contentType=JSON') === -1)
			throw new Error('L.TileLayer.XServer cannot be intatiated directly without contentType=JSON');
		
		L.TileLayer.prototype.initialize.call(this, url, options);
	},

	onAdd: function (map) {
		L.TileLayer.prototype.onAdd.call(this, map);

		if(!this.options.disableMouseEvents) {
			map._container.addEventListener('mousemove', L.bind(this._onMouseMove, this), true);
			map._mapPane.addEventListener('mousedown', L.bind(this._onMouseDown, this), true);

			map._mapPane.addEventListener('click', L.bind(this._onClick, this), true);
			map.addEventListener('click', L.bind(this._onMapClick, this), false);
		}
	},

	onRemove: function (map) {
		if(!this.options.disableMouseEvents) {
			map._container.removeEventListener('mousemove', L.bind(this._onMouseMove, this), true);
			map._mapPane.removeEventListener('mousedown', L.bind(this._onMouseDown, this), true);
  
			map._mapPane.removeEventListener('click', L.bind(this._onClick, this), true);
			map.removeEventListener('click', L.bind(this._onMapClick, this), false);
		}

		L.TileLayer.prototype.onRemove.call(this, map);
	},

	findElement: function (e, container) {
		if (!container)
			return null;

		var result = {};

		var tiles = Array.prototype.slice.call(container.getElementsByTagName('img')),
			i, len, tile;

		for (i = 0, len = tiles.length; i < len; i++) {
			tile = tiles[i];
			var mp = L.DomEvent.getMousePosition(e, tile);

			for (var j = tile._layers.length - 1; j >= 0; j--) {
				var layer = tile._layers[j];
				var width = Math.abs(layer.pixelBoundingBox.right - layer.pixelBoundingBox.left);
				var height = Math.abs(layer.pixelBoundingBox.top - layer.pixelBoundingBox.bottom);
				if ((layer.referencePixelPoint.x - width / 2 <= mp.x) && (layer.referencePixelPoint.x + width / 2 >= mp.x) &&
					(layer.referencePixelPoint.y - height / 2 <= mp.y) && (layer.referencePixelPoint.y + height / 2 >= mp.y)) {
					if (!result[layer.id])
						result[layer.id] = layer;
				}
			}
		}

		if (Object.keys(result).length > 0)
			return result;

		return null;
	},

	_onMouseMove: function (e) {
		if (!this._map || (this._map.dragging._draggable && this._map.dragging._draggable._moving) || this._map._animatingZoom) {
			return;
		}

		if (this.findElement(e, this._container)) {
			e.preventDefault();

			this._map._container.style.cursor = 'pointer';

			e.stopPropagation();
		} else {
			this._map._container.style.cursor = '';
		}
	},

	_onMouseDown: function (e) {
		var found = this.findElement(e, this._container);
		if (found) {
			e.preventDefault();

			e.stopPropagation();
			return false;
		}
	},

	_onClick: function (e) {
		var found = this.findElement(e, this._container);
		if (found) {
			e.preventDefault();

			var description = this.buildDescriptionText(found);

			var point = found[Object.keys(found)[0]].latLng;

			L.popup()
				.setLatLng(point)
				.setContent(description)
				.openOn(this._map);

			e.stopPropagation();
			return false;
		}
	},

	_onMapClick: function (e) {
		var found = this.findElement(e.originalEvent, this._container);
		if (found) {
			var description = this.buildDescriptionText(found);

			var point = found[Object.keys(found)[0]].latLng;

			L.popup()
				.setLatLng(point)
				.setContent(description)
				.openOn(this._map);

			return false;
		}
	},

	buildDescriptionText: function (found) {
		var description = '';
		var isFirstLayer = true;

		if(typeof this.options.onCreateFeatureDescription === 'undefined') {
			for (var layer in found) {
				if (isFirstLayer) {
					isFirstLayer = false;
				} else {
					description = description + '<br>';
				}

				for (var i = 0; i < found[layer].attributes.length; i++) {
					var attribute = found[layer].attributes[i];
					description = description.concat(
						attribute.key.replace(/[A-Z]/g, ' $&') + ': ' +
						attribute.value.replace('_', ' ') + '<br>');
				}

			}

			return description.toLowerCase();
		} else {
			return this.options.onCreateFeatureDescription(found);
		}
	},

	pixToLatLng: function (tileKey, point) {
		var earthHalfCircum = Math.PI;
		var earthCircum = earthHalfCircum * 2.0
		var arc = earthCircum / Math.pow(2, tileKey.z);
		var x = -earthHalfCircum + (tileKey.x + (point.x / 256.0)) * arc;
		var y = earthHalfCircum - (tileKey.y + (point.y / 256.0)) * arc;

		return L.latLng(
			(360 / Math.PI) * (Math.atan(Math.exp(y)) - (Math.PI / 4)),
			(180.0 / Math.PI) * x);
	},

	_removeTile: function (key) {
		var tile = this._tiles[key];
		if (tile && tile.el && tile.el.request)
			tile.el.request.abort();
			
		return L.TileLayer.prototype._removeTile.call(this, key);
	},

	createTile: function (coords, done) {
		var url = this.getTileUrl(coords);

		if (this._isrsLayer) {
			// Modify/extend this object for customization, for example the stored profile 
			var request = {
				'mapSection': {
					'$type': 'MapSectionByTileKey',
					'zoomLevel': coords.z,
					'x': coords.x,
					'y': coords.y
				},
				'imageOptions': {
					'width': 256,
					'height': 256
				},
				'resultFields': {
					'image': true
				}
			};

			if (this.options.requestExtension) {
				request = L.extend(request, this.options.requestExtension);
			}
		}

		var tile = document.createElement('img');
		tile._map = this._map;
		tile._layers = [];

		tile.request = this._isrsLayer ?
			superagent.post(url)
				.set('Content-Type', 'application/json')
				.send(request) :
			superagent.get(url);

		if(this.options.username && this.options.password)		
			tile.request = tile.request.auth(this.options.username, this.options.password);
		
		tile.request.responseType('json')
			.end(L.bind(function (err, response) {
				tile.request = null;

				if(response && response.body && response.body.image)
				{
					var resp = response.body;

					var prefixMap = {
						'iVBOR': 'data:image/png;base64,',
						'R0lGO': 'data:image/gif;base64,',
						'/9j/4': 'data:image/jpeg;base64,',
						'Qk02U': 'data:image/bmp;base64,'
					};
					
					var rawImage = resp.image;
					tile.src = prefixMap[rawImage.substr(0, 5)] + rawImage;

					if (resp.features) {
						var objectInfos = resp.features;

						for (var i = 0; i < objectInfos.length; i++) {
							var oi = objectInfos[i];
							oi.latLng = this.pixToLatLng(coords, oi.referencePixelPoint);
							tile._layers.push(oi);
						}
					}
				}

				done(null, tile);
			}, this));
		return tile;
	}
});

L.tileLayer.xserver = function (url, options) {
	// only use the XServer layer for rs/renderMap or rest/tile with contentType=JSON
	var resolvedUrl =  L.Util.template(url, L.extend({s: 0, x: 0, y: 0, z: 0}, options));

	if ((resolvedUrl.indexOf('/renderMap') !== -1) || (url.indexOf('contentType=JSON') !== -1)) {
		return new L.TileLayer.XServer(url, options);
	} else {
		return new L.TileLayer(url, options);
	}
};

module.exports = L.tileLayer.xserver;
