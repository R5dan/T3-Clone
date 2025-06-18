export class OpenRouterKeyError extends Error {
  constructor() {
    super("OpenRouter Key Error");
  }
}

export class InvalidOpenRouterKey extends OpenRouterKeyError { }
export class NoOpenRouterKey extends OpenRouterKeyError { }

export class ModelError extends Error {
  constructor() {
    super("Model Error");
  }
}

export class InvalidModel extends ModelError { }
export class NoModel extends ModelError { }
export class ModelDown extends ModelError { }

export class UserError extends Error {
  constructor(error = "User Error") {
    super(error);
  }
}

export class InvalidUser extends UserError { }
export class NoUser extends UserError { }
export class InvalidUserId extends UserError {
  constructor(public userId: string) {
    super(`Invalid User ID: ${userId}`);
  }
}
export class LocalUser extends UserError {
  constructor() {
    super(`User is local`);
  }
}
export class ThreadError extends Error {
  constructor(error = "Thread Error") {
    super(error);
  }
}
export class NoThread extends ThreadError {
  constructor(public threadId: string) {
    super(`No Thread with ID: ${threadId}`);
  }
}

export class MessageError extends Error {
  constructor(error = "Message Error") {
    super(error);
  }
}

export class NoMessage extends MessageError {
  constructor(public messageId: string) {
    super(`No Message with ID: ${messageId}`);
  }
}

export class FileError extends MessageError {
  constructor(error = "File Error") {
    super(error);
  }
}

export class NoImage extends FileError {
  constructor(public imageId: string) {
    super(`No Image with ID: ${imageId}`);
  }
}

export class NoFile extends FileError {
  constructor(public fileId: string) {
    super(`No File with ID: ${fileId}`);
  }
}