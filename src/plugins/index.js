"use strict";

let _resReqPlugins = [];
let _runAllByDefualt;
const add = callback => {
	_resReqPlugins.push(callback);
};

const get = name => {
	return _resReqPlugins;
};

module.exports = {
	add: add,
	get: get
};