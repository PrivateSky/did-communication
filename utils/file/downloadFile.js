import readFile from "./readFile.js";

const downloadFile = (basePath, filePath, fileName, keySSI, dsuStorage)=>{
    readFile(basePath, filePath, fileName, keySSI, dsuStorage, (err, {fileDownloader, downloadedFile})=>{
      fileDownloader.downloadFileToDevice(downloadedFile);
    })
}

export default downloadFile;
