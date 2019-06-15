function Loader(container) {
	this.container = container;
    this.scenes = {};
	this.current = "";
	this.loadhistory = [];
	this.styles = {};
	this.events = [];
	this.intervals = [];
	this.global = {};
	this.allowRequests = false;
	this.console = {};
}

Loader.prototype.init = function (func) {
	this.addStyle({
		"!.selection-container": {
			"text-align": "center"
		},
		"!.option": {
			"cursor": "pointer",
			"display": "inline-block",
			"width": "max-content"
		},
		"!#console-container": {
			"overflow-y": "auto",
			"height": "60%",
			"border": "1px solid #d3d3d3",
			"padding": "1.25em"
		},
		"!.console-sign": {
			"color": "darkcyan",
			"font-weight": "700",
			"cursor": "default"
		},
		"!.console-edit": {
			"display": "inline-block",
			"width": "90%",
			"margin-left": "0.5em"
		},
		"!.console-edit:focus": {
			"outline": "none"
		}
	});

	let style = '<style uid="loader-styles">';
	for (let i in this.styles) {
		identifier = i;
		if(i[0] == "!") {
			identifier = i[1] == "#" ? "[uid~=" : i[1] == "." ? "[uclass~=" : i[1];
			identifier += i.split(":")[0].substr(2) + "]";
			if(i.split(":")[1]) {
				identifier += ":" + i.split(":")[1];
			}
		}

		style += identifier + ' {\n';
		for (let j in this.styles[i]) {
			style += "\t" + j + ': ' + this.styles[i][j] + ';\n';
		}
		style += '}\n';
	}
	style += '</style>';
	this.addHTML(style);
	
	if(this.allowRequests) {
		let frame = document.createElement("iframe");
		frame.setAttribute('id','request-frame');
		frame.style.display="none";
		frame.sandbox="allow-same-origin";
		document.body.appendChild(frame);
	}

	Object.defineProperties(this.scenes, {
		".index": {
			enumerable: false,
			value: function() {
				this.addHTML("<h1 uclass='heading'>Index</h1>");
				this.createSelection(Object.getOwnPropertyNames(this.scenes)).publish();
			}
		},
		'.console': {
			enumerable: false,
			value: function() {
				this.addHTML("<h1 uclass='heading'>Console</h1><div uid='console-container'></div>");
				var container = this.findElement("!#console-container");
				var variables = this.global;
				var tis = this;
				var history = [""];
				var current = 0;

				function addLine(editable,text) {
					var line = document.createElement('div');
					var sign,edit;

					if(editable) {
					    sign = document.createElement('span');
					    sign.innerHTML = ">&nbsp";
    					sign.setAttribute("uclass", "console-sign")
	    				line.appendChild(sign)
		    			line.setAttribute("uclass", "console-line");

						edit = document.createElement('div');
						edit.contentEditable = true;
						edit.setAttribute("uclass", "console-edit");

						edit.addEventListener("keydown", function(e) {
							if(e.keyCode == 13) {
								e.preventDefault();
								if(edit.innerText != "") {
								    history.push(edit.innerText);
								    edit.contentEditable = false;
								    addLine(false, compute(edit.innerText))
								    addLine(true);
								}
							}
							if(e.keyCode == 38 && current < history.length-1) {
								current++;
								edit.innerHTML = history[current];
							}
							if(e.keyCode == 40 && current > 0) {
								current--;
								edit.innerHTML = history[current];
							}
						});

						line.appendChild(edit);
					}
					else {
						line.innerHTML = text;
					}
					container.appendChild(line);
					edit && edit.focus();
				}

				function compute(code) {
					var result = "";
					var here = tis;
					var commands = {
						print: function(...text) {
							return text.join(" ");
						},
						alias: function(name,value) {
							if(name in commands) {
								return new Error("Unexpected " + name);
							}
							variables[name] = value;
							return value;
						},
						open: function(name) {
							if(name in this.scenes) {
							    this.loadscene(name);
							    return name;
							}
							else {
								return "Error: scene " + name + " is not defined";
							}
						},
						clear: function() {
							var container = this.findElement("!#console-container");
							while(container.children.length > 0) {
								container.removeChild(container.firstChild);
							}
							return "";
						},
						global: function() {
							return displayObj(this);
						},
						help: function() {
							return displayObj(commands);
						}
					};

					function displayObj(obj, tabs=0) {
						//Complete tabs
						let objstr = "";
						let value = "";
						var tabstr = "";
						for(var t = 0; t < tabs; t++) {
							tabstr += "&nbsp;&nbsp;&nbsp;&nbsp;";
						}

						for(let i in obj) {
							if(objstr != "") {
								objstr += "<br>";
							}
							value = obj[i];
							if(typeof obj[i] == "function") {
								value = "f ()";
							}
							if(obj[i] instanceof Array) {
								value = "[" + obj[i].join() + "]";
							}
							
							if(Object.prototype.toString.call(obj[i]) == "[object Object]") {
								value = "<br>" + displayObj(obj[i], tabs+1);
							}

							objstr += tabstr + i + ": " + value;
							//console.log(objstr)
						}

						return objstr;
					}

					var words = code.split(" ");

					try {
						if(words[0] in variables) {
							result = variables[words[0]];
						}
						else if(words[0] in commands) {
					        result = commands[words[0]].apply(tis,words.slice(1));
						}
						else {
							result = words[0] + " is not defined"
						}
					}
					catch(e) {
						result = e.message;
					}

					return result;
				}

				addLine(true);
			}
		}
	});

	this.container.addEventListener('keydown', function(e) {
		if(e.ctrlKey && e.keyCode == 73) {
			if(this.current == ".console") {
				e.preventDefault();
				this.loadscene(this.loadhistory.pop());
			}
			else {
			    e.preventDefault();
			    this.loadscene('.console');
			}
		}
	}.bind(this));

	func.call(this);
};

