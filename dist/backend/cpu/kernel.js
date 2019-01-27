'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Kernel = require('../kernel');
var FunctionBuilder = require('../function-builder');
var CPUFunctionNode = require('./function-node');
var utils = require('../../utils');
var kernelString = require('./kernel-string');

/**
 * @desc Kernel Implementation for CPU.
 *
 * <p>Instantiates properties to the CPU Kernel.</p>
 *
 * @prop {Object} thread - The thread dimensions, x, y and z
 * @prop {Object} output - The canvas dimensions
 * @prop {Function} run - Method to run the kernel
 *
 */

var CPUKernel = function (_Kernel) {
	_inherits(CPUKernel, _Kernel);

	_createClass(CPUKernel, null, [{
		key: 'getFeatures',
		value: function getFeatures() {
			return this.features;
		}
	}, {
		key: 'isContextMatch',
		value: function isContextMatch(context) {
			return false;
		}
		/**
   * @name getMode()
   * @desc Return the current mode in which gpu.js is executing.
   * @returns {String} The current mode; "cpu".
   */

	}, {
		key: 'getMode',
		value: function getMode() {
			return 'cpu';
		}
	}, {
		key: 'features',
		get: function get() {
			return Object.freeze({
				kernelMap: true,
				isIntegerDivisionAccurate: true
			});
		}
	}, {
		key: 'isSupported',
		get: function get() {
			return true;
		}
	}]);

	function CPUKernel(fnString, settings) {
		_classCallCheck(this, CPUKernel);

		var _this = _possibleConstructorReturn(this, (CPUKernel.__proto__ || Object.getPrototypeOf(CPUKernel)).call(this, fnString, settings));

		_this._imageData = null;
		_this._colorData = null;
		_this._kernelString = null;
		_this.thread = {
			x: 0,
			y: 0,
			z: 0
		};

		_this.run = function () {
			//note: need arguments
			this.run = null;
			this.build.apply(this, arguments);
			return this.run.apply(this, arguments);
		}.bind(_this);
		return _this;
	}

	_createClass(CPUKernel, [{
		key: 'initCanvas',
		value: function initCanvas() {
			if (typeof document !== 'undefined') {
				return document.createElement('canvas');
			} else if (typeof OffscreenCanvas !== 'undefined') {
				return new OffscreenCanvas(0, 0);
			}
		}
	}, {
		key: 'initContext',
		value: function initContext() {
			if (!this.canvas) return null;
			return this.canvas.getContext('2d');
		}

		/**
   * @desc Validate settings related to CPU Kernel, such as
   * dimensions size, and auto dimension support.
   */

	}, {
		key: 'validateSettings',
		value: function validateSettings() {
			if (!this.output || this.output.length === 0) {
				if (arguments.length !== 1) {
					throw 'Auto dimensions only supported for kernels with only one input';
				}

				var argType = utils.getVariableType(arguments[0]);
				if (argType === 'Array') {
					this.output = utils.getDimensions(argType);
				} else if (argType === 'NumberTexture' || argType === 'ArrayTexture(4)') {
					this.output = arguments[0].output;
				} else {
					throw 'Auto dimensions not supported for input type: ' + argType;
				}
			}

			this.checkOutput();
		}

		/**
   * @desc Builds the Kernel, by generating the kernel
   * string using thread dimensions, and arguments
   * supplied to the kernel.
   *
   * <p>If the graphical flag is enabled, canvas is used.</p>
   */

	}, {
		key: 'build',
		value: function build() {
			this.setupConstants();
			this.setupArguments(arguments);
			this.validateSettings();
			var threadDim = this.threadDim = utils.clone(this.output);

			while (threadDim.length < 3) {
				threadDim.push(1);
			}

			if (this.graphical) {
				var canvas = this.canvas;
				if (!canvas) {
					throw new Error('no canvas available for using graphical output');
				}
				canvas.width = threadDim[0];
				canvas.height = threadDim[1];
				this._imageData = this.context.createImageData(threadDim[0], threadDim[1]);
				this._colorData = new Uint8ClampedArray(threadDim[0] * threadDim[1] * 4);
			}

			var kernelString = this.getKernelString();
			this.kernelString = kernelString;

			try {
				this.run = new Function([], kernelString).bind(this)();
			} catch (e) {
				console.error('An error occurred compiling the javascript: ', e);
			}

			if (this.debug) {
				console.log('Function output:');
				console.log(kernelString);
			}
		}
	}, {
		key: 'color',
		value: function color(r, g, b, a) {
			if (typeof a === 'undefined') {
				a = 1;
			}

			r = Math.floor(r * 255);
			g = Math.floor(g * 255);
			b = Math.floor(b * 255);
			a = Math.floor(a * 255);

			var width = this.output[0];
			var height = this.output[1];

			var x = this.thread.x;
			var y = height - this.thread.y - 1;

			var index = x + y * width;

			this._colorData[index * 4 + 0] = r;
			this._colorData[index * 4 + 1] = g;
			this._colorData[index * 4 + 2] = b;
			this._colorData[index * 4 + 3] = a;
		}

		/**
   * @desc Generates kernel string for this kernel program.
   *
   * <p>If sub-kernels are supplied, they are also factored in.
   * This string can be saved by calling the `toString` method
   * and then can be reused later.</p>
   *
   * @returns {String} result
   *
   */

	}, {
		key: 'getKernelString',
		value: function getKernelString() {
			if (this._kernelString !== null) return this._kernelString;

			// Thread dim fix (to make compilable)
			var threadDim = this.threadDim || (this.threadDim = utils.clone(this.output));
			while (threadDim.length < 3) {
				threadDim.push(1);
			}

			var functionBuilder = FunctionBuilder.fromKernel(this, CPUFunctionNode);

			var prototypes = functionBuilder.getPrototypes('kernel');
			var kernel = null;
			if (prototypes.length > 1) {
				prototypes = prototypes.filter(function (fn) {
					if (/^function/.test(fn)) return fn;
					kernel = fn;
					return false;
				});
			} else {
				kernel = prototypes.shift();
			}
			var kernelString = this._kernelString = '\n\t\tconst LOOP_MAX = ' + this._getLoopMaxString() + '\n\t\tconst constants = this.constants;\n\t\tconst _this = this;\n    return function (' + this.argumentNames.map(function (argumentName) {
				return 'user_' + argumentName;
			}).join(', ') + ') {\n      ' + this._processConstants() + '\n      ' + this._processArguments() + '\n      ' + this._kernelLoop(kernel) + '\n      if (this.graphical) {\n        this._imageData.data.set(this._colorData);\n        this.context.putImageData(this._imageData, 0, 0);\n        return;\n      }\n      ' + this._kernelOutput() + '\n      ' + (prototypes.length > 0 ? prototypes.join('\n') : '') + '\n    }.bind(this);';
			return kernelString;
		}

		/**
   * @desc Returns the *pre-compiled* Kernel as a JS Object String, that can be reused.
   */

	}, {
		key: 'toString',
		value: function toString() {
			return kernelString(this);
		}

		/**
   * @desc Get the maximum loop size String.
   * @returns {String} result
   */

	}, {
		key: '_getLoopMaxString',
		value: function _getLoopMaxString() {
			return this.loopMaxIterations ? ' ' + parseInt(this.loopMaxIterations) + ';\n' : ' 1000;\n';
		}
	}, {
		key: '_processConstants',
		value: function _processConstants() {
			if (!this.constants) return '';

			var result = [];
			for (var p in this.constants) {
				var type = this.constantTypes[p];
				switch (type) {
					case 'HTMLImage':
						result.push('  const constants_' + p + ' = this._imageTo2DArray(this.constants.' + p + ')');
						break;
					case 'HTMLImageArray':
						result.push('  const constants_' + p + ' = this._imageTo3DArray(this.constants.' + p + ')');
						break;
					case 'Input':
						result.push('  const constants_' + p + ' = this.constants.' + p + '.value');
						break;
					default:
						result.push('  const constants_' + p + ' = this.constants.' + p);
				}
			}
			return result.join('\n');
		}
	}, {
		key: '_processArguments',
		value: function _processArguments() {
			var result = [];
			for (var i = 0; i < this.argumentTypes.length; i++) {
				switch (this.argumentTypes[i]) {
					case 'HTMLImage':
						result.push('  user_' + this.argumentNames[i] + ' = this._imageTo2DArray(user_' + this.argumentNames[i] + ')');
						break;
					case 'HTMLImageArray':
						result.push('  user_' + this.argumentNames[i] + ' = this._imageTo3DArray(user_' + this.argumentNames[i] + ')');
						break;
					case 'Input':
						result.push('  user_' + this.argumentNames[i] + ' = user_' + this.argumentNames[i] + '.value');
						break;
				}
			}
			return result.join(';\n');
		}
	}, {
		key: '_imageTo2DArray',
		value: function _imageTo2DArray(image) {
			var canvas = this.canvas;
			if (canvas.width < image.width) {
				canvas.width = image.width;
			}
			if (canvas.height < image.height) {
				canvas.height = image.height;
			}
			var ctx = this.context;
			ctx.drawImage(image, 0, 0, image.width, image.height);
			var pixelsData = ctx.getImageData(0, 0, image.width, image.height).data;
			var imageArray = new Array(image.height);
			var index = 0;
			for (var y = image.height - 1; y >= 0; y--) {
				imageArray[y] = new Array(image.width);
				for (var x = 0; x < image.width; x++) {
					var r = pixelsData[index++] / 255;
					var g = pixelsData[index++] / 255;
					var b = pixelsData[index++] / 255;
					var a = pixelsData[index++] / 255;
					var result = [r, g, b, a];
					result.r = r;
					result.g = g;
					result.b = b;
					result.a = a;
					imageArray[y][x] = result;
				}
			}
			return imageArray;
		}
	}, {
		key: '_imageTo3DArray',
		value: function _imageTo3DArray(images) {
			var imagesArray = new Array(images.length);
			for (var i = 0; i < images.length; i++) {
				imagesArray[i] = this._imageTo2DArray(images[i]);
			}
			return imagesArray;
		}
	}, {
		key: '_kernelLoop',
		value: function _kernelLoop(kernelString) {
			switch (this.output.length) {
				case 1:
					return this._kernel1DLoop(kernelString);
				case 2:
					return this._kernel2DLoop(kernelString);
				case 3:
					return this._kernel3DLoop(kernelString);
				default:
					throw new Error('unsupported size kernel');
			}
		}
	}, {
		key: '_kernel1DLoop',
		value: function _kernel1DLoop(kernelString) {
			var threadDim = this.threadDim;
			return 'const result = new Float32Array(' + threadDim[0] + ');\n    ' + this._mapSubKernels(function (subKernel) {
				return 'let subKernelResult_' + subKernel.name + ';';
			}).join('\n') + '\n\t\t' + this._mapSubKernels(function (subKernel) {
				return 'const result_' + subKernel.name + ' = new Float32Array(' + threadDim[0] + ');\n';
			}).join('') + '\n    for (let x = 0; x < ' + threadDim[0] + '; x++) {\n      this.thread.x = x;\n      this.thread.y = 0;\n      this.thread.z = 0;\n      let kernelResult;\n      ' + kernelString + '\n      result[x] = kernelResult;\n      ' + this._mapSubKernels(function (subKernel) {
				return 'result_' + subKernel.name + '[x] = subKernelResult_' + subKernel.name + ';\n';
			}).join('') + '\n    }';
		}
	}, {
		key: '_kernel2DLoop',
		value: function _kernel2DLoop(kernelString) {
			var threadDim = this.threadDim;
			return 'const result = new Array(' + threadDim[1] + ');\n    ' + this._mapSubKernels(function (subKernel) {
				return 'let subKernelResult_' + subKernel.name + ';';
			}).join('\n') + '\n    ' + this._mapSubKernels(function (subKernel) {
				return 'const result_' + subKernel.name + ' = new Array(' + threadDim[1] + ');\n';
			}).join('') + '\n    for (let y = 0; y < ' + threadDim[1] + '; y++) {\n      this.thread.z = 0;\n      this.thread.y = y;\n      const resultX = result[y] = new Float32Array(' + threadDim[0] + ');\n      ' + this._mapSubKernels(function (subKernel) {
				return 'const result_' + subKernel.name + 'X = result_' + subKernel.name + '[y] = new Float32Array(' + threadDim[0] + ');\n';
			}).join('') + '\n      for (let x = 0; x < ' + threadDim[0] + '; x++) {\n      \tthis.thread.x = x;\n        let kernelResult;\n        ' + kernelString + '\n        resultX[x] = kernelResult;\n        ' + this._mapSubKernels(function (subKernel) {
				return 'result_' + subKernel.name + 'X[x] = subKernelResult_' + subKernel.name + ';\n';
			}).join('') + '\n      }\n    }';
		}
	}, {
		key: '_kernel3DLoop',
		value: function _kernel3DLoop(kernelString) {
			var threadDim = this.threadDim;
			return 'const result = new Array(' + threadDim[2] + ');\n    ' + this._mapSubKernels(function (subKernel) {
				return 'let subKernelResult_' + subKernel.name + ';';
			}).join('\n') + '\n    ' + this._mapSubKernels(function (subKernel) {
				return 'const result_' + subKernel.name + ' = new Array(' + threadDim[2] + ');\n';
			}).join('') + '\n    for (let z = 0; z < ' + threadDim[2] + '; z++) {\n      this.thread.z = z;\n      const resultY = result[z] = new Array(' + threadDim[1] + ');\n      ' + this._mapSubKernels(function (subKernel) {
				return 'const result_' + subKernel.name + 'Y = result_' + subKernel.name + '[z] = new Array(' + threadDim[1] + ');\n';
			}).join('') + '\n      for (let y = 0; y < ' + threadDim[1] + '; y++) {\n        this.thread.y = y;\n        const resultX = resultY[y] = new Float32Array(' + threadDim[0] + ');\n        ' + this._mapSubKernels(function (subKernel) {
				return 'const result_' + subKernel.name + 'X = result_' + subKernel.name + 'Y[y] = new Float32Array(' + threadDim[0] + ');\n';
			}).join('') + '\n        for (let x = 0; x < ' + threadDim[0] + '; x++) {\n        \tthis.thread.x = x;\n          let kernelResult;\n          ' + kernelString + '\n          resultX[x] = kernelResult;\n          ' + this._mapSubKernels(function (subKernel) {
				return 'result_' + subKernel.name + 'X[x] = subKernelResult_' + subKernel.name + ';\n';
			}).join('') + '\n        }\n      }\n    }';
		}
	}, {
		key: '_kernelOutput',
		value: function _kernelOutput() {
			if (!this.subKernels) {
				return 'return result;';
			}
			return 'return {\n      result: result,\n      ' + this.subKernels.map(function (subKernel) {
				return subKernel.property + ': result_' + subKernel.name;
			}).join(',\n') + '\n    };';
		}
	}, {
		key: '_mapSubKernels',
		value: function _mapSubKernels(fn) {
			return this.subKernels === null ? [''] : this.subKernels.map(fn);
		}
	}, {
		key: 'destroy',
		value: function destroy(removeCanvasReference) {
			if (removeCanvasReference) {
				delete this.canvas;
			}
		}
	}], [{
		key: 'destroyContext',
		value: function destroyContext(context) {}
	}]);

	return CPUKernel;
}(Kernel);

module.exports = CPUKernel;