import bytesToBase64 from "./bytesToBase64.js";

export default class AvatarUploader {
  constructor(context) {
    this.context = context;
    this.storageService = this.context.storageService;
  }

  uploadAvatar(table, key) {
    const fileElement = this.context.getElementByTag("file");
    fileElement.click();
    fileElement.addEventListener("change", async (event) => {
      const file = event.target.files[0];
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!file.type) {
        return console.error(
          "The file.type property does not appear to be supported on this browser."
        );
      }

      if (!file.type.match("image.*")) {
        return console.error(
          "The selected file does not appear to be an image."
        );
      }

      this.name = file.name;
      this.buffer = await file.arrayBuffer();
      if (table && key) {
        await this.updateAvatar(table, key);
      }
      const reader = new FileReader();
      reader.addEventListener("load", (event) => {
        this.showAvatar(event.target.result);
        fileElement.value = "";
      });
      reader.readAsDataURL(file);
    });
  }

  showAvatar(src) {
    let avatarElement = this.context.querySelector("ion-avatar");
    let imgElement = avatarElement.querySelector("img");

    if (!imgElement) {
      imgElement = this.context.createElement("img");
      avatarElement.append(imgElement);
    }
    imgElement.src = src;
  }

  async updateAvatar(table, key) {
    let avatar = this.getAvatar("base64");
    let record;

    try {
      record = await this.storageService.getRecordAsync(table, key);
    } catch (e) {
      try {
        await this.storageService.insertRecordAsync(table, key, {
          avatar: avatar,
        });
        return
      }catch (e) {
        return console.error(e);
      }
    }

    record.avatar = avatar;
    try {
      await this.storageService.updateRecordAsync(table, key, record);
    } catch (e) {
      return console.error(e);
    }
  }

  getAvatar(format) {
    if(format === "base64"){
      let avatar = bytesToBase64(this.buffer);
      if (avatar.length) {
        avatar = `data:image/png;base64, ${avatar}`;
      }

      return avatar;
    }

    return {
      name: this.name,
      content: this.buffer
    }

  }

  deleteAvatar() {
    let avatarElement = this.context.querySelector("ion-avatar");
    let imgElement = avatarElement.querySelector("img");
    imgElement.remove();
    imgElement = undefined;
    this.buffer = undefined;
  }
}
