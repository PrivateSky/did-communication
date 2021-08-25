import DSU_Builder from "../../services/DSUBuilder.js";
import promisify from "../promisify.js";

export default class FileUploader {
  constructor() {}

  async buildDSUWithFile(fileName, fileContent) {
    const dsuBuilderService = new DSU_Builder();
    let transactionId;
    try {
      transactionId = await promisify(dsuBuilderService.getTransactionId)();
    } catch (e) {
      return console.error(e);
    }

    try {
      await promisify(dsuBuilderService.addFileDataToDossier)(transactionId, fileName, fileContent);
    }catch (e) {
      return console.error(e);
    }

    let keySSI;
    try {
      keySSI = await promisify(dsuBuilderService.buildDossier)(transactionId);
    }catch (e) {
      return console.error(e);
    }

    return keySSI;
  }
}
