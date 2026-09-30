/**
 * A map with one pin, described entirely by the query string:
 *
 *     ?lat=50.7359&lng=15.7399&zoom=13&title=Sněžka&layer=aerial&link=0
 *
 * `lat` and `lng` are required. `zoom` defaults to 13, `layer` to the map; `link=0` hides the link
 * to Google Maps. The layers come from layers.json, aerial imagery only where it covers the pin.
 */
(function (window, document) {
    'use strict';

    var L = window.L;

    function number(value) {
        var parsed = parseFloat(value);

        return isFinite(parsed) ? parsed : null;
    }

    function fail(message) {
        var element = document.getElementById('map');
        element.className = 'embed-message';
        element.textContent = message;
    }

    // The same pin as the Maps plugin draws, so the maps look alike wherever they are shown.
    function pin() {
        return L.divIcon({
            className: 'embed-pin',
            html: '<svg width="24" height="30" viewBox="0 0 24 30" xmlns="http://www.w3.org/2000/svg">'
                + '<path d="M12 0C7.16 0 3 4.56 3 10.08c0 6.48 9 19.92 9 19.92s9-13.44 9-19.92'
                + 'C21 4.56 16.84 0 12 0zm0 14.4c-1.8 0-3.24-1.44-3.24-3.24s1.44-3.24 3.24-3.24'
                + ' 3.24 1.44 3.24 3.24-1.44 3.24-3.24 3.24z" '
                + 'fill="#3388ff" stroke="rgba(0,0,0,0.5)" stroke-width="0.5"/></svg>',
            iconSize: [24, 30],
            iconAnchor: [12, 30],
            popupAnchor: [0, -30]
        });
    }

    function tileLayer(described) {
        return L.tileLayer(described.url, {
            attribution: described.attribution,
            maxZoom: described.maxZoom || 19,
            bounds: described.bounds
        });
    }

    function googleMapsLink(lat, lng) {
        var control = L.control({ position: 'bottomleft' });

        control.onAdd = function () {
            var container = L.DomUtil.create('div', 'embed-link');
            var link = L.DomUtil.create('a', '', container);
            link.href = 'https://www.google.com/maps/search/?api=1&query='
                + encodeURIComponent(lat + ',' + lng);
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = 'Open in Google Maps';
            L.DomEvent.disableClickPropagation(container);

            return container;
        };

        return control;
    }

    function build(layers) {
        var query = new URLSearchParams(window.location.search);
        var lat = number(query.get('lat'));
        var lng = number(query.get('lng'));

        if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            fail('Give the place as ?lat=…&lng=…');

            return;
        }

        var zoom = number(query.get('zoom'));
        var title = query.get('title');
        var here = L.latLng(lat, lng);
        var map = L.map('map', { scrollWheelZoom: false }).setView(here, zoom === null ? 13 : zoom);

        var base = tileLayer(layers.base);
        var switcher = {};
        switcher[layers.base.name] = base;

        var aerial = (layers.aerial || []).filter(function (one) {
            return !one.bounds || L.latLngBounds(one.bounds).contains(here);
        }).map(function (one, index) {
            var name = switcher[one.name] ? one.name + ' ' + (index + 1) : one.name;
            switcher[name] = tileLayer(one);

            return switcher[name];
        });

        var shown = query.get('layer') === 'aerial' && aerial.length ? aerial[0] : base;
        shown.addTo(map);

        if (aerial.length) {
            L.control.layers(switcher).addTo(map);
        }

        var marker = L.marker(here, { icon: pin(), title: title || '' }).addTo(map);
        if (title) {
            var content = document.createElement('div');
            content.textContent = title;
            marker.bindPopup(content);
        }

        if (query.get('link') !== '0') {
            googleMapsLink(lat, lng).addTo(map);
        }
    }

    fetch('layers.json')
        .then(function (response) {
            if (!response.ok) {
                throw new Error(response.statusText);
            }

            return response.json();
        })
        .then(build)
        .catch(function () {
            fail('The map could not be loaded.');
        });
})(window, document);
