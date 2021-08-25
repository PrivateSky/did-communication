import DSU_Builder from "../../services/DSUBuilder.js";
import promisify from "../promisify.js";

export default async function buildDSUWithFiles(filesArray) {
    if (!Array.isArray(filesArray)) {
        filesArray = [filesArray];
    }
    const dsuBuilderService = new DSU_Builder();
    let transactionId;
    try {
        transactionId = await promisify(dsuBuilderService.getTransactionId)();
    } catch (e) {
        return console.error(e);
    }

    for (let i = 0; i < filesArray.length; i++) {
        const fileObj = filesArray[i];
        try {
             await promisify(dsuBuilderService.addFileDataToDossier)(
                transactionId,
                fileObj.name,
                fileObj.content
            );
        } catch (e) {
            return console.error(e);
        }
    }

    let keySSI;
    try {
        keySSI = await promisify(dsuBuilderService.buildDossier)(transactionId);
    } catch (e) {
        return console.error(e);
    }

    const keySSISpace = require("opendsu").loadAPI("keyssi");
    return keySSISpace.parse(keySSI).derive().getIdentifier();
}
