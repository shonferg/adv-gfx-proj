/**
 * Represents a sound file playable through WebAudio.
 * Based on Tutorial by Boris Smus at
 * https://www.html5rocks.com/en/tutorials/webaudio/intro/
 */
export class SoundBuffer {
    source: AudioBufferSourceNode;
    gainNode: GainNode;

    /**
     * Initializes a new sound buffer with an existing AudioBuffer
     * @param context A WebAudio context.
     * @param buffer A WebAudio buffer
     */
    constructor(public context: AudioContext, public buffer: AudioBuffer) {
        this.source = this.context.createBufferSource();
        this.gainNode = this.context.createGain();
        this.gainNode.gain.value = 0;
        
        this.source.buffer = this.buffer;
        this.source.connect(this.gainNode);
        this.gainNode.connect(this.context.destination); 
    }

    /**
     * Creates a new SoundBuffer from the given URL asyncronously
     * Based on an example from Mozilla Developer Network to use ES6 Promise with an XMLHttpRequest:
     * https://github.com/mdn/js-examples/blob/master/promises-test/index.html
     * @param context A WebAudio conext
     * @param url The URL of the sound file to load
     */
    static create(context: AudioContext, url: string): Promise<SoundBuffer> {
        // Create new promise with the Promise() constructor;
        // This has as its argument a function
        // with two parameters, resolve and reject
        return new Promise(function (resolve, reject) {
            // Standard XHR to load an image
            var request = new XMLHttpRequest();
            request.open('GET', url);
            request.responseType = 'arraybuffer';

            // When the request loads, check whether it was successful
            request.onload = function () {
                if (request.status === 200) {
                    // If successful, resolve the promise by passing back the request response
                    context.decodeAudioData(request.response, function(buffer) {
                        resolve(new SoundBuffer(context, buffer));
                    });
                } else {
                    // If it fails, reject the promise with a error message
                    reject(Error('Couldn\'t load sound from: ' + url + ' error code:' + request.statusText));
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
     * Starts playback of the sound.
     */
    play(): void {        
        this.source.start(0);
    }
    
    /**
     * Sets the volume of the sound.
     * @param value The volume to set between 0 and 1.
     */
    setGain(value: number): void {
        this.gainNode.gain.value = value * value;
    }
    
    /**
     * Sets whether the sound should loop or not.
     * @param value
     */
    setLoop(value: boolean): void {
        this.source.loop = value;
    }
}