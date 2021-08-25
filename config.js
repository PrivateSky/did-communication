import fetch from "./utils/fetch.js";
import promisify from "./utils/promisify.js";
import getStorageService from "./services/StorageService.js";
import constants from "./constants.js";
import Message from "./utils/Message.js";

const openDSU = require("opendsu");
const keySSISpace = openDSU.loadAPI("keyssi");
const w3cDID = openDSU.loadAPI("w3cdid");

const DOMAIN = constants.DOMAIN;
const { setConfig, getConfig, addControllers, addHook } = WebCardinal.preload;
const { define } = WebCardinal.components;
const { Controller } = WebCardinal.controllers;

function generateIdentity(username) {
  const w3cDID = openDSU.loadAPI("w3cdid");
  return new Promise((resolve, reject) => {
    w3cDID.createIdentity("name", DOMAIN, username, (err, didDocument) => {
      if (err) {
        return reject(err);
      }

      resolve(didDocument.getIdentifier());
    });
  });
}

function setTheme() {
  function applyDarkTheme() {
    const schemeElement = document.head.querySelector("[name=color-scheme]");
    schemeElement.setAttribute(
      "content",
      `${schemeElement.getAttribute("content")} dark`
    );
    document.body.classList.add("dark");
  }

  const storedTheme = window.localStorage.getItem("mt-theme");
  if (storedTheme === "dark") {
    applyDarkTheme();
    return;
  }
  if (storedTheme === "light") {
    return;
  }

  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    applyDarkTheme();
  }
}

addHook("beforeAppLoads", async () => {
  const SECURITY_CONTEXT_KEY_SSI_PATH = "security-context";
  let readMessageCalled = false;
  addControllers({
    MtController: class _ extends Controller {
      constructor(...props) {
        super(...props);
        this.constants = constants;
      }

      ensureStorageServiceIsInitialised(callback) {
        this.DSUStorage.getObject(
          SECURITY_CONTEXT_KEY_SSI_PATH,
          async (err, keySSIObj) => {
            if (err || !keySSIObj) {
              const createSeedSSIAsync = promisify(keySSISpace.createSeedSSI);

              let keySSI;
              try {
                const seedSSI = await createSeedSSIAsync(DOMAIN);
                keySSI = seedSSI.getIdentifier();
              } catch (e) {
                console.error(e);
                return this.showErrorToast(e);
              }
              this.DSUStorage.setObject(
                SECURITY_CONTEXT_KEY_SSI_PATH,
                { keySSI },
                async (err) => {
                  if (err) {
                    return callback(err);
                  }
                  this.createSSIForStorageService(keySSI, async (err) => {
                    this.initialiseStorageService();
                    try {
                      await this.generateUserID();
                      await this.storageService.insertRecordAsync(
                        constants.TABLES.IDENTITY,
                        "identity",
                        this.identity
                      );
                    } catch (e) {
                      return callback(e);
                    }

                    if (!readMessageCalled) {
                      this.readMessage();
                    }

                    callback();
                  });
                }
              );
            } else {
              openDSU.loadAPI("sc").getSecurityContext(keySSIObj.keySSI);
              this.initialiseStorageService();
              try {
                this.identity = await this.storageService.getRecordAsync(
                  constants.TABLES.IDENTITY,
                  "identity"
                );
              }catch (e) {
                return callback(e);
              }
              if (!readMessageCalled) {
                this.readMessage();
              }
              callback();
            }
          }
        );
      }

      createSSIForStorageService(scKeySSI, callback) {
        const sc = openDSU.loadAPI("sc").getSecurityContext(scKeySSI);
        keySSISpace.createSeedSSI(DOMAIN, (err, seedSSI) => {
          this.DSUStorage.setObject(
            constants.KEY_SSI_PATH,
            { keySSI: seedSSI.getIdentifier() },
            callback
          );
        });
      }

      async generateUserID() {
        try {
          const response = await fetch("/api-standard/user-details");
          const userDetails = await response.json();
          this.identity = {
            did: await generateIdentity(userDetails.username),
            nickname: userDetails.username,
          };
        } catch (err) {
          return console.error(`Failed to generate user's DID`, err);
        }
      }

      initialiseStorageService() {
        const storageService = getStorageService(this.DSUStorage);
        storageService.insertRecordAsync = promisify(
          storageService.insertRecord
        );

        storageService.getRecordAsync = promisify(storageService.getRecord);

        storageService.updateRecordAsync = promisify(
          storageService.updateRecord
        );

        storageService.deleteRecordAsync = promisify(
          storageService.deleteRecord
        );

        storageService.filterAsync = promisify(storageService.filter);
        this.storageService = storageService;
      }

      readMessage() {
        readMessageCalled = true;
        w3cDID.resolveDID(this.identity.did, (err, didDocument) => {
          if (err) {
            return console.error(err);
          }

          didDocument.readMessage(async (err, message) => {
            if (err) {
              return console.error(err);
            }

            this.receivedMessage = true;
            try {
              await this.parseMessageAndStoreMessage(message);
            } catch (e) {
              return console.error(e);
            }
            this.readMessage();
          });
        });
      }

      async parseMessageAndStoreMessage(messageSerialisation) {
        const message = new Message(messageSerialisation);
        const teamDID = message.getGroupDID();
        const senderDID = message.getSender();
        const content = message.getContent();
        const avatar = message.getGroupAvatar();
        const avatarName = message.getAvatarName();

        const resolveDIDAsync = promisify(w3cDID.resolveDID);
        let groupDIDDocument;
        try {
          groupDIDDocument = await resolveDIDAsync(teamDID);
        } catch (e) {
          console.error(e);
          return this.showErrorToast(e);
        }

        let teamName = groupDIDDocument.getGroupName();
        let teamRecord;
        if (senderDID !== this.identity.did) {
          try {
            teamRecord = await this.storageService.getRecordAsync(
              constants.TABLES.TEAMS,
              teamDID
            );
          } catch (e) {
            try {
              await this.storageService.insertRecordAsync(
                constants.TABLES.TEAMS,
                teamDID,
                { admin: senderDID, teamName: teamName, avatar, avatarName }
              );
            } catch (e) {
              console.error(e);
              return this.showErrorToast(e);
            }
          }

          try {
            await this.storageService.insertRecordAsync(teamDID, Date.now(), {
              sender: senderDID,
              message: message.getContent(),
              messageType: message.getContentType(),
              keySSI: message.getAttachedDSUKeySSI(),
              teamName: teamName,
            });
          } catch (e) {
            console.error(e);
            return this.showErrorToast(e);
          }
        }
      }

      showToast(message, props = {}) {
        const toastElement = this.createAndAddElement("ion-toast", {
          message,
          duration: 2000,
          color: "dark",
          ...props,
        });
        toastElement.present();
      }

      showErrorToast(message, props = {}) {
        this.showToast(message, {
          color: "danger",
          ...props,
        });
      }
    },
  });
});

setConfig(
  (() => {
    const config = getConfig();
    config.translations = false;
    config.logLevel = "error";
    return config;
  })()
);

setTheme();

define("mt-page");
define("mt-page-menu");
define("mt-header");
define("mt-footer");
define("mt-title");
define("mt-menu");
define("mt-chat-emojis");
define("mt-chat-item");
define("mt-team-item");
define("mt-team-adder");
define("mt-team-modal");
define("mt-team-member");
define("mt-settings-did");
define("mt-settings-nickname");
