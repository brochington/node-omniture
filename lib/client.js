var Client = function(username, sharedSecret, environment, options){
			this.init(username, sharedSecret, environment, options);
		};

var	crypto = require("crypto"),
		http = require("https"),
		p = Client.prototype;

p.init = function(username, sharedSecret, environment, options){
	this.environments = {
      sanJose: "api.omniture.com",
      dallas: "api2.omniture.com",
      london: "api3.omniture.com",
      sanJoseBeta: "beta-api.omniture.com",
      dallasBeta: "beta-api2.omniture.com",
      sandbox: "api-sbx1.omniture.com"
    }
	this.username = username;
	this.sharedSecret = sharedSecret;
	this.environment = (environment) ? this.environments[environment] : this.environments.sanJose;
	this.nonce = null;
	this.created = null;
	this.log = (options && options.log) ? options.log : false;
	this.path = "/admin/1.4/rest/"; // the version number should not be hardcoded.
}

p.logger = function(level, message) {
	if(this.log){
    var levels = ["error", "warn", "info"],
				debugLevel = "info";
    if (levels.indexOf(level) >= levels.indexOf(debugLevel) ) {
      if (typeof message !== "string") {
        message = JSON.stringify(message);
      };
      console.log(level+": "+message);
    }
	}
 }

p.request = function(method, parameters, callback){
	var self = this;
	response = this.sendRequest(method, parameters, function(err,data){
		self.logger("info", "API Request Completed");
		// try to parse the data as JSON, if not, return the string of data
		if(err){
			callback(err); 
		}else{
			try{
				var json = JSON.parse(data);
				if(json.error){
					callback(new Error(json.error));
				}else{
					callback(null,json);				
				}
			}catch(e){ // if the string was not json, we just need to return it
				callback(null,data);
			}
		}
	});
}

p.sendRequest = function(method, parameters, callback){
	this.generateNonce();
	var self = this,
			options = {
				host: this.environment,
				path: this.path+"?method="+method,
				headers: this.requestHeaders(),
				method: "POST",
				rejectUnauthorized: false,
				requestCert: false,
				agent: false
			}
  console.log('Omniture Request:', options.host + options.path, parameters);
	var request = http.request(options, function(response){
		self.logger("info","HTTP Request Successful");
		var responseData = "";
		// concatenate the response data as we get it
		response.on("data", function(chunk){
			responseData += chunk;
		});
		
			// fire the callback event once the request is completed
		response.on("end", function(e){
			self.logger("info", "API Request Finished");
      console.log('Omniture Response:', responseData);
			callback(null,responseData);
		});
	});
	// log the errors if the request failed
	request.on("error", function(e){
		callback(new Error(e.message));
	});
	// send the POST data we"re requesting
	request.write(JSON.stringify(parameters));
	// finally send the request
	request.end();
}

p.generateNonce = function(){
	// lets generate the strings we need for the header
	var date = new Date(),
		nonce = crypto.createHash("md5").update(randomString).digest("hex"),
		created = date.toISOString(),
		sha1String = crypto.createHash("sha1").update(nonce + created + this.sharedSecret).digest("hex");

	this.nonce = nonce;
	this.created = created;
	this.password = new Buffer(sha1String).toString("base64").replace(/\n/gi, "");

	this.logger('info', 'Generated Nonce: ' + nonce);
}

p.requestHeaders = function(){
	// set the header for the request
	this.headers = {
        "X-WSSE": "UsernameToken Username=\""+this.username+"\", "+
									"PasswordDigest=\""+this.password+"\", "+
									"Nonce=\""+this.nonce+"\", "+
									"Created=\""+this.created+"\""
      };
 return this.headers;
}

module.exports = Client;