Loader.prototype.append = function (name,func) {
	this.scenes[name] = func;
};

Loader.prototype.loadscene = function (name,...args) {
	let style=this.findElement("!#loader-styles");
	while (this.container.firstChild) {
		this.container.removeChild(this.container.firstChild);
	}
	this.container.appendChild(style);

	while (this.events.length || this.intervals.length) {
		if(this.events.length) this.removeEventListener(this.events[0][0], this.events[0][1])
		if(this.intervals.length) this.removeInterval(0);
	}
	
	if(typeof name == "string" && name in this.scenes) {
		this.current != "" && this.loadhistory.push(this.current);
		this.current = name;
		this.scenes[name].call(this,args);
	}
	else {
		(function() {
			this.addHTML('<h1>404 Error Not Found</h1><span>Press a key to proceed</span>');
			this.current = "error";
			this.addEventListener('keydown', function() {
				this.loadscene(".index");
			}.bind(this));
		}).call(this);
	}
};

Loader.prototype.set = function (obj) {
	for (let i in obj) {
		this.append(i,obj[i]);
	}
};

Loader.prototype.addStyle = function(style) {
	for(let i in style) {
		this.styles[i] = style[i]
	}
}

Loader.prototype.addHTML = function (html) {
	this.container.innerHTML += html;
};

Loader.prototype.findElement = function(selector, all) {
	if(selector[0] == '!') {
		let symbol = selector[1];
		let name = selector.slice(2);
		let identifier = symbol == '#' ? "[uid=" : symbol == '.' ? "[uclass=" : selector;
		selector = identifier + name + "]";
	}
	
	if(all) {
		return this.container.querySelectorAll(selector);
	}
	else {
		return this.container.querySelector(selector);
	}
};

Loader.prototype.addEventListener = function (type, func) {
	this.events.push([type, func]);
	this.container.addEventListener(type, func);
};

Loader.prototype.removeEventListener = function (type, func) {
	this.events.forEach(function (event, i) {
		if (event[0] == type && event[1] == func) {
			this.container.removeEventListener(type, func)
			this.events.splice(i, 1);
		};
	}.bind(this));
};

Loader.prototype.addInterval = function (func,interval) {
	this.intervals.push(setInterval(func,interval));
};

Loader.prototype.removeInterval = function(i) {
	clearInterval(this.intervals[i]);
	this.intervals.splice(i,1);
}

Loader.prototype.reload = function(hard) {
	if(hard) {
		for(let i in this.global) {
			delete this.global[i];
		}
		this.loadscene(0);
	}
	else {
		this.loadscene(this.current);
	}
}

/*Loader.prototype.request = function(src) {
	if(this.allowRequests) {
		let frame = document.getElementById('request-frame');
		frame.src=src;
		//return frame.innerHTML;
		console.log(frame.innerHTML)
	}
}*/

Loader.prototype.createSelection = function(options) {
	var container = document.createElement('div');
	container.setAttribute("uclass","selection-container");
	var tis = this;
	
	var selection = {
		options: [],
		selected: -1,
		elements: {
			container: container,
			options: []
		},
		append(name, destination=name) {
			var namex = name;
			//console.log(namex);
			let optionobj = {};
			optionobj["name"] = name;
			optionobj["destination"] = destination.split("[")[0];
			optionobj["arguments"] = destination.indexOf("[") !== -1 && destination.substr(destination.indexOf("["));

			var element = document.createElement('span');
			element.setAttribute("uclass","option");
			element.innerHTML = optionobj.name;
			element.addEventListener("click",function(e) {
		    	tis.loadscene(optionobj.destination, optionobj.arguments);
			}.bind(this));
			element.addEventListener('mouseover',function(e) {
				element.setAttribute("uclass", "option selected");
				this.selected = this.options.indexOf(optionobj);
			}.bind(this));
			element.addEventListener('mouseleave',function(e) {
				element.setAttribute("uclass", "option");
				this.selected = -1;
			})
			
			this.elements.options.push(element);
			optionobj["element"] = element;
			this.options.push(optionobj);
		},
		publish(parent) {
			if(!parent) {
				parent = tis.container;
			}
			var selectionElement = this.elements.container;
			var br;

			this.elements.options.forEach(function(option) {
				br = document.createElement("br");
				selectionElement.appendChild(option);
				selectionElement.appendChild(br);
			});
			
			parent.appendChild(selectionElement);
		}
	};
	options.forEach(function(option) {
		option.indexOf(",") !== -1 ? selection.append(option.substr(0,option.indexOf(",")),option.substr(option.indexOf(",")+1)) : selection.append(option);
	});
	
	return selection;
};