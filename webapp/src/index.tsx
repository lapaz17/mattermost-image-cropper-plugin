import {Store, Action} from 'redux';

import {GlobalState} from 'mattermost-redux/types/store';

import manifest from './manifest';
/* eslint-disable no-param-reassign, import/no-unresolved, @typescript-eslint/no-empty-function*/

import {PluginRegistry} from './types/mattermost-webapp';
import ImageUploadModal from './components/image_upload_modal';
import {UPLOAD_IMAGE} from './action_types';
import imageUploadModalVisible from './reducer';

let image: any;
let uploadAfterUserDecision : any;

export default class Plugin {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
    public async initialize(registry: PluginRegistry, store: Store<GlobalState, Action<Record<string, unknown>>>) {
        // @see https://developers.mattermost.com/extend/plugins/webapp/reference/
        registry.registerFilesWillUploadHook((files, upload) => {
            uploadAfterUserDecision = upload;

            if (files.length === 1 && (files[0].type === 'image/jpeg' || files[0].type === 'image/png')) {
                image = new Blob([files[0]], {type: files[0].type});
                image.name = files[0].name;
                files = null;
                const urlCreator = window.URL || window.webkitURL;
                const imageURL = urlCreator.createObjectURL(image);
                const windowWidth = window.screen.width;
                const windowHeight = window.screen.height;

                //@ts-ignore
                store.dispatch({type: UPLOAD_IMAGE, imgURL: imageURL, aspectRatio: windowWidth / windowHeight, show: true});
            }
            return {
                message: '',
                files,
            };
        });

        registry.registerRootComponent(ImageUploadModal);

        //@ts-ignore
        registry.registerReducer(imageUploadModalVisible);
    }
}

declare global {
    interface Window {
        registerPlugin(id: string, plugin: Plugin): void;
        plugins: any;
    }
}

//For passing tests I added this, https://stackoverflow.com/questions/60024540/i-ran-the-tests-i-wrote-using-jest-i-received-an-unexpected-error-typeerror
Window.prototype.registerPlugin = (id: string, plugin: Plugin): void => {

};
async function cropImageAccordingToUsersChoice(shouldCrop: boolean, imageUploadCroppedAreaPixels : {[startPointsAndDimensions: string]: number}) {
    let newFile: any;

    if (shouldCrop) {
        const canvas = document.createElement('canvas');
        canvas.width = imageUploadCroppedAreaPixels.width;
        canvas.height = imageUploadCroppedAreaPixels.height;
        const ctx = canvas.getContext('2d');
        const imageCropped = new Image();

        await new Promise((resolve) => {
            /* eslint-disable no-unused-expressions */
            imageCropped.onload = () => {
                ctx?.drawImage(
                    imageCropped,
                    imageUploadCroppedAreaPixels.x,
                    imageUploadCroppedAreaPixels.y,
                    imageUploadCroppedAreaPixels.width,
                    imageUploadCroppedAreaPixels.height,
                    0,
                    0,
                    imageUploadCroppedAreaPixels.width,
                    imageUploadCroppedAreaPixels.height,
                );
                resolve('');
            };
            imageCropped.src = URL.createObjectURL(image);
        });
        newFile = await new Promise((resolve) => canvas.toBlob(resolve));
    } else {
        newFile = new Blob([image], {type: image.type});
    }

    newFile.name = image.name;
    const files = [];
    files.push(newFile);
    uploadAfterUserDecision(files);
}

window.registerPlugin(manifest.id, new Plugin());

export {cropImageAccordingToUsersChoice};