// Initialize Firebase
var config = {
  apiKey: "AIzaSyB_D5oFfKNcWJRAKbtxeioCLs1VOnlh-uY",
  databaseURL: "https://pacmap-edce2.firebaseio.com",
  projectId: "pacmap-edce2",
};
firebase.initializeApp(config);

var pacMap = {
  init: function() {
    // variables setup
    var roomName = document.location.pathname.replace('/', '').slice(0,10);
    if (!roomName) {
      roomName = "rootPage";
    }
    this.room = roomName;
    this.ref = firebase.database().ref('rooms/' + this.room);
    this.uuid = this.getUuid();
    theMap.createMap()

    // Start watching user's position
    var bar = function(pos) { return this.watchCoords(pos) }.bind(this);
    navigator.geolocation.watchPosition(bar, function(e) { console.log(e) });

    // Listen for change to the database
    this.setupListeners();

    // Remove outdated entries from the base
    this.removeDeadEntries();
  },
  getUuid: function() {
    var existingId = window.localStorage.getItem('uuid');
    if (!existingId) {
      existingId = this.xorshift() + "-" + this.xorshift() + "-" + this.xorshift() + "-" + this.xorshift();
      window.localStorage.setItem('uuid', existingId);
    }
    return existingId;

  },
  watchCoords: function(pos) {
    this.ref.child(this.uuid).set({ coords: { lat: pos.coords.latitude, lng: pos.coords.longitude }, timestamp: +new Date()});
    theMap.setMarker(this.uuid, pos.coords.latitude, pos.coords.longitude);
  },
  xorshift: function() {
    x = Math.random() * 0x2545F4914F6CDD1D;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5; 
    return x.toString(36).slice(1);
  },
  setupListeners: function setupListeners() {
    this.ref.on('child_added', function(childSnapshot, prevChildKey) {
      // Add new user to local markers collection and show it on the map
      var newUserCoords = childSnapshot.val().coords,
          newUserId = childSnapshot.key;

      theMap.setMarker(newUserId, newUserCoords.lat, newUserCoords.lng);
    }).bind(this);

    this.ref.on('child_changed', function(childSnapshot, prevChildKey) {
      var newUserCoords = childSnapshot.val().coords,
          newUserId = childSnapshot.key;

      theMap.setMarker(newUserId, newUserCoords.lat, newUserCoords.lng);
    }).bind(this);

    this.ref.on('child_removed', function(childSnapshot, prevChildKey) {
      theMap.deleteMarker(childSnapshot.key);
    });
  },
  removeEntry: function(id) {
    this.ref.child(id).remove();
  },
  removeDeadEntries: function() {
    var findTimedoutClients = function() {
      this.ref
        .limitToFirst(50)
        .once('value')
        .then(function(snapshots) {
          // remove each snapshot that have not been active since more than 
          // 30 minutes
          var now = +Date.now();
          snapshots.forEach(function(childSnapshot) {
            var timestamp = Number(childSnapshot.val().timestamp);
            if (((now - timestamp)) > (30 * 60 * 1000)) { 
              pacMap.removeEntry.call(this, childSnapshot.key);
            }
          }.bind(this));
        }.bind(this));
    }.bind(this);

    // Execute once at start-up
    findTimedoutClients();

    setInterval(findTimedoutClients, 30 * 60 * 1000)
  }
}

var theMap = {
  createMap: function() {
    this.map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: 0, lng: 0},
      zoom: 3
      })
    this.markers = {};
  },
  setMarker: function(id, lat, lng) {
    var marker;
    if (!this.markers[id]) {
      marker = new google.maps.Marker();
      this.markers[id] = marker;
    }
    marker = this.markers[id];
    marker.setPosition({lat: lat, lng: lng});
    marker.setMap(this.map);
  },
  deleteMarker: function(id) {
      var marker = this.markers[id];
      marker.setMap(null);
      delete this.markers[id];

  }
}

function initMap() {
  console.log("Freely inspired from \nhttps://developers.google.com/maps/documentation/javascript/firebase?hl=en\nhttps://moquet.net/blog/realtime-geolocation-tracking-firebase/");
  console.log("Special thanks to Matt for the fantastic article, if you come by here, I also live in Paris, why not having a coffee ?")
  var themap = Object.create(pacMap);
  themap.init();
}
