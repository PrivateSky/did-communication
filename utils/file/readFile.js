import FileDownloader from "./FileDownloader.js";

const readFile = (basePath, filePath, fileName, keySSI, dsuStorage, callback) => {
  mountAndRead(basePath, filePath, fileName, keySSI, dsuStorage, callback)
};

function mountAndRead(basePath, filePath, fileName, keySSI, dsuStorage, callback) {
  dsuStorage.call("mountDSU", `${basePath}${filePath}`, keySSI, (err) => {
    const fileDownloader = new FileDownloader(`${basePath}${filePath}`, fileName);
    fileDownloader.downloadFile((downloadedFile) =>
      callback(undefined, {fileDownloader, downloadedFile})
    );
  });
}

export default readFile;
