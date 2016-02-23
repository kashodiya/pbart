
var X2JS = require("x2js");
var stn = '';
var urlTemplate = "https://bart-kashodiya.c9users.io/api/etd?orig=";

var key = "ZQ4M-PB6M-9VJT-DWE9";
var bartApiUrl = "http://api.bart.gov/api/etd.aspx?cmd=etd&key=" + key + "&orig=";

Pebble.addEventListener('ready', function(e) {
  console.log('JavaScript app ready and running! Sending message...');

  stn = localStorage.getItem('stn');
  if (!stn) {
    stn = 'FRMT';
    console.log('Setting default stn:', stn);
  }else{
    console.log('Found stn from localStorage', stn);
  }
  sendMessageTest();
});

function sendMessageTest() {
  var transactionId = Pebble.sendAppMessage( { '0': 42, '1': 'String value' },
    function(e) {
      console.log('Successfully delivered message with transactionId='
        + e.data.transactionId);
    },
    function(e) {
      console.log('Unable to deliver message with transactionId='
        + e.data.transactionId
        + ' Error is: ' + JSON.stringify(e, null, 2));
    }
  );
}

var appKeys = {
  'KeyInit': "0",
  'KeyStn': "1",
  'KeyEtd': "2"
};

function xhrWrapper(url, type, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onload = function () {
    callback(xhr);
  };
  xhr.open(type, url);
  xhr.send();
};

function getEtd(stnAbbr) {
  var url = bartApiUrl + stnAbbr;
  console.log('Fetching URL:', url);

  xhrWrapper(url, 'GET', function(req) {
    console.log('Got API response!', req.response);
    if(req.status == 200) {

      var x2js = new X2JS();
      var jsonObj = x2js.xml_str2json( req.response );
      console.log('JSON Object=', JSON.stringify(jsonObj, null, 2));

      $ = cheerio.load(req.response);
      var dest = [];
      var orig = $('station name').text();
      var origAbbr = $('station abbr').text();
      $('etd').each(function(i, ele){
        var etd = $(this);
        var destination = etd.find('abbreviation').text();
        var minutes = etd.find('estimate minutes').first().text();
        if(minutes === "Leaving") minutes = "0";
        var length = etd.find('estimate length').first().text();
        dest.push({destination: destination, minutes: minutes, length: length});
      });

      var serverResponse = {dest: dest, orig: orig, origAbbr: origAbbr};
      console.log("Response:", JSON.stringify(serverResponse, null, 2));
      sendMessageToWatch(serverResponse);
    } else {
      console.log('owm-weather: Error fetching data (HTTP Status: ' + req.status + ')');
    }
  }.bind(this));
};

function getEtdOld(stnAbbr) {
  var url = urlTemplate + stnAbbr;
  console.log('Fetching URL:', url);

  xhrWrapper(url, 'GET', function(req) {
    console.log('Got API response!');
    if(req.status == 200) {
      var serverResponse = JSON.parse(req.response);
      console.log("Response:", JSON.stringify(serverResponse, null, 2));
      sendMessageToWatch(serverResponse);
    } else {
      console.log('owm-weather: Error fetching data (HTTP Status: ' + req.status + ')');
    }
  }.bind(this));
};

function sendMessageToWatch(serverResponse) {
  var etdStr = serverResponse.dest.reduce(function(p, d){
    return p + "\n" + d.destination + " " + d.minutes + "m " + d.length + "c";
  }, "\n" +serverResponse.orig + "\n===========");

  var key = appKeys.KeyEtd.toString();
  var key = appKeys.KeyEtd;
  console.log("Key for KeyEtd:", key);
  console.log("Value for KeyEtd = ", etdStr);

  var transactionId = Pebble.sendAppMessage( { "2": etdStr },
    function(e) {
      console.log('Successfully delivered message with transactionId='
        + e.data.transactionId);
    },
    function(e) {
      console.log('Unable to deliver message with transactionId='
        + e.data.transactionId
        + ' Error is: ' + JSON.stringify(e, null, 2));
    }
  );
}


Pebble.addEventListener('appmessage', function(e) {
  console.log('message received from watch: ', JSON.stringify(e, null, 2) );
  if (e.payload[appKeys['KeyStn']]) {
    stn = e.payload[appKeys['KeyStn']];
    console.log('Storing stn in localStorage', stn);
    localStorage.setItem('stn', stn);
    //fetchStockQuote(symbol, false);
    getEtd(stn);
  }
});
