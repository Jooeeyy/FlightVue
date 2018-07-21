let app = null;

/**
 * Einbindung einer externen Komponente
 */
Vue.component('v-select', VueSelect.VueSelect);

/**
 * Erstellung einer eigenen Komponente
 */
Vue.component('my-button', {
    props: ['label', 'click'],
    template: '<button @click="click()" type="button" class="action-button">{{label}}</button>',
});

/**
 * Erstellung der Anwendung
 * @type {*|Vue}
 */
app = new Vue({
    el: '#app',
    data: {
        // Text Von
        from: "Bitte auswählen",
        // Text Nach
        to: "Bitte auswählen",
        //Array der Flughafen
        airports: [],
        // Array der Flüge
        flights: [],
        //Map Object
        mapObject: null,
        // Ob ein Flughafen per Map ausgewählt werden kann
        chooseAirport: null, // null = keine Auswahl | from = Auswahl von | to = Auswahl bis
        // Ausgewählte Flüge
        choosenFlights: [],
        // Linie auf der Map nach ausgewählten Flügen
        flightLine: null
    },
    created: function () {
        // Funktion, die die Flüge lädt beim starten
        let params = {
            from: 25,
            to: 23
        };
        this.load('/route/find', params, this.successCallback);
        //Flughafen laden
        this.getAirports();
        //Map laden
        this.loadMap();
    },
    methods: {
        //Kommunikation mit der API
        load: function (action, data, callback) {
            let endpoint = "http://flights.eliashenrich.de/api.php";

            let url = endpoint + '?action=' + action;

            let keys = Object.keys(data);
            for (let i = 0; i < keys.length; i++) {
                let paramName = keys[i];
                let paramValue = data[keys[i]];

                url += "&" + paramName + "=" + paramValue;
            }

            this.$http.get(url).then(function (response) {
                if (response.status == "200") {
                    callback(response.data);
                }
            });
        },
        //Lädt Flüge
        showOverlay: function () {

            let element = document.getElementById('waitOverlayWrapper');
            element.style.display = "block";

            this.choosenFlights = [];
            this.updateLine();
            this.load("/route/find", {from: this.from.value, to: this.to.value}, this.successCallback);
            return false;



            return false;
        },
        // Fügt ein Flug-Liste-Item hinzu
        addListItem: function (airportFrom, fromName, fromPos, airportTo, toName, toPos, arrival, departure) {
            this.flights.push({
                "from": airportFrom,
                "to":  airportTo,
                "fromName": fromName,
                "toName": toName,
                "arrival": arrival,
                "departure": departure,
                "fromPos": fromPos,
                "toPos": toPos,
                "type": "flight"
            });
        },
        //Fügt einen neuen Router Unterteiler der Flugliste hinzu
        addNewRoute: function() {
            this.flights.push({
                "type": "divider"
            });
        },
        //Fügt einen neuen Step einer Route hinzu
        addFlightRoute: function(from, to) {
            this.flights.push({
                "type": "flightRoute",
                "from": from,
                "to": to
            })
        },
        //Wird nach erfolgreicher Suche ausgeführt
        successCallback: function (response) {
            if (response == "null") {
                alert("Es wurde keine mögliche Verbindung gefunden");
            } else {

                this.flights = [];
                for (let i = 0; i < response.length; i++) {
                    let flug = response[i];

                    this.addNewRoute();

                    console.log("Flug " + i);

                    for (let j = 0; j < flug.length; j++) {

                        let leg = flug[j];

                        console.log("Leg " + j, leg);

                        this.addFlightRoute(
                            leg.airportFrom.CodeIATA + " (" + leg.airportFrom.CityName + ")", leg.airportTo.CodeIATA + " (" + leg.airportTo.CityName + ")");

                        let airportFrom = leg.airportFrom.CityName;
                        let airportTo = leg.airportTo.CityName;
                        let airportFromName = leg.airportFrom.Name;
                        let airportToName = leg.airportTo.Name;
                        let posFrom = [leg.airportFrom.PositionLat, leg.airportFrom.PositionLon];
                        let posTo = [leg.airportTo.PositionLat, leg.airportTo.PositionLon];

                        if (leg.schedule.length > 0) {
                            for (let p = 0; p < leg.schedule.length; ++p) {
                                let sched = leg.schedule[p];
                                this.addListItem(airportFrom, airportFromName, posFrom, airportTo, airportToName, posTo, sched.ScheduledArrivalTime, sched.ScheduledDepartureTime);
                            }
                        }


                    }

                }
            }

            let element = document.getElementById('waitOverlayWrapper');
            element.style.display = "none";
        },
        // Auswahl eines Flughafens starten
        choose: function(e) {
            if (this.chooseAirport == e) {
                this.chooseAirport = null;
            } else {
                this.chooseAirport = e;
            }
        },
        // Alle Flughafen laden
        getAirports: function () {
            let self = this;
            this.load("/airports/all", {}, function (data) {
                let airports = [];

                for (let i = 0; i < data.data.length; ++i) {
                    let airport = data.data[i];
                    airports.push(self.createSelectObject(airport));

                    setTimeout(function() {
                        let marker = L.marker([airport.PositionLat, airport.PositionLon]);
                        marker.on("click", function(e) {
                            self.clickedOnMarker(airport);
                        });
                        marker.bindTooltip('<em>'+airport.Name+'</em>');
                        marker.addTo(self.mapObject);
                    }, 100)


                }

                airports.sort(function (a, b) {
                    return (a.label > b.label) ? 1 : ((b.label > a.label) ? -1 : 0);
                });
                self.airports = airports;


            });
        },
        // Wird bei einem Klick auf einen Marker ausgeführt
        clickedOnMarker: function(e) {
            if (this.chooseAirport != null) {
                if (this.chooseAirport == "from") {
                    this.from = this.createSelectObject(e);
                } else {
                    this.to = this.createSelectObject(e);
                }

                this.chooseAirport = null;
            }
        },
        // Lädt die Map
        loadMap: function() {
            let self = this;
            setTimeout(function() {

                const accessToken = 'pk.eyJ1IjoiZWxrcm9rZXR0byIsImEiOiJjamplZ2NqODQybG4wM3F0ZTU0N2s4azdxIn0.VL6YIZWFhnan5AWzxgIFpw';
                const url = "https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}";

                self.mapObject = L.map('mapid', {
                    center: [-10.0, -170.0],
                    zoom: 4
                });

                L.tileLayer(url, {
                    attribution: 'Copyright-Hinweise...',
                    maxZoom: 18,
                    id: 'mapbox.streets',
                    accessToken: accessToken
                }).addTo(self.mapObject);




            }, 0);
        },
        // Erstellt das Objekt für die Flüge
        createSelectObject: function(obj) {
            return {label: obj.Name, value: obj.Id}
        },
        // Fügt ein Flug zur aktiven Buchung hinzu
        addFlight: function(flight) {
            if (flight.type != "flight")
                return;

            if (this.isActiveFlight(flight)) {
                for(let i = 0; i < this.choosenFlights.length; ++i) {
                    if (JSON.stringify(this.choosenFlights[i]) == JSON.stringify(flight)) {
                        this.choosenFlights.splice(i, 1);
                    }
                }
            } else {
                this.choosenFlights.push(flight);
            }

            this.updateLine();
        },
        // Ist der Flug in der aktuellen Buchung?
        isActiveFlight: function(flight) {
            for(let i = 0; i < this.choosenFlights.length; ++i) {
                if (JSON.stringify(this.choosenFlights[i]) == JSON.stringify(flight)) {
                    return true;
                }
            }
            return false;
        },
        // Fluglinie auf der Map aktualisieren
        updateLine() {

            if (this.flightLine != null) {
                this.mapObject.removeLayer(this.flightLine);
            }

            let pointList = [];

            for(let i = 0; i < this.choosenFlights.length; ++i) {
                let flight = this.choosenFlights[i];
                pointList.push(new L.LatLng(flight.fromPos[0], flight.fromPos[1]));
                pointList.push(new L.LatLng(flight.toPos[0], flight.toPos[1]));
            }

            this.flightLine = new L.Polyline(pointList, {
                color: 'red',
                weight: 3,
                opacity: 0.5,
                smoothFactor: 1
            });
            this.flightLine.addTo(this.mapObject);
        },
        // Buchungsfunktion
        book: function() {
            alert('Buchung erfolgreich');
            this.choosenFlights = [];
            this.updateLine();
        }
    },
    template: `
<div class="wrapper">
<div class="headerBar">
    <form action="http://flights.eliashenrich.de/form.php" method="POST" class="text-center" v-on:submit.prevent="showOverlay()">
        von
        <div class="my-select text-center">
            <v-select v-model="from" :options="airports"></v-select>
        </div>
        nach
        <div class="my-select text-center">
            <v-select v-model="to" :options="airports"></v-select>
        </div>
        <input type="submit" value="Suchen" />
        <my-button label="Von wählen" :click="() => choose('from')"></my-button>
        <my-button label="Nach wählen" :click="() => choose('to')"></my-button>
    </form>
</div>
<div class="contentWrapper">
    <div class="contentLeft">
        <h1>
            Flugergebnisse
        </h1>

        <ul class="flightList" id="flightList">
            <li v-for="item in flights" v-bind:class="{ active: isActiveFlight(item) }" @click="addFlight(item)">
                <span v-if="item.type == 'flight'" >
                     <span class="flightFrom">{{item.from}}</span> -> <span class="flightTo">{{item.to}}</span>
                     <span class="timeDeparture">{{item.departure}}</span> <span class="timeArrival">{{item.arrival}}</span>
                </span>
                <span v-if="item.type == 'flightRoute'" class="flightRoute">
                    <b>{{item.from}}</b> nach
                     <b>{{item.to}}</b>
                </span>
                <span v-if="item.type == 'divider'" class="divider">
                    Neue Route
                </span>
             </li>
        
          
        </ul>

    </div>
    <div class="contentRight">
        <div id="mapid"></div>
    </div>
</div>
     <div id="chooseAirport" v-if="chooseAirport != null">
            <span v-if="chooseAirport == 'from'">
                Wähle den Abflugsflughafen
            </span>
            <span v-if="chooseAirport == 'to'">
                Wähle den Ankunftsflughafen
            </span>
            <a @click="chooseAirport = null" style="cursor:pointer"> x</a>
    </div>
    <div id="bookingFlight" v-if="choosenFlights.length > 0">
    <h1>Buchung</h1>
        <ul>
            <li v-for="item in choosenFlights">
                {{item.from}} ({{item.arrival}}) - {{item.to}} ({{item.departure}})
            </li>
        </ul>
        <div style="text-align:center; margin-top:20px;">
        <my-button label="Buchen" :click="() => book()"></my-button>
        </div>
    </div>
</div>`

});

