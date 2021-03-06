// ==UserScript==
// @name         Private-box
// @description  Connect to private-box / other boxcritters servers
// @author       SArpnt
// @version      Alpha 3.2.5
// @namespace    https://boxcrittersmods.ga/authors/sarpnt/
// @homepage     https://boxcrittersmods.ga/projects/private-box/
// @updateURL    https://github.com/boxcrittersmods/private-box/raw/master/client.user.js
// @downloadURL  https://github.com/boxcrittersmods/private-box/raw/master/client.user.js
// @supportURL   https://github.com/boxcrittersmods/private-box/issues
// @run-at       document-start
// @grant        none
// @include      /^https:\/\/boxcritters\.com\/play\/(index\.html)?([\?#].*)?$/
// @require      https://github.com/SArpnt/joinFunction/raw/master/script.js
// @require      https://github.com/SArpnt/EventHandler/raw/master/script.js
// @require      https://github.com/SArpnt/cardboard/raw/master/script.user.js
// @require      https://unpkg.com/json5@^2.0.0/dist/index.min.js
// ==/UserScript==

(function () {
	'use strict';
	let modData = cardboard.register('privateBox');

	if (!window.location.search) {
		let search = sessionStorage.getItem('privateBox');
		if (search) {
			sessionStorage.removeItem('privateBox');
			window.location.search = search;
		}
		return;
	}

	const urlParams = new URLSearchParams(window.location.search);
	let url = {
		ip: urlParams.get("ip"),
	};
	if (!url.ip) return; // nothing needs to happen if not connecting to a server
	try {
		url.sendData = JSON5.parse(urlParams.get("sendData"));
	} catch (e) {
		url.sendData = e;
	}
	for (let i in url)
		modData[i] = url[i];

	modData.urlParse = u => u.replace('::ip::', url.ip);

	cardboard.on('loadScriptCreatejs', function (t) {
		t.innerHTML = t.innerHTML.replace(
			/var\s+i\s*=\s*d\.src/,
			`var i = d.ourl`
		).replace(
			/i\s*=\s*b\s*\+\s*i,/,
			``
		).replace(
			/f\s*=\s*document\.createElement\s*\(\s*['"`]img['"`]\s*\)\s*,\s*f\.src\s*=\s*g/,
			`f = document.createElement("img" ), f.src = cardboard.mods.privateBox.urlParse(g)`
		);
	});
	cardboard.on('runScriptCreatejs', function (t) {
		let o = createjs.LoadItem.create;
		createjs.LoadItem.create = function (u) {
			let li = o.call(this, u);
			li.ourl = li.src;
			li.src = modData.urlParse(li.src);
			return li;
		};
	});
	cardboard.on('loadScriptClient', function (t) {
		t.innerHTML = t.innerHTML.replace(
			/this\.code\s*\(\s*['"`]code['"`]\s*,\s*i\s*\)/,
			`this\.code("code", i, ...e)`
		).replace(
			/new\s*createjs\.LoadQueue\((?:([^\),]*),?)*\)/g,
			(...a) => {
				let x = a.slice(1, a.length - 2);
				return `new createjs.LoadQueue(${x[0]},${x[1]},true)`;
			}
		);
	});
	cardboard.on('runScriptClient', function () {
		convertToImgElement = function (t) {
			if ("string" == typeof t) {
				var e = document.createElement("img");
				return e.crossOrigin = "Anonymous",
					e.src = modData.urlParse(t),
					e;
			}
			return t;
		};
	});
	cardboard.on('loadScriptIndex', function (t) {
		t.innerHTML = t.innerHTML.replace(
			/world\.preload\s*\(([^)]*)\)/,
			/*(_, p) => {
				let preload = JSON5.parse(p);
				function editPreload(p) {
					if (/^https?:\/\/([^/]*)/.test(p.src))
						p.src = p.src.replace(
							/^https?:\/\/([^/]*)/,
							(_, domain) => {
								if (domain == 'media.boxcritters.com')
									return url.ip + '/data/media';
								else
									return url.ip + '/data';
							}
						);
					else
						p.src = url.ip + '/data/' + p.src;
				}
				if (Array.isArray(preload))
					for (let p of preload)
						editPreload(p);
				else
					editPreload(preload);
				return `world.preload(${JSON.stringify(preload)})`;
			}*/
			`{
				let PBxhttp = new XMLHttpRequest();
				PBxhttp.onreadystatechange = function() {
					if (this.readyState == 4 && this.status == 200) {
						let m = PBxhttp.response;
						if (typeof m == 'string')
							m = JSON.parse(m);
						console.debug("[PB]", "Manifest:", m)
						world.preload(m)
					}
				};
				PBxhttp.open("GET", ${JSON.stringify(modData.urlParse("::ip::/data/manifest.json"))}, true);
				PBxhttp.send();
			}`
		).replace(
			/world\.connect\s*\([^\)\n]*\)/,
			`world.connect(${JSON.stringify(url.ip)})`
		).replace(
			/world\.login\s*\(\s*sessionStorage\.getItem\s*\(\s*['"`]sessionTicket['"`]\s*\)\s*\)\s*[;\n]/,
			`world.login(Object.assign(
					{
						playerId: sessionStorage.getItem('playerId'),
						//sessionTicket: sessionStorage.getItem('sessionTicket'),
					},
					${JSON.stringify(url.sendData)}
				)
			);`
		).replace(
			/world\.joinRoom\s*\(\s*['"`]port['"`]\s*\)/,
			`world.joinLobby()`
		).replace(
			/window\.location\.href\s*=\s*['"`]\.\.\/index\.html['"`][;\n]/,
			`window.location.href = "../index.html";
			sessionStorage.setItem('privateBox', window.location.search);`
		);
	});
})();