[![NPM version](https://img.shields.io/npm/v/leaflet-xserver.svg)](https://www.npmjs.com/package/leaflet-xserver)
![XServer 2.x!](https://img.shields.io/badge/XServer-2.x-blue.svg?style=flat)
![Leaflet compatible!](https://img.shields.io/badge/Leaflet-1.x-blue.svg?style=flat)

## Purpose

leaflet-xserver provides classes to add xMapServer specific features to Leaflet.

## Components

* [Auto Attribution](#autoattribution)
* [L.TileLayer.XServer](#tilelayerxserver)

## How to build

```npm install``` 

or use the latest build at https://unpkg.com/leaflet-xserver/dist/

<a name="autoattribution"></a>
### Auto Attribution 

If included to the script, `leaflet-xserver.js` automatically sets the correct attribution text for every
layer that uses the xMapServer-2 `rest` or `rs` api.

<a name="tilelayerxserver"></a>
### L.TileLayer.XServer

The Layer class `L.TileLayer.XServer` can be used to make xServer elements clickable or request tiles with specific parameters.

#### Additional options

* *disableMouseEvents* - disables all mouse click and hover events. Default: ```false```

#### As single map
[Demo](https://ptv-logistics.github.io/xserverjs/boilerplate/Leaflet-Clickable.1.0.html)

The easiest way to add a clickable layer is to use class `L.TileLayer.XServer`, append a clickable xServer-Layer (e.g. `PTV_TruckAttributes`) to the profile and set the `&contentType=JSON` parameter. The icons of the layer can now be clicked to display the object information. The options are the same as for `L.TileLayer`

```javascript
var map = L.map('map').setView(new L.LatLng(49.01405, 8.4044), 14);

var interactiveTileLayer = L.tileLayer.xserver(
    'https://s0{s}-xserver2-europe-test.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}' +
    '?storedProfile={profile}&layers=background,transport,labels,PTV_TruckAttributes&contentType=JSON&xtok={token}',
    {
        profile: 'silkysand',
        token: window.token,
        subdomains: '1234',
        maxZoom: 22,
        pane: 'tilePane'
    }).addTo(map);
```

#### custom feature description
[Demo](https://ptv-logistics.github.io/xserverjs/boilerplate/Leaflet-Clickable.1.0.html)

The easiest way to add a clickable layer is to use class `L.TileLayer.XServer`, append a clickable xServer-Layer (e.g. `PTV_TruckAttributes`) to the profile and set the `&contentType=JSON` parameter. The icons of the layer can now be clicked to display the object information. The options are the same as for `L.TileLayer`

```javascript
var map = L.map('map').setView(new L.LatLng(49.01405, 8.4044), 14);

var interactiveTileLayer = L.tileLayer.xserver(
    'https://s0{s}-xserver2-europe-test.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}' +
    '?storedProfile={profile}&layers=background,transport,labels,PTV_TruckAttributes&contentType=JSON&xtok={token}',
    {
        profile: 'silkysand',
        token: window.token,
        subdomains: '1234',
        maxZoom: 22,
        pane: 'tilePane',
        onCreateFeatureDescription(found) {
            var description = [];
    
            for (var layer in found) {
                for (var i = 0; i < found[layer].attributes.length; i++) {
                    var attribute = found[layer].attributes[i];
    
                    switch(attribute.key) {
                        case 'totalPermittedWeight':
                            description.push('Gilt für Fahrzeuggewicht ab ' + attribute.value + ' kg');
                            break;
                        case 'loadType':
    
                            switch(attribute.value) {
                                case "PASSENGER":
                                case "0":
                                    description.push('Gilt für Passagierverkehr');
                                    break;
                                case "1":
                                case "GOODS":
                                    description.push('Gilt für Güterverkehr');
                                    break;
                            }
    
                            break;
                        case 'driveType':
                            switch(attribute.value) {
                                case "MOTOR_VEHICLE":
                                    description.push('Gilt für motorisierte Fahrzeuge');
                                    break;
                                case "BICYCLE":
                                    description.push('Gilt für Fahrräder');
                                    break;
                                case "PEDESTRIAN":
                                    description.push('Gilt für Fußgänger');
                                    break;
                            }
                            break;
                        case 'maxHeight':
                            description.push('Maximalhöhe: ' + (attribute.value/100) + ' m');
                            break;
                        case 'maxWeight':
                            description.push('Maximalgewicht: ' + attribute.value + ' kg');
                            break;
                        case 'maxWidth':
                            description.push('Maximalbreite ' + (attribute.value/100) + ' m');
                            break;
                        case 'maxLength':
                            description.push('Maximallänge ' + (attribute.value/100) + ' m');
                            break;
                        case 'maxAxleLoad':
                            description.push('Maximales Achslast: ' + attribute.value + ' kg');
                            break;
                        case 'hazardousToWaters':
                            description.push('Transport von wassergefährdenden Gütern verboten');
                            break;
                        case 'hazardousGoods':
                            description.push('Transport von gefährlichen Güter verboten');
                            break;
                        case 'combustibles':
                            description.push('Transport von die Brennstoffen verboten');
                            break;
                        case 'hasTrailer':
                            description.push('Gibt an, ob es einen Anhänger gibt');
                            break;
                        case 'freeForDelivery':
                            description.push('Frei für Anlieferung');
                            break;
                        case 'tunnelRestriction':
                            switch(attribute.value) {
                                case 'B':
                                    description.push('Tunnelbeschränkung B, C, D, E');
                                    break;
                                case 'C':
                                    description.push('Tunnelbeschränkung C, D, E');
                                    break;
                                case 'D':
                                    description.push('Tunnelbeschränkung D, E');
                                    break;
                                case 'E':
                                    description.push('Tunnelbeschränkung E');
                                    break;
                            }
    
                            break;
                        case 'opening':
                            if(attribute.value == "0") {
                                description.push('Segment gesperrt');
                            }
    
                            break;
                    }
                }
            }
    
            return description.join('<br/>')
        }
    }).addTo(map);
```

#### As layered map
[Demo](https://ptv-logistics.github.io/xserverjs/boilerplate/Leaflet-Clickable-Layered.1.0.html)

It's also possible to split the xMapServer map into separate Leaflet layers. This sample creates a standard xMapServer basemap-layer and a clickable truck attributes overlay. A client-side layer `L.Circle`can then be added between the two xMapServer layers by assigning them to different panes (`tilePane`, `overlayPane` and  `shadowPane`).

```javascript
var coordinate = L.latLng(49.01405, 8.4044); // KA
var radius = 250; // m

var map = L.map('map').setView(coordinate, 14);

var basemapLayer = L.tileLayer(
    'https://s0{s}-xserver2-europe-test.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}' +
    '?storedProfile={profile}&layers={layers}&xtok={token}', {
        profile: 'silkysand',
        layers: 'background,transport',
        token: window.token,
        subdomains: '1234',
        maxZoom: 22,
        pane: 'tilePane'
    }).addTo(map);

var circle = L.circle(coordinate, radius / Math.cos(coordinate.lng / 2 / Math.PI), {
    color: 'red',
    fillColor: 'orange',
    fillOpacity: 0.5,
    pane: 'overlayPane',
    attribution: 'My Circle'
}).addTo(map).bindPopup("I am a circle.");

var truckAttributesLayer = L.tileLayer.xserver(
    'https://s0{s}-xserver2-europe-test.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}' +
    '?storedProfile={profile}&layers={layers}&contentType=JSON&xtok={token}', {
        profile: 'silkysand',
        layers: 'labels,PTV_TruckAttributes',
        token: window.token,
        subdomains: '1234',
        maxZoom: 22,
        pane: 'clickableTiles'
    }).addTo(map);
```

#### Using the JSON API
[Demo](https://ptv-logistics.github.io/xserverjs/boilerplate/Leaflet-Clickable.1.0-rs.html)

If you need more than the standard `rest` parameters, `L.TileLayer.XServer` can be initialized with a `requestExtension` property. This property then contains parameters which are sent using the JSON api.

```javascript
var map = L.map('map').setView(new L.LatLng(49.01405, 8.4044), 14);

var interactiveTileLayer = L.tileLayer.xserver(
    'https://s0{s}-xserver2-europe-test.cloud.ptvgroup.com/services/rs/XMap/renderMap',
    {
        requestExtension: {
            "storedProfile": "gravelpit",
            "requestProfile": {
                "featureLayerProfile": {
                    "themes": [{
                        "enabled": true,
                        "id": "PTV_TruckAttributes"
                    }]
                }
            },
            "resultFields": {
                "featureThemeIds": ["PTV_TruckAttributes"]
                }
        },
        username: 'xtok',
        password: window.token,
        subdomains: '1234',
        maxZoom: 22,
        pane: 'tilePane'
    }).addTo(map);
```
