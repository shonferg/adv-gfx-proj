/**
 * Reads a text file 
 * Based on an example from Mozilla Developer Network to use ES6 Promise with an XMLHttpRequest:
 * https://github.com/mdn/js-examples/blob/master/promises-test/index.html
 * @param url The URL of the text file to load
 */
import { ShaderSourceCode, ShaderProgram } from "./shaderPrograms/ShaderProgram";

export function getTextFile(url: string): Promise<string> {
    // Create new promise with the Promise() constructor;
    // This has as its argument a function
    // with two parameters, resolve and reject
    return new Promise(function (resolve, reject) {
        // Standard XHR to load an image
        var request = new XMLHttpRequest();
        request.open('GET', url + "?/rand=" + Math.round(Math.random() * 100000).toString());
        request.responseType = "text";

        // When the request loads, check whether it was successful
        request.onload = function () {
            if (request.status === 200) {
                // If successful, resolve the promise by passing back the request response
                resolve(request.response);
            } else {
                // If it fails, reject the promise with a error message
                reject(Error('File at ' + url + ' didn\'t load successfully; error code:' + request.statusText));
            }
        };

        request.onerror = function () {
            // Also deal with the case when the entire request fails to begin with
            // This is probably a network error, so reject the promise with an appropriate message
            reject(Error('There was a network error while trying to load: ' + url));
        };
        // Send the request
        request.send();
    });
}

/**
 * Reads a JSON file from the passed URL
 * Based on an example from Mozilla Developer Network to use ES6 Promise with an XMLHttpRequest:
 * https://github.com/mdn/js-examples/blob/master/promises-test/index.html
 * @param url The URL of the text file to load
 */
export function getJSONFile(url: string): Promise<any> {
    // Create new promise with the Promise() constructor;
    // This has as its argument a function
    // with two parameters, resolve and reject
    return new Promise(function (resolve, reject) {
        // Standard XHR to load an image
        var request = new XMLHttpRequest();
        request.open('GET', url + "?/rand=" + Math.round(Math.random() * 100000).toString());
        request.responseType = "json";
        request.overrideMimeType("application/json");

        // When the request loads, check whether it was successful
        request.onload = function () {
            if (request.status === 200) {
                // If successful, resolve the promise by passing back the request response
                resolve(request.response);
            } else {
                // If it fails, reject the promise with a error message
                reject(Error('File at ' + url + ' didn\'t load successfully; error code:' + request.statusText));
            }
        };

        request.onerror = function () {
            // Also deal with the case when the entire request fails to begin with
            // This is probably a network error, so reject the promise with an appropriate message
            reject(Error('There was a network error while trying to load: ' + url));
        };
        // Send the request
        request.send();
    });
}

/** Holds the names of shader file pairs to make it easier to request them together */
export class ShaderFileNames {
    /**
     * Creates a new ShaderFileNames object.
     * @param frag The fragment shader file name.
     * @param vert The vertex shader file name.
     */
    constructor(public frag: string, public vert: string) { }
}

/**
 * A helper function to request several shaders at the same time.  Will only resolve the promise when all shaders are loaded.
 * @param input An array of shader file name objects.
 * @return An equivalently sized list of resolved ShaderSourceCode objects with an array key matching the key in the original array.
 */
export function requestShaders(input: ShaderFileNames[]): Promise<ShaderSourceCode[]> {
    return new Promise(async function (resolve, reject) {
        let promises: Promise<ShaderSourceCode>[] = [];

        // Initiate all async actions
        for (let key in input) {
            let item: ShaderFileNames = input[key];
            promises[key] = ShaderProgram.fetchSource(item.frag, item.vert);
        }

        let results: ShaderSourceCode[] = [];

        // Await all results
        for (let key in promises) {
            let item: Promise<ShaderSourceCode> = promises[key];
            results[key] = await item;
        }

        resolve(results);
    });
}