export default class Message {
  constructor(serialisation) {
    this.message = {};
    if (typeof serialisation !== "undefined") {
      try {
        this.message = JSON.parse(serialisation);
      } catch (e) {
        throw createOpenDSUErrorWrapper(
          `Invalid message serialisation ${serialisation}`,
          e
        );
      }
    }
  }

  setGroupDID(_teamDID) {
    this.message.groupDID = _teamDID;
  }

  getGroupDID() {
    return this.message.groupDID;
  }

  setGroupAvatar(_avatar) {
    this.message.groupAvatar = _avatar;
  }

  getGroupAvatar() {
    return this.message.groupAvatar;
  }

  setAvatarName(_avatarName) {
    this.message.avatarName = _avatarName;
  }

  getAvatarName() {
    return this.message.avatarName;
  }

  setContent(content) {
    this.message.content = content;
  }

  getContent() {
    return this.message.content;
  }

  setContentType(_type) {
    this.message.contentType = _type;
  }

  getContentType() {
    return this.message.contentType;
  }

  setSender(senderDID) {
    this.message.sender = senderDID;
  }

  getSender() {
    return this.message.sender;
  }

  setAttachedDSUKeySSI(_keySSI) {
    this.message.attachedDSUKeySSI = _keySSI;
  }

  getAttachedDSUKeySSI() {
    return this.message.attachedDSUKeySSI;
  }

  getSerialisation() {
    return JSON.stringify(this.message);
  }
}
