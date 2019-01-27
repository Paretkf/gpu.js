const getContext = require('gl');
const WebGLKernel = require('../web-gl/kernel');
let isSupported = null;
let testCanvas = null;
let testContext = null;
let testExtensions = null;
let features = null;

class HeadlessGLKernel extends WebGLKernel {
	static get isSupported() {
		if (isSupported !== null) return isSupported;
		this.setupFeatureChecks();
		isSupported = testContext !== null;
		return isSupported;
	}

	static setupFeatureChecks() {
		testCanvas = null;
		testExtensions = null;
		if (typeof getContext !== 'function') return;
		testContext = getContext(2, 2, {
			preserveDrawingBuffer: true
		});
		testExtensions = {
			STACKGL_resize_drawingbuffer: testContext.getExtension('STACKGL_resize_drawingbuffer'),
			STACKGL_destroy_context: testContext.getExtension('STACKGL_destroy_context'),
			OES_texture_float: testContext.getExtension('OES_texture_float'),
			OES_texture_float_linear: testContext.getExtension('OES_texture_float_linear'),
			OES_element_index_uint: testContext.getExtension('OES_element_index_uint'),
		};
		features = this.getFeatures();
	}

	static isContextMatch(context) {
		try {
			return context.getParameter(context.RENDERER) === 'ANGLE';
		} catch (e) {
			return false;
		}
	}

	static getFeatures() {
		const isDrawBuffers = this.getIsDrawBuffers();
		return Object.freeze({
			isFloatRead: this.getIsFloatRead(),
			isIntegerDivisionAccurate: this.getIsIntegerDivisionAccurate(),
			getIsTextureFloat: true,
			isDrawBuffers,
			kernelMap: isDrawBuffers
		});
	}

	static getIsDrawBuffers() {
		return Boolean(testExtensions.WEBGL_draw_buffers);
	}

	static get testCanvas() {
		return testCanvas;
	}

	static get testContext() {
		return testContext;
	}

	static get features() {
		return features;
	}

	/**
	 * @desc Return the current mode in which gpu.js is executing.
	 * @returns {String} The current mode; "gpu".
	 */
	static getMode() {
		return 'gpu';
	}

	initCanvas() {
		return {};
	}

	initContext() {
		const context = getContext(2, 2, {
			preserveDrawingBuffer: true
		});
		return context;
	}

	initExtensions() {
		this.extensions = {
			STACKGL_resize_drawingbuffer: this.context.getExtension('STACKGL_resize_drawingbuffer'),
			STACKGL_destroy_context: this.context.getExtension('STACKGL_destroy_context'),
			OES_texture_float: this.context.getExtension('OES_texture_float'),
			OES_texture_float_linear: this.context.getExtension('OES_texture_float_linear'),
			OES_element_index_uint: this.context.getExtension('OES_element_index_uint'),
		};
	}

	destroyExtensions() {
		this.extensions.STACKGL_resize_drawingbuffer = null;
		this.extensions.STACKGL_destroy_context = null;
		this.extensions.OES_texture_float = null;
		this.extensions.OES_texture_float_linear = null;
		this.extensions.OES_element_index_uint = null;
	}

	static destroyContext(context) {
		const extension = context.getExtension('STACKGL_destroy_context');
		if (extension && extension.destroy) {
			extension.destroy();
		}
	}
}

module.exports = HeadlessGLKernel;